package com.aiuigenerator.bff.web;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.aiuigenerator.bff.domain.UserGitLabCredential;
import com.aiuigenerator.bff.service.GitLabOAuth2Service;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * REST API for GitLab OAuth2 authentication flow
 * Handles: authorization initiation, callback handling, credential management
 */
@RestController
@RequestMapping("/api/gitlab")
public class GitLabOAuth2Controller {
    private static final Logger log = LoggerFactory.getLogger(GitLabOAuth2Controller.class);

    private final GitLabOAuth2Service gitLabOAuth2Service;
    private final ObjectMapper objectMapper;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    public GitLabOAuth2Controller(GitLabOAuth2Service gitLabOAuth2Service, ObjectMapper objectMapper) {
        this.gitLabOAuth2Service = gitLabOAuth2Service;
        this.objectMapper = objectMapper;
    }

    /**
     * Extract user ID from JWT token or use default for dev mode
     */
    private String extractUserId(JwtAuthenticationToken token) {
        if (token != null && token.getToken() != null) {
            return (String) token.getToken().getClaims().get("sub");
        }
        if (devMode) {
            return "dev-user";
        }
        throw new IllegalArgumentException("No authentication token provided");
    }

    /**
     * Step 1: Initiate OAuth2 authorization
     * Returns the authorization URL to redirect user to GitLab login
     */
    @GetMapping("/auth/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam(required = false, defaultValue = "https://gitlab.com") String gitlabUrl,
            @RequestParam(required = false, defaultValue = "false") boolean force,
            Authentication auth) {

        try {
            String userId;
            if (auth instanceof JwtAuthenticationToken) {
                JwtAuthenticationToken token = (JwtAuthenticationToken) auth;
                userId = extractUserId(token);
            } else if (devMode) {
                userId = "dev-user";
            } else {
                return ResponseEntity.status(401).body(createErrorResponse("No authentication"));
            }

            // If force=true, disconnect any existing connection first (for switching accounts)
            if (force) {
                log.info("Force reconnect requested for user {} on GitLab {}. Disconnecting existing credential first.", userId, gitlabUrl);
                try {
                    gitLabOAuth2Service.disconnectGitLab(userId, gitlabUrl);
                } catch (Exception e) {
                    log.debug("No existing credential to disconnect, or disconnect failed: {}", e.getMessage());
                }
            }

            String state = gitLabOAuth2Service.generateState();

            // In dev mode without real GitLab credentials, mock the OAuth flow
            boolean hasRealGitlabCreds = gitLabOAuth2Service.hasRealCredentials();
            log.info("GitLab authorize: devMode={}, hasRealGitlabCreds={}, force={}", devMode, hasRealGitlabCreds, force);
            if (devMode && !hasRealGitlabCreds) {
                log.info("Dev mode (no GitLab creds): Creating mock GitLab credential for user {}", userId);
                UserGitLabCredential credential = gitLabOAuth2Service.createMockCredential(userId, gitlabUrl);

                ObjectNode response = objectMapper.createObjectNode();
                response.put("success", true);
                response.put("message", "Mock connection created in dev mode");
                response.put("gitlabUrl", credential.getGitlabUrl());
                response.put("gitlabUsername", credential.getGitlabUsername());
                return ResponseEntity.ok(response);
            }

            // Store state in session or cache for validation (simplified for now)
            String authorizationUrl = gitLabOAuth2Service.generateAuthorizationUrl(gitlabUrl, state);

            log.info("Generated authorization URL for user {} on GitLab instance {}", userId, gitlabUrl);

            ObjectNode response = objectMapper.createObjectNode();
            response.put("authorizationUrl", authorizationUrl);
            response.put("state", state);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to generate authorization URL", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("Failed to generate authorization URL: " + e.getMessage()));
        }
    }

