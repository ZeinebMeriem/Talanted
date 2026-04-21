package com.aiuigenerator.bff.domain;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Stores encrypted GitLab OAuth2 credentials per user and GitLab instance
 * Supports multiple GitLab instances (gitlab.com + self-hosted)
 */
@Document(collection = "user_gitlab_credentials")
@CompoundIndexes({
    @CompoundIndex(name = "user_gitlab_idx", def = "{'userId': 1, 'gitlabUrl': 1}", unique = true)
})
public class UserGitLabCredential {

    @Id
    private String id;

    // User identifier from Keycloak JWT (sub claim)
    private String userId;

    // GitLab instance URL (https://gitlab.com or https://gitlab.company.com)
    private String gitlabUrl;

    // GitLab username from OAuth2 profile
    private String gitlabUsername;

    // Encrypted access token
    private String accessToken;

    // Encrypted refresh token (nullable if no refresh token provided)
    private String refreshToken;

    // Token expiration time (nullable if no expiry)
    private Instant tokenExpiresAt;

    // Scopes granted during OAuth2 flow (e.g., "api read_user")
    private String scope;

    // Whether this credential is still active/valid
    private boolean isActive;

    // Timestamps
    private Instant createdAt;

    private Instant updatedAt;

    public UserGitLabCredential() {
    }

    public UserGitLabCredential(String userId, String gitlabUrl, String gitlabUsername) {
        this.userId = userId;
        this.gitlabUrl = gitlabUrl;
        this.gitlabUsername = gitlabUsername;
        this.isActive = true;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getGitlabUrl() {
        return gitlabUrl;
    }

    public void setGitlabUrl(String gitlabUrl) {
        this.gitlabUrl = gitlabUrl;
    }

    public String getGitlabUsername() {
        return gitlabUsername;
    }

    public void setGitlabUsername(String gitlabUsername) {
        this.gitlabUsername = gitlabUsername;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public Instant getTokenExpiresAt() {
        return tokenExpiresAt;
    }

    public void setTokenExpiresAt(Instant tokenExpiresAt) {
        this.tokenExpiresAt = tokenExpiresAt;
    }

    public String getScope() {
        return scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired() {
        if (tokenExpiresAt == null) {
            return false; // No expiry set
        }
        return Instant.now().isAfter(tokenExpiresAt);
    }

    /**
     * Check if token needs refresh (consider 5 min buffer)
     */
    public boolean needsRefresh() {
        if (tokenExpiresAt == null) {
            return false;
        }
        Instant refreshThreshold = tokenExpiresAt.minusSeconds(300); // 5 min buffer
        return Instant.now().isAfter(refreshThreshold);
    }

    @Override
    public String toString() {
        return "UserGitLabCredential{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", gitlabUrl='" + gitlabUrl + '\'' +
                ", gitlabUsername='" + gitlabUsername + '\'' +
                ", isActive=" + isActive +
                ", createdAt=" + createdAt +
                '}';
    }
}
