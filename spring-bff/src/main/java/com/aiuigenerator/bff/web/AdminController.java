package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.AuditEvent;
import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.AuditEventRepository;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.service.GenerationService;
import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('admin')")
public class AdminController {

    private final KeycloakAdminService keycloakAdmin;
    private final GenerationRepository generationRepo;
    private final GenerationService generationService;
    private final AuditEventRepository auditRepo;
    private final HttpClient http = HttpClient.newHttpClient();

    @Value("${app.fastapi.base-url:http://fastapi-ai:8000}")
    private String fastapiUrl;

    @Value("${app.keycloak.internal-url:http://keycloak:8080}")
    private String keycloakUrl;

    @Value("${app.minio.endpoint:http://minio:9000}")
    private String minioUrl;

    public AdminController(KeycloakAdminService keycloakAdmin, GenerationRepository generationRepo, GenerationService generationService, AuditEventRepository auditRepo) {
        this.keycloakAdmin = keycloakAdmin;
        this.generationRepo = generationRepo;
        this.generationService = generationService;
        this.auditRepo = auditRepo;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> users() {
        try {
            List<Map<String, Object>> keycloakUsers = keycloakAdmin.listUsers();
            Map<String, Long> lastLoginMap = keycloakAdmin.getLastLoginByUser();
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
                user.put("roles", userId != null ? keycloakAdmin.getUserRoles(userId) : List.of());
                user.put("lastLoginAt", userId != null ? lastLoginMap.get(userId) : null);
                if (userId != null) {
                    generationRepo.findTopByUserIdOrderByCreatedAtDesc(userId)
                        .ifPresentOrElse(
                            g -> user.put("lastProjectAt", g.getCreatedAt() != null ? g.getCreatedAt().toEpochMilli() : null),
                            () -> user.put("lastProjectAt", null));
                } else {
                    user.put("lastProjectAt", null);
                }
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

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<Void> setUserRole(
            @PathVariable("userId") String userId,
            @RequestParam("role") String role,
            @RequestParam("assign") boolean assign) {
        try {
            if (!"admin".equals(role)) return ResponseEntity.badRequest().build();
            if (assign) keycloakAdmin.assignAdminRole(userId);
            else keycloakAdmin.removeAdminRole(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }

    @PostMapping("/generations/{generationId}/retry")
    public ResponseEntity<Void> retryGeneration(@PathVariable String generationId) {
        try {
            java.util.Optional<Generation> opt = generationRepo.findById(generationId);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            Generation g = opt.get();
            g.setStatus(GenerationStatus.PROCESSING);
            generationRepo.save(g);
            try {
                generationService.repairGeneration(generationId);
            } catch (Exception inner) {
                g.setStatus(GenerationStatus.FAILED);
                generationRepo.save(g);
            }
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
    public ResponseEntity<List<Map<String, Object>>> dailyChart(@RequestParam(defaultValue = "30") int days) {
        int clampedDays = Math.max(7, Math.min(90, days));
        Instant since = Instant.now().minus(clampedDays, ChronoUnit.DAYS);
        List<Generation> recent = generationRepo.findByCreatedAtAfterOrderByCreatedAtAsc(since);

        Map<String, Long> byDay = new LinkedHashMap<>();
        for (int i = clampedDays - 1; i >= 0; i--) {
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
        long start = System.currentTimeMillis();
        try {
            generationRepo.count();
            long ms = System.currentTimeMillis() - start;
            Map<String, Object> mongo = new HashMap<>();
            mongo.put("status", "UP");
            mongo.put("responseMs", ms);
            result.put("mongodb", mongo);
        } catch (Exception e) {
            Map<String, Object> mongo = new HashMap<>();
            mongo.put("status", "DOWN");
            mongo.put("responseMs", System.currentTimeMillis() - start);
            result.put("mongodb", mongo);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/audit")
    public ResponseEntity<List<AuditEvent>> auditLog() {
        return ResponseEntity.ok(auditRepo.findTop100ByOrderByTimestampDesc());
    }

    private Map<String, Object> ping(String url) {
        long start = System.currentTimeMillis();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET().build();
            int status = http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            long ms = System.currentTimeMillis() - start;
            Map<String, Object> r = new HashMap<>();
            r.put("status", status < 500 ? "UP" : "DOWN");
            r.put("responseMs", ms);
            return r;
        } catch (Exception e) {
            Map<String, Object> r = new HashMap<>();
            r.put("status", "DOWN");
            r.put("responseMs", System.currentTimeMillis() - start);
            return r;
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        try {
            List<Map<String, Object>> users = keycloakAdmin.listUsers();
            long totalProjects = generationRepo.count();
            long completedProjects = generationRepo.countByStatus(GenerationStatus.COMPLETED);
            long processingProjects = generationRepo.countByStatus(GenerationStatus.PROCESSING);
            long failedProjects = generationRepo.countByStatus(GenerationStatus.FAILED);

            // Compute extended metrics from all generations
            List<Generation> allGens = generationRepo.findAll();

            // Avg generation time (createdAt → updatedAt) for COMPLETED only, capped at 1h to filter anomalies
            OptionalDouble avgTime = allGens.stream()
                .filter(g -> g.getStatus() == GenerationStatus.COMPLETED
                        && g.getCreatedAt() != null && g.getUpdatedAt() != null)
                .mapToLong(g -> Duration.between(g.getCreatedAt(), g.getUpdatedAt()).getSeconds())
                .filter(s -> s > 0 && s < 3600)
                .average();

            // Avg quality score for projects that have been evaluated
            OptionalDouble avgQuality = allGens.stream()
                .filter(g -> g.getGlobalScore() != null && g.getGlobalScore() > 0)
                .mapToInt(Generation::getGlobalScore)
                .average();

            // Integration counts
            long deployedCount = allGens.stream()
                .filter(g -> g.getDeployUrl() != null && !g.getDeployUrl().isBlank())
                .count();
            long gitlabCount = allGens.stream()
                .filter(g -> g.getGitlabProjectUrl() != null && !g.getGitlabProjectUrl().isBlank())
                .count();

            Map<String, Object> result = new HashMap<>();
            result.put("totalUsers", users.size());
            result.put("totalProjects", totalProjects);
            result.put("completedProjects", completedProjects);
            result.put("processingProjects", processingProjects);
            result.put("failedProjects", failedProjects);
            result.put("successRate", totalProjects > 0 ? Math.round((completedProjects * 100.0) / totalProjects) : 0);
            result.put("avgGenerationSeconds", avgTime.isPresent() ? Math.round(avgTime.getAsDouble()) : null);
            result.put("avgQualityScore", avgQuality.isPresent() ? Math.round(avgQuality.getAsDouble()) : null);
            result.put("deployedCount", deployedCount);
            result.put("gitlabCount", gitlabCount);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }
}
