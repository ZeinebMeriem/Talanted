package com.aiuigenerator.bff.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.Generation;
import com.aiuigenerator.bff.domain.GenerationStatus;

public interface GenerationRepository extends MongoRepository<Generation, String> {

	List<Generation> findTop50ByOrderByCreatedAtDesc();

	long countByStatus(GenerationStatus status);
}
