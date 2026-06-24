package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.service.EmailVerificationService;
import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final KeycloakAdminService keycloakAdmin;
    private final EmailVerificationService emailVerification;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public UserController(KeycloakAdminService keycloakAdmin, EmailVerificationService emailVerification) {
        this.keycloakAdmin = keycloakAdmin;
        this.emailVerification = emailVerification;
    }

    /** Public endpoint — no JWT required. Creates a Keycloak user account. */
    @PostMapping("/public/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody Map<String, String> body) {
        String firstName = body.getOrDefault("firstName", "").trim();
        String lastName  = body.getOrDefault("lastName",  "").trim();
        String email     = body.getOrDefault("email",     "").trim();
        String username  = body.getOrDefault("username",  "").trim();
        String password  = body.getOrDefault("password",  "");

        if (email.isBlank() || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields."));
        }
        try {
            keycloakAdmin.createUser(firstName, lastName, email, username, password);
            emailVerification.sendVerificationEmail(email);
            return ResponseEntity.ok(Map.of("status", "created"));
        } catch (RuntimeException e) {
            if ("EMAIL_EXISTS".equals(e.getMessage())) {
                return ResponseEntity.status(409).body(Map.of("error", "An account with this email or username already exists."));
            }
            return ResponseEntity.status(500).body(Map.of("error", "Registration failed. Please try again."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Registration failed. Please try again."));
        }
    }

    /**
     * Public endpoint — verifies email via custom BFF token and redirects to the React app
     * with the sign-in form pre-filled.
     */
    @GetMapping("/public/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam("token") String token) throws Exception {
        String email = emailVerification.verifyToken(token);
        String redirect;
        if (email != null) {
            redirect = frontendUrl + "?auth=login&login_hint=" + URLEncoder.encode(email, StandardCharsets.UTF_8);
        } else {
            redirect = frontendUrl + "?auth=login&error=token_expired";
        }
        return ResponseEntity.status(302).location(URI.create(redirect)).build();
    }

    /** Public endpoint — resend verification email for an unverified account. */
    @PostMapping("/public/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        try {
            emailVerification.sendVerificationEmail(email);
        } catch (Exception ignored) {
            // always 200 to avoid account enumeration
        }
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(@RequestParam("q") String q) {
        if (q == null || q.isBlank() || q.length() < 2) return ResponseEntity.ok(List.of());
        try {
            List<Map<String, Object>> users = keycloakAdmin.searchUsers(q);
            List<Map<String, Object>> result = users.stream()
                    .map(u -> Map.<String, Object>of(
                            "userId", String.valueOf(u.getOrDefault("id", "")),
                            "username", String.valueOf(u.getOrDefault("username", ""))))
                    .filter(u -> !((String) u.get("userId")).isBlank())
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }
}
