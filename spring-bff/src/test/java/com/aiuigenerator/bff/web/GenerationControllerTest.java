package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.dto.DuplicateResponse;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.dto.GenerationRollbackResponse;
import com.aiuigenerator.bff.dto.GenerationVersionsResponse;
import com.aiuigenerator.bff.service.AuditService;
import com.aiuigenerator.bff.service.GenerationService;
import com.aiuigenerator.bff.service.SimpleGitLabService;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GenerationController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "app.security.dev-mode=true",
    "app.fastapi.base-url=http://localhost:8000"
})
@DisplayName("GenerationController Tests")
class GenerationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GenerationService service;

    @MockBean
    private AuditService audit;

    @MockBean
    private SimpleGitLabService gitLabService;

    private Generation buildGeneration(String id, String userId) {
        Generation g = new Generation();
        g.setGenerationId(id);
        g.setUserId(userId);
        g.setPrompt("Create a landing page");
        g.setStatus(GenerationStatus.COMPLETED);
        g.setCreatedAt(Instant.now());
        g.setUpdatedAt(Instant.now());
        return g;
    }

    // ── LIST ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/generations — dev mode returns all projects")
    void listGenerations_devMode_returnsAll() throws Exception {
        Generation g = buildGeneration("gen-001", "dev-user");
        when(service.listAllGenerations()).thenReturn(List.of(g));

        mockMvc.perform(get("/api/generations").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].generationId").value("gen-001"));
    }

    // ── GET BY ID ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/generations/{id} — returns existing generation")
    void getGeneration_found() throws Exception {
        Generation g = buildGeneration("gen-123", "dev-user");
        when(service.getGeneration("gen-123")).thenReturn(g);

        mockMvc.perform(get("/api/generations/{id}", "gen-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generationId").value("gen-123"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("GET /api/generations/{id} — 4xx when not found")
    void getGeneration_notFound_throws() throws Exception {
        when(service.getGeneration("missing")).thenThrow(new IllegalArgumentException("not found"));

        mockMvc.perform(get("/api/generations/{id}", "missing"))
                .andExpect(status().is4xxClientError());
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/generations — creates project and returns 201")
    void createGeneration_success() throws Exception {
        GenerationCreateResponse resp = new GenerationCreateResponse();
        resp.generationId = "gen-new";
        resp.status = GenerationStatus.PENDING;
        when(service.createGeneration(anyString(), anyString(), any(), any())).thenReturn(resp);

        mockMvc.perform(multipart("/api/generations")
                .param("prompt", "Build a dashboard")
                .param("domain", "dashboard"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.generationId").value("gen-new"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("POST /api/generations — empty prompt still delegates to service")
    void createGeneration_emptyPrompt_delegatesToService() throws Exception {
        GenerationCreateResponse resp = new GenerationCreateResponse();
        resp.generationId = "gen-empty";
        resp.status = GenerationStatus.PENDING;
        when(service.createGeneration(anyString(), eq(""), any(), any())).thenReturn(resp);

        mockMvc.perform(multipart("/api/generations").param("prompt", ""))
                .andExpect(status().isCreated());
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("DELETE /api/generations/{id} — returns 204")
    void deleteGeneration_success() throws Exception {
        doNothing().when(service).deleteGeneration("gen-001");

        mockMvc.perform(delete("/api/generations/{id}", "gen-001"))
                .andExpect(status().isNoContent());

        verify(service, times(1)).deleteGeneration("gen-001");
    }

    // ── RENAME ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("PATCH /api/generations/{id}/name — renames and returns 204")
    void renameGeneration_success() throws Exception {
        doNothing().when(service).renameGeneration(eq("gen-001"), eq("New Name"));

        mockMvc.perform(patch("/api/generations/{id}/name", "gen-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New Name\"}"))
                .andExpect(status().isNoContent());

        verify(service).renameGeneration("gen-001", "New Name");
    }

    // ── ROLLBACK ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/generations/{id}/rollback — returns rollback response")
    void rollback_success() throws Exception {
        GenerationRollbackResponse resp = new GenerationRollbackResponse();
        resp.generationId = "gen-001";
        resp.previousActiveVersion = 2;
        resp.activeVersion = 1;
        when(service.rollback("gen-001", 1)).thenReturn(resp);

        mockMvc.perform(post("/api/generations/{id}/rollback", "gen-001")
                .param("version", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeVersion").value(1))
                .andExpect(jsonPath("$.previousActiveVersion").value(2));
    }

    // ── DUPLICATE ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/generations/{id}/duplicate — returns new generation ID")
    void duplicate_success() throws Exception {
        DuplicateResponse resp = new DuplicateResponse();
        resp.newGenerationId = "gen-copy";
        resp.buildSuccess = true;
        when(service.duplicateGeneration(eq("gen-001"), anyString())).thenReturn(resp);

        mockMvc.perform(post("/api/generations/{id}/duplicate", "gen-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newGenerationId").value("gen-copy"))
                .andExpect(jsonPath("$.buildSuccess").value(true));
    }

    // ── VERSIONS ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/generations/{id}/versions — returns versions response")
    void getVersions_success() throws Exception {
        GenerationVersionsResponse resp = new GenerationVersionsResponse();
        resp.generationId = "gen-001";
        resp.activeVersion = 2;
        when(service.getVersions("gen-001")).thenReturn(resp);

        mockMvc.perform(get("/api/generations/{id}/versions", "gen-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generationId").value("gen-001"))
                .andExpect(jsonPath("$.activeVersion").value(2));
    }

    // ── QUALITY ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/generations/{id}/quality — returns quality scores")
    void getQuality_success() throws Exception {
        Map<String, Object> scores = Map.of(
                "globalScore", 85,
                "semanticFidelity", 90,
                "codeQuality", 80
        );
        when(service.getQualityScores("gen-001", null)).thenReturn(scores);

        mockMvc.perform(get("/api/generations/{id}/quality", "gen-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.globalScore").value(85));
    }

    // ── DEPLOY ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/generations/{id}/deploy — missing token returns 400")
    void deploy_missingToken_returns400() throws Exception {
        mockMvc.perform(post("/api/generations/{id}/deploy", "gen-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"netlify\",\"token\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/generations/{id}/deploy — valid token delegates to service")
    void deploy_validToken_success() throws Exception {
        Map<String, Object> result = Map.of("url", "https://xyz.netlify.app");
        when(service.deployToNetlify("gen-001", "nfp_token123")).thenReturn(result);

        mockMvc.perform(post("/api/generations/{id}/deploy", "gen-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"netlify\",\"token\":\"nfp_token123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://xyz.netlify.app"));
    }

    // ── REPAIR ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/generations/{id}/repair — returns quality scores after repair")
    void repair_success() throws Exception {
        Map<String, Object> result = Map.of(
                "repaired", true,
                "globalScore", 88
        );
        when(service.repairGeneration("gen-001")).thenReturn(result);

        mockMvc.perform(post("/api/generations/{id}/repair", "gen-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repaired").value(true))
                .andExpect(jsonPath("$.globalScore").value(88));
    }
}
