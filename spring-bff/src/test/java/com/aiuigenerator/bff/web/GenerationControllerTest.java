package com.aiuigenerator.bff.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.service.GenerationService;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("GenerationController Tests")
class GenerationControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private GenerationService service;

  @Test
  @DisplayName("Should list all generations for authenticated user")
  void testListGenerations() throws Exception {
    String testUserId = "user-123";

    Generation gen = new Generation();
    gen.setGenerationId("gen-001");
    gen.setUserId(testUserId);
    gen.setPrompt("Create a landing page");
    gen.setStatus(GenerationStatus.COMPLETED);
    gen.setCreatedAt(Instant.now());

    when(service.listGenerations(testUserId)).thenReturn(List.of(gen));

    mockMvc.perform(get("/api/generations")
        .header("Authorization", "Bearer test-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(0))));
  }

  @Test
  @DisplayName("Should get generation by ID")
  void testGetGeneration() throws Exception {
    String genId = "gen-123";

    Generation gen = new Generation();
    gen.setGenerationId(genId);
    gen.setPrompt("Create dashboard");
    gen.setStatus(GenerationStatus.COMPLETED);
    gen.setCreatedAt(Instant.now());

    when(service.getGeneration(genId)).thenReturn(gen);

    mockMvc.perform(get("/api/generations/{id}", genId)
        .header("Authorization", "Bearer test-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.generationId").value(genId))
        .andExpect(jsonPath("$.status").value("COMPLETED"));
  }

  @Test
  @DisplayName("Should create generation with prompt and files")
  void testCreateGeneration() throws Exception {
    String prompt = "Create a landing page";
    String genId = "gen-001";

    GenerationCreateResponse response = new GenerationCreateResponse();
    response.generationId = genId;
    response.status = "PENDING";

    when(service.createGeneration(eq("user-123"), eq(prompt), any(), any()))
        .thenReturn(response);

    mockMvc.perform(post("/api/generations")
        .header("Authorization", "Bearer test-token")
        .param("prompt", prompt)
        .param("domain", "landing")
        .contentType(MediaType.MULTIPART_FORM_DATA))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.generationId").value(genId));
  }

  @Test
  @DisplayName("Should reject generation without authentication")
  void testCreateGenerationNoAuth() throws Exception {
    mockMvc.perform(post("/api/generations")
        .param("prompt", "test")
        .contentType(MediaType.MULTIPART_FORM_DATA))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Should request generation versions")
  void testGetVersions() throws Exception {
    String genId = "gen-001";

    mockMvc.perform(get("/api/generations/{id}/versions", genId)
        .header("Authorization", "Bearer test-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Should retrieve generation audit log")
  void testGetAuditEvents() throws Exception {
    String genId = "gen-001";

    mockMvc.perform(get("/api/generations/{id}/audit", genId)
        .header("Authorization", "Bearer test-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("Should duplicate a generation")
  void testDuplicateGeneration() throws Exception {
    String originalId = "gen-001";
    String newId = "gen-002";

    com.aiuigenerator.bff.dto.DuplicateResponse response = new com.aiuigenerator.bff.dto.DuplicateResponse();
    response.newGenerationId = newId;
    response.buildSuccess = true;

    when(service.duplicateGeneration(originalId, "user-123"))
        .thenReturn(response);

    mockMvc.perform(post("/api/generations/{id}/duplicate", originalId)
        .header("Authorization", "Bearer test-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.newGenerationId").value(newId));
  }

  @Test
  @DisplayName("Should rollback to previous version")
  void testRollbackVersion() throws Exception {
    String genId = "gen-001";

    mockMvc.perform(post("/api/generations/{id}/rollback", genId)
        .header("Authorization", "Bearer test-token")
        .param("version", "1")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }
}
