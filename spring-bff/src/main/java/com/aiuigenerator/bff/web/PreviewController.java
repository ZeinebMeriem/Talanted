package com.aiuigenerator.bff.web;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.servlet.http.HttpServletRequest;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

@RestController
@RequestMapping("/preview")
public class PreviewController {

    private final WebClient fastApiWebClient;
    private final WebClient fastApiLargeFilesWebClient;
    private final WebClient bffWebClient;
    private final String bffBaseUrl;

    public PreviewController(
            WebClient fastApiWebClient,
            @Value("${app.fastapi.base-url}") String fastApiBaseUrl,
            @Value("${app.fastapi.timeout-seconds:1200}") long timeoutSeconds,
            @Value("${app.bff.base-url:http://localhost:8080}") String bffBaseUrl) {
        this.fastApiWebClient = fastApiWebClient;
        this.bffBaseUrl = bffBaseUrl;

        // Create a separate WebClient for large file downloads with increased buffer
        HttpClient httpClient = HttpClient.create().responseTimeout(Duration.ofSeconds(timeoutSeconds));
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024)) // 50MB
                .build();

        this.fastApiLargeFilesWebClient = WebClient.builder()
                .baseUrl(fastApiBaseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .build();

        // WebClient for proxying BFF API calls (http://localhost:8081 or configured base URL)
        this.bffWebClient = WebClient.builder().build();
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

        // If this is an API call, proxy to BFF API instead of FastAPI
        if (remainingPath.startsWith("api/")) {
            return proxyApiCall(remainingPath, HttpMethod.GET, null, request);
        }

        // Proxy to FastAPI /projects/{id}/{remaining-path}
        String proxyPath = "/projects/" + generationId + "/" + remainingPath;

        // Use the large files client for dist assets (JS, CSS, etc.)
        WebClient client = remainingPath.startsWith("dist/") ? fastApiLargeFilesWebClient : fastApiWebClient;

        return client
                .get()
                .uri(proxyPath)
                .retrieve()
                .toEntity(byte[].class)
                .map(response -> {
                    // Copy headers from FastAPI response, but exclude framing-related headers
                    HttpHeaders headers = new HttpHeaders();
                    response.getHeaders().forEach((key, values) -> {
                        if (!key.equalsIgnoreCase(HttpHeaders.CONTENT_LENGTH)
                                && !key.equalsIgnoreCase("X-Frame-Options")
                                && !key.equalsIgnoreCase("Content-Security-Policy")) {
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

    /**
     * Proxy POST requests to BFF API: /preview/{id}/api/** → /api/**
     */
    @PostMapping("/{id}/api/**")
    public Mono<ResponseEntity<byte[]>> proxyApiPost(
            @PathVariable("id") String generationId,
            @RequestBody(required = false) String body,
            HttpServletRequest request) {
        return proxyApiRequestWithBody(request, HttpMethod.POST, body != null ? body.getBytes() : null);
    }

    /**
     * Proxy PUT requests to BFF API: /preview/{id}/api/** → /api/**
     */
    @PutMapping("/{id}/api/**")
    public Mono<ResponseEntity<byte[]>> proxyApiPut(
            @PathVariable("id") String generationId,
            @RequestBody(required = false) String body,
            HttpServletRequest request) {
        return proxyApiRequestWithBody(request, HttpMethod.PUT, body != null ? body.getBytes() : null);
    }

    /**
     * Proxy DELETE requests to BFF API: /preview/{id}/api/** → /api/**
     */
    @DeleteMapping("/{id}/api/**")
    public Mono<ResponseEntity<byte[]>> proxyApiDelete(
            @PathVariable("id") String generationId,
            HttpServletRequest request) {
        return proxyApiRequestWithBody(request, HttpMethod.DELETE, null);
    }

    /**
     * Internal method to proxy API calls with authentication
     */
    private Mono<ResponseEntity<byte[]>> proxyApiRequestWithBody(
            HttpServletRequest request,
            HttpMethod method,
            byte[] body) {
        String apiPath = extractApiPath(request.getRequestURI());
        return proxyApiCall(apiPath, method, body, request);
    }

    /**
     * Extract the API path from /preview/{id}/api/*** → /api/***
     */
    private String extractApiPath(String requestUri) {
        int apiIndex = requestUri.indexOf("/api/");
        if (apiIndex >= 0) {
            return requestUri.substring(apiIndex);
        }
        return "/api/";
    }

    /**
     * Proxy an API call to the BFF, including authentication headers
     */
    private Mono<ResponseEntity<byte[]>> proxyApiCall(
            String apiPath,
            HttpMethod method,
            byte[] body,
            HttpServletRequest request) {

        // Get current authentication to pass it along
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String authHeader = null;
        if (auth != null && auth.getCredentials() != null) {
            authHeader = "Bearer " + auth.getCredentials();
        }

        // Build the target URL using configured base URL
        String targetUrl = bffBaseUrl + apiPath;
        String contentType = request.getContentType() != null ? request.getContentType() : "application/json";

        // Handle requests with body (POST/PUT)
        if (body != null && (method == HttpMethod.POST || method == HttpMethod.PUT)) {
            var requestBodySpec = (WebClient.RequestBodySpec) bffWebClient.method(method).uri(targetUrl)
                    .header(HttpHeaders.CONTENT_TYPE, contentType);
            if (authHeader != null) {
                requestBodySpec = requestBodySpec.header(HttpHeaders.AUTHORIZATION, authHeader);
            }
            return requestBodySpec
                    .bodyValue(body)
                    .retrieve()
                    .toEntity(byte[].class)
                    .map(this::mapProxyResponse)
                    .onErrorResume(e -> handleProxyError(apiPath, e));
        }

        // Handle requests without body (GET/DELETE)
        var requestHeadersSpec = bffWebClient.method(method).uri(targetUrl);
        if (authHeader != null) {
            requestHeadersSpec = requestHeadersSpec.header(HttpHeaders.AUTHORIZATION, authHeader);
        }
        return requestHeadersSpec
                .retrieve()
                .toEntity(byte[].class)
                .map(this::mapProxyResponse)
                .onErrorResume(e -> handleProxyError(apiPath, e));
    }

    private ResponseEntity<byte[]> mapProxyResponse(ResponseEntity<byte[]> response) {
        HttpHeaders headers = new HttpHeaders();
        response.getHeaders().forEach((key, values) -> {
            if (!key.equalsIgnoreCase(HttpHeaders.CONTENT_LENGTH)) {
                headers.putIfAbsent(key, values);
            }
        });
        return ResponseEntity.ok()
                .headers(headers)
                .body(response.getBody());
    }

    private Mono<ResponseEntity<byte[]>> handleProxyError(String apiPath, Throwable e) {
        System.err.println("Error proxying API call to " + apiPath + ": " + e.getMessage());
        return Mono.just(ResponseEntity.status(500).build());
    }
}