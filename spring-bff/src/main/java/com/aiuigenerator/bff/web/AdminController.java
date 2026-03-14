package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final KeycloakAdminService keycloakAdmin;
    private final GenerationRepository generationRepo;

    public AdminController(KeycloakAdminService keycloakAdmin, GenerationRepository generationRepo) {
        this.keycloakAdmin = keycloakAdmin;
        this.generationRepo = generationRepo;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> users() {
        try {
            List<Map<String, Object>> keycloakUsers = keycloakAdmin.listUsers();
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> u : keycloakUsers) {
                String userId = (String) u.get("id");
                Map<String, Object> user = new HashMap<>();
                user.put("userId", userId);
                user.put("username", u.get("username"));
                user.put("email", u.get("email"));
                user.put("firstName", u.get("firstName"));
                user.put("lastName", u.get("lastName"));
                user.put("emailVerified", u.getOrDefault("emailVerified", false));
                user.put("enabled", u.getOrDefault("enabled", true));
                user.put("createdTimestamp", u.get("createdTimestamp"));
                user.put("projectCount", userId != null ? generationRepo.countByUserId(userId) : 0);
                result.add(user);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        try {
            List<Map<String, Object>> users = keycloakAdmin.listUsers();
            long totalProjects = generationRepo.count();
            long completedProjects = generationRepo.countByStatus(GenerationStatus.COMPLETED);

            Map<String, Object> result = new HashMap<>();
            result.put("totalUsers", users.size());
            result.put("totalProjects", totalProjects);
            result.put("completedProjects", completedProjects);
            result.put("successRate", totalProjects > 0 ? Math.round((completedProjects * 100.0) / totalProjects) : 0);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }
}
