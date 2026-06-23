package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class TedService {

    private static final Logger log = LoggerFactory.getLogger(TedService.class);
    private final WebClient fastApiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${app.fastapi.base-url:http://localhost:8000}")
    private String fastApiBaseUrl;

    public TedService(WebClient fastApiWebClient, ObjectMapper objectMapper) {
        this.fastApiWebClient = fastApiWebClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Send a message to TED and get a response.
     */
    public TedChatResponse chat(String message, java.util.Map<String, Object> context) {
        try {
            log.info("TED: chat message: {}", message.substring(0, Math.min(50, message.length())));

            java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
            requestBody.put("message", message);
            requestBody.put("context", context != null ? context : new java.util.HashMap<>());

            TedChatResponse response = fastApiWebClient.post()
                    .uri("/api/ted/chat")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(TedChatResponse.class)
                    .doOnError(e -> log.error("TED chat error: {}", e.getMessage()))
                    .onErrorResume(e -> {
                        // Fallback response
                        TedChatResponse fallback = new TedChatResponse();
                        fallback.response = "I'm here to help! Tell me what you're working on. 🚀";
                        fallback.suggestions = new java.util.ArrayList<>();
                        fallback.contextUsed = new java.util.ArrayList<>();
                        return reactor.core.publisher.Mono.just(fallback);
                    })
                    .block();

            log.info("TED: response received, {} suggestions",
                    response != null && response.suggestions != null ? response.suggestions.size() : 0);
            return response;
        } catch (Exception e) {
            log.error("TED service error: {}", e.getMessage(), e);
            TedChatResponse fallback = new TedChatResponse();
            fallback.response = "I'm here to help! 🚀";
            fallback.suggestions = new java.util.ArrayList<>();
            fallback.contextUsed = new java.util.ArrayList<>();
            return fallback;
        }
    }

    /**
     * Get suggestions based on context.
     */
    public java.util.List<TedSuggestion> getSuggestions(java.util.Map<String, Object> context) {
        try {
            log.info("TED: getting suggestions");

            java.util.List<TedSuggestion> suggestions = fastApiWebClient.post()
                    .uri("/api/ted/suggestions")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .bodyValue(context != null ? context : new java.util.HashMap<>())
                    .retrieve()
                    .bodyToFlux(TedSuggestion.class)
                    .collectList()
                    .block();

            return suggestions != null ? suggestions : new java.util.ArrayList<>();
        } catch (Exception e) {
            log.error("TED suggestions error: {}", e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    // DTO Classes
    public static class TedChatResponse {
        public String response = "";
        public java.util.List<TedSuggestion> suggestions = new java.util.ArrayList<>();
        public java.util.List<String> contextUsed = new java.util.ArrayList<>();
    }

    public static class TedSuggestion {
        public String id;
        public String title;
        public String description;
        public String icon;
        public String action;
    }
}
