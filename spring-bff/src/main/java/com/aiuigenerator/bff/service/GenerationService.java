package com.aiuigenerator.bff.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.aiuigenerator.bff.domain.AiReport;
import com.aiuigenerator.bff.domain.CodeVersion;
import com.aiuigenerator.bff.domain.FileEntry;
import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationFile;
import com.aiuigenerator.bff.domain.GenerationStatus;
import com.aiuigenerator.bff.domain.UiSpecVersion;
import com.aiuigenerator.bff.dto.AiReportDto;
import com.aiuigenerator.bff.dto.CodeBundleDto;
import com.aiuigenerator.bff.dto.CodeFileDto;
import com.aiuigenerator.bff.dto.FileRefDto;
import com.aiuigenerator.bff.dto.FastApiGenerateRequest;
import com.aiuigenerator.bff.dto.FastApiGenerateResponse;
import com.aiuigenerator.bff.dto.GenerationCreateResponse;
import com.aiuigenerator.bff.dto.GenerationRollbackResponse;
import com.aiuigenerator.bff.dto.GenerationVersionsResponse;
import com.aiuigenerator.bff.repo.AiReportRepository;
import com.aiuigenerator.bff.repo.CodeVersionRepository;
import com.aiuigenerator.bff.repo.GenerationFileRepository;
import com.aiuigenerator.bff.repo.GenerationRepository;
import com.aiuigenerator.bff.repo.UiSpecVersionRepository;

import de.huxhorn.sulky.ulid.ULID;

@Service
public class GenerationService {

    private final ULID ulid = new ULID();

    private final UploadValidator validator;
    private final FileStorageService fileStorage;
    private final FastApiClient fastApi;
    private final AuditService audit;

    private final GenerationRepository generationRepo;
    private final GenerationFileRepository fileRepo;
    private final UiSpecVersionRepository uiSpecRepo;
    private final CodeVersionRepository codeRepo;
    private final AiReportRepository reportRepo;

    public GenerationService(
            UploadValidator validator,
            FileStorageService fileStorage,
            FastApiClient fastApi,
            AuditService audit,
            GenerationRepository generationRepo,
            GenerationFileRepository fileRepo,
            UiSpecVersionRepository uiSpecRepo,
            CodeVersionRepository codeRepo,
            AiReportRepository reportRepo) {
        this.validator = validator;
        this.fileStorage = fileStorage;
        this.fastApi = fastApi;
        this.audit = audit;
        this.generationRepo = generationRepo;
        this.fileRepo = fileRepo;
        this.uiSpecRepo = uiSpecRepo;
        this.codeRepo = codeRepo;
        this.reportRepo = reportRepo;
    }

    public GenerationCreateResponse createGeneration(String userId, String prompt, List<MultipartFile> files) {
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
        Generation g = generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));

        CodeVersion cv = codeRepo.findByGenerationIdAndVersion(generationId, g.getActiveVersion())
                .orElseThrow(() -> new IllegalArgumentException("code version not found"));

        CodeBundleDto bundle = new CodeBundleDto();
        bundle.files = cv.getFiles() == null ? List.of() : cv.getFiles().stream().map(fe -> {
            CodeFileDto dto = new CodeFileDto();
            dto.path = fe.path();
            dto.content = fe.content();
            return dto;
        }).collect(Collectors.toList());
        return bundle;
    }

    public GenerationRollbackResponse rollback(String generationId, int targetVersion) {
        if (targetVersion <= 0) {
            throw new IllegalArgumentException("version must be > 0");
        }

        Generation g = generationRepo.findById(generationId)
                .orElseThrow(() -> new IllegalArgumentException("generation not found"));

        // Ensure the requested version exists before switching the pointer.
        uiSpecRepo.findByGenerationIdAndVersion(generationId, targetVersion)
                .orElseThrow(() -> new IllegalArgumentException("uiSpec version not found"));
        codeRepo.findByGenerationIdAndVersion(generationId, targetVersion)
                .orElseThrow(() -> new IllegalArgumentException("code version not found"));

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
}
