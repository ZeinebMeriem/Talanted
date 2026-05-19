package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "generations")
@CompoundIndexes({
    @CompoundIndex(name = "userId_createdAt", def = "{'userId': 1, 'createdAt': -1}"),
    @CompoundIndex(name = "userId_status", def = "{'userId': 1, 'status': 1}")
})
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

    @Indexed
    private String userId;

    private String jiraIssueKey;

    private List<String> jiraIssueKeys;

    private String gitlabProjectUrl; // https://gitlab.com/group/project

    private String gitlabBranch; // main, feature/ai-generated

    private String gitlabCommitHash; // git commit SHA-1 hash

    private Instant gitlabPushedAt; // timestamp when pushed to GitLab

    // Deployment
    private String deployUrl;      // public URL after deploy (e.g. https://xyz.netlify.app)
    private String deployProvider; // "netlify"
    private Instant deployedAt;

    // A/B Variant support
    private String variantGroupId;  // links 3 variants together
    private String variantTheme;    // minimal | vibrant | corporate
    private Integer variantIndex;   // 1, 2 or 3

    // Quality evaluation scores (from UIEvaluatorAgent)
    private Integer globalScore; // 0-100 overall quality
    private Integer semanticFidelity; // 0-100
    private Integer codeQuality; // 0-100
    private Integer completeness; // 0-100
    private Integer accessibility; // 0-100
    private Integer visualRichness; // 0-100

    // Accessibility audit history
    private String lastAccessibilityAuditId; // reference to latest AccessibilityAudit document

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

    public String getLastAccessibilityAuditId() {
        return lastAccessibilityAuditId;
    }

    public void setLastAccessibilityAuditId(String lastAccessibilityAuditId) {
        this.lastAccessibilityAuditId = lastAccessibilityAuditId;
    }

    public String getVariantGroupId() { return variantGroupId; }
    public void setVariantGroupId(String variantGroupId) { this.variantGroupId = variantGroupId; }

    public String getVariantTheme() { return variantTheme; }
    public void setVariantTheme(String variantTheme) { this.variantTheme = variantTheme; }

    public Integer getVariantIndex() { return variantIndex; }
    public void setVariantIndex(Integer variantIndex) { this.variantIndex = variantIndex; }

    public String getDeployUrl() { return deployUrl; }
    public void setDeployUrl(String deployUrl) { this.deployUrl = deployUrl; }

    public String getDeployProvider() { return deployProvider; }
    public void setDeployProvider(String deployProvider) { this.deployProvider = deployProvider; }

    public Instant getDeployedAt() { return deployedAt; }
    public void setDeployedAt(Instant deployedAt) { this.deployedAt = deployedAt; }
}
