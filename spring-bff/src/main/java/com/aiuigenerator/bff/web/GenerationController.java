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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import com.aiuigenerator.bff.dto.GitLabPushDto;
import com.aiuigenerator.bff.service.AuditService;
import com.aiuigenerator.bff.service.GenerationService;
import com.aiuigenerator.bff.service.SimpleGitLabService;

@RestController
@RequestMapping("/api/generations")
public class GenerationController {

    private static final Logger log = LoggerFactory.getLogger(GenerationController.class);
    private final GenerationService service;
    private final AuditService audit;
    private final SimpleGitLabService gitLabService;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    public GenerationController(GenerationService service, AuditService audit, SimpleGitLabService gitLabService) {
        this.service = service;
        this.audit = audit;
        this.gitLabService = gitLabService;
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
            @RequestParam(name = "themePreset", required = false) String themePreset,
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
            service.createGenerationStream(userId, safePrompt, files, domain, model, themePreset, writer);
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
        if (!devMode && token != null && token.getToken() != null) {
            Object sub = token.getToken().getClaims().get("sub");
            if (sub == null) throw new IllegalArgumentException("Invalid token - missing 'sub' claim");
            if (!g.getUserId().equals(sub.toString())) {
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

    /** Returns quality scores for a generation, optionally scoped to a specific version. */
    @GetMapping("/{id}/quality")
    public ResponseEntity<java.util.Map<String, Object>> quality(
            @PathVariable("id") String id,
            @RequestParam(value = "version", required = false) Integer version) {
        return ResponseEntity.ok(service.getQualityScores(id, version));
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGeneration(@PathVariable("id") String id) {
        service.deleteGeneration(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/name")
    public ResponseEntity<Void> renameGeneration(
            @PathVariable("id") String id,
            @RequestBody java.util.Map<String, String> body) {
        service.renameGeneration(id, body.getOrDefault("name", ""));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/chat")
    public List<ChatMessageDto> chatHistory(@PathVariable("id") String id) {
        return service.getChatHistory(id);
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<com.aiuigenerator.bff.dto.DuplicateResponse> duplicate(
            @PathVariable("id") String id,
            JwtAuthenticationToken token) {
        String userId = "dev-user";
        if (token != null && token.getToken() != null) {
            Object sub = token.getToken().getClaims().get("sub");
            if (sub != null) userId = sub.toString();
        }
        com.aiuigenerator.bff.dto.DuplicateResponse resp = service.duplicateGeneration(id, userId);
        return ResponseEntity.ok(resp);
    }

    /**
     * Push generated code to GitLab repository
     */
    @PostMapping("/{id}/push-to-gitlab")
    public ResponseEntity<?> pushToGitLab(
            @PathVariable("id") String generationId,
            @RequestBody GitLabPushDto.PushRequest request) {

        log.info("POST /api/generations/{}/push-to-gitlab: project={}", generationId, request.projectPath);

        try {
            // 1. Validate inputs
            if (request.gitlabUrl == null || request.gitlabUrl.isBlank()) {
                return ResponseEntity.ok(GitLabPushDto.PushResponse.error("GitLab URL is required"));
            }
            if (request.projectPath == null || request.projectPath.isBlank()) {
                return ResponseEntity.ok(GitLabPushDto.PushResponse.error("Project path is required"));
            }
            if (request.personalAccessToken == null || request.personalAccessToken.isBlank()) {
                return ResponseEntity.ok(GitLabPushDto.PushResponse.error("Personal access token is required"));
            }
            if (request.branch == null || request.branch.isBlank()) {
                request.branch = "main";
            }
            if (request.commitMessage == null || request.commitMessage.isBlank()) {
                request.commitMessage = "feat: initial commit";
            }

            // 2. Get code content
            CodeBundleDto code = service.getCode(generationId);
            if (code == null || code.files == null || code.files.isEmpty()) {
                return ResponseEntity.ok(GitLabPushDto.PushResponse.error("No code found for this generation"));
            }

            // 3. Push to GitLab — files are written to their real paths in the repo
            GitLabPushDto.PushResponse response = gitLabService.pushCode(
                    request.gitlabUrl,
                    request.personalAccessToken,
                    request.projectPath,
                    request.branch,
                    request.commitMessage,
                    code.files,
                    request.forceOverwrite);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error pushing to GitLab: {}", e.getMessage(), e);
            return ResponseEntity.ok(GitLabPushDto.PushResponse.error("Error: " + e.getMessage()));
        }
    }

    /** Agentic Repair — trigger self-healing on an existing project and return updated scores. */
    @PostMapping("/{id}/repair")
    public ResponseEntity<java.util.Map<String, Object>> repair(@PathVariable("id") String id) {
        java.util.Map<String, Object> result = service.repairGeneration(id);
        return ResponseEntity.ok(result);
    }

    /** Auto-Documentation — generate README.md + JSDoc for an existing project. */
    @PostMapping("/{id}/docs")
    public ResponseEntity<java.util.Map<String, Object>> generateDocs(@PathVariable("id") String id) {
        java.util.Map<String, Object> result = service.generateDocs(id);
        return ResponseEntity.ok(result);
    }

    /** Deploy to Netlify — proxies to FastAPI, persists public URL. */
    @PostMapping("/{id}/deploy")
    public ResponseEntity<java.util.Map<String, Object>> deploy(
            @PathVariable("id") String id,
            @RequestBody java.util.Map<String, String> body) {
        String provider = body.getOrDefault("provider", "netlify");
        String token    = body.getOrDefault("token", "");
        if (token.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "token is required"));
        }
        java.util.Map<String, Object> result = "netlify".equals(provider)
                ? service.deployToNetlify(id, token)
                : java.util.Map.of("error", "Unsupported provider: " + provider);
        return ResponseEntity.ok(result);
    }
}

