package com.aiuigenerator.bff.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.AuditEvent;

public interface AuditEventRepository extends MongoRepository<AuditEvent, String> {

    List<AuditEvent> findTop200ByGenerationIdOrderByTimestampAsc(String generationId);
}
