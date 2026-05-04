package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.service.KeycloakAdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "app.fastapi.base-url=http://localhost:8000",
    "app.keycloak.internal-url=http://localhost:8083",
    "app.minio.endpoint=http://localhost:9000"
})
@DisplayName("AdminController Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private KeycloakAdminService keycloakAdmin;

    @MockBean
    private GenerationRepository generationRepo;

    // ── USERS ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/users — retourne la liste des utilisateurs")
    void getUsers_returnsList() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("id", "user-001");
        user.put("username", "john");
        user.put("email", "john@example.com");
        user.put("enabled", true);

        when(keycloakAdmin.listUsers()).thenReturn(List.of(user));
        when(generationRepo.countByUserId("user-001")).thenReturn(3L);

        mockMvc.perform(get("/api/admin/users").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].userId").value("user-001"))
                .andExpect(jsonPath("$[0].username").value("john"));
    }

    @Test
    @DisplayName("GET /api/admin/users — retourne liste vide si aucun utilisateur")
    void getUsers_empty() throws Exception {
        when(keycloakAdmin.listUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/admin/users — retourne 503 si Keycloak indisponible")
    void getUsers_keycloakDown_returns503() throws Exception {
        when(keycloakAdmin.listUsers()).thenThrow(new RuntimeException("Keycloak unavailable"));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isServiceUnavailable());
    }

    // ── USER PROJECTS ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/users/{id}/projects — retourne les projets de l'utilisateur")
    void getUserProjects_returnsList() throws Exception {
        Generation g = new Generation();
        g.setGenerationId("gen-001");
        g.setUserId("user-001");
        g.setStatus(GenerationStatus.COMPLETED);
        g.setCreatedAt(Instant.now());

        when(generationRepo.findByUserIdOrderByCreatedAtDesc("user-001")).thenReturn(List.of(g));

        mockMvc.perform(get("/api/admin/users/{userId}/projects", "user-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].generationId").value("gen-001"));
    }

    // ── DELETE USER ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("DELETE /api/admin/users/{id} — supprime et retourne 204")
    void deleteUser_success() throws Exception {
        doNothing().when(keycloakAdmin).deleteUser("user-001");

        mockMvc.perform(delete("/api/admin/users/{userId}", "user-001"))
                .andExpect(status().isNoContent());

        verify(keycloakAdmin).deleteUser("user-001");
    }

    @Test
    @DisplayName("DELETE /api/admin/users/{id} — retourne 503 si Keycloak indisponible")
    void deleteUser_keycloakDown_returns503() throws Exception {
        doThrow(new RuntimeException("Keycloak down")).when(keycloakAdmin).deleteUser("user-001");

        mockMvc.perform(delete("/api/admin/users/{userId}", "user-001"))
                .andExpect(status().isServiceUnavailable());
    }

    // ── TOGGLE USER ENABLED ───────────────────────────────────────────────────

    @Test
    @DisplayName("PUT /api/admin/users/{id}/enabled — désactive un utilisateur")
    void toggleUserEnabled_disable() throws Exception {
        doNothing().when(keycloakAdmin).toggleUserEnabled("user-001", false);

        mockMvc.perform(put("/api/admin/users/{userId}/enabled", "user-001")
                .param("enabled", "false"))
                .andExpect(status().isOk());

        verify(keycloakAdmin).toggleUserEnabled("user-001", false);
    }

    @Test
    @DisplayName("PUT /api/admin/users/{id}/enabled — active un utilisateur")
    void toggleUserEnabled_enable() throws Exception {
        doNothing().when(keycloakAdmin).toggleUserEnabled("user-001", true);

        mockMvc.perform(put("/api/admin/users/{userId}/enabled", "user-001")
                .param("enabled", "true"))
                .andExpect(status().isOk());

        verify(keycloakAdmin).toggleUserEnabled("user-001", true);
    }

    // ── ACTIVITY ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/activity — retourne les 50 dernières activités")
    void getActivity_returnsList() throws Exception {
        when(generationRepo.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/activity"))
                .andExpect(status().isOk());
    }

    // ── FAILED PROJECTS ───────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/failed — retourne les projets échoués")
    void getFailed_returnsList() throws Exception {
        when(generationRepo.findByStatusOrderByCreatedAtDesc(GenerationStatus.FAILED))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/admin/failed"))
                .andExpect(status().isOk());
    }

    // ── DAILY CHART ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/chart/daily — retourne les stats journalières")
    void getDailyChart_returnsData() throws Exception {
        when(generationRepo.findByCreatedAtAfterOrderByCreatedAtAsc(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/chart/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)));
    }
}
