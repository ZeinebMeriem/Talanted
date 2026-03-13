package com.aiuigenerator.bff.service;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.aiuigenerator.bff.dto.FastApiGenerateRequest;
import com.aiuigenerator.bff.dto.FastApiGenerateResponse;

@Service
public class FastApiClient {

    private final WebClient webClient;

    public FastApiClient(WebClient fastApiWebClient) {
        this.webClient = fastApiWebClient;
    }

    public FastApiGenerateResponse generate(FastApiGenerateRequest request) {
        return webClient.post()
                .uri("/internal/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(FastApiGenerateResponse.class)
                .block();
    }
}
