package com.aiuigenerator.bff.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.aiuigenerator.bff.service.TedService;
import com.aiuigenerator.bff.service.TedService.TedChatResponse;
import com.aiuigenerator.bff.service.TedService.TedSuggestion;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ted")
public class TedController {

    private static final Logger log = LoggerFactory.getLogger(TedController.class);
    private final TedService tedService;

    public TedController(TedService tedService) {
        this.tedService = tedService;
    }

    @PostMapping(value = "/chat", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TedChatResponse> chat(
            @RequestBody Map<String, Object> request,
            JwtAuthenticationToken token) {
        try {
            String message = (String) request.getOrDefault("message", "");
            @SuppressWarnings("unchecked")
            Map<String, Object> context = (Map<String, Object>) request.getOrDefault("context", new HashMap<>());

            log.info("TED: chat from user: {}", token != null ? token.getName() : "anonymous");

            TedChatResponse response = tedService.chat(message, context);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("TED controller error: {}", e.getMessage());
            TedChatResponse fallback = new TedChatResponse();
            fallback.response = "I'm here to help! 🚀";
            fallback.suggestions = List.of();
            fallback.contextUsed = List.of();
            return ResponseEntity.ok(fallback);
        }
    }

    @PostMapping(value = "/suggestions", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<TedSuggestion>> getSuggestions(
            @RequestBody Map<String, Object> context,
            JwtAuthenticationToken token) {
        try {
            log.info("TED: suggestions from user: {}", token != null ? token.getName() : "anonymous");
            List<TedSuggestion> suggestions = tedService.getSuggestions(context);
            return ResponseEntity.ok(suggestions);
        } catch (Exception e) {
            log.error("TED suggestions error: {}", e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }
}
