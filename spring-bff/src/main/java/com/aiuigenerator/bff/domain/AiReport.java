package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ai_reports")
public class AiReport {

    @Id
    private String reportId;

    private String generationId;

    private int version;

    private int score;

    private List<Map<String, Object>> issues;

    private List<String> sourcesUsed;

    private String llmProvider;

    private Map<String, Object> durations;

    private int retriesCount;

    private int buildRetries;

    private Map<String, Object> uiEvaluation;

    private Instant createdAt;

    public String getReportId() {
        return reportId;
    }

    public void setReportId(String reportId) {
        this.reportId = reportId;
    }

    public String getGenerationId() {
        return generationId;
    }

    public void setGenerationId(String generationId) {
        this.generationId = generationId;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public List<Map<String, Object>> getIssues() {
        return issues;
    }

    public void setIssues(List<Map<String, Object>> issues) {
        this.issues = issues;
    }

    public List<String> getSourcesUsed() {
        return sourcesUsed;
    }

    public void setSourcesUsed(List<String> sourcesUsed) {
        this.sourcesUsed = sourcesUsed;
    }

    public String getLlmProvider() {
        return llmProvider;
    }

    public void setLlmProvider(String llmProvider) {
        this.llmProvider = llmProvider;
    }

    public Map<String, Object> getDurations() {
        return durations;
    }

    public void setDurations(Map<String, Object> durations) {
        this.durations = durations;
    }

    public int getRetriesCount() {
        return retriesCount;
    }

    public void setRetriesCount(int retriesCount) {
        this.retriesCount = retriesCount;
    }

    public int getBuildRetries() {
        return buildRetries;
    }

    public void setBuildRetries(int buildRetries) {
        this.buildRetries = buildRetries;
    }

    public Map<String, Object> getUiEvaluation() {
        return uiEvaluation;
    }

    public void setUiEvaluation(Map<String, Object> uiEvaluation) {
        this.uiEvaluation = uiEvaluation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
