package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final KeycloakAdminService keycloakAdmin;
    private final GenerationRepository generationRepo;
    private final HttpClient http = HttpClient.newHttpClient();

    @Value("${app.fastapi.base-url:http://fastapi-ai:8000}")
    private String fastapiUrl;

    @Value("${app.keycloak.internal-url:http://keycloak:8080}")
    private String keycloakUrl;

    @Value("${app.minio.endpoint:http://minio:9000}")
    private String minioUrl;

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

    @GetMapping("/users/{userId}/projects")
    public ResponseEntity<List<Generation>> userProjects(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(generationRepo.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable("userId") String userId) {
        try {
            keycloakAdmin.deleteUser(userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }

    @PutMapping("/users/{userId}/enabled")
    public ResponseEntity<Void> setUserEnabled(
            @PathVariable("userId") String userId,
            @RequestParam("enabled") boolean enabled) {
        try {
            keycloakAdmin.toggleUserEnabled(userId, enabled);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }

    @GetMapping("/activity")
    public ResponseEntity<List<Generation>> activity() {
        return ResponseEntity.ok(generationRepo.findTop50ByOrderByCreatedAtDesc());
    }

    @GetMapping("/failed")
    public ResponseEntity<List<Generation>> failed() {
        return ResponseEntity.ok(generationRepo.findByStatusOrderByCreatedAtDesc(GenerationStatus.FAILED));
    }

    @GetMapping("/chart/daily")
    public ResponseEntity<List<Map<String, Object>>> dailyChart() {
        Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        List<Generation> recent = generationRepo.findByCreatedAtAfterOrderByCreatedAtAsc(sevenDaysAgo);

        Map<String, Long> byDay = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            byDay.put(LocalDate.now(ZoneOffset.UTC).minusDays(i).toString(), 0L);
        }
        for (Generation g : recent) {
            String day = g.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().toString();
            byDay.merge(day, 1L, Long::sum);
        }

        List<Map<String, Object>> result = byDay.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("date", e.getKey());
            m.put("count", e.getValue());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> serviceHealth() {
        Map<String, Object> result = new HashMap<>();
        result.put("fastapi", ping(fastapiUrl + "/health"));
        result.put("keycloak", ping(keycloakUrl + "/health/ready"));
        result.put("minio", ping(minioUrl + "/minio/health/live"));
        try {
            generationRepo.count();
            result.put("mongodb", "UP");
        } catch (Exception e) {
            result.put("mongodb", "DOWN");
        }
        return ResponseEntity.ok(result);
    }

    private String ping(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET().build();
            int status = http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            return status < 500 ? "UP" : "DOWN";
        } catch (Exception e) {
            return "DOWN";
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
