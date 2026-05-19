package com.aiuigenerator.bff.service;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.aiuigenerator.bff.dto.DuplicateResponse;
import com.aiuigenerator.bff.dto.EditFileRequest;
import com.aiuigenerator.bff.dto.EditFileResponse;
import com.aiuigenerator.bff.dto.FastApiGenerateRequest;
import com.aiuigenerator.bff.dto.FastApiGenerateResponse;
import com.aiuigenerator.bff.dto.ProjectFilesResponse;
import com.aiuigenerator.bff.dto.RestoreRequest;
import com.aiuigenerator.bff.dto.RestoreResponse;

import reactor.core.publisher.Flux;

@Service
public class FastApiClient {

    private final WebClient webClient;

    public FastApiClient(WebClient fastApiWebClient) {
        this.webClient = fastApiWebClient;
    }

    /**
     * Streaming variant: calls FastAPI /internal/generate/stream and returns a
     * Flux of raw SSE data strings (the JSON payload after "data: ").
     */
    public Flux<String> generateStream(FastApiGenerateRequest request) {
        return webClient.post()
                .uri("/internal/generate/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                // SSE lines arrive as "data: {...}" — strip the prefix to get pure JSON
                .filter(line -> line != null && !line.isBlank())
                .map(line -> line.startsWith("data: ") ? line.substring(6).trim() : line.trim())
                .filter(json -> !json.isEmpty());
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

    public EditFileResponse editFile(EditFileRequest request) {
        try {
            return webClient.post()
                    .uri("/internal/edit-file")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(EditFileResponse.class)
                    .block();
        } catch (Exception e) {
            String msg = e.getMessage();
            System.err.println("FastAPI /internal/edit-file error: " + msg);
            throw new RuntimeException("FastAPI edit-file failed: " + msg, e);
        }
    }

    public ProjectFilesResponse getProjectFiles(String generationId) {
        return webClient.get()
                .uri("/internal/projects/{id}/files", generationId)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(ProjectFilesResponse.class)
                .block();
    }

    public RestoreResponse restoreProject(RestoreRequest request) {
        return webClient.post()
                .uri("/internal/projects/{id}/restore", request.generationId)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(RestoreResponse.class)
                .block();
    }

    public DuplicateResponse duplicateProject(String generationId) {
        return webClient.post()
                .uri("/internal/projects/{id}/duplicate", generationId)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(DuplicateResponse.class)
                .block();
    }
}
