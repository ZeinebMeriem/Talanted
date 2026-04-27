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
        // In dev mode (legacy support), return all projects
        if (devMode) {
            return service.listAllGenerations();
        }

        // Production: require authenticated user
        if (token == null || token.getToken() == null) {
            throw new IllegalArgumentException("Authentication required - token missing");
        }

        Object subClaim = token.getToken().getClaims().get("sub");
        if (subClaim == null) {
            throw new IllegalArgumentException("Invalid token - missing 'sub' claim");
        }

        String userId = subClaim.toString();
        return service.listGenerations(userId);
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
    public ResponseEntity<?> pushToGitLab(
            @PathVariable("id") String generationId,
            @RequestBody GitLabClientDto.PushToGitLabRequest request,
            JwtAuthenticationToken token) {

        log.info(
                "POST /api/generations/{}/push-gitlab: projectPath={}, branch={}, autoCreate={}, tokenProvided={}",
                generationId,
                request.projectPath,
                request.branch,
                request.autoCreate,
                request.token != null && !request.token.isBlank());

        try {
            log.debug("Calling service.pushGenerationToGitLab for generation: {}", generationId);
            GitLabClientDto.PushToGitLabResponse response = service.pushGenerationToGitLab(
                    generationId,
                    request,
                    token);

            log.info("Push response for {}: success={}, message={}", generationId, response.success, response.message);

            // Return 200 for both success and validation errors (error is in response body)
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Validation error for generation {}: {}", generationId, e.getMessage());
            return ResponseEntity.ok(GitLabClientDto.PushToGitLabResponse.error(
                    e.getMessage(),
                    "VALIDATION_FAILED",
                    "Check that generation exists and code has been generated"));
        } catch (Exception e) {
            log.error("Failed to push to GitLab for generation {}: {}", generationId, e.getMessage(), e);
            return ResponseEntity.ok(GitLabClientDto.PushToGitLabResponse.error(
                    "Failed to push to GitLab: " + e.getMessage(),
                    "GIT_PUSH_FAILED",
                    "Check logs for details. The generation may still be valid for editing."));
        }
    }

    /**
     * Validate GitLab token
     */
    @PostMapping("/validate-gitlab-token")
    public ResponseEntity<?> validateGitLabToken(
            @RequestBody GitLabClientDto.ValidateTokenRequest request,
            JwtAuthenticationToken token) {

        log.info("POST /api/generations/validate-gitlab-token: gitlabUrl={}", request.gitlabUrl);

        // Dev mode: validation not supported without authentication
        if (token == null || token.getToken() == null) {
            return ResponseEntity.badRequest().body(
                    new GitLabClientDto.ValidateTokenResponse(false));
        }

        try {
            boolean isValid = service.validateGitLabToken(request.gitlabUrl, request.token);
            return ResponseEntity.ok(new GitLabClientDto.ValidateTokenResponse(isValid));
        } catch (Exception e) {
            log.error("Failed to validate GitLab token", e);
            return ResponseEntity.ok(new GitLabClientDto.ValidateTokenResponse(false));
        }
    }
}
