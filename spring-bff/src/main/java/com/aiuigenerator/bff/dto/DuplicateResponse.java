package com.aiuigenerator.bff.dto;

public class DuplicateResponse {
    public String newGenerationId;
    public boolean buildSuccess;
    public String buildOutput;

    public DuplicateResponse() {
    }

    public DuplicateResponse(String newGenerationId, boolean buildSuccess, String buildOutput) {
        this.newGenerationId = newGenerationId;
        this.buildSuccess = buildSuccess;
        this.buildOutput = buildOutput;
    }
}
