package com.aiuigenerator.bff.web;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aiuigenerator.bff.repo.GenerationRepository;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final GenerationRepository generationRepo;

    public UserController(GenerationRepository generationRepo) {
        this.generationRepo = generationRepo;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(JwtAuthenticationToken token) {
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
        long total = generationRepo.count();
        long completed = generationRepo.countByStatus(com.aiuigenerator.bff.domain.GenerationStatus.COMPLETED);

        Map<String, Object> result = new HashMap<>();
        result.put("totalGenerations", total);
        result.put("completedGenerations", completed);
        result.put("successRate", total > 0 ? Math.round((completed * 100.0) / total) : 0);

        return ResponseEntity.ok(result);
    }
}
