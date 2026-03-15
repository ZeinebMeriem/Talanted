package com.aiuigenerator.bff.repo;

import java.time.Instant;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;

public interface GenerationRepository extends MongoRepository<Generation, String> {

	List<Generation> findTop50ByOrderByCreatedAtDesc();

	List<Generation> findByUserIdOrderByCreatedAtDesc(String userId);

	List<Generation> findByStatusOrderByCreatedAtDesc(GenerationStatus status);

	List<Generation> findByCreatedAtAfterOrderByCreatedAtAsc(Instant after);

	long countByUserId(String userId);

	long countByUserIdAndStatus(String userId, GenerationStatus status);

	long countByStatus(GenerationStatus status);
}
