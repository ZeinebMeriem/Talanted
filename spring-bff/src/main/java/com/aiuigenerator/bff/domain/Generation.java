package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "generations")
public class Generation {

    @Id
    private String generationId;

    private String sessionId;

    private GenerationStatus status;

    private String prompt;

    private String name;

    private int activeVersion;

    private Instant createdAt;

    private Instant updatedAt;

    private String userId;

    private String jiraIssueKey;

    private List<String> jiraIssueKeys;

    private String gitlabProjectUrl; // https://gitlab.com/group/project

    private String gitlabBranch; // main, feature/ai-generated

    private String gitlabCommitHash; // git commit SHA-1 hash

    private Instant gitlabPushedAt; // timestamp when pushed to GitLab

    // Quality evaluation scores (from UIEvaluatorAgent)
    private Integer globalScore; // 0-100 overall quality
    private Integer semanticFidelity; // 0-100
    private Integer codeQuality; // 0-100
    private Integer completeness; // 0-100
    private Integer accessibility; // 0-100
    private Integer visualRichness; // 0-100

    public String getGenerationId() {
        return generationId;
    }

    public void setGenerationId(String generationId) {
        this.generationId = generationId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public GenerationStatus getStatus() {
        return status;
    }

    public void setStatus(GenerationStatus status) {
        this.status = status;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getActiveVersion() {
        return activeVersion;
    }

    public void setActiveVersion(int activeVersion) {
        this.activeVersion = activeVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getJiraIssueKey() {
        return jiraIssueKey;
    }

    public void setJiraIssueKey(String jiraIssueKey) {
        this.jiraIssueKey = jiraIssueKey;
    }

    public List<String> getJiraIssueKeys() {
        return jiraIssueKeys;
    }

    public void setJiraIssueKeys(List<String> jiraIssueKeys) {
        this.jiraIssueKeys = jiraIssueKeys;
    }

    public String getGitlabProjectUrl() {
        return gitlabProjectUrl;
    }

    public void setGitlabProjectUrl(String gitlabProjectUrl) {
        this.gitlabProjectUrl = gitlabProjectUrl;
    }

    public String getGitlabBranch() {
        return gitlabBranch;
    }

    public void setGitlabBranch(String gitlabBranch) {
        this.gitlabBranch = gitlabBranch;
    }

    public String getGitlabCommitHash() {
        return gitlabCommitHash;
    }

    public void setGitlabCommitHash(String gitlabCommitHash) {
        this.gitlabCommitHash = gitlabCommitHash;
    }

    public Instant getGitlabPushedAt() {
        return gitlabPushedAt;
    }

    public void setGitlabPushedAt(Instant gitlabPushedAt) {
        this.gitlabPushedAt = gitlabPushedAt;
    }

    public Integer getGlobalScore() {
        return globalScore;
    }

    public void setGlobalScore(Integer globalScore) {
        this.globalScore = globalScore;
    }

    public Integer getSemanticFidelity() {
        return semanticFidelity;
    }

    public void setSemanticFidelity(Integer semanticFidelity) {
        this.semanticFidelity = semanticFidelity;
    }

    public Integer getCodeQuality() {
        return codeQuality;
    }

    public void setCodeQuality(Integer codeQuality) {
        this.codeQuality = codeQuality;
    }

    public Integer getCompleteness() {
        return completeness;
    }

    public void setCompleteness(Integer completeness) {
        this.completeness = completeness;
    }

    public Integer getAccessibility() {
        return accessibility;
    }

    public void setAccessibility(Integer accessibility) {
        this.accessibility = accessibility;
    }

    public Integer getVisualRichness() {
        return visualRichness;
    }

    public void setVisualRichness(Integer visualRichness) {
        this.visualRichness = visualRichness;
    }
}
