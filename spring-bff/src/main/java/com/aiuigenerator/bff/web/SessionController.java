package com.aiuigenerator.bff.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @GetMapping("/{sid}/history")
    public Map<String, Object> history(@PathVariable("sid") String sessionId) {
        return Map.of(
                "sessionId", sessionId,
                "items", java.util.List.of(),
                "note", "MVP stub - history not implemented yet");
    }
}
