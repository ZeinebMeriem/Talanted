package com.aiuigenerator.bff.dto;

import java.util.Map;

import com.aiuigenerator.bff.domain.GenerationStatus;

public class GenerationCreateResponse {
    public String generationId;
    public String sessionId;
    public GenerationStatus status;
    public int activeVersion;

    public Map<String, Object> uiSpec;
    public CodeBundleDto codeBundle;
    public AiReportDto aiReport;
}
