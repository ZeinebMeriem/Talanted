package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.dto.UserProfileDto.UpdateProfileRequest;
import com.aiuigenerator.bff.dto.UserProfileDto.UserProfileResponse;
import com.aiuigenerator.bff.service.UserProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Handles /api/user/* routes (singular) for the authenticated user's own data.
 * Distinct from /api/users/* which handles admin/public registration.
 */
@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    private static final Logger log = LoggerFactory.getLogger(UserProfileController.class);
    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    /** Returns JWT claims + basic profile info for the currently authenticated user. */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        var claims = token.getToken().getClaims();
        return ResponseEntity.ok(Map.of(
                "userId",        claims.getOrDefault("sub", ""),
                "email",         claims.getOrDefault("email", ""),
                "username",      claims.getOrDefault("preferred_username", ""),
                "firstName",     claims.getOrDefault("given_name", ""),
                "lastName",      claims.getOrDefault("family_name", ""),
                "emailVerified", claims.getOrDefault("email_verified", false),
                "roles",         token.getAuthorities().stream()
                                      .map(a -> a.getAuthority().replace("ROLE_", ""))
                                      .toList()
        ));
    }

    /** Returns the full enriched profile including plan/subscription data. */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> profile(JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        String userId = extractUserId(token);
        Map<String, Object> keycloakData = Map.copyOf(token.getToken().getClaims());
        UserProfileResponse resp = userProfileService.getOrCreateProfile(userId, keycloakData);
        return ResponseEntity.ok(resp);
    }

    /** Updates mutable profile fields (bio, avatar, timezone, etc.). */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        String userId = extractUserId(token);
        UserProfileResponse resp = userProfileService.updateProfile(userId, request);
        return ResponseEntity.ok(resp);
    }

    /** Returns generation stats for the current user. */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        String userId = extractUserId(token);
        // getOrCreateProfile syncs counts from GenerationRepository
        Map<String, Object> keycloakData = Map.copyOf(token.getToken().getClaims());
        UserProfileResponse profile = userProfileService.getOrCreateProfile(userId, keycloakData);
        return ResponseEntity.ok(Map.of(
                "totalGenerations",     profile.projectCount,
                "completedGenerations", profile.completedProjects,
                "successRate", profile.projectCount > 0
                        ? Math.round((profile.completedProjects * 100.0) / profile.projectCount)
                        : 0
        ));
    }

    /** Triggers a Keycloak email-verification email for the current user. */
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> sendVerificationEmail(JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        String userId = extractUserId(token);
        boolean sent = userProfileService.sendVerificationEmail(userId);
        if (sent) return ResponseEntity.ok(Map.of("success", true, "message", "Verification email sent"));
        return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to send email"));
    }

    /** Uploads a new avatar image. */
    @PostMapping("/avatar")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        String userId = extractUserId(token);
        try {
            byte[] bytes = file.getBytes();
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar";
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/png";
            var result = userProfileService.uploadAvatar(userId, bytes, fileName, mimeType);
            return ResponseEntity.ok(Map.of("avatarUrl", result.avatarUrl != null ? result.avatarUrl : ""));
        } catch (Exception e) {
            log.error("Avatar upload failed for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }

    /** Removes the current user's avatar. */
    @DeleteMapping("/profile/avatar")
    public ResponseEntity<Void> deleteAvatar(JwtAuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).build();
        // Clear avatarUrl in profile
        String userId = extractUserId(token);
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.avatarUrl = "";
        userProfileService.updateProfile(userId, req);
        return ResponseEntity.noContent().build();
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private String extractUserId(JwtAuthenticationToken token) {
        Object sub = token.getToken().getClaims().get("sub");
        return sub != null ? sub.toString() : "unknown";
    }
}
