package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.service.GenerationService;
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

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "app.security.dev-mode=true",
    "app.fastapi.base-url=http://localhost:8000",
    "app.keycloak.admin-url=http://localhost:8083/admin"
})
@DisplayName("AdminController Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GenerationService generationService;

    @MockBean
    private KeycloakAdminService keycloakAdminService;

    // ── USERS ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/users — returns list of users")
    void getUsers_returnsList() throws Exception {
        Map<String, Object> user = Map.of(
                "userId", "user-001",
                "username", "john",
                "email", "john@example.com",
                "enabled", true
        );
        when(keycloakAdminService.listUsers()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/admin/users").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].userId").value("user-001"));
    }

    @Test
    @DisplayName("GET /api/admin/users — returns empty list when no users")
    void getUsers_empty() throws Exception {
        when(keycloakAdminService.listUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ── STATS ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/stats — returns platform statistics")
    void getStats_returnsStats() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isOk());
    }

    // ── ACTIVITY ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/activity — returns recent activity")
    void getActivity_returnsList() throws Exception {
        mockMvc.perform(get("/api/admin/activity"))
                .andExpect(status().isOk());
    }

    // ── FAILED PROJECTS ───────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/failed — returns failed projects")
    void getFailed_returnsList() throws Exception {
        mockMvc.perform(get("/api/admin/failed"))
                .andExpect(status().isOk());
    }

    // ── HEALTH ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/admin/health — returns service health map")
    void getHealth_returnsMap() throws Exception {
        mockMvc.perform(get("/api/admin/health"))
                .andExpect(status().isOk());
    }

    // ── USER MANAGEMENT ──────────────────────────────────────────────────────

    @Test
    @DisplayName("DELETE /api/admin/users/{id} — deletes user and returns 204")
    void deleteUser_success() throws Exception {
        doNothing().when(keycloakAdminService).deleteUser("user-001");

        mockMvc.perform(delete("/api/admin/users/{id}", "user-001"))
                .andExpect(status().isNoContent());

        verify(keycloakAdminService).deleteUser("user-001");
    }

    @Test
    @DisplayName("PUT /api/admin/users/{id}/enabled — toggles user enabled state")
    void toggleUserEnabled_success() throws Exception {
        doNothing().when(keycloakAdminService).setUserEnabled("user-001", false);

        mockMvc.perform(put("/api/admin/users/{id}/enabled", "user-001")
                .param("enabled", "false"))
                .andExpect(status().isNoContent());

        verify(keycloakAdminService).setUserEnabled("user-001", false);
    }
}
