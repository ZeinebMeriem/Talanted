package com.aiuigenerator.bff.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.aiuigenerator.bff.domain.UserGitLabCredential;

/**
 * MongoDB repository for storing encrypted GitLab OAuth2 credentials
 */
@Repository
public interface UserGitLabCredentialRepository extends MongoRepository<UserGitLabCredential, String> {

    /**
     * Find credential for a specific user and GitLab instance
     */
    Optional<UserGitLabCredential> findByUserIdAndGitlabUrl(String userId, String gitlabUrl);

    /**
     * Find all credentials for a user (both active and inactive)
     */
    List<UserGitLabCredential> findByUserId(String userId);

    /**
     * Find all active credentials for a user
     */
    List<UserGitLabCredential> findByUserIdAndIsActiveTrue(String userId);

    /**
     * Delete credential for a specific user and GitLab instance
     */
    void deleteByUserIdAndGitlabUrl(String userId, String gitlabUrl);

    /**
     * Check if user has a credential for a GitLab instance
     */
    boolean existsByUserIdAndGitlabUrl(String userId, String gitlabUrl);
}
