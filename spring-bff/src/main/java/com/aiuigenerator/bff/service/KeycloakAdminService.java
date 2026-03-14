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
}