    /**
     * Step 2: Handle OAuth2 callback
     * Exchanges authorization code for access token and stores credential
     */
    @GetMapping("/auth/callback")
    public ResponseEntity<?> callback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false, defaultValue = "https://gitlab.com") String gitlabUrl,
            Authentication auth) {

        try {
            String userId;
            if (auth instanceof JwtAuthenticationToken) {
                JwtAuthenticationToken token = (JwtAuthenticationToken) auth;
                userId = extractUserId(token);
            } else if (devMode) {
                userId = "dev-user";
            } else {
                return ResponseEntity.status(401).body(createErrorResponse("No authentication"));
            }

            log.info("Processing OAuth2 callback for user {} on GitLab {}", userId, gitlabUrl);

            // Exchange code for token and store credential
            UserGitLabCredential credential = gitLabOAuth2Service.handleOAuth2Callback(code, gitlabUrl, userId);

            String html = buildSuccessHtml(credential.getGitlabUsername(), credential.getGitlabUrl());
            return ResponseEntity.ok()
                    .header("Content-Type", "text/html; charset=UTF-8")
                    .body(html);

        } catch (Exception e) {
            log.error("OAuth2 callback failed", e);
            String html = buildErrorHtml(e.getMessage(), gitlabUrl, gitLabOAuth2Service.getRedirectUri());
            return ResponseEntity.badRequest()
                    .header("Content-Type", "text/html; charset=UTF-8")
                    .body(html);
        }
    }

    /**
     * List all connected GitLab instances for current user
     */
    @GetMapping("/credentials")
    public ResponseEntity<?> listCredentials(Authentication auth) {
        try {
            String userId;
            if (auth instanceof JwtAuthenticationToken) {
                JwtAuthenticationToken token = (JwtAuthenticationToken) auth;
                userId = extractUserId(token);
            } else if (devMode) {
                userId = "dev-user";
            } else {
                return ResponseEntity.status(401).body(createErrorResponse("No authentication token provided"));
            }
            List<UserGitLabCredential> credentials = gitLabOAuth2Service.listCredentials(userId);

            List<ObjectNode> response = credentials.stream()
                    .map(cred -> {
                        ObjectNode node = objectMapper.createObjectNode();
                        node.put("gitlabUrl", cred.getGitlabUrl());
                        node.put("gitlabUsername", cred.getGitlabUsername());
                        node.put("connectedAt", cred.getCreatedAt().toString());
                        node.put("isActive", cred.isActive());
                        node.put("scope", cred.getScope());
                        return node;
                    })
                    .collect(Collectors.toList());

            log.info("Listed {} GitLab credentials for user {}", response.size(), userId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to list credentials", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("Failed to list credentials: " + e.getMessage()));
        }
    }

    /**
     * Verify a GitLab credential is still valid
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verify(
            @RequestParam(required = false, defaultValue = "https://gitlab.com") String gitlabUrl,
            Authentication auth) {

        try {
            String userId;
            if (auth instanceof JwtAuthenticationToken) {
                JwtAuthenticationToken token = (JwtAuthenticationToken) auth;
                userId = extractUserId(token);
            } else if (devMode) {
                userId = "dev-user";
            } else {
                return ResponseEntity.status(401).body(createErrorResponse("No authentication"));
            }

            Optional<UserGitLabCredential> credential = gitLabOAuth2Service.getCredential(userId, gitlabUrl);

            if (credential.isEmpty()) {
                ObjectNode response = objectMapper.createObjectNode();
                response.put("connected", false);
                response.put("message", "Not connected to this GitLab instance");
                return ResponseEntity.ok(response);
            }

            UserGitLabCredential cred = credential.get();
            boolean isValid = gitLabOAuth2Service.verifyToken(cred.getGitlabUrl(), cred.getAccessToken());

            ObjectNode response = objectMapper.createObjectNode();
            response.put("connected", true);
            response.put("valid", isValid);
            response.put("gitlabUsername", cred.getGitlabUsername());
            response.put("tokenExpired", cred.isTokenExpired());

            if (!isValid) {
                log.warn("GitLab token is invalid for user {} on {}", userId, gitlabUrl);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to verify credential", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("Failed to verify credential: " + e.getMessage()));
        }
    }

    /**
     * Verify a GitLab token with Personal Access Token (for manual credential addition)
     * Accepts: gitlabUrl, personalAccessToken in request body
     * NOTE: No auth required - users paste tokens directly
     */
    @PostMapping("/verify-token")
    public ResponseEntity<?> verifyToken(
            @RequestBody(required = true) VerifyTokenRequest request) {

        try {
            if (request == null || request.gitlabUrl == null || request.personalAccessToken == null) {
                return ResponseEntity.badRequest().body(
                        createErrorResponse("Missing gitlabUrl or personalAccessToken"));
            }

            log.info("Verifying GitLab token for URL: {}", request.gitlabUrl);

            // Verify token server-side to avoid CORS issues
            boolean isValid = gitLabOAuth2Service.verifyTokenWithPAT(request.gitlabUrl, request.personalAccessToken);

            if (!isValid) {
                return ResponseEntity.badRequest().body(
                        createErrorResponse("Invalid GitLab token or URL"));
            }

            // Get user info from GitLab
            String username = gitLabOAuth2Service.getGitLabUsername(request.gitlabUrl, request.personalAccessToken);

            ObjectNode response = objectMapper.createObjectNode();
            response.put("username", username);

            log.info("Token verified successfully for GitLab user: {}", username);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to verify token", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("Failed to verify token: " + e.getMessage()));
        }
    }

    /**
     * Request body for token verification
     */
    public static class VerifyTokenRequest {
        public String gitlabUrl;
        public String personalAccessToken;

        public VerifyTokenRequest() {}

        public VerifyTokenRequest(String gitlabUrl, String personalAccessToken) {
            this.gitlabUrl = gitlabUrl;
            this.personalAccessToken = personalAccessToken;
        }

        public String getGitlabUrl() {
            return gitlabUrl;
        }

        public void setGitlabUrl(String gitlabUrl) {
            this.gitlabUrl = gitlabUrl;
        }

        public String getPersonalAccessToken() {
            return personalAccessToken;
        }

        public void setPersonalAccessToken(String personalAccessToken) {
            this.personalAccessToken = personalAccessToken;
        }
    }

    /**
     * Disconnect/revoke GitLab credential
     */
    @PostMapping("/disconnect")
    public ResponseEntity<?> disconnect(
            @RequestParam(required = false, defaultValue = "https://gitlab.com") String gitlabUrl,
            Authentication auth) {

        try {
            String userId;
            if (auth instanceof JwtAuthenticationToken) {
                JwtAuthenticationToken token = (JwtAuthenticationToken) auth;
                userId = extractUserId(token);
            } else if (devMode) {
                userId = "dev-user";
            } else {
                return ResponseEntity.status(401).body(createErrorResponse("No authentication"));
            }

            gitLabOAuth2Service.disconnectGitLab(userId, gitlabUrl);

            log.info("Disconnected user {} from GitLab {}", userId, gitlabUrl);

            ObjectNode response = objectMapper.createObjectNode();
            response.put("success", true);
            response.put("message", "Successfully disconnected from GitLab");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to disconnect from GitLab", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("Failed to disconnect: " + e.getMessage()));
        }
    }

    /**
     * Create error response object
     */
    private ObjectNode createErrorResponse(String message) {
        ObjectNode error = objectMapper.createObjectNode();
        error.put("error", true);
        error.put("message", message);
        return error;
    }

    /**
     * Build styled HTML for successful OAuth callback
     */
    private String buildSuccessHtml(String username, String gitlabUrl) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>GitLab Connected - AI UI Generator</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 48px;
                        max-width: 480px;
                        width: 100%%;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUp 0.5s ease-out;
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .success-icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
                        border-radius: 50%%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                        animation: scaleIn 0.4s ease-out 0.2s both;
                    }
                    @keyframes scaleIn {
                        from { opacity: 0; transform: scale(0.5); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .success-icon svg {
                        width: 40px;
                        height: 40px;
                        color: white;
                    }
                    h1 {
                        font-size: 24px;
                        font-weight: 700;
                        color: #1f2937;
                        margin-bottom: 8px;
                    }
                    .subtitle {
                        color: #6b7280;
                        font-size: 14px;
                        margin-bottom: 32px;
                        line-height: 1.5;
                    }
                    .user-info {
                        background: #f3f4f6;
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin-bottom: 24px;
                    }
                    .user-label {
                        font-size: 12px;
                        color: #6b7280;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                    }
                    .user-name {
                        font-size: 18px;
                        font-weight: 600;
                        color: #1f2937;
                    }
                    .gitlab-url {
                        font-size: 13px;
                        color: #9ca3af;
                        margin-top: 4px;
                    }
                    .btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        color: white;
                        font-weight: 600;
                        font-size: 15px;
                        padding: 14px 32px;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        text-decoration: none;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }
                    .auto-close {
                        font-size: 13px;
                        color: #9ca3af;
                        margin-top: 20px;
                    }
                    .countdown {
                        font-weight: 600;
                        color: #667eea;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1>Successfully Connected!</h1>
                    <p class="subtitle">Your GitLab account has been linked to AI UI Generator. You can now push your generated code directly to GitLab.</p>
                    <div class="user-info">
                        <div class="user-label">Connected as</div>
                        <div class="user-name">%s</div>
                        <div class="gitlab-url">%s</div>
                    </div>
                    <button class="btn" onclick="returnToApp()">Return to AI UI Generator</button>
                    <p class="auto-close"><strong>You can close this window</strong> or click the button above to return.</p>
                </div>
                <script>
                    // Notify parent window immediately
                    if (window.opener) {
                        window.opener.postMessage({ type: 'GITLAB_CONNECTED', success: true, username: '%s' }, '*');
                    }
                    
                    function returnToApp() {
                        // Try to notify parent one more time
                        if (window.opener) {
                            window.opener.postMessage({ type: 'GITLAB_CONNECTED', success: true, username: '%s' }, '*');
                            window.close();
                        } else {
                            // If no opener, redirect to main app
                            window.location.href = 'http://localhost:5173';
                        }
                    }
                    
                    // Try to auto-close after 2 seconds, but fallback to manual message
                    setTimeout(() => {
                        if (window.opener) {
                            window.opener.postMessage({ type: 'GITLAB_CONNECTED', success: true, username: '%s' }, '*');
                        }
                        window.close();
                        // If window didn't close (browser blocked it), message stays as-is
                    }, 2000);
                </script>
            </body>
            </html>
            """.formatted(username, gitlabUrl, username, username);
    }

    /**
     * Build styled HTML for OAuth callback error
     */
    private String buildErrorHtml(String errorMessage, String gitlabUrl, String redirectUri) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Connection Failed - AI UI Generator</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 48px;
                        max-width: 480px;
                        width: 100%%;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUp 0.5s ease-out;
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .error-icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%);
                        border-radius: 50%%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                        animation: shake 0.5s ease-out;
                    }
                    @keyframes shake {
                        0%%, 100%% { transform: translateX(0); }
                        25%% { transform: translateX(-10px); }
                        75%% { transform: translateX(10px); }
                    }
                    .error-icon svg {
                        width: 40px;
                        height: 40px;
                        color: white;
                    }
                    h1 {
                        font-size: 24px;
                        font-weight: 700;
                        color: #1f2937;
                        margin-bottom: 8px;
                    }
                    .subtitle {
                        color: #6b7280;
                        font-size: 14px;
                        margin-bottom: 24px;
                        line-height: 1.5;
                    }
                    .error-details {
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin-bottom: 24px;
                        text-align: left;
                    }
                    .error-label {
                        font-size: 12px;
                        color: #dc2626;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                        font-weight: 600;
                    }
                    .error-text {
                        font-size: 13px;
                        color: #991b1b;
                        line-height: 1.5;
                        word-break: break-word;
                    }
                    .debug-info {
                        background: #f3f4f6;
                        border-radius: 8px;
                        padding: 12px 16px;
                        margin-top: 12px;
                        font-size: 12px;
                        color: #6b7280;
                    }
                    .debug-row {
                        margin-bottom: 4px;
                    }
                    .debug-label {
                        font-weight: 600;
                    }
                    .btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        color: white;
                        font-weight: 600;
                        font-size: 15px;
                        padding: 14px 32px;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        text-decoration: none;
                        margin-right: 12px;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }
                    .btn-secondary {
                        background: #e5e7eb;
                        color: #374151;
                    }
                    .btn-secondary:hover {
                        background: #d1d5db;
                        box-shadow: none;
                    }
                    .actions {
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                        gap: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h1>Connection Failed</h1>
                    <p class="subtitle">We couldn't connect to GitLab. Please check the error details below and try again.</p>
                    <div class="error-details">
                        <div class="error-label">Error Details</div>
                        <div class="error-text">%s</div>
                        <div class="debug-info">
                            <div class="debug-row"><span class="debug-label">GitLab URL:</span> %s</div>
                            <div class="debug-row"><span class="debug-label">Redirect URI:</span> %s</div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn" onclick="retry()">Try Again</button>
                        <button class="btn btn-secondary" onclick="closeWindow()">Close Window</button>
                    </div>
                </div>
                <script>
                    // Notify parent window of failure
                    if (window.opener) {
                        window.opener.postMessage({ type: 'GITLAB_ERROR', success: false, error: '%%s' }, '*');
                    }
                    function closeWindow() {
                        window.close();
                    }
                    function retry() {
                        window.location.href = '/api/gitlab/auth/authorize?gitlabUrl=%%s';
                    }
                </script>
            </body>
            </html>
            """.formatted(errorMessage, gitlabUrl, redirectUri != null ? redirectUri : "Not configured", errorMessage.replace("'", "\\'"), gitlabUrl);
    }
}
