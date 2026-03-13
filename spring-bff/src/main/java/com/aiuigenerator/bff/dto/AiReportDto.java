package com.aiuigenerator.bff.dto;

import java.util.List;
import java.util.Map;

public class AiReportDto {
    public int score;
    public List<Map<String, Object>> issues;
    public List<String> sources_used;
    public String llm_provider;
    public Map<String, Object> durations;
    public int retries_count;
}
