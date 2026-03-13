package com.aiuigenerator.bff.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, Object> root() {
        return Map.of(
                "service", "spring-bff",
                "status", "ok",
                "endpoints", Map.of(
                        "health", "/actuator/health",
                        "createGeneration", "POST /api/generations",
                        "getGeneration", "GET /api/generations/{id}"));
    }
}
