package com.aiuigenerator.bff.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.aiuigenerator.bff.domain.UiSpecVersion;

public interface UiSpecVersionRepository extends MongoRepository<UiSpecVersion, String> {
    Optional<UiSpecVersion> findByGenerationIdAndVersion(String generationId, int version);

    @Query(value = "{ 'generationId': ?0 }", fields = "{ 'uiSpec': 0 }")
    List<UiSpecVersion> findByGenerationId(String generationId, Sort sort);
}
