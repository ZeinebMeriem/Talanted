package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import java.io.PrintWriter;
import java.util.Base64;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.domain.Sort;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.aiuigenerator.bff.domain.AiReport;
import com.aiuigenerator.bff.domain.ChatMessage;
import com.aiuigenerator.bff.domain.CodeVersion;
import com.aiuigenerator.bff.domain.FileEntry;
import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationFile;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.domain.UiSpecVersion;
import com.aiuigenerator.bff.dto.AiReportDto;
import com.aiuigenerator.bff.dto.ChatMessageDto;
import com.aiuigenerator.bff.dto.CodeBundleDto;
import com.aiuigenerator.bff.dto.EditFileRequest;
import com.aiuigenerator.bff.dto.EditFileResponse;
import com.aiuigenerator.bff.dto.FileRefDto;
import com.aiuigenerator.bff.dto.FastApiGenerateRequest;
import com.aiuigenerator.bff.dto.FastApiGenerateResponse;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.dto.GenerationRollbackResponse;
import com.aiuigenerator.bff.dto.GenerationVersionsResponse;
import com.aiuigenerator.bff.dto.JiraIssueDTO;
import com.aiuigenerator.bff.dto.RestoreRequest;
import com.aiuigenerator.bff.dto.CodeFileDto;
import com.aiuigenerator.bff.repo.AiReportRepository;
import com.aiuigenerator.bff.repo.ChatMessageRepository;
import com.aiuigenerator.bff.repo.CodeVersionRepository;
import com.aiuigenerator.bff.repo.GenerationFileRepository;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.repo.UiSpecVersionRepository;

import de.huxhorn.sulky.ulid.ULID;

@Service
public class GenerationService {

    private static final Logger log = LoggerFactory.getLogger(GenerationService.class);
    private final ULID ulid = new ULID();

    @org.springframework.beans.factory.annotation.Value("${app.fastapi.base-url}")
    private String fastApiBaseUrl;

    @org.springframework.beans.factory.annotation.Value("${app.security.dev-mode:false}")
    private boolean devMode;

    private final UploadValidator validator;
    private final FileStorageService fileStorage;
    private final FastApiClient fastApi;
    private final AuditService audit;
    private final JiraService jiraService;

    private final GenerationRepository generationRepo;
    private final GenerationFileRepository fileRepo;
    private final UiSpecVersionRepository uiSpecRepo;
    private final CodeVersionRepository codeRepo;
    private final AiReportRepository reportRepo;
    private final ChatMessageRepository chatRepo;

    public GenerationService(
            UploadValidator validator,
            FileStorageService fileStorage,
            FastApiClient fastApi,
            AuditService audit,
            JiraService jiraService,
            GenerationRepository generationRepo,
            GenerationFileRepository fileRepo,
            UiSpecVersionRepository uiSpecRepo,
            CodeVersionRepository codeRepo,
            AiReportRepository reportRepo,
            ChatMessageRepository chatRepo) {
        this.validator = validator;
        this.fileStorage = fileStorage;
        this.fastApi = fastApi;
        this.audit = audit;
        this.jiraService = jiraService;
        this.generationRepo = generationRepo;
        this.fileRepo = fileRepo;
        this.uiSpecRepo = uiSpecRepo;
        this.codeRepo = codeRepo;
        this.reportRepo = reportRepo;
        this.chatRepo = chatRepo;
    }

    public GenerationCreateResponse createGeneration(String userId, String prompt, List<MultipartFile> files,
            String domain) {
        long started = System.currentTimeMillis();

        validator.validatePrompt(prompt);

        String generationId = ulid.nextULID();
        String sessionId = ulid.nextULID();

        Generation g = new Generation();
        g.setGenerationId(generationId);
        g.setSessionId(sessionId);
        g.setPrompt(prompt);
        g.setActiveVersion(1);
        g.setStatus(GenerationStatus.PENDING);
        g.setCreatedAt(Instant.now());
        g.setUpdatedAt(Instant.now());
        g.setUserId(userId);
        generationRepo.save(g);

        audit.recordEvent("GENERATION_REQUESTED", generationId, sessionId, 0,
                Map.of("hasFiles", files != null && !files.isEmpty()));

        List<FileRefDto> fileRefs = new ArrayList<>();

        if (files != null) {
            for (MultipartFile f : files) {
                if (f == null || f.isEmpty()) {
                    continue;
                }
                validator.validateFile(f);

                String sha256 = validator.computeSha256(f);
                String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                String objectKey = generationId + "/" + sha256 + "_" + safeName;
                String minioPath = fileStorage.putToMinio(objectKey, f);

                GenerationFile meta = new GenerationFile();
                meta.setFileId(ulid.nextULID());
                meta.setGenerationId(generationId);
                meta.setOriginalName(f.getOriginalFilename());
                meta.setMimeType(f.getContentType());
                meta.setSizeBytes(f.getSize());
                meta.setSha256(sha256);
                meta.setMinioPath(minioPath);
                meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                fileRepo.save(meta);

                FileRefDto ref = new FileRefDto();
                ref.minioPath = minioPath;
                ref.mimeType = f.getContentType();
                ref.originalName = f.getOriginalFilename();
                ref.sha256 = sha256;
                ref.sizeBytes = f.getSize();
                fileRefs.add(ref);
            }
        }

        g.setStatus(GenerationStatus.PROCESSING);
        g.setUpdatedAt(Instant.now());
        generationRepo.save(g);

        FastApiGenerateRequest req = new FastApiGenerateRequest();
        req.generationId = generationId;
        req.prompt = prompt;
        req.mode = "full";
        req.fileRefs = fileRefs;
        req.domain = (domain != null && !domain.isBlank()) ? domain : null;

        FastApiGenerateResponse fastResp = fastApi.generate(req);

        UiSpecVersion spec = new UiSpecVersion();
        spec.setSpecVersionId(ulid.nextULID());
        spec.setGenerationId(generationId);
        spec.setVersion(1);
        spec.setUiSpec(fastResp.uiSpec);
        spec.setType(UiSpecVersion.Type.INITIAL);
        spec.setCreatedAt(Instant.now());
        uiSpecRepo.save(spec);

        CodeVersion cv = new CodeVersion();
        cv.setCodeVersionId(ulid.nextULID());
        cv.setGenerationId(generationId);
        cv.setVersion(1);
        cv.setCreatedAt(Instant.now());

        List<FileEntry> entries = new ArrayList<>();
        if (fastResp.codeBundle != null && fastResp.codeBundle.files != null) {
            fastResp.codeBundle.files.forEach(f -> entries.add(new FileEntry(f.path, f.content)));
        }
        cv.setFiles(entries);
        codeRepo.save(cv);

        AiReport report = new AiReport();
        report.setReportId(ulid.nextULID());
        report.setGenerationId(generationId);
        report.setVersion(1);
        report.setCreatedAt(Instant.now());

        if (fastResp.aiReport != null) {
            report.setScore(fastResp.aiReport.score);
            report.setIssues(fastResp.aiReport.issues);
            report.setSourcesUsed(fastResp.aiReport.sources_used);
            report.setLlmProvider(fastResp.aiReport.llm_provider);
            report.setDurations(fastResp.aiReport.durations);
            report.setRetriesCount(fastResp.aiReport.retries_count);
            report.setBuildRetries(fastResp.aiReport.build_retries);
            report.setUiEvaluation(fastResp.aiReport.ui_evaluation);
        } else {
            report.setScore(0);
            report.setIssues(List.of());
            report.setSourcesUsed(List.of());
            report.setLlmProvider("unknown");
            report.setDurations(Map.of());
            report.setRetriesCount(0);
        }

        reportRepo.save(report);

        g.setStatus(GenerationStatus.COMPLETED);
        g.setActiveVersion(1);
        g.setUpdatedAt(Instant.now());

        // Store quality evaluation scores from FastAPI
        if (fastResp.aiReport != null && fastResp.aiReport.ui_evaluation != null) {
            Map<String, Object> uiEval = fastResp.aiReport.ui_evaluation;
            Object globalScoreObj = uiEval.get("global_score");
            if (globalScoreObj instanceof Number) {
                g.setGlobalScore(((Number) globalScoreObj).intValue());
            }
            Object semanticFidelityObj = uiEval.get("semantic_fidelity");
            if (semanticFidelityObj instanceof Number) {
                g.setSemanticFidelity(((Number) semanticFidelityObj).intValue());
            }
            Object codeQualityObj = uiEval.get("code_quality");
            if (codeQualityObj instanceof Number) {
                g.setCodeQuality(((Number) codeQualityObj).intValue());
            }
            Object completenessObj = uiEval.get("completeness");
            if (completenessObj instanceof Number) {
                g.setCompleteness(((Number) completenessObj).intValue());
            }
            Object accessibilityObj = uiEval.get("accessibility");
            if (accessibilityObj instanceof Number) {
                g.setAccessibility(((Number) accessibilityObj).intValue());
            }
            Object visualRichnessObj = uiEval.get("visual_richness");
            if (visualRichnessObj instanceof Number) {
                g.setVisualRichness(((Number) visualRichnessObj).intValue());
            }
        }

        generationRepo.save(g);

        long durationMs = System.currentTimeMillis() - started;
        Map<String, Object> details = new HashMap<>();
        details.put("durationMs", durationMs);
        details.put("filesCount", fileRefs.size());
        audit.recordEvent("GENERATION_COMPLETED", generationId, sessionId, durationMs, details);

        GenerationCreateResponse out = new GenerationCreateResponse();
        out.generationId = generationId;
        out.sessionId = sessionId;
        out.status = g.getStatus();
        out.activeVersion = g.getActiveVersion();
        out.uiSpec = fastResp.uiSpec;
        out.codeBundle = fastResp.codeBundle;
        out.aiReport = fastResp.aiReport;
        return out;
    }

