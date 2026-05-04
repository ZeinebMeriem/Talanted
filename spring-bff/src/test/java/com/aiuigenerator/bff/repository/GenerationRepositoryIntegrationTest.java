package com.aiuigenerator.bff.repository;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.repo.GenerationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataMongoTest
@ActiveProfiles("test")
@DisplayName("GenerationRepository — Tests d'intégration MongoDB réel")
class GenerationRepositoryIntegrationTest {

    @Autowired
    private GenerationRepository generationRepo;

    @AfterEach
    void cleanup() {
        generationRepo.deleteAll();
    }

    // ── SAVE & FIND ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Sauvegarde un projet et le retrouve par ID")
    void save_andFindById_realMongoDB() {
        Generation g = makeGeneration("gen-001", "user-123", GenerationStatus.COMPLETED);

        generationRepo.save(g);

        Optional<Generation> found = generationRepo.findById("gen-001");

        assertTrue(found.isPresent());
        assertEquals("user-123", found.get().getUserId());
        assertEquals("Create a dashboard", found.get().getPrompt());
        assertEquals(GenerationStatus.COMPLETED, found.get().getStatus());
    }

    @Test
    @DisplayName("Retourne vide si l'ID n'existe pas")
    void findById_notFound_returnsEmpty() {
        Optional<Generation> found = generationRepo.findById("id-inexistant");
        assertFalse(found.isPresent());
    }

    // ── FILTER BY USER ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Retourne uniquement les projets de l'utilisateur demandé")
    void findByUserId_returnsOnlyThisUserProjects() {
        generationRepo.saveAll(List.of(
            makeGeneration("gen-001", "user-A", GenerationStatus.COMPLETED),
            makeGeneration("gen-002", "user-A", GenerationStatus.PENDING),
            makeGeneration("gen-003", "user-B", GenerationStatus.COMPLETED)
        ));

        List<Generation> results = generationRepo
            .findByUserIdOrderByCreatedAtDesc("user-A");

        assertEquals(2, results.size());
        assertTrue(results.stream().allMatch(g -> g.getUserId().equals("user-A")));
    }

    @Test
    @DisplayName("Retourne liste vide si l'utilisateur n'a aucun projet")
    void findByUserId_newUser_returnsEmpty() {
        List<Generation> results = generationRepo
            .findByUserIdOrderByCreatedAtDesc("utilisateur-sans-projets");

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Les projets sont triés du plus récent au plus ancien")
    void findByUserId_sortedByCreatedAtDesc() {
        Generation old = makeGeneration("gen-old", "user-A", GenerationStatus.COMPLETED);
        old.setCreatedAt(Instant.now().minusSeconds(3600));

        Generation recent = makeGeneration("gen-new", "user-A", GenerationStatus.COMPLETED);
        recent.setCreatedAt(Instant.now());

        generationRepo.saveAll(List.of(old, recent));

        List<Generation> results = generationRepo
            .findByUserIdOrderByCreatedAtDesc("user-A");

        assertEquals("gen-new", results.get(0).getGenerationId());
        assertEquals("gen-old", results.get(1).getGenerationId());
    }

    // ── COUNT ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Compte correctement les projets d'un utilisateur")
    void countByUserId_returnsCorrectNumber() {
        generationRepo.saveAll(List.of(
            makeGeneration("gen-001", "user-count", GenerationStatus.COMPLETED),
            makeGeneration("gen-002", "user-count", GenerationStatus.FAILED),
            makeGeneration("gen-003", "autre-user", GenerationStatus.COMPLETED)
        ));

        long count = generationRepo.countByUserId("user-count");

        assertEquals(2, count);
    }

    @Test
    @DisplayName("Compte retourne 0 si l'utilisateur n'a pas de projets")
    void countByUserId_noProjects_returnsZero() {
        long count = generationRepo.countByUserId("utilisateur-vide");
        assertEquals(0, count);
    }

    // ── STATUS ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Retrouve les projets échoués triés par date")
    void findByStatus_failed_returnsCorrectProjects() {
        generationRepo.saveAll(List.of(
            makeGeneration("gen-ok",     "user-A", GenerationStatus.COMPLETED),
            makeGeneration("gen-fail-1", "user-A", GenerationStatus.FAILED),
            makeGeneration("gen-fail-2", "user-B", GenerationStatus.FAILED)
        ));

        List<Generation> failed = generationRepo
            .findByStatusOrderByCreatedAtDesc(GenerationStatus.FAILED);

        assertEquals(2, failed.size());
        assertTrue(failed.stream()
            .allMatch(g -> g.getStatus() == GenerationStatus.FAILED));
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Supprime un projet par ID")
    void deleteById_removesFromDB() {
        generationRepo.save(makeGeneration("gen-del", "user-A", GenerationStatus.COMPLETED));

        generationRepo.deleteById("gen-del");

        assertFalse(generationRepo.findById("gen-del").isPresent());
    }

    @Test
    @DisplayName("Après suppression les autres projets restent intacts")
    void deleteById_doesNotAffectOthers() {
        generationRepo.saveAll(List.of(
            makeGeneration("gen-del",  "user-A", GenerationStatus.COMPLETED),
            makeGeneration("gen-keep", "user-A", GenerationStatus.COMPLETED)
        ));

        generationRepo.deleteById("gen-del");

        assertTrue(generationRepo.findById("gen-keep").isPresent());
        assertEquals(1, generationRepo.countByUserId("user-A"));
    }

    // ── HELPER ────────────────────────────────────────────────────────────────

    private Generation makeGeneration(String id, String userId, GenerationStatus status) {
        Generation g = new Generation();
        g.setGenerationId(id);
        g.setUserId(userId);
        g.setPrompt("Create a dashboard");
        g.setStatus(status);
        g.setCreatedAt(Instant.now());
        g.setUpdatedAt(Instant.now());
        return g;
    }
}
