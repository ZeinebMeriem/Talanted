package com.aiuigenerator.bff.web;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.aiuigenerator.bff.dto.UserProfileDto.AvatarUploadResponse;
import com.aiuigenerator.bff.dto.UserProfileDto.EmailVerificationResponse;
import com.aiuigenerator.bff.dto.UserProfileDto.UpdateProfileRequest;
import com.aiuigenerator.bff.dto.UserProfileDto.UserProfileResponse;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.service.UserProfileService;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final GenerationRepository generationRepo;
    private final UserProfileService userProfileService;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    public UserController(GenerationRepository generationRepo, UserProfileService userProfileService) {
        this.generationRepo = generationRepo;
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(JwtAuthenticationToken token) {
        // In dev mode, return mock user if token missing
        if (devMode && (token == null || token.getToken() == null)) {
            Map<String, Object> result = new HashMap<>();
            result.put("userId", "dev-user");
            result.put("username", "developer");
            result.put("email", "dev@localhost");
            result.put("emailVerified", true);
            result.put("firstName", "Dev");
            result.put("lastName", "User");
            result.put("roles", List.of("user"));
            return ResponseEntity.ok(result);
        }

        // Production: require authenticated user
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        Map<String, Object> claims = token.getToken().getClaims();

        Map<String, Object> result = new HashMap<>();
        result.put("userId", claims.get("sub"));
        result.put("username", claims.get("preferred_username"));
        result.put("email", claims.get("email"));
        result.put("emailVerified", claims.getOrDefault("email_verified", false));
        result.put("firstName", claims.get("given_name"));
        result.put("lastName", claims.get("family_name"));

        // Roles from Keycloak realm_access
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map<?, ?> ra) {
            Object roles = ra.get("roles");
            result.put("roles", roles instanceof List<?> ? roles : List.of());
        } else {
            result.put("roles", List.of());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(JwtAuthenticationToken token) {
        // In dev mode, return all projects stats
        if (devMode && (token == null || token.getToken() == null)) {
            long total = generationRepo.count();
            long completed = generationRepo.countByStatus(com.aiuigenerator.bff.domain.GenerationStatus.COMPLETED);

            Map<String, Object> result = new HashMap<>();
            result.put("totalGenerations", total);
            result.put("completedGenerations", completed);
            result.put("successRate", total > 0 ? Math.round((completed * 100.0) / total) : 0);
            return ResponseEntity.ok(result);
        }

        // Production: require authenticated user
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");
        long total = generationRepo.countByUserId(userId);
        long completed = generationRepo.countByUserIdAndStatus(userId,
                com.aiuigenerator.bff.domain.GenerationStatus.COMPLETED);

        Map<String, Object> result = new HashMap<>();
        result.put("totalGenerations", total);
        result.put("completedGenerations", completed);
        result.put("successRate", total > 0 ? Math.round((completed * 100.0) / total) : 0);

        return ResponseEntity.ok(result);
    }

    /**
     * Get complete user profile with extended data.
     * Merges Keycloak user data with MongoDB profile (avatar, bio, timezone, preferences).
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(JwtAuthenticationToken token) {
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");
        Map<String, Object> claims = new HashMap<>(token.getToken().getClaims());

        UserProfileResponse profile = userProfileService.getOrCreateProfile(userId, claims);
        return ResponseEntity.ok(profile);
    }

    /**
     * Update user's extended profile (avatar, bio, timezone, notification preferences).
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            JwtAuthenticationToken token) {
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");
        UserProfileResponse updated = userProfileService.updateProfile(userId, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Send email verification message to user.
     * Triggers Keycloak to send a verification email with a link.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<EmailVerificationResponse> sendVerificationEmail(JwtAuthenticationToken token) {
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");
        boolean sent = userProfileService.sendVerificationEmail(userId);

        if (sent) {
            return ResponseEntity.ok(EmailVerificationResponse.success("Verification email sent successfully"));
        } else {
            return ResponseEntity.status(500)
                    .body(EmailVerificationResponse.error("Failed to send verification email"));
        }
    }

    /**
     * Resend email verification message (alias for verify-email).
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<EmailVerificationResponse> resendVerificationEmail(JwtAuthenticationToken token) {
        return sendVerificationEmail(token);
    }

    /**
     * Upload user avatar image.
     * Accepts PNG, JPEG, or WebP images. Max size: 5MB.
     */
    @PostMapping("/avatar")
    public ResponseEntity<AvatarUploadResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            JwtAuthenticationToken token) {
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");

        try {
            byte[] fileData = file.getBytes();
            AvatarUploadResponse response = userProfileService.uploadAvatar(
                    userId,
                    fileData,
                    file.getOriginalFilename(),
                    file.getContentType());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new IllegalArgumentException("Error uploading avatar: " + e.getMessage());
        }
    }

    /**
     * Delete user avatar.
     */
    @DeleteMapping("/profile/avatar")
    public ResponseEntity<Void> deleteAvatar(JwtAuthenticationToken token) {
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        String userId = (String) token.getToken().getClaims().get("sub");
        userProfileService.deleteAvatar(userId);
        return ResponseEntity.noContent().build();
    }
}
