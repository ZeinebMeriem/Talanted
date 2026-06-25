package com.aiuigenerator.bff.dto;

import java.time.Instant;
import java.util.Map;

public class UserProfileDto {

    public static class UpdateProfileRequest {
        public String avatarUrl;
        public String bio;
        public String timezone;
        public String preferredLanguage;
        public Map<String, Boolean> notifications;

        public UpdateProfileRequest() {
        }

        public UpdateProfileRequest(
                String avatarUrl,
                String bio,
                String timezone,
                String preferredLanguage,
                Map<String, Boolean> notifications) {
            this.avatarUrl = avatarUrl;
            this.bio = bio;
            this.timezone = timezone;
            this.preferredLanguage = preferredLanguage;
            this.notifications = notifications;
        }
    }

    public static class UserProfileResponse {
        public String userId;
        public String username;
        public String email;
        public String firstName;
        public String lastName;
        public boolean emailVerified;
        public String avatarUrl;
        public String bio;
        public String timezone;
        public String preferredLanguage;
        public Map<String, Boolean> notifications;
        public Instant createdAt;
        public Instant updatedAt;
        public long projectCount;
        public long completedProjects;
        // Plan / subscription fields
        public String planId;
        public String stripeCustomerId;
        public String subscriptionId;
        public Instant currentPeriodEnd;
        public int generationsThisMonth;

        public UserProfileResponse() {}
    }

    /** Used by the verify-session and admin endpoints to update a user's plan */
    public static class UpdatePlanRequest {
        public String planId;
        public String stripeCustomerId;
        public String subscriptionId;
        public Instant currentPeriodEnd;
        public UpdatePlanRequest() {}
    }

    public static class AvatarUploadResponse {
        public String avatarUrl;

        public AvatarUploadResponse() {
        }

        public AvatarUploadResponse(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }
    }

    public static class EmailVerificationResponse {
        public boolean success;
        public String message;

        public EmailVerificationResponse() {
        }

        public EmailVerificationResponse(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public static EmailVerificationResponse success(String message) {
            return new EmailVerificationResponse(true, message);
        }

        public static EmailVerificationResponse error(String message) {
            return new EmailVerificationResponse(false, message);
        }
    }
}
