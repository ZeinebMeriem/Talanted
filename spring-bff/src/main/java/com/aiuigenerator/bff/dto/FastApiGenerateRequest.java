package com.aiuigenerator.bff.dto;

import java.util.List;
import java.util.Map;

public class FastApiGenerateRequest {
    public String generationId;
    public String prompt;
    public String mode; // full | codegen_only
    public List<FileRefDto> fileRefs;
    public Map<String, Object> uiSpec;
    public String domain; // ecommerce | medical | dashboard | education | saas | portfolio | restaurant |
                          // real_estate | null (auto-detect)
    public String model; // gemini | claude | gpt | groq | null (use .env default)
}
