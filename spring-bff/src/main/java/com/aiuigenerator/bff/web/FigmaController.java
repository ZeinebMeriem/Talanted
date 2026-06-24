package com.aiuigenerator.bff.web;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

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
            @AuthenticationPrincipal Jwt jwt) {

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
                .body(new FigmaImportResponse(false, null, null,
                    "Invalid Figma URL — expected figma.com/design/<key> or figma.com/file/<key>")));
        }

        String fileKey   = m.group(1);
        String finalToken = token;
        String userId    = jwt != null ? jwt.getSubject() : "anonymous";

        return webClient.get()
            .uri("/files/{key}?depth=1", fileKey)
            .header("X-Figma-Token", finalToken)
            .retrieve()
            .bodyToMono(Map.class)
            .map(data -> {
                String name = (String) data.getOrDefault("name", "Figma File");
                log.info("Figma validate OK: key={} name=\"{}\" user={}", fileKey, name, userId);
                return ResponseEntity.ok(new FigmaImportResponse(true, fileKey, name, "OK"));
            })
            .onErrorResume(WebClientResponseException.class, ex -> {
                String msg = switch (ex.getStatusCode().value()) {
                    case 401, 403 -> "Invalid or expired Figma token. Check your personal access token.";
                    case 404      -> "Figma file not found. Make sure the file is shared or the URL is correct.";
                    case 429      -> "Figma rate limit hit. Please wait a moment and try again.";
                    default       -> "Figma API error " + ex.getStatusCode().value() + ": " + ex.getMessage();
                };
                log.warn("Figma validate failed: key={} status={} user={}", fileKey, ex.getStatusCode(), userId);
                return Mono.just(ResponseEntity.badRequest()
                    .body(new FigmaImportResponse(false, fileKey, null, msg)));
            })
            .onErrorResume(ex -> {
                log.warn("Figma validate error: key={} error={} user={}", fileKey, ex.getMessage(), userId);
                return Mono.just(ResponseEntity.badRequest()
                    .body(new FigmaImportResponse(false, fileKey, null,
                        "Could not reach Figma API: " + ex.getMessage())));
            });
    }
}
