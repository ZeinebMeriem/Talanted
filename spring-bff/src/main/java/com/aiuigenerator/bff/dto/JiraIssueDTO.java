package com.aiuigenerator.bff.dto;

import java.util.List;

public record JiraIssueDTO(
        String key,
        String summary,
        String description,
        String acceptanceCriteria,
        String issueType,
        String status,
        String priority,
        List<JiraAttachmentDTO> attachments,
        String webUrl) {
    public record JiraAttachmentDTO(
            String filename,
            String mimeType,
            long size,
            String content // base64 encoded for images
    ) {
    }
}
