package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final KeycloakAdminService keycloakAdmin;

    public UserController(KeycloakAdminService keycloakAdmin) {
        this.keycloakAdmin = keycloakAdmin;
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
