package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
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
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GenerationController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "app.security.dev-mode=true",
    "app.fastapi.base-url=http://localhost:8000"
})
@DisplayName("GenerationController Pagination Tests")
class GenerationControllerPaginationTest {

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

    private List<Generation> buildGenerationList(String userId, int count) {
        List<Generation> list = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            list.add(buildGeneration("gen-" + String.format("%03d", i), userId));
        }
        return list;
    }

    @Test
    @DisplayName("GET /api/generations — response contains required pagination fields")
    void list_returnsPaginatedResponseStructure() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of(
                buildGeneration("gen-001", "dev-user"),
                buildGeneration("gen-002", "dev-user")
        ));
        mockMvc.perform(get("/api/generations").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").exists())
                .andExpect(jsonPath("$.size").exists())
                .andExpect(jsonPath("$.total").exists())
                .andExpect(jsonPath("$.totalPages").exists())
                .andExpect(jsonPath("$.hasNext").exists())
                .andExpect(jsonPath("$.hasPrev").exists());
    }

    @Test
    @DisplayName("GET /api/generations — default page=0 and size=10")
    void list_defaultPageAndSize() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of());
        mockMvc.perform(get("/api/generations").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    @DisplayName("GET /api/generations — empty list returns hasNext=false and hasPrev=false")
    void list_emptyContent_noNavigation() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of());
        mockMvc.perform(get("/api/generations").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.hasPrev").value(false))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    @DisplayName("GET /api/generations?page=1&size=3 — returns correct slice and navigation")
    void list_explicitPageAndSize_returnsCorrectSlice() throws Exception {
        List<Generation> all = buildGenerationList("dev-user", 7);
        when(service.listAllGenerations()).thenReturn(all);
        mockMvc.perform(get("/api/generations").param("page", "1").param("size", "3")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(3))
                .andExpect(jsonPath("$.total").value(7))
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.hasPrev").value(true))
                .andExpect(jsonPath("$.hasNext").value(true));
    }

    @Test
    @DisplayName("GET /api/generations?size=5 — totalPages computed correctly via ceiling")
    void list_totalPagesIsCorrect() throws Exception {
        when(service.listAllGenerations()).thenReturn(buildGenerationList("dev-user", 12));
        mockMvc.perform(get("/api/generations").param("size", "5")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    @DisplayName("GET /api/generations?size=100 — size clamped to max 50")
    void list_oversizeRequest_clampedTo50() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of());
        mockMvc.perform(get("/api/generations").param("size", "100")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(50));
    }

    @Test
    @DisplayName("GET /api/generations?size=0 — size clamped to min 1")
    void list_zeroSize_clampedToOne() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of());
        mockMvc.perform(get("/api/generations").param("size", "0")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1));
    }

    @Test
    @DisplayName("GET /api/generations?page=99 — out-of-range page returns empty content")
    void list_pageOutOfRange_returnsEmptyContent() throws Exception {
        when(service.listAllGenerations()).thenReturn(buildGenerationList("dev-user", 3));
        mockMvc.perform(get("/api/generations").param("page", "99").param("size", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    @DisplayName("GET /api/generations — dev mode calls listAllGenerations")
    void list_devMode_callsListAll() throws Exception {
        when(service.listAllGenerations()).thenReturn(List.of());
        mockMvc.perform(get("/api/generations").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        verify(service).listAllGenerations();
        verify(service, never()).listGenerations(anyString());
    }
}
