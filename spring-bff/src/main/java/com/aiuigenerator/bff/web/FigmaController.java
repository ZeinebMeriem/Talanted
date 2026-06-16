package com.aiuigenerator.bff.web;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/figma")
public class FigmaController {

    private static final Logger log = LoggerFactory.getLogger(FigmaController.class);
    private static final Pattern FILE_KEY_PATTERN =
        Pattern.compile("figma\\.com/(?:file|design|proto)/([A-Za-z0-9_-]+)");

    private final WebClient webClient;

    public FigmaController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
            .baseUrl("https://api.figma.com/v1")
            .build();
    }

    public record FigmaImportRequest(String figmaUrl, String figmaToken) {}

    public record FigmaImportResponse(boolean valid, String fileKey, String fileName, String message) {}

    /**
     * Validate a Figma URL and return the file name.
     * Called by the frontend before starting generation so we can show the file name to the user.
     */
    @PostMapping("/validate")
    public Mono<ResponseEntity<FigmaImportResponse>> validate(
            @RequestBody FigmaImportRequest body,
            JwtAuthenticationToken auth) {

        if (body.figmaUrl() == null || body.figmaUrl().isBlank()) {
            return Mono.just(ResponseEntity.badRequest()
                .body(new FigmaImportResponse(false, null, null, "figmaUrl is required")));
        }

        String token = body.figmaToken();
        if (token == null || token.isBlank()) {
            token = System.getenv("FIGMA_API_TOKEN");
        }
        if (token == null || token.isBlank()) {
            return Mono.just(ResponseEntity.badRequest()
                .body(new FigmaImportResponse(false, null, null, "figmaToken is required")));
        }

        Matcher m = FILE_KEY_PATTERN.matcher(body.figmaUrl());
        if (!m.find()) {
            return Mono.just(ResponseEntity.badRequest()
                .body(new FigmaImportResponse(false, null, null, "Invalid Figma URL format")));
        }

        String fileKey = m.group(1);
        String finalToken = token;

        return webClient.get()
            .uri("/files/{key}?depth=1", fileKey)
            .header("X-Figma-Token", finalToken)
            .retrieve()
            .bodyToMono(Map.class)
            .map(data -> {
                String name = (String) data.getOrDefault("name", "Figma File");
                log.info("Figma validate: key={} name=\"{}\" user={}", fileKey, name, auth.getName());
                return ResponseEntity.ok(new FigmaImportResponse(true, fileKey, name, "OK"));
            })
            .onErrorResume(ex -> {
                log.warn("Figma validate error for key={}: {}", fileKey, ex.getMessage());
                return Mono.just(ResponseEntity.badRequest()
                    .body(new FigmaImportResponse(false, fileKey, null,
                        "Figma API error: " + ex.getMessage())));
            });
    }
}