    /**
     * Streaming variant of createGeneration.
     *
     * 1. Synchronously uploads files to MinIO and creates the Generation record
     * (PROCESSING).
     * 2. Calls FastAPI /internal/generate/stream, proxying each SSE event to the
     * SseEmitter.
     * 3. On the "complete" event, saves codeBundle/uiSpec/aiReport to MongoDB and
     * marks COMPLETED.
     * 4. On any error, marks the generation FAILED and completes the emitter with
     * an error event.
     *
     * Must be called from a background thread (not a servlet container thread)
     * because
     * the inner Flux is consumed synchronously via blockLast().
     */
    @SuppressWarnings("unchecked")
    public void createGenerationStream(
            String userId,
            String prompt,
            List<MultipartFile> files,
            String domain,
            String model,
            String themePreset,
            PrintWriter writer) {

        final ObjectMapper mapper = new ObjectMapper();
        String generationId = null;
        String sessionId = null;

        try {
            validator.validatePrompt(prompt);

            generationId = ulid.nextULID();
            sessionId = ulid.nextULID();
            final String gId = generationId;
            final String sId = sessionId;

            Generation g = new Generation();
            g.setGenerationId(gId);
            g.setSessionId(sId);
            g.setPrompt(prompt);
            g.setActiveVersion(1);
            g.setStatus(GenerationStatus.PENDING);
            g.setCreatedAt(Instant.now());
            g.setUpdatedAt(Instant.now());
            g.setUserId(userId);
            generationRepo.save(g);

            audit.recordEvent("GENERATION_REQUESTED", gId, sId, 0,
                    Map.of("hasFiles", files != null && !files.isEmpty(), "streaming", true, "model",
                            model != null ? model : "default"));

            // ── Upload files to MinIO ────────────────────────────────────────
            List<FileRefDto> fileRefs = new ArrayList<>();
            if (files != null) {
                for (MultipartFile f : files) {
                    if (f == null || f.isEmpty())
                        continue;
                    validator.validateFile(f);
                    String sha256 = validator.computeSha256(f);
                    String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                    String objectKey = gId + "/" + sha256 + "_" + safeName;
                    String minioPath = fileStorage.putToMinio(objectKey, f);

                    GenerationFile meta = new GenerationFile();
                    meta.setFileId(ulid.nextULID());
                    meta.setGenerationId(gId);
                    meta.setOriginalName(f.getOriginalFilename());
                    meta.setMimeType(f.getContentType());
                    meta.setSizeBytes(f.getSize());
                    meta.setSha256(sha256);
                    meta.setMinioPath(minioPath);
                    meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                    fileRepo.save(meta);

                    FileRefDto ref = new FileRefDto();
                    ref.minioPath = minioPath;
                    ref.mimeType = f.getContentType();
                    ref.originalName = f.getOriginalFilename();
                    ref.sha256 = sha256;
                    ref.sizeBytes = f.getSize();
                    fileRefs.add(ref);
                }
            }

            g.setStatus(GenerationStatus.PROCESSING);
            g.setUpdatedAt(Instant.now());
            generationRepo.save(g);

            // ── Build FastAPI request ────────────────────────────────────────
            FastApiGenerateRequest req = new FastApiGenerateRequest();
            req.generationId = gId;
            req.prompt = prompt;
            req.mode = "full";
            req.fileRefs = fileRefs;
            req.domain = (domain != null && !domain.isBlank()) ? domain : null;
            req.model = (model != null && !model.isBlank()) ? model : null;
            req.themePreset = (themePreset != null && !themePreset.isBlank()) ? themePreset : null;

            final long started = System.currentTimeMillis();
            final String[] completedResultHolder = { null };

            // ── Stream from FastAPI line-by-line via HttpURLConnection ────────
            // (WebClient/Reactor buffers SSE on Tomcat — use raw HTTP instead)
            String fastapiUrl = fastApiBaseUrl + "/internal/generate/stream";
            String reqJson = mapper.writeValueAsString(req);

            HttpURLConnection conn = (HttpURLConnection) new URL(fastapiUrl).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setDoOutput(true);
            conn.setConnectTimeout(30_000);
            conn.setReadTimeout(660_000); // 11 min
            try (OutputStream os = conn.getOutputStream()) {
                os.write(reqJson.getBytes(StandardCharsets.UTF_8));
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: "))
                        continue;
                    String json = line.substring(6).trim();
                    if (json.isEmpty())
                        continue;
                    if (json.contains("\"type\":\"complete\"")) {
                        // Inject generationId into result so the frontend can build the preview URL
                        try {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> eventMap = mapper.readValue(json, Map.class);
                            Object resultObj = eventMap.get("result");
                            if (resultObj instanceof Map) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> resultMap = (Map<String, Object>) resultObj;
                                resultMap.put("generationId", gId);
                            }
                            json = mapper.writeValueAsString(eventMap);
                        } catch (Exception ignored) {
                        }
                        completedResultHolder[0] = json;
                    }
                    // Write SSE event directly to response stream — flush() ensures
                    // the event reaches the client immediately without Tomcat buffering.
                    writer.print("data: " + json + "\n\n");
                    writer.flush();
                }
            } finally {
                conn.disconnect();
            }

            // ── Persist result once streaming is done ───────────────────────
            if (completedResultHolder[0] != null) {
                try {
                    Map<String, Object> wrapper = mapper.readValue(completedResultHolder[0], Map.class);
                    Map<String, Object> result = (Map<String, Object>) wrapper.get("result");

                    Object uiSpecRaw = result != null ? result.get("uiSpec") : null;
                    Object codeBundleRaw = result != null ? result.get("codeBundle") : null;
                    Object aiReportRaw = result != null ? result.get("aiReport") : null;

                    // uiSpec
                    UiSpecVersion spec = new UiSpecVersion();
                    spec.setSpecVersionId(ulid.nextULID());
                    spec.setGenerationId(gId);
                    spec.setVersion(1);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> uiSpecMap = uiSpecRaw instanceof Map ? (Map<String, Object>) uiSpecRaw
                            : Map.of();
                    spec.setUiSpec(uiSpecMap);
                    spec.setType(UiSpecVersion.Type.INITIAL);
                    spec.setCreatedAt(Instant.now());
                    uiSpecRepo.save(spec);

                    // codeBundle
                    CodeVersion cv = new CodeVersion();
                    cv.setCodeVersionId(ulid.nextULID());
                    cv.setGenerationId(gId);
                    cv.setVersion(1);
                    cv.setCreatedAt(Instant.now());
                    List<FileEntry> entries = new ArrayList<>();
                    if (codeBundleRaw instanceof Map) {
                        Object filesObj = ((Map<?, ?>) codeBundleRaw).get("files");
                        if (filesObj instanceof List) {
                            for (Object fObj : (List<?>) filesObj) {
                                if (fObj instanceof Map) {
                                    Map<?, ?> fm = (Map<?, ?>) fObj;
                                    entries.add(new FileEntry(
                                            String.valueOf(fm.get("path")),
                                            String.valueOf(fm.get("content"))));
                                }
                            }
                        }
                    }
                    cv.setFiles(entries);
                    codeRepo.save(cv);

                    // aiReport
                    AiReport report = new AiReport();
                    report.setReportId(ulid.nextULID());
                    report.setGenerationId(gId);
                    report.setVersion(1);
                    report.setCreatedAt(Instant.now());
                    if (aiReportRaw instanceof Map) {
                        Map<?, ?> rmap = (Map<?, ?>) aiReportRaw;
                        report.setScore(
                                rmap.get("score") instanceof Number ? ((Number) rmap.get("score")).intValue() : 0);
                        Object llmProviderObj = rmap.get("llm_provider");
                        report.setLlmProvider(llmProviderObj != null ? String.valueOf(llmProviderObj) : "unknown");
                        report.setRetriesCount(rmap.get("retries_count") instanceof Number
                                ? ((Number) rmap.get("retries_count")).intValue()
                                : 0);
                        report.setBuildRetries(rmap.get("build_retries") instanceof Number
                                ? ((Number) rmap.get("build_retries")).intValue()
                                : 0);
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> issues = rmap.get("issues") instanceof List
                                ? (List<Map<String, Object>>) rmap.get("issues")
                                : List.of();
                        report.setIssues(issues);
                        @SuppressWarnings("unchecked")
                        List<String> sourcesUsed = rmap.get("sources_used") instanceof List
                                ? (List<String>) rmap.get("sources_used")
                                : List.of();
                        report.setSourcesUsed(sourcesUsed);
                        @SuppressWarnings("unchecked")
                        Map<String, Object> durations = rmap.get("durations") instanceof Map
                                ? (Map<String, Object>) rmap.get("durations")
                                : Map.of();
                        report.setDurations(durations);
                    } else {
                        report.setScore(0);
                        report.setIssues(List.of());
                        report.setSourcesUsed(List.of());
                        report.setLlmProvider("unknown");
                        report.setDurations(Map.of());
                        report.setRetriesCount(0);
                    }
                    reportRepo.save(report);

                    g.setStatus(GenerationStatus.COMPLETED);
                    g.setActiveVersion(1);
                    g.setUpdatedAt(Instant.now());
                    generationRepo.save(g);

                    long durationMs = System.currentTimeMillis() - started;
                    audit.recordEvent("GENERATION_COMPLETED", gId, sId, durationMs,
                            Map.of("durationMs", durationMs, "filesCount", fileRefs.size(), "streaming", true));
                } catch (Exception parseEx) {
                    // Log but don't fail — the client already got the complete event
                }
            }

