package com.aiuigenerator.bff.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.aiuigenerator.bff.domain.UserProfile;
import com.aiuigenerator.bff.dto.UserProfileDto.AvatarUploadResponse;
import com.aiuigenerator.bff.dto.UserProfileDto.UpdateProfileRequest;
import com.aiuigenerator.bff.dto.UserProfileDto.UserProfileResponse;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.repo.UserProfileRepository;

@Service
public class UserProfileService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);

    private final UserProfileRepository userProfileRepo;
    private final GenerationRepository generationRepo;
    private final KeycloakEmailService keycloakEmailService;
    private final FileStorageService fileStorageService;

    public UserProfileService(
            UserProfileRepository userProfileRepo,
            GenerationRepository generationRepo,
            KeycloakEmailService keycloakEmailService,
            FileStorageService fileStorageService) {
        this.userProfileRepo = userProfileRepo;
        this.generationRepo = generationRepo;
        this.keycloakEmailService = keycloakEmailService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Get or create user profile with Keycloak data merged in.
     *
     * @param userId The Keycloak user ID (UUID)
     * @param keycloakData Map of Keycloak claims (email, firstName, lastName, email_verified, preferred_username)
     * @return Complete user profile with extended data from MongoDB + Keycloak
     */
    public UserProfileResponse getOrCreateProfile(String userId, Map<String, Object> keycloakData) {
        // Get or create MongoDB profile
        UserProfile profile = userProfileRepo.findByUserId(userId)
                .orElse(createNewProfile(userId, keycloakData));

        // Sync Keycloak data (in case user updated name/email in Keycloak)
        syncKeycloakData(profile, keycloakData);

        // Sync project stats
        long totalProjects = generationRepo.countByUserId(userId);
        long completedProjects = generationRepo.countByUserIdAndStatus(userId,
                com.aiuigenerator.bff.domain.GenerationStatus.COMPLETED);

        profile.setProjectCount(totalProjects);
        profile.setCompletedProjects(completedProjects);

        // Save synced profile
        profile = userProfileRepo.save(profile);

        return toResponse(profile);
    }

    /**
     * Update user's extended profile (avatar, bio, timezone, preferences).
     *
     * @param userId The Keycloak user ID (UUID)
     * @param request Update request with new profile data
     * @return Updated user profile
     */
    public UserProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        UserProfile profile = userProfileRepo.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found for userId: " + userId));

        if (request.avatarUrl != null) {
            profile.setAvatarUrl(request.avatarUrl);
        }
        if (request.bio != null) {
            profile.setBio(request.bio);
        }
        if (request.timezone != null) {
            profile.setTimezone(request.timezone);
        }
        if (request.preferredLanguage != null) {
            profile.setPreferredLanguage(request.preferredLanguage);
        }
        if (request.notifications != null) {
            profile.setNotifications(request.notifications);
        }

        profile.setUpdatedAt(Instant.now());
        profile = userProfileRepo.save(profile);

        log.info("Updated profile for user: {}", userId);
        return toResponse(profile);
    }

    /**
     * Send email verification email to user.
     *
     * @param userId The Keycloak user ID (UUID)
     * @return true if email was sent, false otherwise
     */
    public boolean sendVerificationEmail(String userId) {
        boolean sent = keycloakEmailService.sendVerificationEmail(userId);
        if (sent) {
            log.info("Verification email triggered for user: {}", userId);
        } else {
            log.warn("Failed to send verification email for user: {}", userId);
        }
        return sent;
    }

    /**
     * Upload and store user avatar.
     *
     * @param userId The Keycloak user ID (UUID)
     * @param fileData Avatar image file content
     * @param fileName Original filename
     * @param mimeType Image MIME type
     * @return Response with new avatar URL
     */
    public AvatarUploadResponse uploadAvatar(String userId, byte[] fileData, String fileName, String mimeType) {
        // Validate file type
        if (!isValidImageType(mimeType)) {
            throw new IllegalArgumentException("Invalid image type: " + mimeType + ". Must be PNG, JPEG, or WebP");
        }

        // Validate file size (5MB max)
        if (fileData.length > 5242880) {
            throw new IllegalArgumentException("Avatar file too large. Max size: 5MB");
        }

        // Generate object key for MinIO storage
        String hash = generateFileHash(fileData);
        String objectKey = String.format("avatars/%s/%s_%s", userId, hash,
                sanitizeFileName(fileName));

        // Upload to MinIO
        String avatarUrl = fileStorageService.putBytesToMinio(objectKey, fileData, mimeType, fileName);

        // Update user profile
        UserProfile profile = userProfileRepo.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found for userId: " + userId));

        profile.setAvatarUrl(avatarUrl);
        profile.setUpdatedAt(Instant.now());
        userProfileRepo.save(profile);

        log.info("Avatar uploaded for user: {} -> {}", userId, avatarUrl);
        return new AvatarUploadResponse(avatarUrl);
    }

    /**
     * Delete user avatar.
     *
     * @param userId The Keycloak user ID (UUID)
     */
    public void deleteAvatar(String userId) {
        UserProfile profile = userProfileRepo.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found for userId: " + userId));

        if (profile.getAvatarUrl() != null) {
            // TODO: Delete from MinIO if needed
            profile.setAvatarUrl(null);
            profile.setUpdatedAt(Instant.now());
            userProfileRepo.save(profile);
            log.info("Avatar deleted for user: {}", userId);
        }
    }

    // ========== Helper Methods ==========

    private UserProfile createNewProfile(String userId, Map<String, Object> keycloakData) {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setCreatedAt(Instant.now());
        profile.setUpdatedAt(Instant.now());

        syncKeycloakData(profile, keycloakData);

        // Initialize default notifications
        Map<String, Boolean> defaultNotifications = new HashMap<>();
        defaultNotifications.put("emailNotifications", true);
        defaultNotifications.put("projectUpdates", true);
        defaultNotifications.put("weeklyDigest", false);
        profile.setNotifications(defaultNotifications);

        return userProfileRepo.save(profile);
    }

    private void syncKeycloakData(UserProfile profile, Map<String, Object> keycloakData) {
        if (keycloakData == null)
            return;

        if (keycloakData.get("preferred_username") != null) {
            profile.setUsername((String) keycloakData.get("preferred_username"));
        }
        if (keycloakData.get("email") != null) {
            profile.setEmail((String) keycloakData.get("email"));
        }
        if (keycloakData.get("given_name") != null) {
            profile.setFirstName((String) keycloakData.get("given_name"));
        }
        if (keycloakData.get("family_name") != null) {
            profile.setLastName((String) keycloakData.get("family_name"));
        }
        if (keycloakData.get("email_verified") != null) {
            profile.setEmailVerified((Boolean) keycloakData.get("email_verified"));
        }
    }

    private UserProfileResponse toResponse(UserProfile profile) {
        return new UserProfileResponse(
                profile.getUserId(),
                profile.getUsername(),
                profile.getEmail(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.isEmailVerified(),
                profile.getAvatarUrl(),
                profile.getBio(),
                profile.getTimezone(),
                profile.getPreferredLanguage(),
                profile.getNotifications(),
                profile.getCreatedAt(),
                profile.getUpdatedAt(),
                profile.getProjectCount(),
                profile.getCompletedProjects());
    }

    private boolean isValidImageType(String mimeType) {
        return mimeType != null && (
                mimeType.equals("image/png") ||
                mimeType.equals("image/jpeg") ||
                mimeType.equals("image/webp"));
    }

    private String generateFileHash(byte[] data) {
        // Simple hash based on data content
        return Integer.toHexString(java.util.Arrays.hashCode(data));
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null)
            return "avatar";
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
