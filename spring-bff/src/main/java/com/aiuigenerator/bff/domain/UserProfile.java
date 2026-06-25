package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "user_profiles")
public class UserProfile {

    @Id
    private String userId;  // UUID from Keycloak JWT sub claim

    // Basic info (mirrored from Keycloak for caching)
    @Indexed
    private String username;
    @Indexed
    private String email;
    private String firstName;
    private String lastName;
    private boolean emailVerified;

    // Extended profile
    private String avatarUrl;
    private String bio;
    private String timezone;
    private String preferredLanguage;
    private Map<String, Boolean> notifications; // email, push, etc.

    // Metadata
    private Instant createdAt;
    private Instant updatedAt;
    private long projectCount;
    private long completedProjects;

    // ── Subscription / Plan ──────────────────────────────────────────────────
    private String planId = "free";          // free | team | enterprise | custom
    private String stripeCustomerId;
    private String subscriptionId;
    private Instant currentPeriodEnd;        // when the current billing period ends

    // Monthly generation counter (reset on new billing month)
    private int    generationsThisMonth = 0;
    private String generationResetMonth;     // "YYYY-MM" — reset when month changes

    // Getters and Setters
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public void setPreferredLanguage(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }

    public Map<String, Boolean> getNotifications() {
        return notifications;
    }

    public void setNotifications(Map<String, Boolean> notifications) {
        this.notifications = notifications;
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

    public long getProjectCount() {
        return projectCount;
    }

    public void setProjectCount(long projectCount) {
        this.projectCount = projectCount;
    }

    public long getCompletedProjects() {
        return completedProjects;
    }

    public void setCompletedProjects(long completedProjects) {
        this.completedProjects = completedProjects;
    }

    public String getPlanId() { return planId == null ? "free" : planId; }
    public void setPlanId(String planId) { this.planId = planId; }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public String getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(String subscriptionId) { this.subscriptionId = subscriptionId; }

    public Instant getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }

    public int getGenerationsThisMonth() { return generationsThisMonth; }
    public void setGenerationsThisMonth(int generationsThisMonth) { this.generationsThisMonth = generationsThisMonth; }

    public String getGenerationResetMonth() { return generationResetMonth; }
    public void setGenerationResetMonth(String generationResetMonth) { this.generationResetMonth = generationResetMonth; }
}
