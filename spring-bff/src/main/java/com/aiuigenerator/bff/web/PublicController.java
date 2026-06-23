package com.aiuigenerator.bff.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.repo.GenerationRepository;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final GenerationRepository generationRepo;

    public PublicController(GenerationRepository generationRepo) {
        this.generationRepo = generationRepo;
    }

    @GetMapping("/share/{token}")
    public ResponseEntity<Map<String, Object>> getSharedProject(@PathVariable("token") String token) {
        return generationRepo.findByShareToken(token)
            .filter(Generation::isShareEnabled)
            .map(g -> ResponseEntity.ok(Map.<String, Object>of(
                "generationId", g.getGenerationId() != null ? g.getGenerationId() : "",
                "name", g.getName() != null ? g.getName() : "",
                "prompt", g.getPrompt() != null ? g.getPrompt() : "",
                "status", g.getStatus() != null ? g.getStatus().toString() : "UNKNOWN",
                "createdAt", g.getCreatedAt() != null ? g.getCreatedAt().toString() : "",
                "shareToken", token
            )))
            .orElse(ResponseEntity.notFound().build());
    }
}
