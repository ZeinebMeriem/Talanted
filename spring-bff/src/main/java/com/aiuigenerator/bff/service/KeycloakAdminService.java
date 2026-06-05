package com.aiuigenerator.bff.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class KeycloakAdminService {

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.keycloak.internal-url:http://keycloak:8080}")
    private String keycloakUrl;

    @Value("${app.keycloak.realm:ai-ui}")
    private String realm;

    @Value("${KEYCLOAK_ADMIN:admin}")
    private String adminUsername;

    @Value("${KEYCLOAK_ADMIN_PASSWORD:admin}")
    private String adminPassword;

    private String getAdminToken() throws Exception {
        String body = "grant_type=password"
                + "&client_id=admin-cli"
                + "&username=" + URLEncoder.encode(adminUsername, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(adminPassword, StandardCharsets.UTF_8);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/realms/master/protocol/openid-connect/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> tokenResponse = mapper.readValue(res.body(), new TypeReference<>() {});
        return (String) tokenResponse.get("access_token");
    }

    public void deleteUser(String userId) throws Exception {
        String token = getAdminToken();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users/" + userId))
                .header("Authorization", "Bearer " + token)
                .DELETE()
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) {
            throw new RuntimeException("Keycloak error: " + res.statusCode());
        }
    }

    public void toggleUserEnabled(String userId, boolean enabled) throws Exception {
        String token = getAdminToken();
        String bodyJson = "{\"enabled\":" + enabled + "}";
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users/" + userId))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) {
            throw new RuntimeException("Keycloak error: " + res.statusCode());
        }
    }

    public List<Map<String, Object>> listUsers() throws Exception {
        String token = getAdminToken();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users?max=200"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(res.body(), new TypeReference<>() {});
    }

    public List<String> getUserRoles(String userId) throws Exception {
        String token = getAdminToken();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        List<Map<String, Object>> roles = mapper.readValue(res.body(), new TypeReference<>() {});
        return roles.stream()
                .map(r -> (String) r.get("name"))
                .filter(name -> name != null)
                .collect(java.util.stream.Collectors.toList());
    }

    public void assignAdminRole(String userId) throws Exception {
        String token = getAdminToken();
        String roleBody = getAdminRoleBody(token);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("[" + roleBody + "]"))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) throw new RuntimeException("Keycloak error: " + res.statusCode());
    }

    public void removeAdminRole(String userId) throws Exception {
        String token = getAdminToken();
        String roleBody = getAdminRoleBody(token);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .method("DELETE", HttpRequest.BodyPublishers.ofString("[" + roleBody + "]"))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) throw new RuntimeException("Keycloak error: " + res.statusCode());
    }

    /** Returns a map of userId → last login timestamp (ms) from the most recent 500 LOGIN events. */
    public Map<String, Long> getLastLoginByUser() throws Exception {
        String token = getAdminToken();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/events?type=LOGIN&max=500"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) return Map.of();
        List<Map<String, Object>> events = mapper.readValue(res.body(), new TypeReference<>() {});
        // Events are sorted newest-first; keep only the first occurrence per user
        Map<String, Long> result = new java.util.LinkedHashMap<>();
        for (Map<String, Object> event : events) {
            String userId = (String) event.get("userId");
            Object time = event.get("time");
            if (userId != null && time != null && !result.containsKey(userId)) {
                result.put(userId, ((Number) time).longValue());
            }
        }
        return result;
    }

    private String getAdminRoleBody(String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/roles/admin"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }
}
