package com.aiuigenerator.bff.dto;

import java.time.Instant;
import java.util.List;

public class GenerationVersionsResponse {
    public String generationId;
    public int activeVersion;

    public List<UiSpecVersionSummary> uiSpecVersions;
    public List<CodeVersionSummary> codeVersions;
    public List<AiReportSummary> aiReportVersions;

    public static class UiSpecVersionSummary {
        public int version;
        public String type;
        public Instant createdAt;
    }

    public static class CodeVersionSummary {
        public int version;
        public Instant createdAt;
    }

    public static class AiReportSummary {
        public int version;
        public int score;
        public String llmProvider;
        public Instant createdAt;
    }
}
