package com.aiuigenerator.bff.web;

import java.util.List;

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

import com.aiuigenerator.bff.domain.AuditEvent;
import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.dto.ChatMessageDto;
import com.aiuigenerator.bff.dto.CodeBundleDto;
import com.aiuigenerator.bff.dto.EditFileRequest;
import com.aiuigenerator.bff.dto.EditFileResponse;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.dto.GenerationRollbackResponse;
import com.aiuigenerator.bff.dto.GenerationVersionsResponse;
import com.aiuigenerator.bff.service.AuditService;
import com.aiuigenerator.bff.service.GenerationService;

@RestController
@RequestMapping("/api/generations")
public class GenerationController {

    private final GenerationService service;
    private final AuditService audit;

    public GenerationController(GenerationService service, AuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GenerationCreateResponse> create(
            @RequestParam("prompt") String prompt,
            @RequestParam(name = "files", required = false) List<MultipartFile> files,
            @RequestParam(name = "domain", required = false) String domain,
            JwtAuthenticationToken token) {

        String userId = (String) token.getToken().getClaims().get("sub");
        GenerationCreateResponse out = service.createGeneration(userId, prompt, files, domain);
        return ResponseEntity.status(201).body(out);
    }

    @GetMapping("/{id}")
    public Generation get(@PathVariable("id") String id) {
        return service.getGeneration(id);
    }

    @GetMapping
    public List<Generation> list(JwtAuthenticationToken token) {
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
        EditFileResponse resp = service.editFile(id, body.filePath, body.instruction);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{id}/chat")
    public List<ChatMessageDto> chatHistory(@PathVariable("id") String id) {
        return service.getChatHistory(id);
    }
}
