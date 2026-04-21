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
            JwtAuthenticationToken token) {

        try {
            String userId = extractUserId(token);
            String state = gitLabOAuth2Service.generateState();

            // In dev mode, mock the OAuth flow by creating a credential directly
            if (devMode) {
                log.info("Dev mode: Creating mock GitLab credential for user {}", userId);
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
            JwtAuthenticationToken token) {

        try {
            String userId = extractUserId(token);

            log.info("Processing OAuth2 callback for user {} on GitLab {}", userId, gitlabUrl);

            // Exchange code for token and store credential
            UserGitLabCredential credential = gitLabOAuth2Service.handleOAuth2Callback(code, gitlabUrl, userId);

            ObjectNode response = objectMapper.createObjectNode();
            response.put("success", true);
            response.put("gitlabUrl", credential.getGitlabUrl());
            response.put("gitlabUsername", credential.getGitlabUsername());
            response.put("message", "Successfully connected to GitLab");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("OAuth2 callback failed", e);
            return ResponseEntity.badRequest().body(
                    createErrorResponse("OAuth2 callback failed: " + e.getMessage()));
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
}
