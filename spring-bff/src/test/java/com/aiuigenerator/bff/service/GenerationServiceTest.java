package com.aiuigenerator.bff.service;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.AiReportRepository;
import com.aiuigenerator.bff.repo.ChatMessageRepository;
import com.aiuigenerator.bff.repo.CodeVersionRepository;
import com.aiuigenerator.bff.repo.GenerationFileRepository;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.repo.UiSpecVersionRepository;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.Sort;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GenerationService Tests")
class GenerationServiceTest {

    @Mock private UploadValidator validator;
    @Mock private FileStorageService fileStorage;
    @Mock private FastApiClient fastApi;
    @Mock private AuditService audit;
    @Mock private JiraService jiraService;
    @Mock private GenerationRepository generationRepo;
    @Mock private GenerationFileRepository fileRepo;
    @Mock private UiSpecVersionRepository uiSpecRepo;
    @Mock private CodeVersionRepository codeRepo;
    @Mock private AiReportRepository reportRepo;
    @Mock private ChatMessageRepository chatRepo;

    @InjectMocks
    private GenerationService generationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(generationService, "fastApiBaseUrl", "http://localhost:8000");
        ReflectionTestUtils.setField(generationService, "devMode", true);
    }

    // ── LIST ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("listGenerations — returns only projects belonging to userId")
    void listGenerations_filtersbyUserId() {
        String userId = "user-123";
        Generation g = new Generation();
        g.setGenerationId("gen-001");
        g.setUserId(userId);
        g.setStatus(GenerationStatus.COMPLETED);

        when(generationRepo.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(g));

        List<Generation> result = generationService.listGenerations(userId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("gen-001", result.get(0).getGenerationId());
        assertEquals(userId, result.get(0).getUserId());
        verify(generationRepo).findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Test
    @DisplayName("listGenerations — returns empty list when user has no projects")
    void listGenerations_noProjects_returnsEmpty() {
        when(generationRepo.findByUserIdOrderByCreatedAtDesc("user-empty")).thenReturn(List.of());

        List<Generation> result = generationService.listGenerations("user-empty");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ── GET BY ID ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getGeneration — returns generation when found")
    void getGeneration_found() {
        Generation g = new Generation();
        g.setGenerationId("gen-001");
        g.setPrompt("Build a dashboard");
        g.setStatus(GenerationStatus.COMPLETED);
        g.setCreatedAt(Instant.now());

        when(generationRepo.findById("gen-001")).thenReturn(Optional.of(g));

        Generation result = generationService.getGeneration("gen-001");

        assertNotNull(result);
        assertEquals("gen-001", result.getGenerationId());
        assertEquals("Build a dashboard", result.getPrompt());
        assertEquals(GenerationStatus.COMPLETED, result.getStatus());
    }

    @Test
    @DisplayName("getGeneration — throws when not found")
    void getGeneration_notFound_throws() {
        when(generationRepo.findById("missing")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> generationService.getGeneration("missing"));
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteGeneration — removes from repository")
    void deleteGeneration_callsRepository() {
        Generation g = new Generation();
        g.setGenerationId("gen-del");
        g.setStatus(GenerationStatus.COMPLETED);
        when(generationRepo.findById("gen-del")).thenReturn(Optional.of(g));
        doNothing().when(generationRepo).deleteById("gen-del");

        generationService.deleteGeneration("gen-del");

        verify(generationRepo).deleteById("gen-del");
    }

    // ── RENAME ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("renameGeneration — updates name and saves")
    void renameGeneration_updatesAndSaves() {
        Generation g = new Generation();
        g.setGenerationId("gen-001");
        g.setName("Old Name");
        when(generationRepo.findById("gen-001")).thenReturn(Optional.of(g));
        when(generationRepo.save(any())).thenReturn(g);

        generationService.renameGeneration("gen-001", "New Name");

        assertEquals("New Name", g.getName());
        verify(generationRepo).save(g);
    }

    @Test
    @DisplayName("renameGeneration — throws when generation not found")
    void renameGeneration_notFound_throws() {
        when(generationRepo.findById("missing")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> generationService.renameGeneration("missing", "Name"));
    }

    // ── STATUS ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getGeneration — status is one of the known GenerationStatus values")
    void getGeneration_statusIsValid() {
        Generation g = new Generation();
        g.setGenerationId("gen-s");
        g.setStatus(GenerationStatus.PROCESSING);
        when(generationRepo.findById("gen-s")).thenReturn(Optional.of(g));

        Generation result = generationService.getGeneration("gen-s");

        assertNotNull(result.getStatus());
        assertTrue(
            result.getStatus() == GenerationStatus.PENDING ||
            result.getStatus() == GenerationStatus.PROCESSING ||
            result.getStatus() == GenerationStatus.COMPLETED ||
            result.getStatus() == GenerationStatus.FAILED
        );
    }

    // ── CHAT HISTORY ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getChatHistory — returns empty list when no messages")
    void getChatHistory_noMessages_returnsEmpty() {
        when(chatRepo.findByGenerationId(eq("gen-001"), any(Sort.class))).thenReturn(List.of());

        var result = generationService.getChatHistory("gen-001");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }
}
