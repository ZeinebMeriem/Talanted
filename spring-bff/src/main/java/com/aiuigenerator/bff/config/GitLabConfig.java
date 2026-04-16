package com.aiuigenerator.bff.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.aiuigenerator.bff.service.GitLabService;

/**
 * Configuration for GitLab integration
 */
@Configuration
public class GitLabConfig {

    /**
     * Create GitLabService bean
     */
    @Bean
    public GitLabService gitLabService() {
        return new GitLabService();
    }
}
