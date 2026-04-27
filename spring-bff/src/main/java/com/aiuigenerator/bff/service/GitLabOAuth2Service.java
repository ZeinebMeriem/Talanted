package com.aiuigenerator.bff.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.aiuigenerator.bff.domain.UserGitLabCredential;
import com.aiuigenerator.bff.repo.UserGitLabCredentialRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Service for handling GitLab OAuth2 authorization code flow
 * Handles: authorize URL generation, token exchange, credential storage, token refresh
 */
@Service
public class GitLabOAuth2Service {
    private static final Logger log = LoggerFactory.getLogger(GitLabOAuth2Service.class);

    private final UserGitLabCredentialRepository credentialRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gitlab.oauth.client-id:}")
    private String clientId;

    @Value("${gitlab.oauth.client-secret:}")
    private String clientSecret;

    @Value("${gitlab.oauth.redirect-uri:http://localhost:3000/gitlab-callback}")
    private String redirectUri;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    public GitLabOAuth2Service(
            UserGitLabCredentialRepository credentialRepo,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.credentialRepo = credentialRepo;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Check if real GitLab OAuth credentials are configured (not dev mode placeholder)
     */
    public boolean hasRealCredentials() {
        boolean hasCreds = clientId != null && !clientId.isBlank();
        log.debug("hasRealCredentials: clientId present={}, devMode={}", hasCreds, devMode);
        return hasCreds;
    }

    /**
     * Get the configured redirect URI for debugging
     */
    public String getRedirectUri() {
        return redirectUri;
    }

    /**
     * Generate OAuth2 authorization URL
     * User will be redirected to GitLab login, then back to callback endpoint
     */
    public String generateAuthorizationUrl(String gitlabUrl, String state) {
        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
        String authorizationUri = normalizedUrl + "/oauth/authorize";

        // In dev mode without real creds, use a placeholder client_id
        String effectiveClientId = (clientId == null || clientId.isBlank()) && devMode ? "dev-client-id" : clientId;

        StringBuilder url = new StringBuilder(authorizationUri);
        url.append("?client_id=").append(urlEncode(effectiveClientId));
        url.append("&redirect_uri=").append(urlEncode(redirectUri));
        url.append("&response_type=code");
        url.append("&scope=api%20read_user");
        url.append("&state=").append(state);

        log.info("Generated authorization URL for GitLab: {} with redirect_uri={}", normalizedUrl, redirectUri);
        return url.toString();
    }

    /**
     * Generate a random state parameter for CSRF protection
     */
    public String generateState() {
        return UUID.randomUUID().toString();
    }

    /**
     * Exchange authorization code for access token and store credential
     */
    public UserGitLabCredential handleOAuth2Callback(
            String code,
            String gitlabUrl,
            String userId) throws Exception {

        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
        String tokenUri = normalizedUrl + "/oauth/token";

        log.info("OAuth2 callback: exchanging code for token. clientId={}, redirectUri={}",
                clientId != null ? clientId.substring(0, Math.min(8, clientId.length())) + "..." : "null",
                redirectUri);

        // Exchange code for token using form-urlencoded (GitLab requires this, not JSON)
        org.springframework.util.LinkedMultiValueMap<String, String> tokenRequest = new org.springframework.util.LinkedMultiValueMap<>();
        tokenRequest.add("client_id", clientId);
        tokenRequest.add("client_secret", clientSecret);
        tokenRequest.add("code", code);
        tokenRequest.add("grant_type", "authorization_code");
        tokenRequest.add("redirect_uri", redirectUri);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<org.springframework.util.LinkedMultiValueMap<String, String>> entity = new HttpEntity<>(tokenRequest, headers);

        try {
            // Call GitLab token endpoint
            String response = restTemplate.postForObject(tokenUri, entity, String.class);
            log.debug("GitLab token response: {}", response);
            JsonNode tokenNode = objectMapper.readTree(response);

            // Extract token data
            String accessToken = tokenNode.get("access_token").asText();
            String refreshToken = tokenNode.has("refresh_token") ? tokenNode.get("refresh_token").asText() : null;
            long expiresIn = tokenNode.has("expires_in") ? tokenNode.get("expires_in").asLong() : 3600;
            Instant tokenExpiresAt = Instant.now().plusSeconds(expiresIn);

            // Fetch user profile to get username
            String gitlabUsername = fetchGitLabUsername(accessToken, normalizedUrl);

            // Create or update credential
            Optional<UserGitLabCredential> existing = credentialRepo.findFirstByUserIdAndGitlabUrl(userId, normalizedUrl);

            UserGitLabCredential credential;
            if (existing.isPresent()) {
                credential = existing.get();
                // Update username in case switching from mock to real OAuth
                credential.setGitlabUsername(gitlabUsername);
                log.info("Updating existing GitLab credential for user {} on {} with username {}", userId, normalizedUrl, gitlabUsername);
            } else {
                credential = new UserGitLabCredential(userId, normalizedUrl, gitlabUsername);
                log.info("Creating new GitLab credential for user {} on {}", userId, normalizedUrl);
            }

            credential.setAccessToken(accessToken);
            credential.setRefreshToken(refreshToken);
            credential.setTokenExpiresAt(tokenExpiresAt);
            credential.setScope("api read_user");
            credential.setActive(true);
            credential.setUpdatedAt(Instant.now());

            // Save to MongoDB
            UserGitLabCredential saved = credentialRepo.save(credential);
            log.info("Successfully stored GitLab credential for user {} on {}", userId, gitlabUrl);

            return saved;

        } catch (Exception e) {
            log.error("Failed to exchange OAuth2 code for GitLab token", e);
            throw new RuntimeException("OAuth2 token exchange failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get stored credential for user and GitLab instance
     */
    public Optional<UserGitLabCredential> getCredential(String userId, String gitlabUrl) {
        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
        return credentialRepo.findFirstByUserIdAndGitlabUrl(userId, normalizedUrl);
    }

    /**
     * List all active credentials for user
     */
    public List<UserGitLabCredential> listCredentials(String userId) {
        return credentialRepo.findByUserIdAndIsActiveTrue(userId);
    }

    /**
     * Refresh token if expired
     */
    public void refreshTokenIfNeeded(UserGitLabCredential credential) throws Exception {
        if (!credential.needsRefresh()) {
            return; // Token still valid
        }

        if (credential.getRefreshToken() == null) {
            log.warn("No refresh token available for credential {}", credential.getId());
            return;
        }

        String normalizedUrl = normalizeGitLabUrl(credential.getGitlabUrl());
        String tokenUri = normalizedUrl + "/oauth/token";

        Map<String, String> refreshRequest = new HashMap<>();
        refreshRequest.put("client_id", clientId);
        refreshRequest.put("client_secret", clientSecret);
        refreshRequest.put("refresh_token", credential.getRefreshToken());
        refreshRequest.put("grant_type", "refresh_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String requestBody = objectMapper.writeValueAsString(refreshRequest);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(tokenUri, entity, String.class);
            JsonNode tokenNode = objectMapper.readTree(response);

            String newAccessToken = tokenNode.get("access_token").asText();
            long expiresIn = tokenNode.has("expires_in") ? tokenNode.get("expires_in").asLong() : 3600;

            credential.setAccessToken(newAccessToken);
            credential.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
            credential.setUpdatedAt(Instant.now());

            credentialRepo.save(credential);
            log.info("Successfully refreshed GitLab token for credential {}", credential.getId());

        } catch (Exception e) {
            log.error("Failed to refresh GitLab token", e);
            throw new RuntimeException("Token refresh failed: " + e.getMessage(), e);
        }
    }

    /**
     * Disconnect/revoke GitLab credential
     */
    public void disconnectGitLab(String userId, String gitlabUrl) {
        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
        credentialRepo.deleteByUserIdAndGitlabUrl(userId, normalizedUrl);
        log.info("Disconnected GitLab for user {} on {}", userId, gitlabUrl);
    }

    /**
     * Fetch GitLab username from API using OAuth2 Bearer token
     */
    private String fetchGitLabUsername(String accessToken, String gitlabUrl) throws Exception {
        String userInfoUri = normalizeGitLabUrl(gitlabUrl) + "/api/v4/user";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            org.springframework.http.ResponseEntity<String> response =
                    restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, String.class);
            JsonNode userNode = objectMapper.readTree(response.getBody());
            return userNode.get("username").asText();
        } catch (Exception e) {
            log.error("Failed to fetch GitLab username", e);
            throw e;
        }
    }

    /**
     * Verify token is still valid using OAuth2 Bearer token
     */
    public boolean verifyToken(String gitlabUrl, String accessToken) {
        try {
            String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
            String userInfoUri = normalizedUrl + "/api/v4/user";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> response =
                    restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, String.class);
            return response.getBody() != null && !response.getBody().isEmpty();

        } catch (Exception e) {
            log.warn("Token verification failed for {}: {}", gitlabUrl, e.getMessage());
            return false;
        }
    }

    /**
     * Verify GitLab Personal Access Token (PAT) and return username
     */
    public String getGitLabUsername(String gitlabUrl, String personalAccessToken) {
        try {
            String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
            String userInfoUri = normalizedUrl + "/api/v4/user";

            HttpHeaders headers = new HttpHeaders();
            headers.set("PRIVATE-TOKEN", personalAccessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> response =
                    restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode user = objectMapper.readTree(response.getBody());
                String username = user.get("username").asText();
                log.info("Successfully retrieved GitLab username: {}", username);
                return username;
            }

            throw new Exception("Failed to get user info: " + response.getStatusCode());

        } catch (Exception e) {
            log.error("Failed to get GitLab username: {}", e.getMessage());
            throw new RuntimeException("Failed to verify GitLab token: " + e.getMessage(), e);
        }
    }

    /**
     * Verify if a GitLab Personal Access Token is valid
     */
    public boolean verifyTokenWithPAT(String gitlabUrl, String personalAccessToken) {
        try {
            String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
            String userInfoUri = normalizedUrl + "/api/v4/user";

            HttpHeaders headers = new HttpHeaders();
            headers.set("PRIVATE-TOKEN", personalAccessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> response =
                    restTemplate.exchange(userInfoUri, org.springframework.http.HttpMethod.GET, entity, String.class);

            boolean isValid = response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty();
            if (isValid) {
                log.info("PAT verified successfully for GitLab: {}", gitlabUrl);
            } else {
                log.warn("PAT verification failed for GitLab: {}", gitlabUrl);
            }
            return isValid;

        } catch (Exception e) {
            log.warn("PAT verification failed for GitLab {}: {}", gitlabUrl, e.getMessage());
            return false;
        }
    }

    /**
     * Normalize GitLab URL (remove trailing slash, ensure https)
     */
    private String normalizeGitLabUrl(String gitlabUrl) {
        if (gitlabUrl == null) {
            return "https://gitlab.com";
        }
        return gitlabUrl.replaceAll("/*$", "").replaceAll("^http://", "https://");
    }

    /**
     * Create a mock GitLab credential for dev mode
     * If credential already exists for this user+URL, reuse it instead of creating a duplicate
     */
    public synchronized UserGitLabCredential createMockCredential(String userId, String gitlabUrl) {
        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);

        // Check if credential already exists - findFirst avoids IncorrectResultSizeDataAccessException
        Optional<UserGitLabCredential> existing = credentialRepo.findFirstByUserIdAndGitlabUrl(userId, normalizedUrl);

        UserGitLabCredential credential;
        if (existing.isPresent()) {
            // Reuse existing credential instead of creating duplicate
            credential = existing.get();
            log.info("Reusing existing mock GitLab credential for user {} on {}", userId, normalizedUrl);
        } else {
            // Create new credential only if it doesn't exist
            credential = new UserGitLabCredential(userId, normalizedUrl, "dev-user");
            log.info("Creating new mock GitLab credential for user {} on {}", userId, normalizedUrl);
        }

        // Update fields
        credential.setAccessToken("dev-token-" + UUID.randomUUID());
        credential.setScope("api read_user");
        credential.setActive(true);
        credential.setUpdatedAt(Instant.now());

        UserGitLabCredential saved = credentialRepo.save(credential);
        log.info("Mock GitLab credential saved for user {} on {}", userId, normalizedUrl);
        return saved;
    }

    /**
     * URL encode for OAuth2 parameters
     */
    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
}
