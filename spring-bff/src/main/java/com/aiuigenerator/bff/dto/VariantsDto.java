package com.aiuigenerator.bff.dto;

import java.util.List;

public class VariantsDto {

    public static class VariantItem {
        public String variantId;
        public String theme;
        public String themeLabel;
        public int globalScore;
        public int semanticFidelity;
        public int codeQuality;
        public int completeness;
        public int accessibility;
        public int visualRichness;
        public boolean buildSuccess;
        public String error;
    }

    public static class VariantsResponse {
        public String variantGroupId;
        public List<VariantItem> variants;
    }
}
