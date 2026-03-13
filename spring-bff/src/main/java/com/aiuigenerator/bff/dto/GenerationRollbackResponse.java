package com.aiuigenerator.bff.dto;

import java.time.Instant;

public class GenerationRollbackResponse {
    public String generationId;
    public int previousActiveVersion;
    public int activeVersion;
    public Instant updatedAt;
}
