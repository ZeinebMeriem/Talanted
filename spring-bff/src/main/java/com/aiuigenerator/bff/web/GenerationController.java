package com.aiuigenerator.bff.web;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.aiuigenerator.bff.domain.AuditEvent;
import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.dto.ChatMessageDto;
import com.aiuigenerator.bff.dto.CodeBundleDto;
import com.aiuigenerator.bff.dto.EditFileRequest;
import com.aiuigenerator.bff.dto.EditFileResponse;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.dto.GenerationRollbackResponse;
import com.aiuigenerator.bff.dto.GenerationVersionsResponse;
import com.aiuigenerator.bff.dto.GitLabClientDto;
import com.aiuigenerator.bff.service.AuditService;
import com.aiuigenerator.bff.service.GenerationService;

@RestController
@RequestMapping("/api/generations")
public class GenerationController {

    private static final Logger log = LoggerFactory.getLogger(GenerationController.class);
    private final GenerationService service;
    private final AuditService audit;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    public GenerationController(GenerationService service, AuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    /**
     * Streaming generation endpoint.
     *
     * Writes SSE directly to HttpServletResponse to bypass Spring MVC / Tomcat
     * response buffering. SseEmitter buffers internally and does not flush after
     * each event, so progress events never reach the client until the pipeline
     * finishes. Writing directly to the output stream and calling flush() after
     * every event fixes the 0% progress bar problem.
     *
     * This is a SYNCHRONOUS handler — Spring MVC will block the thread until
     * the response is committed, which is fine because the pipeline can take
     * up to 10 minutes and we need to stream in real time.
     */
    @PostMapping(value = "/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public void createStream(
            @RequestParam(name = "prompt", required = false) String prompt,
            @RequestParam(name = "files", required = false) List<MultipartFile> files,
            @RequestParam(name = "domain", required = false) String domain,
            @RequestParam(name = "model", required = false) String model,
            @RequestParam(name = "jiraIssueKeys", required = false) List<String> jiraIssueKeys,
            @RequestParam(name = "jiraIssueKey", required = false) String jiraIssueKey,
            JwtAuthenticationToken token,
            HttpServletResponse response) throws IOException {

        String userId = "dev-user";
        if (token != null && token.getToken() != null) {
            Object sub = token.getToken().getClaims().get("sub");
            if (sub != null)
                userId = String.valueOf(sub);
        }

        String safePrompt = prompt == null ? "" : prompt;
        int jiraKeysCount = (jiraIssueKeys == null ? 0 : jiraIssueKeys.size());
        log.info(
                "POST /api/generations/stream: userId={}, jiraKeysCount={}, jiraIssueKey={}, promptLen={}, filesCount={}, domain={}, model={}",
                userId, jiraKeysCount, jiraIssueKey, safePrompt.length(),
                files == null ? 0 : files.size(), domain, model);

        // Set SSE headers — disable all buffering layers
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("X-Accel-Buffering", "no"); // disables Nginx proxy buffering
        response.setHeader("Connection", "keep-alive");
        response.flushBuffer(); // commit the headers immediately

        PrintWriter writer = response.getWriter();

        List<String> keys = (jiraIssueKeys != null)
                ? jiraIssueKeys.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).distinct().toList()
                : List.of();
        if (keys.isEmpty() && jiraIssueKey != null && !jiraIssueKey.isBlank()) {
            keys = List.of(jiraIssueKey.trim());
        }

        if (!keys.isEmpty()) {
            service.createGenerationStreamFromJiraMulti(userId, keys, safePrompt, files, domain, model, writer);
        } else {
            service.createGenerationStream(userId, safePrompt, files, domain, model, writer);
        }

        // Ensure the response is fully committed
        if (!writer.checkError()) {
            writer.flush();
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GenerationCreateResponse> create(
            @RequestParam(name = "prompt", required = false) String prompt,
            @RequestParam(name = "files", required = false) List<MultipartFile> files,
            @RequestParam(name = "domain", required = false) String domain,
            @RequestParam(name = "jiraIssueKeys", required = false) List<String> jiraIssueKeys,
            @RequestParam(name = "jiraIssueKey", required = false) String jiraIssueKey,
            JwtAuthenticationToken token) {

        String userId = "dev-user";
        if (token != null && token.getToken() != null) {
            Object sub = token.getToken().getClaims().get("sub");
            if (sub != null)
                userId = String.valueOf(sub);
        }

        String safePrompt = prompt == null ? "" : prompt;
        List<String> keys = (jiraIssueKeys != null)
                ? jiraIssueKeys.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).distinct().toList()
                : List.of();
        if (keys.isEmpty() && jiraIssueKey != null && !jiraIssueKey.isBlank()) {
            keys = List.of(jiraIssueKey.trim());
        }

        GenerationCreateResponse out;
        if (!keys.isEmpty()) {
            out = service.createGenerationFromJiraMulti(userId, keys, safePrompt, files, domain);
        } else {
            out = service.createGeneration(userId, safePrompt, files, domain);
        }
        return ResponseEntity.status(201).body(out);
    }

    @GetMapping("/{id}")
    public Generation get(@PathVariable("id") String id, JwtAuthenticationToken token) {
        Generation g = service.getGeneration(id);
        // In production mode, verify ownership
        if (!devMode && token != null) {
            String userId = (String) token.getToken().getClaims().get("sub");
            if (!g.getUserId().equals(userId)) {
                throw new IllegalArgumentException("generation not found");
            }
        }
        return g;
    }

    @GetMapping
    public List<Generation> list(JwtAuthenticationToken token) {
        // In dev mode or without token, show all projects
        if (devMode || token == null) {
            return service.listAllGenerations();
        }
        return service.listGenerations((String) token.getToken().getClaims().get("sub"));
    }

    @GetMapping("/{id}/code")
    public CodeBundleDto code(@PathVariable("id") String id) {
        return service.getCode(id);
    }

    @GetMapping("/{id}/audit")
    public List<AuditEvent> audit(@PathVariable("id") String id) {
        return audit.listEventsForGeneration(id);
    }

    @GetMapping("/{id}/versions")
    public GenerationVersionsResponse versions(@PathVariable("id") String id) {
        return service.getVersions(id);
    }

    @PostMapping("/{id}/rollback")
    public GenerationRollbackResponse rollback(
            @PathVariable("id") String id,
            @RequestParam("version") int version) {
        return service.rollback(id, version);
    }

    @PostMapping("/{id}/edit-file")
    public ResponseEntity<EditFileResponse> editFile(
            @PathVariable("id") String id,
            @RequestBody EditFileRequest body) {
        body.generationId = id;
        EditFileResponse resp = service.editFile(id, body.filePath, body.instruction, body.model);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{id}/chat")
    public List<ChatMessageDto> chatHistory(@PathVariable("id") String id) {
        return service.getChatHistory(id);
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<com.aiuigenerator.bff.dto.DuplicateResponse> duplicate(
            @PathVariable("id") String id,
            JwtAuthenticationToken token) {
        String userId = (String) token.getToken().getClaims().get("sub");
        com.aiuigenerator.bff.dto.DuplicateResponse resp = service.duplicateGeneration(id, userId);
        return ResponseEntity.ok(resp);
    }

    /**
     * Push generated code to GitLab repository
     */
    @PostMapping("/{id}/push-gitlab")
    public ResponseEntity<GitLabClientDto.PushToGitLabResponse> pushToGitLab(
            @PathVariable("id") String generationId,
            @RequestBody GitLabClientDto.PushToGitLabRequest request,
            JwtAuthenticationToken token) {

        log.info(
                "POST /api/generations/{}/push-gitlab: projectPath={}, branch={}, autoCreate={}",
                generationId,
                request.projectPath,
                request.branch,
                request.autoCreate);

        try {
            GitLabClientDto.PushToGitLabResponse response = service.pushGenerationToGitLab(
                    generationId,
                    request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to push to GitLab", e);
            return ResponseEntity.badRequest().body(
                    GitLabClientDto.PushToGitLabResponse.error(
                            "Failed to push to GitLab: " + e.getMessage()));
        }
    }
}
