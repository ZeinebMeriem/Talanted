package com.aiuigenerator.bff.web;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.servlet.http.HttpServletRequest;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/preview")
public class PreviewController {

    private final WebClient fastApiWebClient;

    public PreviewController(WebClient fastApiWebClient) {
        this.fastApiWebClient = fastApiWebClient;
    }

    /**
     * Proxy /preview/{id}/** to FastAPI /projects/{id}/**
     * Captures all remaining paths and forwards them to the FastAPI projects endpoint.
     */
    @GetMapping("/{id}/**")
    public Mono<ResponseEntity<byte[]>> servePreview(
            @PathVariable("id") String generationId,
            HttpServletRequest request) {

        // Extract the remaining path after /preview/{id}/
        String requestUri = request.getRequestURI();
        String prefix = "/preview/" + generationId + "/";
        int prefixIndex = requestUri.indexOf(prefix);

        String remainingPath = "";
        if (prefixIndex >= 0) {
            remainingPath = requestUri.substring(prefixIndex + prefix.length());
        }

        // Proxy to FastAPI /projects/{id}/{remaining-path}
        String proxyPath = "/projects/" + generationId + "/" + remainingPath;

        return fastApiWebClient
                .get()
                .uri(proxyPath)
                .retrieve()
                .toEntity(byte[].class)
                .map(response -> {
                    // Copy headers from FastAPI response (excluding content-length to let Spring set it)
                    HttpHeaders headers = new HttpHeaders();
                    response.getHeaders().forEach((key, values) -> {
                        if (!key.equalsIgnoreCase(HttpHeaders.CONTENT_LENGTH)) {
                            headers.putIfAbsent(key, values);
                        }
                    });
                    return ResponseEntity.ok()
                            .headers(headers)
                            .body(response.getBody());
                })
                .onErrorResume(e -> {
                    // Log error and return not found
                    System.err.println("Error serving preview for " + generationId + ": " + e.getMessage());
                    return Mono.just(ResponseEntity.notFound().build());
                });
    }
}
