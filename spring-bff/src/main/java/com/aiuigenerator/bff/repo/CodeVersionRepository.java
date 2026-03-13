package com.aiuigenerator.bff.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.aiuigenerator.bff.domain.CodeVersion;

public interface CodeVersionRepository extends MongoRepository<CodeVersion, String> {
    Optional<CodeVersion> findByGenerationIdAndVersion(String generationId, int version);

    @Query(value = "{ 'generationId': ?0 }", fields = "{ 'files': 0 }")
    List<CodeVersion> findByGenerationId(String generationId, Sort sort);
}
