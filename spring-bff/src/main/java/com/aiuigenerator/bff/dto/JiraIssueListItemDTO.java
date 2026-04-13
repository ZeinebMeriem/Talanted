package com.aiuigenerator.bff.dto;

import java.util.List;

public record JiraIssueListItemDTO(
                String key,
                String summary,
                String issueType,
                String status,
                String priority,
                List<String> labels,
                String updated,
                String webUrl) {
}
