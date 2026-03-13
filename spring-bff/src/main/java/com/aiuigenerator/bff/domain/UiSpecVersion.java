package com.aiuigenerator.bff.domain;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ui_spec_versions")
public class UiSpecVersion {

    public enum Type {
        INITIAL,
        PATCH,
        ROLLBACK
    }

    @Id
    private String specVersionId;

    private String generationId;

    private int version;

    private Map<String, Object> uiSpec;

    private Instant createdAt;

    private Type type;

    public String getSpecVersionId() {
        return specVersionId;
    }

    public void setSpecVersionId(String specVersionId) {
        this.specVersionId = specVersionId;
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

    public Map<String, Object> getUiSpec() {
        return uiSpec;
    }

    public void setUiSpec(Map<String, Object> uiSpec) {
        this.uiSpec = uiSpec;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }
}
