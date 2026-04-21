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

    public GitLabOAuth2Service(
            UserGitLabCredentialRepository credentialRepo,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.credentialRepo = credentialRepo;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Generate OAuth2 authorization URL
     * User will be redirected to GitLab login, then back to callback endpoint
     */
    public String generateAuthorizationUrl(String gitlabUrl, String state) {
        String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
        String authorizationUri = normalizedUrl + "/oauth/authorize";

        Map<String, String> params = new HashMap<>();
        params.put("client_id", clientId);
        params.put("redirect_uri", redirectUri);
        params.put("response_type", "code");
        params.put("scope", "api read_user");
        params.put("state", state);

        StringBuilder url = new StringBuilder(authorizationUri);
        url.append("?client_id=").append(clientId);
        url.append("&redirect_uri=").append(urlEncode(redirectUri));
        url.append("&response_type=code");
        url.append("&scope=api%20read_user");
        url.append("&state=").append(state);

        log.info("Generated authorization URL for GitLab: {}", normalizedUrl);
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

        // Exchange code for token
        Map<String, String> tokenRequest = new HashMap<>();
        tokenRequest.put("client_id", clientId);
        tokenRequest.put("client_secret", clientSecret);
        tokenRequest.put("code", code);
        tokenRequest.put("grant_type", "authorization_code");
        tokenRequest.put("redirect_uri", redirectUri);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String requestBody = objectMapper.writeValueAsString(tokenRequest);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            // Call GitLab token endpoint
            String response = restTemplate.postForObject(tokenUri, entity, String.class);
            JsonNode tokenNode = objectMapper.readTree(response);

            // Extract token data
            String accessToken = tokenNode.get("access_token").asText();
            String refreshToken = tokenNode.has("refresh_token") ? tokenNode.get("refresh_token").asText() : null;
            long expiresIn = tokenNode.has("expires_in") ? tokenNode.get("expires_in").asLong() : 3600;
            Instant tokenExpiresAt = Instant.now().plusSeconds(expiresIn);

            // Fetch user profile to get username
            String gitlabUsername = fetchGitLabUsername(accessToken, normalizedUrl);

            // Create or update credential
            Optional<UserGitLabCredential> existing = credentialRepo.findByUserIdAndGitlabUrl(userId, gitlabUrl);

            UserGitLabCredential credential;
            if (existing.isPresent()) {
                credential = existing.get();
                log.info("Updating existing GitLab credential for user {} on {}", userId, gitlabUrl);
            } else {
                credential = new UserGitLabCredential(userId, gitlabUrl, gitlabUsername);
                log.info("Creating new GitLab credential for user {} on {}", userId, gitlabUrl);
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
        return credentialRepo.findByUserIdAndGitlabUrl(userId, normalizedUrl);
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
     * Fetch GitLab username from API
     */
    private String fetchGitLabUsername(String accessToken, String gitlabUrl) throws Exception {
        String userInfoUri = gitlabUrl + "/api/v4/user";

        HttpHeaders headers = new HttpHeaders();
        headers.set("PRIVATE-TOKEN", accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            String response = restTemplate.getForObject(userInfoUri, String.class);
            JsonNode userNode = objectMapper.readTree(response);
            return userNode.get("username").asText();
        } catch (Exception e) {
            log.error("Failed to fetch GitLab username", e);
            throw e;
        }
    }

    /**
     * Verify token is still valid
     */
    public boolean verifyToken(String gitlabUrl, String accessToken) {
        try {
            String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
            String userInfoUri = normalizedUrl + "/api/v4/user";

            HttpHeaders headers = new HttpHeaders();
            headers.set("PRIVATE-TOKEN", accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String response = restTemplate.getForObject(userInfoUri, String.class);
            return response != null && !response.isEmpty();

        } catch (Exception e) {
            log.warn("Token verification failed for {}: {}", gitlabUrl, e.getMessage());
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
