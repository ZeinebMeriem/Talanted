package com.aiuigenerator.bff.repo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.aiuigenerator.bff.domain.UserProfile;

public interface UserProfileRepository extends MongoRepository<UserProfile, String> {

    Optional<UserProfile> findByUserId(String userId);

    Optional<UserProfile> findByEmail(String email);

    Optional<UserProfile> findByUsername(String username);
}
