package com.aiuigenerator.bff.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.AccessibilityAudit;

public interface AccessibilityAuditRepository extends MongoRepository<AccessibilityAudit, String> {

	List<AccessibilityAudit> findByGenerationIdOrderByTimestampDesc(String generationId);

	List<AccessibilityAudit> findByGenerationIdOrderByTimestampDesc(String generationId, org.springframework.data.domain.Pageable pageable);

	List<AccessibilityAudit> findByUserIdOrderByTimestampDesc(String userId);
}