            // Stream ended — writer is flushed and closed by the controller

        } catch (Exception e) {
            log.error("createGenerationStream failed for generationId={}: {}", generationId, e.getMessage(), e);
            if (generationId != null) {
                try {
                    Generation failed = generationRepo.findById(generationId).orElse(null);
                    if (failed != null) {
                        failed.setStatus(GenerationStatus.FAILED);
                        failed.setUpdatedAt(Instant.now());
                        generationRepo.save(failed);
                    }
                } catch (Exception ignored) {
                    /* best-effort */
                }
            }
            // Send error event so the frontend knows it failed
            try {
                writer.print("data: {\"type\":\"error\",\"message\":\"" +
                        e.getMessage().replace("\"", "'") + "\"}\n\n");
                writer.flush();
            } catch (Exception ignored) {
                /* response may already be closed */ }
        }
    }

    public GenerationCreateResponse createGenerationFromJira(
            String userId,
            String jiraIssueKey,
            String additionalPrompt,
            List<MultipartFile> extraFiles,
            String domain) {

        JiraIssueDTO issue = jiraService.getIssue(jiraIssueKey);
        String prompt = buildJiraPrompt(issue, additionalPrompt);
        validator.validatePrompt(prompt);

        // Reuse existing flow by creating a fresh Generation and uploading Jira
        // attachments
        long started = System.currentTimeMillis();

        String generationId = ulid.nextULID();
        String sessionId = ulid.nextULID();

        Generation g = new Generation();
        g.setGenerationId(generationId);
        g.setSessionId(sessionId);
        g.setPrompt(prompt);
        g.setJiraIssueKey(jiraIssueKey);
        g.setActiveVersion(1);
        g.setStatus(GenerationStatus.PENDING);
        g.setCreatedAt(Instant.now());
        g.setUpdatedAt(Instant.now());
        g.setUserId(userId);
        generationRepo.save(g);

        audit.recordEvent("GENERATION_REQUESTED", generationId, sessionId, 0,
                Map.of("hasFiles", true, "streaming", false, "source", "jira", "jiraIssueKey", jiraIssueKey));

        List<FileRefDto> fileRefs = new ArrayList<>();

        // Upload Jira attachments
        if (issue.attachments() != null) {
            for (JiraIssueDTO.JiraAttachmentDTO a : issue.attachments()) {
                if (a == null || a.content() == null || a.content().isBlank())
                    continue;

                byte[] bytes;
                try {
                    bytes = Base64.getDecoder().decode(a.content());
                } catch (IllegalArgumentException e) {
                    continue;
                }

                String mimeType = a.mimeType();
                String originalName = a.filename();
                long sizeBytes = bytes.length;

                validator.validateBytes(mimeType, sizeBytes, originalName);

                String sha256 = validator.computeSha256(bytes);
                String safeName = validator.sanitizeFilename(originalName);
                String objectKey = generationId + "/" + sha256 + "_" + safeName;
                String minioPath = fileStorage.putBytesToMinio(objectKey, bytes, mimeType, originalName);

                GenerationFile meta = new GenerationFile();
                meta.setFileId(ulid.nextULID());
                meta.setGenerationId(generationId);
                meta.setOriginalName(originalName);
                meta.setMimeType(mimeType);
                meta.setSizeBytes(sizeBytes);
                meta.setSha256(sha256);
                meta.setMinioPath(minioPath);
                meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                fileRepo.save(meta);

                FileRefDto ref = new FileRefDto();
                ref.minioPath = minioPath;
                ref.mimeType = mimeType;
                ref.originalName = originalName;
                ref.sha256 = sha256;
                ref.sizeBytes = sizeBytes;
                fileRefs.add(ref);
            }
        }

        // Upload any extra user files
        if (extraFiles != null) {
            for (MultipartFile f : extraFiles) {
                if (f == null || f.isEmpty())
                    continue;
                validator.validateFile(f);

                String sha256 = validator.computeSha256(f);
                String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                String objectKey = generationId + "/" + sha256 + "_" + safeName;
                String minioPath = fileStorage.putToMinio(objectKey, f);

                GenerationFile meta = new GenerationFile();
                meta.setFileId(ulid.nextULID());
                meta.setGenerationId(generationId);
                meta.setOriginalName(f.getOriginalFilename());
                meta.setMimeType(f.getContentType());
                meta.setSizeBytes(f.getSize());
                meta.setSha256(sha256);
                meta.setMinioPath(minioPath);
                meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                fileRepo.save(meta);

                FileRefDto ref = new FileRefDto();
                ref.minioPath = minioPath;
                ref.mimeType = f.getContentType();
                ref.originalName = f.getOriginalFilename();
                ref.sha256 = sha256;
                ref.sizeBytes = f.getSize();
                fileRefs.add(ref);
            }
        }

        g.setStatus(GenerationStatus.PROCESSING);
        g.setUpdatedAt(Instant.now());
        generationRepo.save(g);

        FastApiGenerateRequest req = new FastApiGenerateRequest();
        req.generationId = generationId;
        req.prompt = prompt;
        req.mode = "full";
        req.fileRefs = fileRefs;
        req.domain = (domain != null && !domain.isBlank()) ? domain : null;

        FastApiGenerateResponse fastResp = fastApi.generate(req);

        UiSpecVersion spec = new UiSpecVersion();
        spec.setSpecVersionId(ulid.nextULID());
        spec.setGenerationId(generationId);
        spec.setVersion(1);
        spec.setUiSpec(fastResp.uiSpec);
        spec.setType(UiSpecVersion.Type.INITIAL);
        spec.setCreatedAt(Instant.now());
        uiSpecRepo.save(spec);

        CodeVersion cv = new CodeVersion();
        cv.setCodeVersionId(ulid.nextULID());
        cv.setGenerationId(generationId);
        cv.setVersion(1);
        cv.setCreatedAt(Instant.now());

        List<FileEntry> entries = new ArrayList<>();
        if (fastResp.codeBundle != null && fastResp.codeBundle.files != null) {
            fastResp.codeBundle.files.forEach(f -> entries.add(new FileEntry(f.path, f.content)));
        }
        cv.setFiles(entries);
        codeRepo.save(cv);

        AiReport report = new AiReport();
        report.setReportId(ulid.nextULID());
        report.setGenerationId(generationId);
        report.setVersion(1);
        report.setCreatedAt(Instant.now());

        if (fastResp.aiReport != null) {
            report.setScore(fastResp.aiReport.score);
            report.setIssues(fastResp.aiReport.issues);
            report.setSourcesUsed(fastResp.aiReport.sources_used);
            report.setLlmProvider(fastResp.aiReport.llm_provider);
            report.setDurations(fastResp.aiReport.durations);
            report.setRetriesCount(fastResp.aiReport.retries_count);
            report.setBuildRetries(fastResp.aiReport.build_retries);
            report.setUiEvaluation(fastResp.aiReport.ui_evaluation);
        } else {
            report.setScore(0);
            report.setIssues(List.of());
            report.setSourcesUsed(List.of());
            report.setLlmProvider("unknown");
            report.setDurations(Map.of());
            report.setRetriesCount(0);
        }

        reportRepo.save(report);

        g.setStatus(GenerationStatus.COMPLETED);
        g.setActiveVersion(1);
        g.setUpdatedAt(Instant.now());

        // Store quality evaluation scores from FastAPI
        if (fastResp.aiReport != null && fastResp.aiReport.ui_evaluation != null) {
            Map<String, Object> uiEval = fastResp.aiReport.ui_evaluation;
            Object globalScoreObj = uiEval.get("global_score");
            if (globalScoreObj instanceof Number) {
                g.setGlobalScore(((Number) globalScoreObj).intValue());
            }
            Object semanticFidelityObj = uiEval.get("semantic_fidelity");
            if (semanticFidelityObj instanceof Number) {
                g.setSemanticFidelity(((Number) semanticFidelityObj).intValue());
            }
            Object codeQualityObj = uiEval.get("code_quality");
            if (codeQualityObj instanceof Number) {
                g.setCodeQuality(((Number) codeQualityObj).intValue());
            }
            Object completenessObj = uiEval.get("completeness");
            if (completenessObj instanceof Number) {
                g.setCompleteness(((Number) completenessObj).intValue());
            }
            Object accessibilityObj = uiEval.get("accessibility");
            if (accessibilityObj instanceof Number) {
                g.setAccessibility(((Number) accessibilityObj).intValue());
            }
            Object visualRichnessObj = uiEval.get("visual_richness");
            if (visualRichnessObj instanceof Number) {
                g.setVisualRichness(((Number) visualRichnessObj).intValue());
            }
        }

        generationRepo.save(g);

        long durationMs = System.currentTimeMillis() - started;
        audit.recordEvent("GENERATION_COMPLETED", generationId, sessionId, durationMs,
                Map.of("durationMs", durationMs, "filesCount", fileRefs.size(), "streaming", false, "source", "jira"));

        GenerationCreateResponse out = new GenerationCreateResponse();
        out.generationId = generationId;
        out.sessionId = sessionId;
        out.status = g.getStatus();
        out.activeVersion = g.getActiveVersion();
        out.uiSpec = fastResp.uiSpec;
        out.codeBundle = fastResp.codeBundle;
        out.aiReport = fastResp.aiReport;
        return out;
    }

    @SuppressWarnings("unchecked")
    public void createGenerationStreamFromJira(
            String userId,
            String jiraIssueKey,
            String additionalPrompt,
            List<MultipartFile> extraFiles,
            String domain,
            String model,
            PrintWriter writer) {

        JiraIssueDTO issue = jiraService.getIssue(jiraIssueKey);
        String prompt = buildJiraPrompt(issue, additionalPrompt);

        final ObjectMapper mapper = new ObjectMapper();
        String generationId = null;
        String sessionId = null;

        try {
            validator.validatePrompt(prompt);

            generationId = ulid.nextULID();
            sessionId = ulid.nextULID();
            final String gId = generationId;
            final String sId = sessionId;

            Generation g = new Generation();
            g.setGenerationId(gId);
            g.setSessionId(sId);
            g.setPrompt(prompt);
            g.setJiraIssueKey(jiraIssueKey);
            g.setActiveVersion(1);
            g.setStatus(GenerationStatus.PENDING);
            g.setCreatedAt(Instant.now());
            g.setUpdatedAt(Instant.now());
            g.setUserId(userId);
            generationRepo.save(g);

            audit.recordEvent("GENERATION_REQUESTED", gId, sId, 0,
                    Map.of("hasFiles", true, "streaming", true, "model", model != null ? model : "default",
                            "source", "jira", "jiraIssueKey", jiraIssueKey));

            // ── Upload Jira attachments + extraFiles to MinIO ─────────────────
            List<FileRefDto> fileRefs = new ArrayList<>();

            if (issue.attachments() != null) {
                for (JiraIssueDTO.JiraAttachmentDTO a : issue.attachments()) {
                    if (a == null || a.content() == null || a.content().isBlank())
                        continue;

                    byte[] bytes;
                    try {
                        bytes = Base64.getDecoder().decode(a.content());
                    } catch (IllegalArgumentException e) {
                        continue;
                    }

                    String mimeType = a.mimeType();
                    String originalName = a.filename();
                    long sizeBytes = bytes.length;

                    validator.validateBytes(mimeType, sizeBytes, originalName);

                    String sha256 = validator.computeSha256(bytes);
                    String safeName = validator.sanitizeFilename(originalName);
                    String objectKey = gId + "/" + sha256 + "_" + safeName;
                    String minioPath = fileStorage.putBytesToMinio(objectKey, bytes, mimeType, originalName);

                    GenerationFile meta = new GenerationFile();
                    meta.setFileId(ulid.nextULID());
                    meta.setGenerationId(gId);
                    meta.setOriginalName(originalName);
                    meta.setMimeType(mimeType);
                    meta.setSizeBytes(sizeBytes);
                    meta.setSha256(sha256);
                    meta.setMinioPath(minioPath);
                    meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                    fileRepo.save(meta);

                    FileRefDto ref = new FileRefDto();
                    ref.minioPath = minioPath;
                    ref.mimeType = mimeType;
                    ref.originalName = originalName;
                    ref.sha256 = sha256;
                    ref.sizeBytes = sizeBytes;
                    fileRefs.add(ref);
                }
            }

            if (extraFiles != null) {
                for (MultipartFile f : extraFiles) {
                    if (f == null || f.isEmpty())
                        continue;
                    validator.validateFile(f);

                    String sha256 = validator.computeSha256(f);
                    String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                    String objectKey = gId + "/" + sha256 + "_" + safeName;
                    String minioPath = fileStorage.putToMinio(objectKey, f);

                    GenerationFile meta = new GenerationFile();
                    meta.setFileId(ulid.nextULID());
                    meta.setGenerationId(gId);
                    meta.setOriginalName(f.getOriginalFilename());
                    meta.setMimeType(f.getContentType());
                    meta.setSizeBytes(f.getSize());
                    meta.setSha256(sha256);
                    meta.setMinioPath(minioPath);
                    meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                    fileRepo.save(meta);

                    FileRefDto ref = new FileRefDto();
                    ref.minioPath = minioPath;
                    ref.mimeType = f.getContentType();
                    ref.originalName = f.getOriginalFilename();
                    ref.sha256 = sha256;
                    ref.sizeBytes = f.getSize();
                    fileRefs.add(ref);
                }
            }

            g.setStatus(GenerationStatus.PROCESSING);
            g.setUpdatedAt(Instant.now());
            generationRepo.save(g);

            FastApiGenerateRequest req = new FastApiGenerateRequest();
            req.generationId = gId;
            req.prompt = prompt;
            req.mode = "full";
            req.fileRefs = fileRefs;
            req.domain = (domain != null && !domain.isBlank()) ? domain : null;
            req.model = (model != null && !model.isBlank()) ? model : null;

            final long started = System.currentTimeMillis();
            final String[] completedResultHolder = { null };

            String fastapiUrl = fastApiBaseUrl + "/internal/generate/stream";
            String reqJson = mapper.writeValueAsString(req);

            HttpURLConnection conn = (HttpURLConnection) new URL(fastapiUrl).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setDoOutput(true);
            conn.setConnectTimeout(30_000);
            conn.setReadTimeout(660_000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(reqJson.getBytes(StandardCharsets.UTF_8));
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: "))
                        continue;
                    String json = line.substring(6).trim();
                    if (json.isEmpty())
                        continue;
                    if (json.contains("\"type\":\"complete\"")) {
                        try {
                            Map<String, Object> eventMap = mapper.readValue(json, Map.class);
                            Object resultObj = eventMap.get("result");
                            if (resultObj instanceof Map) {
                                Map<String, Object> resultMap = (Map<String, Object>) resultObj;
                                resultMap.put("generationId", gId);
                            }
                            json = mapper.writeValueAsString(eventMap);
                        } catch (Exception ignored) {
                        }
                        completedResultHolder[0] = json;
                    }
                    writer.print("data: " + json + "\n\n");
                    writer.flush();
                }
            } finally {
                conn.disconnect();
            }

            if (completedResultHolder[0] != null) {
                try {
                    Map<String, Object> wrapper = mapper.readValue(completedResultHolder[0], Map.class);
                    Map<String, Object> result = (Map<String, Object>) wrapper.get("result");

                    Object uiSpecRaw = result != null ? result.get("uiSpec") : null;
                    Object codeBundleRaw = result != null ? result.get("codeBundle") : null;
                    Object aiReportRaw = result != null ? result.get("aiReport") : null;

                    UiSpecVersion spec = new UiSpecVersion();
                    spec.setSpecVersionId(ulid.nextULID());
                    spec.setGenerationId(gId);
                    spec.setVersion(1);
                    Map<String, Object> uiSpecMap = uiSpecRaw instanceof Map ? (Map<String, Object>) uiSpecRaw
                            : Map.of();
                    spec.setUiSpec(uiSpecMap);
                    spec.setType(UiSpecVersion.Type.INITIAL);
                    spec.setCreatedAt(Instant.now());
                    uiSpecRepo.save(spec);

                    CodeVersion cv = new CodeVersion();
                    cv.setCodeVersionId(ulid.nextULID());
                    cv.setGenerationId(gId);
                    cv.setVersion(1);
                    cv.setCreatedAt(Instant.now());
                    List<FileEntry> entries = new ArrayList<>();
                    if (codeBundleRaw instanceof Map) {
                        Object filesObj = ((Map<?, ?>) codeBundleRaw).get("files");
                        if (filesObj instanceof List) {
                            for (Object fObj : (List<?>) filesObj) {
                                if (fObj instanceof Map) {
                                    Map<?, ?> fm = (Map<?, ?>) fObj;
                                    entries.add(new FileEntry(
                                            String.valueOf(fm.get("path")),
                                            String.valueOf(fm.get("content"))));
                                }
                            }
                        }
                    }
                    cv.setFiles(entries);
                    codeRepo.save(cv);

                    AiReport report = new AiReport();
                    report.setReportId(ulid.nextULID());
                    report.setGenerationId(gId);
                    report.setVersion(1);
                    report.setCreatedAt(Instant.now());
                    if (aiReportRaw instanceof Map) {
                        Map<?, ?> rmap = (Map<?, ?>) aiReportRaw;
                        report.setScore(
                                rmap.get("score") instanceof Number ? ((Number) rmap.get("score")).intValue() : 0);
                        Object llmProviderObj = rmap.get("llm_provider");
                        report.setLlmProvider(llmProviderObj != null ? String.valueOf(llmProviderObj) : "unknown");
                        report.setRetriesCount(rmap.get("retries_count") instanceof Number
                                ? ((Number) rmap.get("retries_count")).intValue()
                                : 0);
                        report.setBuildRetries(rmap.get("build_retries") instanceof Number
                                ? ((Number) rmap.get("build_retries")).intValue()
                                : 0);
                        List<Map<String, Object>> issues = rmap.get("issues") instanceof List
                                ? (List<Map<String, Object>>) rmap.get("issues")
                                : List.of();
                        report.setIssues(issues);
                        List<String> sourcesUsed = rmap.get("sources_used") instanceof List
                                ? (List<String>) rmap.get("sources_used")
                                : List.of();
                        report.setSourcesUsed(sourcesUsed);
                        Map<String, Object> durations = rmap.get("durations") instanceof Map
                                ? (Map<String, Object>) rmap.get("durations")
                                : Map.of();
                        report.setDurations(durations);
                    } else {
                        report.setScore(0);
                        report.setIssues(List.of());
                        report.setSourcesUsed(List.of());
                        report.setLlmProvider("unknown");
                        report.setDurations(Map.of());
                        report.setRetriesCount(0);
                    }
                    reportRepo.save(report);

                    g.setStatus(GenerationStatus.COMPLETED);
                    g.setActiveVersion(1);
                    g.setUpdatedAt(Instant.now());
                    generationRepo.save(g);

                    long durationMs = System.currentTimeMillis() - started;
                    audit.recordEvent("GENERATION_COMPLETED", gId, sId, durationMs,
                            Map.of("durationMs", durationMs, "filesCount", fileRefs.size(), "streaming", true, "source",
                                    "jira"));
                } catch (Exception ignored) {
                }
            }

        } catch (Exception e) {
            log.error("createGenerationStreamFromJira failed for generationId={}: {}", generationId, e.getMessage(), e);
            if (generationId != null) {
                try {
                    Generation failed = generationRepo.findById(generationId).orElse(null);
                    if (failed != null) {
                        failed.setStatus(GenerationStatus.FAILED);
                        failed.setUpdatedAt(Instant.now());
                        generationRepo.save(failed);
                    }
                } catch (Exception ignored) {
                }
            }
            try {
                writer.print(
                        "data: {\"type\":\"error\",\"message\":\"" + e.getMessage().replace("\"", "'") + "\"}\n\n");
                writer.flush();
            } catch (Exception ignored) {
            }
        }
    }

    public GenerationCreateResponse createGenerationFromJiraMulti(
            String userId,
            List<String> jiraIssueKeys,
            String additionalPrompt,
            List<MultipartFile> extraFiles,
            String domain) {

        List<String> keys = (jiraIssueKeys == null) ? List.of()
                : jiraIssueKeys.stream()
                        .filter(k -> k != null && !k.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (keys.isEmpty()) {
            throw new IllegalArgumentException("jiraIssueKeys must not be empty");
        }

        List<JiraIssueDTO> issues = new ArrayList<>();
        for (String key : keys) {
            issues.add(jiraService.getIssue(key));
        }

        String prompt = buildJiraPromptMulti(issues, additionalPrompt);
        validator.validatePrompt(prompt);

        long started = System.currentTimeMillis();

        String generationId = ulid.nextULID();
        String sessionId = ulid.nextULID();

        Generation g = new Generation();
        g.setGenerationId(generationId);
        g.setSessionId(sessionId);
        g.setPrompt(prompt);
        g.setJiraIssueKey(keys.get(0));
        g.setJiraIssueKeys(keys);
        g.setActiveVersion(1);
        g.setStatus(GenerationStatus.PENDING);
        g.setCreatedAt(Instant.now());
        g.setUpdatedAt(Instant.now());
        g.setUserId(userId);
        generationRepo.save(g);

        audit.recordEvent("GENERATION_REQUESTED", generationId, sessionId, 0,
                Map.of("hasFiles", true, "streaming", false, "source", "jira", "jiraIssueKeys", keys));

        List<FileRefDto> fileRefs = new ArrayList<>();

        // Upload attachments from all selected Jira tickets
        long totalAttachmentBytes = 0;
        final long totalCapBytes = 20L * 1024 * 1024; // 20MB safety cap

        for (JiraIssueDTO issue : issues) {
            if (issue.attachments() == null)
                continue;
            for (JiraIssueDTO.JiraAttachmentDTO a : issue.attachments()) {
                if (a == null || a.content() == null || a.content().isBlank())
                    continue;

                byte[] bytes;
                try {
                    bytes = Base64.getDecoder().decode(a.content());
                } catch (IllegalArgumentException e) {
                    continue;
                }

                if (totalAttachmentBytes + bytes.length > totalCapBytes) {
                    log.warn("Skipping Jira attachments beyond total cap ({} bytes)", totalCapBytes);
                    break;
                }

                String mimeType = a.mimeType();
                String originalName = a.filename();
                long sizeBytes = bytes.length;

                validator.validateBytes(mimeType, sizeBytes, originalName);

                String sha256 = validator.computeSha256(bytes);
                String safeName = validator.sanitizeFilename(originalName);
                String objectKey = generationId + "/" + sha256 + "_" + safeName;
                String minioPath = fileStorage.putBytesToMinio(objectKey, bytes, mimeType, originalName);

                GenerationFile meta = new GenerationFile();
                meta.setFileId(ulid.nextULID());
                meta.setGenerationId(generationId);
                meta.setOriginalName(originalName);
                meta.setMimeType(mimeType);
                meta.setSizeBytes(sizeBytes);
                meta.setSha256(sha256);
                meta.setMinioPath(minioPath);
                meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                fileRepo.save(meta);

                FileRefDto ref = new FileRefDto();
                ref.minioPath = minioPath;
                ref.mimeType = mimeType;
                ref.originalName = originalName;
                ref.sha256 = sha256;
                ref.sizeBytes = sizeBytes;
                fileRefs.add(ref);

                totalAttachmentBytes += sizeBytes;
            }
        }

        // Upload any extra user files
        if (extraFiles != null) {
            for (MultipartFile f : extraFiles) {
                if (f == null || f.isEmpty())
                    continue;
                validator.validateFile(f);

                String sha256 = validator.computeSha256(f);
                String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                String objectKey = generationId + "/" + sha256 + "_" + safeName;
                String minioPath = fileStorage.putToMinio(objectKey, f);

                GenerationFile meta = new GenerationFile();
                meta.setFileId(ulid.nextULID());
                meta.setGenerationId(generationId);
                meta.setOriginalName(f.getOriginalFilename());
                meta.setMimeType(f.getContentType());
                meta.setSizeBytes(f.getSize());
                meta.setSha256(sha256);
                meta.setMinioPath(minioPath);
                meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                fileRepo.save(meta);

                FileRefDto ref = new FileRefDto();
                ref.minioPath = minioPath;
                ref.mimeType = f.getContentType();
                ref.originalName = f.getOriginalFilename();
                ref.sha256 = sha256;
                ref.sizeBytes = f.getSize();
                fileRefs.add(ref);
            }
        }

        g.setStatus(GenerationStatus.PROCESSING);
        g.setUpdatedAt(Instant.now());
        generationRepo.save(g);

        FastApiGenerateRequest req = new FastApiGenerateRequest();
        req.generationId = generationId;
        req.prompt = prompt;
        req.mode = "full";
        req.fileRefs = fileRefs;
        req.domain = (domain != null && !domain.isBlank()) ? domain : null;

        FastApiGenerateResponse fastResp = fastApi.generate(req);

        UiSpecVersion spec = new UiSpecVersion();
        spec.setSpecVersionId(ulid.nextULID());
        spec.setGenerationId(generationId);
        spec.setVersion(1);
        spec.setUiSpec(fastResp.uiSpec);
        spec.setType(UiSpecVersion.Type.INITIAL);
        spec.setCreatedAt(Instant.now());
        uiSpecRepo.save(spec);

        CodeVersion cv = new CodeVersion();
        cv.setCodeVersionId(ulid.nextULID());
        cv.setGenerationId(generationId);
        cv.setVersion(1);
        cv.setCreatedAt(Instant.now());

        List<FileEntry> entries = new ArrayList<>();
        if (fastResp.codeBundle != null && fastResp.codeBundle.files != null) {
            fastResp.codeBundle.files.forEach(f -> entries.add(new FileEntry(f.path, f.content)));
        }
        cv.setFiles(entries);
        codeRepo.save(cv);

        AiReport report = new AiReport();
        report.setReportId(ulid.nextULID());
        report.setGenerationId(generationId);
        report.setVersion(1);
        report.setCreatedAt(Instant.now());

        if (fastResp.aiReport != null) {
            report.setScore(fastResp.aiReport.score);
            report.setIssues(fastResp.aiReport.issues);
            report.setSourcesUsed(fastResp.aiReport.sources_used);
            report.setLlmProvider(fastResp.aiReport.llm_provider);
            report.setDurations(fastResp.aiReport.durations);
            report.setRetriesCount(fastResp.aiReport.retries_count);
            report.setBuildRetries(fastResp.aiReport.build_retries);
            report.setUiEvaluation(fastResp.aiReport.ui_evaluation);
        } else {
            report.setScore(0);
            report.setIssues(List.of());
            report.setSourcesUsed(List.of());
            report.setLlmProvider("unknown");
            report.setDurations(Map.of());
            report.setRetriesCount(0);
        }
        reportRepo.save(report);

        g.setStatus(GenerationStatus.COMPLETED);
        g.setActiveVersion(1);
        g.setUpdatedAt(Instant.now());
        generationRepo.save(g);

        long durationMs = System.currentTimeMillis() - started;
        audit.recordEvent("GENERATION_COMPLETED", generationId, sessionId, durationMs,
                Map.of("durationMs", durationMs, "filesCount", fileRefs.size(), "streaming", false, "source", "jira",
                        "jiraIssueKeys", keys));

        GenerationCreateResponse out = new GenerationCreateResponse();
        out.generationId = generationId;
        out.sessionId = sessionId;
        out.status = g.getStatus();
        out.activeVersion = g.getActiveVersion();
        out.uiSpec = fastResp.uiSpec;
        out.codeBundle = fastResp.codeBundle;
        out.aiReport = fastResp.aiReport;
        return out;
    }

    @SuppressWarnings("unchecked")
    public void createGenerationStreamFromJiraMulti(
            String userId,
            List<String> jiraIssueKeys,
            String additionalPrompt,
            List<MultipartFile> extraFiles,
            String domain,
            String model,
            PrintWriter writer) {

        List<String> keys = (jiraIssueKeys == null) ? List.of()
                : jiraIssueKeys.stream()
                        .filter(k -> k != null && !k.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (keys.isEmpty()) {
            throw new IllegalArgumentException("jiraIssueKeys must not be empty");
        }

        List<JiraIssueDTO> issues = new ArrayList<>();
        for (String key : keys) {
            issues.add(jiraService.getIssue(key));
        }

        String prompt = buildJiraPromptMulti(issues, additionalPrompt);

        final ObjectMapper mapper = new ObjectMapper();
        String generationId = null;
        String sessionId = null;

        try {
            validator.validatePrompt(prompt);

            generationId = ulid.nextULID();
            sessionId = ulid.nextULID();
            final String gId = generationId;
            final String sId = sessionId;

            Generation g = new Generation();
            g.setGenerationId(gId);
            g.setSessionId(sId);
            g.setPrompt(prompt);
            g.setJiraIssueKey(keys.get(0));
            g.setJiraIssueKeys(keys);
            g.setActiveVersion(1);
            g.setStatus(GenerationStatus.PENDING);
            g.setCreatedAt(Instant.now());
            g.setUpdatedAt(Instant.now());
            g.setUserId(userId);
            generationRepo.save(g);

            audit.recordEvent("GENERATION_REQUESTED", gId, sId, 0,
                    Map.of("hasFiles", true, "streaming", true, "model", model != null ? model : "default",
                            "source", "jira", "jiraIssueKeys", keys));

            // ── Upload Jira attachments + extraFiles to MinIO ─────────────────
            List<FileRefDto> fileRefs = new ArrayList<>();

            long totalAttachmentBytes = 0;
            final long totalCapBytes = 20L * 1024 * 1024; // 20MB safety cap

            for (JiraIssueDTO issue : issues) {
                if (issue.attachments() == null)
                    continue;
                for (JiraIssueDTO.JiraAttachmentDTO a : issue.attachments()) {
                    if (a == null || a.content() == null || a.content().isBlank())
                        continue;

                    byte[] bytes;
                    try {
                        bytes = Base64.getDecoder().decode(a.content());
                    } catch (IllegalArgumentException e) {
                        continue;
                    }

                    if (totalAttachmentBytes + bytes.length > totalCapBytes) {
                        log.warn("Skipping Jira attachments beyond total cap ({} bytes)", totalCapBytes);
                        break;
                    }

                    String mimeType = a.mimeType();
                    String originalName = a.filename();
                    long sizeBytes = bytes.length;

                    validator.validateBytes(mimeType, sizeBytes, originalName);

                    String sha256 = validator.computeSha256(bytes);
                    String safeName = validator.sanitizeFilename(originalName);
                    String objectKey = gId + "/" + sha256 + "_" + safeName;
                    String minioPath = fileStorage.putBytesToMinio(objectKey, bytes, mimeType, originalName);

                    GenerationFile meta = new GenerationFile();
                    meta.setFileId(ulid.nextULID());
                    meta.setGenerationId(gId);
                    meta.setOriginalName(originalName);
                    meta.setMimeType(mimeType);
                    meta.setSizeBytes(sizeBytes);
                    meta.setSha256(sha256);
                    meta.setMinioPath(minioPath);
                    meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                    fileRepo.save(meta);

                    FileRefDto ref = new FileRefDto();
                    ref.minioPath = minioPath;
                    ref.mimeType = mimeType;
                    ref.originalName = originalName;
                    ref.sha256 = sha256;
                    ref.sizeBytes = sizeBytes;
                    fileRefs.add(ref);

                    totalAttachmentBytes += sizeBytes;
                }
            }

            if (extraFiles != null) {
                for (MultipartFile f : extraFiles) {
                    if (f == null || f.isEmpty())
                        continue;
                    validator.validateFile(f);

                    String sha256 = validator.computeSha256(f);
                    String safeName = validator.sanitizeFilename(f.getOriginalFilename());
                    String objectKey = gId + "/" + sha256 + "_" + safeName;
                    String minioPath = fileStorage.putToMinio(objectKey, f);

                    GenerationFile meta = new GenerationFile();
                    meta.setFileId(ulid.nextULID());
                    meta.setGenerationId(gId);
                    meta.setOriginalName(f.getOriginalFilename());
                    meta.setMimeType(f.getContentType());
                    meta.setSizeBytes(f.getSize());
                    meta.setSha256(sha256);
                    meta.setMinioPath(minioPath);
                    meta.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
                    fileRepo.save(meta);

                    FileRefDto ref = new FileRefDto();
                    ref.minioPath = minioPath;
                    ref.mimeType = f.getContentType();
                    ref.originalName = f.getOriginalFilename();
                    ref.sha256 = sha256;
                    ref.sizeBytes = f.getSize();
                    fileRefs.add(ref);
                }
            }

            g.setStatus(GenerationStatus.PROCESSING);
            g.setUpdatedAt(Instant.now());
            generationRepo.save(g);

            FastApiGenerateRequest req = new FastApiGenerateRequest();
            req.generationId = gId;
            req.prompt = prompt;
            req.mode = "full";
            req.fileRefs = fileRefs;
            req.domain = (domain != null && !domain.isBlank()) ? domain : null;
            req.model = (model != null && !model.isBlank()) ? model : null;

            final long started = System.currentTimeMillis();
            final String[] completedResultHolder = { null };

            String fastapiUrl = fastApiBaseUrl + "/internal/generate/stream";
            String reqJson = mapper.writeValueAsString(req);

            HttpURLConnection conn = (HttpURLConnection) new URL(fastapiUrl).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setDoOutput(true);
            conn.setConnectTimeout(30_000);
            conn.setReadTimeout(660_000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(reqJson.getBytes(StandardCharsets.UTF_8));
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: "))
                        continue;
                    String json = line.substring(6).trim();
                    if (json.isEmpty())
                        continue;
                    if (json.contains("\"type\":\"complete\"")) {
                        try {
                            Map<String, Object> eventMap = mapper.readValue(json, Map.class);
                            Object resultObj = eventMap.get("result");
                            if (resultObj instanceof Map) {
                                Map<String, Object> resultMap = (Map<String, Object>) resultObj;
                                resultMap.put("generationId", gId);
                            }
                            json = mapper.writeValueAsString(eventMap);
                        } catch (Exception ignored) {
                        }
                        completedResultHolder[0] = json;
                    }
                    writer.print("data: " + json + "\n\n");
                    writer.flush();
                }
            } finally {
                conn.disconnect();
            }

            if (completedResultHolder[0] != null) {
                try {
                    Map<String, Object> wrapper = mapper.readValue(completedResultHolder[0], Map.class);
                    Map<String, Object> result = (Map<String, Object>) wrapper.get("result");

                    Object uiSpecRaw = result != null ? result.get("uiSpec") : null;
                    Object codeBundleRaw = result != null ? result.get("codeBundle") : null;
                    Object aiReportRaw = result != null ? result.get("aiReport") : null;

                    UiSpecVersion spec = new UiSpecVersion();
                    spec.setSpecVersionId(ulid.nextULID());
                    spec.setGenerationId(gId);
                    spec.setVersion(1);
                    Map<String, Object> uiSpecMap = uiSpecRaw instanceof Map ? (Map<String, Object>) uiSpecRaw
                            : Map.of();
                    spec.setUiSpec(uiSpecMap);
                    spec.setType(UiSpecVersion.Type.INITIAL);
                    spec.setCreatedAt(Instant.now());
                    uiSpecRepo.save(spec);

                    CodeVersion cv = new CodeVersion();
                    cv.setCodeVersionId(ulid.nextULID());
                    cv.setGenerationId(gId);
                    cv.setVersion(1);
                    cv.setCreatedAt(Instant.now());
                    List<FileEntry> entries = new ArrayList<>();
                    if (codeBundleRaw instanceof Map) {
                        Object filesObj = ((Map<?, ?>) codeBundleRaw).get("files");
                        if (filesObj instanceof List) {
                            for (Object fObj : (List<?>) filesObj) {
                                if (fObj instanceof Map) {
                                    Map<?, ?> fm = (Map<?, ?>) fObj;
                                    entries.add(new FileEntry(
                                            String.valueOf(fm.get("path")),
                                            String.valueOf(fm.get("content"))));
                                }
                            }
                        }
                    }
                    cv.setFiles(entries);
                    codeRepo.save(cv);

                    AiReport report = new AiReport();
                    report.setReportId(ulid.nextULID());
                    report.setGenerationId(gId);
                    report.setVersion(1);
                    report.setCreatedAt(Instant.now());
                    if (aiReportRaw instanceof Map) {
                        Map<?, ?> rmap = (Map<?, ?>) aiReportRaw;
                        report.setScore(
                                rmap.get("score") instanceof Number ? ((Number) rmap.get("score")).intValue() : 0);
                        Object llmProviderObj = rmap.get("llm_provider");
                        report.setLlmProvider(llmProviderObj != null ? String.valueOf(llmProviderObj) : "unknown");
                        report.setRetriesCount(rmap.get("retries_count") instanceof Number
                                ? ((Number) rmap.get("retries_count")).intValue()
                                : 0);
                        report.setBuildRetries(rmap.get("build_retries") instanceof Number
                                ? ((Number) rmap.get("build_retries")).intValue()
                                : 0);
                        List<Map<String, Object>> issuesList = rmap.get("issues") instanceof List
                                ? (List<Map<String, Object>>) rmap.get("issues")
                                : List.of();
                        report.setIssues(issuesList);
                        List<String> sourcesUsed = rmap.get("sources_used") instanceof List
                                ? (List<String>) rmap.get("sources_used")
                                : List.of();
                        report.setSourcesUsed(sourcesUsed);
                        Map<String, Object> durations = rmap.get("durations") instanceof Map
                                ? (Map<String, Object>) rmap.get("durations")
                                : Map.of();
                        report.setDurations(durations);
                    } else {
                        report.setScore(0);
                        report.setIssues(List.of());
                        report.setSourcesUsed(List.of());
                        report.setLlmProvider("unknown");
                        report.setDurations(Map.of());
                        report.setRetriesCount(0);
                    }
                    reportRepo.save(report);

                    g.setStatus(GenerationStatus.COMPLETED);
                    g.setActiveVersion(1);
                    g.setUpdatedAt(Instant.now());
                    generationRepo.save(g);

                    long durationMs = System.currentTimeMillis() - started;
                    audit.recordEvent("GENERATION_COMPLETED", gId, sId, durationMs,
                            Map.of("durationMs", durationMs, "filesCount", fileRefs.size(), "streaming", true, "source",
                                    "jira", "jiraIssueKeys", keys));
                } catch (Exception ignored) {
                }
            }

        } catch (Exception e) {
            log.error("createGenerationStreamFromJiraMulti failed for generationId={}: {}", generationId,
                    e.getMessage(), e);
            if (generationId != null) {
                try {
                    Generation failed = generationRepo.findById(generationId).orElse(null);
                    if (failed != null) {
                        failed.setStatus(GenerationStatus.FAILED);
                        failed.setUpdatedAt(Instant.now());
                        generationRepo.save(failed);
                    }
                } catch (Exception ignored) {
                }
            }
            try {
                writer.print(
                        "data: {\"type\":\"error\",\"message\":\"" + e.getMessage().replace("\"", "'") + "\"}\n\n");
                writer.flush();
            } catch (Exception ignored) {
            }
        }
    }

    private String buildJiraPrompt(JiraIssueDTO issue, String additionalPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Build a frontend UI based on this Jira ticket. Follow any attached mockups closely.\n\n");
        sb.append("Jira Key: ").append(issue.key()).append("\n");
        sb.append("Title: ").append(issue.summary()).append("\n\n");

        if (issue.description() != null && !issue.description().isBlank()) {
            sb.append("Description:\n").append(issue.description().trim()).append("\n\n");
        }
        if (issue.acceptanceCriteria() != null && !issue.acceptanceCriteria().isBlank()) {
            sb.append("Acceptance Criteria:\n").append(issue.acceptanceCriteria().trim()).append("\n\n");
        }
        if (additionalPrompt != null && !additionalPrompt.isBlank()) {
            sb.append("Additional instructions:\n").append(additionalPrompt.trim()).append("\n");
        }
        return sb.toString();
    }

    private String buildJiraPromptMulti(List<JiraIssueDTO> issues, String additionalPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Build ONE cohesive frontend UI that satisfies ALL of the following Jira tickets.\n");
        sb.append("Follow any attached mockups closely (mockups may come from multiple tickets).\n");
        sb.append("If tickets conflict, propose a sensible merged UX and keep the UI consistent.\n\n");

        for (int i = 0; i < issues.size(); i++) {
            JiraIssueDTO issue = issues.get(i);
            sb.append("--- Ticket ").append(i + 1).append(" ---\n");
            sb.append("Jira Key: ").append(issue.key()).append("\n");
            sb.append("Title: ").append(issue.summary()).append("\n\n");

            if (issue.description() != null && !issue.description().isBlank()) {
                sb.append("Description:\n").append(issue.description().trim()).append("\n\n");
            }
            if (issue.acceptanceCriteria() != null && !issue.acceptanceCriteria().isBlank()) {
                sb.append("Acceptance Criteria:\n").append(issue.acceptanceCriteria().trim()).append("\n\n");
            }
        }

        if (additionalPrompt != null && !additionalPrompt.isBlank()) {
            sb.append("Additional instructions:\n").append(additionalPrompt.trim()).append("\n");
        }

        return sb.toString();
    }

    public Generation getGeneration(String generationId) {
        return generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));
    }

    public List<Generation> listGenerations(String userId) {
        return generationRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void deleteGeneration(String generationId) {
        generationRepo.deleteById(generationId);
    }

    public void renameGeneration(String generationId, String name) {
        generationRepo.findById(generationId).ifPresent(g -> {
            g.setName(name);
            g.setUpdatedAt(Instant.now());
            generationRepo.save(g);
        });
    }

    public List<Generation> listAllGenerations() {
        return generationRepo.findAll()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
    }

    public GenerationVersionsResponse getVersions(String generationId) {
        Generation g = generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));

        Sort byVersionDesc = Sort.by(Sort.Direction.DESC, "version");

        List<UiSpecVersion> uiVersions = uiSpecRepo.findByGenerationId(generationId, byVersionDesc);
        List<CodeVersion> codeVersions = codeRepo.findByGenerationId(generationId, byVersionDesc);
        List<AiReport> reportVersions = reportRepo.findByGenerationId(generationId, byVersionDesc);

        GenerationVersionsResponse out = new GenerationVersionsResponse();
        out.generationId = generationId;
        out.activeVersion = g.getActiveVersion();

        out.uiSpecVersions = uiVersions.stream().map(v -> {
            GenerationVersionsResponse.UiSpecVersionSummary s = new GenerationVersionsResponse.UiSpecVersionSummary();
            s.version = v.getVersion();
            s.type = v.getType() != null ? v.getType().name() : null;
            s.createdAt = v.getCreatedAt();
            return s;
        }).collect(Collectors.toList());

        out.codeVersions = codeVersions.stream().map(v -> {
            GenerationVersionsResponse.CodeVersionSummary s = new GenerationVersionsResponse.CodeVersionSummary();
            s.version = v.getVersion();
            s.createdAt = v.getCreatedAt();
            return s;
        }).collect(Collectors.toList());

        out.aiReportVersions = reportVersions.stream().map(v -> {
            GenerationVersionsResponse.AiReportSummary s = new GenerationVersionsResponse.AiReportSummary();
            s.version = v.getVersion();
            s.score = v.getScore();
            s.llmProvider = v.getLlmProvider();
            s.createdAt = v.getCreatedAt();
            // Populate per-dimension scores from uiEvaluation if present
            Map<String, Object> eval = v.getUiEvaluation();
            if (eval != null) {
                s.semanticFidelity = numOrNull(eval.get("semantic_fidelity"));
                s.codeQuality      = numOrNull(eval.get("code_quality"));
                s.completeness     = numOrNull(eval.get("completeness"));
                s.accessibility    = numOrNull(eval.get("accessibility"));
                s.visualRichness   = numOrNull(eval.get("visual_richness"));
            }
            return s;
        }).collect(Collectors.toList());

        return out;
    }

    public CodeBundleDto getCode(String generationId) {
        // Read directly from disk — source of truth, always in sync with the preview.
        var projectFiles = fastApi.getProjectFiles(generationId);
        CodeBundleDto bundle = new CodeBundleDto();
        bundle.files = projectFiles.files == null ? List.of() : projectFiles.files;
        return bundle;
    }

    public EditFileResponse editFile(String generationId, String filePath, String instruction, String model) {
        EditFileRequest req = new EditFileRequest();
        req.generationId = generationId;
        req.filePath = filePath;
        req.instruction = instruction;
        req.model = model;

        // Save the user message before calling FastAPI
        ChatMessage userMsg = new ChatMessage();
        userMsg.setId(ulid.nextULID());
        userMsg.setGenerationId(generationId);
        userMsg.setRole("user");
        userMsg.setContent(instruction);
        userMsg.setVersionCreated(0);
        userMsg.setCreatedAt(Instant.now());
        chatRepo.save(userMsg);

        EditFileResponse resp = fastApi.editFile(req);

        // On successful edit, create a new CodeVersion so that
        // every chat edit becomes a rollback checkpoint.
        int newVersion = 0;
        if (resp.buildSuccess && resp.filePath != null && !resp.filePath.isBlank()) {
            Generation g = generationRepo.findById(generationId).orElse(null);
            if (g != null) {
                // baseVersion = the version whose files we build on top of (what's on disk now,
                //              e.g. v1 after a rollback to v1).
                // newVersionNumber = strictly greater than every existing snapshot so we never
                //              create a duplicate document (e.g. max=3 → new=4 even if active=1).
                int activeVer = g.getActiveVersion();
                int maxExisting = codeRepo.findByGenerationIdOrderByVersionAsc(generationId)
                        .stream().mapToInt(CodeVersion::getVersion).max().orElse(0);
                int newVersionNumber = Math.max(activeVer, maxExisting) + 1;

                String editedPath = resp.filePath.startsWith("src/")
                        ? resp.filePath
                        : "src/" + resp.filePath;

                // Load base files from the active (possibly rolled-back) version.
                // Fall back to reading from disk when no snapshot exists yet.
                List<FileEntry> baseFiles;
                var existingCv = codeRepo.findByGenerationIdAndVersion(generationId, activeVer);
                if (existingCv.isPresent() && existingCv.get().getFiles() != null
                        && !existingCv.get().getFiles().isEmpty()) {
                    baseFiles = new ArrayList<>(existingCv.get().getFiles());
                } else {
                    // No snapshot for activeVer yet — read current on-disk state (always
                    // reflects the last restore or generation build).
                    try {
                        var projectFiles = fastApi.getProjectFiles(generationId);
                        baseFiles = projectFiles.files == null ? new ArrayList<>()
                                : new ArrayList<>(projectFiles.files.stream()
                                        .map(f -> new FileEntry(f.path, f.content))
                                        .toList());
                    } catch (Exception ex) {
                        baseFiles = new ArrayList<>();
                    }
                }

                baseFiles.removeIf(fe -> fe.path().equals(editedPath) || fe.path().equals(resp.filePath));
                baseFiles.add(new FileEntry(editedPath, resp.content));

                CodeVersion newCv = new CodeVersion();
                newCv.setCodeVersionId(ulid.nextULID());
                newCv.setGenerationId(generationId);
                newCv.setVersion(newVersionNumber);
                newCv.setFiles(baseFiles);
                newCv.setCreatedAt(Instant.now());
                codeRepo.save(newCv);

                g.setActiveVersion(newVersionNumber);
                g.setUpdatedAt(Instant.now());
                generationRepo.save(g);
                newVersion = newVersionNumber;
            }
        }

        // Save the assistant reply with the version it created
        String replyText = resp.buildSuccess
                ? "Done! Updated `" + resp.filePath + "`. Build succeeded."
                : "Edit failed: " + resp.buildOutput;
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setId(ulid.nextULID());
        assistantMsg.setGenerationId(generationId);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(replyText);
        assistantMsg.setVersionCreated(newVersion);
        assistantMsg.setCreatedAt(Instant.now());
        chatRepo.save(assistantMsg);

        return resp;
    }

    public Map<String, Object> getQualityScores(String generationId, Integer version) {
        // Try the AiReport for the requested version; fall back to latest report; then
        // fall back to the denormalised scores on the Generation document itself.
        Optional<AiReport> reportOpt;
        if (version != null) {
            reportOpt = reportRepo.findByGenerationIdAndVersion(generationId, version);
        } else {
            reportOpt = reportRepo.findFirstByGenerationIdOrderByVersionDesc(generationId);
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();

        if (reportOpt.isPresent()) {
            AiReport r = reportOpt.get();
            Map<String, Object> eval = r.getUiEvaluation();
            if (eval != null && !eval.isEmpty()) {
                result.put("globalScore",       numOrNull(eval.get("global_score")));
                result.put("semanticFidelity",  numOrNull(eval.get("semantic_fidelity")));
                result.put("codeQuality",       numOrNull(eval.get("code_quality")));
                result.put("completeness",      numOrNull(eval.get("completeness")));
                result.put("accessibility",     numOrNull(eval.get("accessibility")));
                result.put("visualRichness",    numOrNull(eval.get("visual_richness")));
                result.put("version",           r.getVersion());
                result.put("source",            "ai_report");
                Object reasoning = eval.get("reasoning");
                if (reasoning instanceof Map<?, ?>) {
                    result.put("reasoning", reasoning);
                }
                return result;
            }
            // Report exists but uiEvaluation is empty — fall through to Generation-level scores
        }

        // Fallback: denormalised scores stored on the Generation document
        Generation g = generationRepo.findById(generationId).orElse(null);
        if (g != null && g.getGlobalScore() != null) {
            result.put("globalScore",       g.getGlobalScore());
            result.put("semanticFidelity",  g.getSemanticFidelity());
            result.put("codeQuality",       g.getCodeQuality());
            result.put("completeness",      g.getCompleteness());
            result.put("accessibility",     g.getAccessibility());
            result.put("visualRichness",    g.getVisualRichness());
            result.put("version",           g.getActiveVersion());
            result.put("source",            "generation");
        }
        // Returns empty map if no scores available anywhere
        return result;
    }

    private static Integer numOrNull(Object o) {
        if (o instanceof Number n) return n.intValue();
        return null;
    }

    public List<ChatMessageDto> getChatHistory(String generationId) {
        Sort byDate = Sort.by(Sort.Direction.ASC, "createdAt");
        return chatRepo.findByGenerationId(generationId, byDate).stream().map(m -> {
            ChatMessageDto dto = new ChatMessageDto();
            dto.id = m.getId();
            dto.role = m.getRole();
            dto.content = m.getContent();
            dto.versionCreated = m.getVersionCreated();
            dto.createdAt = m.getCreatedAt();
            return dto;
        }).collect(Collectors.toList());
    }

    public GenerationRollbackResponse rollback(String generationId, int targetVersion) {
        if (targetVersion <= 0) {
            throw new IllegalArgumentException("version must be > 0");
        }

        Generation g = generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));

        // Try to find the requested CodeVersion snapshot.
        // For old projects that pre-date version tracking, no snapshots exist yet —
        // in that case read files from disk and save them as the target version so
        // the restore can proceed.
        CodeVersion cv = codeRepo.findByGenerationIdAndVersion(generationId, targetVersion)
                .orElseGet(() -> {
                    log.warn("No snapshot for version {} of generation {} — bootstrapping from disk",
                            targetVersion, generationId);
                    List<FileEntry> diskFiles = new ArrayList<>();
                    try {
                        var projectFiles = fastApi.getProjectFiles(generationId);
                        if (projectFiles.files != null) {
                            projectFiles.files.forEach(f -> diskFiles.add(new FileEntry(f.path, f.content)));
                        }
                    } catch (Exception ex) {
                        log.warn("Could not read disk files for {}: {}", generationId, ex.getMessage());
                    }
                    if (diskFiles.isEmpty()) {
                        throw new IllegalArgumentException(
                                "No version snapshot found for v" + targetVersion
                                + " and no project files exist on disk. "
                                + "Make a new edit first to create a version checkpoint.");
                    }
                    CodeVersion bootstrap = new CodeVersion();
                    bootstrap.setCodeVersionId(ulid.nextULID());
                    bootstrap.setGenerationId(generationId);
                    bootstrap.setVersion(targetVersion);
                    bootstrap.setFiles(diskFiles);
                    bootstrap.setCreatedAt(Instant.now());
                    codeRepo.save(bootstrap);
                    return bootstrap;
                });

        List<CodeFileDto> filesToRestore;
        if (cv.getFiles() != null && !cv.getFiles().isEmpty()) {
            filesToRestore = cv.getFiles().stream().map(fe -> {
                CodeFileDto dto = new CodeFileDto();
                dto.path = fe.path();
                dto.content = fe.content();
                return dto;
            }).collect(Collectors.toList());
        } else {
            // Snapshot exists but files list empty — read from disk as fallback
            try {
                var projectFiles = fastApi.getProjectFiles(generationId);
                filesToRestore = projectFiles.files == null ? List.of()
                        : projectFiles.files.stream().map(f -> {
                            CodeFileDto dto = new CodeFileDto();
                            dto.path = f.path;
                            dto.content = f.content;
                            return dto;
                        }).collect(Collectors.toList());
            } catch (Exception ex) {
                filesToRestore = List.of();
            }
        }

        // Write the target files to disk and trigger a Vite rebuild
        RestoreRequest restoreReq = new RestoreRequest();
        restoreReq.generationId = generationId;
        restoreReq.files = filesToRestore;
        fastApi.restoreProject(restoreReq);

        int previous = g.getActiveVersion();
        g.setActiveVersion(targetVersion);
        g.setUpdatedAt(Instant.now());
        generationRepo.save(g);

        audit.recordEvent("GENERATION_ROLLBACK", generationId, g.getSessionId(), 0,
                Map.of("fromVersion", previous, "toVersion", targetVersion));

        GenerationRollbackResponse out = new GenerationRollbackResponse();
        out.generationId = generationId;
        out.previousActiveVersion = previous;
        out.activeVersion = g.getActiveVersion();
        out.updatedAt = g.getUpdatedAt();
        return out;
    }

    public com.aiuigenerator.bff.dto.DuplicateResponse duplicateGeneration(String sourceId, String userId) {
        // Get source generation
        Generation source = generationRepo.findById(sourceId)
                .orElseThrow(() -> new IllegalArgumentException("source generation not found"));

        // Call FastAPI to duplicate on disk — FastAPI assigns the new directory ID
        com.aiuigenerator.bff.dto.DuplicateResponse fastapiResp = fastApi.duplicateProject(sourceId);

        // Use the ID FastAPI assigned (it owns the filesystem), not a separate ULID.
        // Using a different ID here caused files to be at /projects/<UUID> while
        // MongoDB records pointed to /projects/<ULID> — the preview would 404.
        String newId = fastapiResp.newGenerationId;
        if (newId == null || newId.isBlank()) {
            throw new IllegalStateException("FastAPI did not return a newGenerationId for the duplicate");
        }

        // Create new Generation document using FastAPI's assigned ID
        Generation newGen = new Generation();
        newGen.setGenerationId(newId);
        newGen.setSessionId(userId);
        newGen.setUserId(userId);
        newGen.setStatus(GenerationStatus.COMPLETED);
        newGen.setPrompt("Fork of: " + source.getPrompt());
        newGen.setActiveVersion(source.getActiveVersion());
        newGen.setCreatedAt(Instant.now());
        newGen.setUpdatedAt(Instant.now());
        generationRepo.save(newGen);

        // Copy code versions
        List<CodeVersion> sourceCodeVersions = codeRepo.findByGenerationIdOrderByVersionAsc(sourceId);
        for (CodeVersion cv : sourceCodeVersions) {
            CodeVersion newCv = new CodeVersion();
            newCv.setCodeVersionId(ulid.nextULID());
            newCv.setGenerationId(newId);
            newCv.setVersion(cv.getVersion());
            newCv.setFiles(cv.getFiles());
            newCv.setCreatedAt(Instant.now());
            codeRepo.save(newCv);
        }

        audit.recordEvent("GENERATION_DUPLICATE", newId, userId, 0,
                Map.of("sourceId", sourceId));

        return fastapiResp;
    }

    /** Proxy repair request to FastAPI and persist updated scores. */
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> repairGeneration(String generationId) {
        try {
            String url = fastApiBaseUrl + "/internal/projects/" + generationId + "/repair";
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(120_000);
            conn.setReadTimeout(300_000);
            conn.setDoOutput(true);
            conn.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));
            int status = conn.getResponseCode();
            String body = new BufferedReader(new InputStreamReader(
                    status < 400 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8))
                    .lines().collect(Collectors.joining());
            final ObjectMapper mapper = new ObjectMapper();
            java.util.Map<String, Object> result = mapper.readValue(body, java.util.Map.class);
            // Persist updated scores to MongoDB
            generationRepo.findById(generationId).ifPresent(g -> {
                Object gs = result.get("globalScore");
                if (gs instanceof Number) g.setGlobalScore(((Number) gs).intValue());
                Object sf = result.get("semanticFidelity");
                if (sf instanceof Number) g.setSemanticFidelity(((Number) sf).intValue());
                Object cq = result.get("codeQuality");
                if (cq instanceof Number) g.setCodeQuality(((Number) cq).intValue());
                Object co = result.get("completeness");
                if (co instanceof Number) g.setCompleteness(((Number) co).intValue());
                Object ac = result.get("accessibility");
                if (ac instanceof Number) g.setAccessibility(((Number) ac).intValue());
                Object vr = result.get("visualRichness");
                if (vr instanceof Number) g.setVisualRichness(((Number) vr).intValue());
                generationRepo.save(g);
            });
            return result;
        } catch (Exception e) {
            log.error("repairGeneration failed for {}: {}", generationId, e.getMessage(), e);
            return Map.of("repaired", false, "error", e.getMessage());
        }
    }

    /** Proxy docs generation request to FastAPI. */
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> generateDocs(String generationId) {
        try {
            String url = fastApiBaseUrl + "/internal/projects/" + generationId + "/docs";
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(30_000);
            conn.setReadTimeout(180_000);
            conn.setDoOutput(true);
            conn.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));
            int status = conn.getResponseCode();
            String body = new BufferedReader(new InputStreamReader(
                    status < 400 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8))
                    .lines().collect(Collectors.joining());
            final ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(body, java.util.Map.class);
        } catch (Exception e) {
            log.error("generateDocs failed for {}: {}", generationId, e.getMessage(), e);
            return Map.of("error", e.getMessage(), "filesUpdated", 0);
        }
    }
}

