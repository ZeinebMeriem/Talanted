package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "accessibility_audits")
public class AccessibilityAudit {

    @Id
    private String id;

    private String generationId;

    private String userId;

    private Instant timestamp;

    private Integer score; // 0-100

    private String wcagLevel; // "AA", "AAA"

    private String summary;

    private List<Map<String, Object>> issues; // Array of issue objects with severity, wcag, title, description, element, filePath, currentCode, fix, autoFixCode

    private List<String> passed; // Passed checks

    private List<String> recommendations;

    private Integer filesAnalyzed;

    private String codeSnapshot; // Truncated source code analyzed

    public AccessibilityAudit() {
    }

    public AccessibilityAudit(String generationId, String userId, Integer score, String wcagLevel, String summary,
            List<Map<String, Object>> issues, List<String> passed, List<String> recommendations, Integer filesAnalyzed,
            String codeSnapshot) {
        this.generationId = generationId;
        this.userId = userId;
        this.timestamp = Instant.now();
        this.score = score;
        this.wcagLevel = wcagLevel;
        this.summary = summary;
        this.issues = issues;
        this.passed = passed;
        this.recommendations = recommendations;
        this.filesAnalyzed = filesAnalyzed;
        this.codeSnapshot = codeSnapshot;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getGenerationId() {
        return generationId;
    }

    public void setGenerationId(String generationId) {
        this.generationId = generationId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getWcagLevel() {
        return wcagLevel;
    }

    public void setWcagLevel(String wcagLevel) {
        this.wcagLevel = wcagLevel;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<Map<String, Object>> getIssues() {
        return issues;
    }

    public void setIssues(List<Map<String, Object>> issues) {
        this.issues = issues;
    }

    public List<String> getPassed() {
        return passed;
    }

    public void setPassed(List<String> passed) {
        this.passed = passed;
    }

    public List<String> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<String> recommendations) {
        this.recommendations = recommendations;
    }

    public Integer getFilesAnalyzed() {
        return filesAnalyzed;
    }

    public void setFilesAnalyzed(Integer filesAnalyzed) {
        this.filesAnalyzed = filesAnalyzed;
    }

    public String getCodeSnapshot() {
        return codeSnapshot;
    }

    public void setCodeSnapshot(String codeSnapshot) {
        this.codeSnapshot = codeSnapshot;
    }
}
