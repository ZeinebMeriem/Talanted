package com.aiuigenerator.bff.service;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.aiuigenerator.bff.dto.EditFileRequest;
import com.aiuigenerator.bff.dto.EditFileResponse;
import com.aiuigenerator.bff.dto.FastApiGenerateRequest;
import com.aiuigenerator.bff.dto.FastApiGenerateResponse;
import com.aiuigenerator.bff.dto.ProjectFilesResponse;
import com.aiuigenerator.bff.dto.RestoreRequest;
import com.aiuigenerator.bff.dto.RestoreResponse;

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

    public EditFileResponse editFile(EditFileRequest request) {
        return webClient.post()
                .uri("/internal/edit-file")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(EditFileResponse.class)
                .block();
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
}
