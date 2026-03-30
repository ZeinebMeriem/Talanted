package com.aiuigenerator.bff.dto;

import java.time.Instant;

public class ChatMessageDto {
    public String id;
    public String role;
    public String content;
    public int versionCreated;
    public Instant createdAt;
}
