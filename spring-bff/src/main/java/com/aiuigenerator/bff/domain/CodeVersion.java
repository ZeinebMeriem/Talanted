package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "code_versions")
public class CodeVersion {

    @Id
    private String codeVersionId;

    private String generationId;

    private int version;

    private List<FileEntry> files;

    private Instant createdAt;

    public String getCodeVersionId() {
        return codeVersionId;
    }

    public void setCodeVersionId(String codeVersionId) {
        this.codeVersionId = codeVersionId;
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

    public List<FileEntry> getFiles() {
        return files;
    }

    public void setFiles(List<FileEntry> files) {
        this.files = files;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
