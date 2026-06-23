package com.aiuigenerator.bff.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.aiuigenerator.bff.domain.AiReport;

public interface AiReportRepository extends MongoRepository<AiReport, String> {

    @Query(value = "{ 'generationId': ?0 }", fields = "{ 'issues': 0, 'sourcesUsed': 0, 'durations': 0 }")
    List<AiReport> findByGenerationId(String generationId, Sort sort);

    Optional<AiReport> findByGenerationIdAndVersion(String generationId, int version);

    Optional<AiReport> findFirstByGenerationIdOrderByVersionDesc(String generationId);
}
