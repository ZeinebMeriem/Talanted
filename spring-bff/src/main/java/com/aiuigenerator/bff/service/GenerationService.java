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
import java.util.stream.Collectors;

import java.io.PrintWriter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.domain.Sort;
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

    private final UploadValidator validator;
    private final FileStorageService fileStorage;
    private final FastApiClient fastApi;
    private final AuditService audit;

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
        g.setUpdatedAt(Instant.now());
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

    public Generation getGeneration(String generationId) {
        return generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));
    }

    public List<Generation> listGenerations(String userId) {
        return generationRepo.findByUserIdOrderByCreatedAtDesc(userId);
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

        // On successful edit, create a new CodeVersion (activeVersion + 1) so that
        // every chat edit becomes a rollback checkpoint.
        int newVersion = 0;
        if (resp.buildSuccess) {
            Generation g = generationRepo.findById(generationId).orElse(null);
            if (g != null) {
                int currentVersion = g.getActiveVersion();
                final int[] versionHolder = { currentVersion };
                codeRepo.findByGenerationIdAndVersion(generationId, currentVersion)
                        .ifPresent(currentCv -> {
                            String editedPath = resp.filePath.startsWith("src/")
                                    ? resp.filePath
                                    : "src/" + resp.filePath;
                            List<FileEntry> newFiles = new ArrayList<>(
                                    currentCv.getFiles() == null ? List.of() : currentCv.getFiles());
                            newFiles.removeIf(fe -> fe.path().equals(editedPath)
                                    || fe.path().equals(resp.filePath));
                            newFiles.add(new FileEntry(editedPath, resp.content));

                            CodeVersion newCv = new CodeVersion();
                            newCv.setCodeVersionId(ulid.nextULID());
                            newCv.setGenerationId(generationId);
                            newCv.setVersion(currentVersion + 1);
                            newCv.setFiles(newFiles);
                            newCv.setCreatedAt(Instant.now());
                            codeRepo.save(newCv);

                            versionHolder[0] = currentVersion + 1;
                            g.setActiveVersion(currentVersion + 1);
                            g.setUpdatedAt(Instant.now());
                            generationRepo.save(g);
                        });
                newVersion = versionHolder[0];
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

        CodeVersion cv = codeRepo.findByGenerationIdAndVersion(generationId, targetVersion)
                .orElseThrow(() -> new IllegalArgumentException("code version not found"));

        // Restore files to disk and rebuild so preview + CODE tab reflect the target
        // version
        RestoreRequest restoreReq = new RestoreRequest();
        restoreReq.generationId = generationId;
        restoreReq.files = cv.getFiles() == null ? List.of() : cv.getFiles().stream().map(fe -> {
            CodeFileDto dto = new CodeFileDto();
            dto.path = fe.path();
            dto.content = fe.content();
            return dto;
        }).collect(Collectors.toList());
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
}
