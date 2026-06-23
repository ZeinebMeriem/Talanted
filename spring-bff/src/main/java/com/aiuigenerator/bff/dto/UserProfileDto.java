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

        public UserProfileResponse() {
        }

        public UserProfileResponse(
                String userId,
                String username,
                String email,
                String firstName,
                String lastName,
                boolean emailVerified,
                String avatarUrl,
                String bio,
                String timezone,
                String preferredLanguage,
                Map<String, Boolean> notifications,
                Instant createdAt,
                Instant updatedAt,
                long projectCount,
                long completedProjects) {
            this.userId = userId;
            this.username = username;
            this.email = email;
            this.firstName = firstName;
            this.lastName = lastName;
            this.emailVerified = emailVerified;
            this.avatarUrl = avatarUrl;
            this.bio = bio;
            this.timezone = timezone;
            this.preferredLanguage = preferredLanguage;
            this.notifications = notifications;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
            this.projectCount = projectCount;
            this.completedProjects = completedProjects;
        }
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
