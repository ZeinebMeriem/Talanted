package com.aiuigenerator.bff.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.GenerationFile;

public interface GenerationFileRepository extends MongoRepository<GenerationFile, String> {
    List<GenerationFile> findByGenerationId(String generationId);
}
