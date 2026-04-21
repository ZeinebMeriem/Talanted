package com.aiuigenerator.bff.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import com.aiuigenerator.bff.service.GitLabService;

/**
 * Configuration for GitLab integration
 */
@Configuration
public class GitLabConfig {

    /**
     * Create RestTemplate bean for GitLab API calls
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /**
     * Create GitLabService bean
     */
    @Bean
    public GitLabService gitLabService() {
        return new GitLabService();
    }
}
