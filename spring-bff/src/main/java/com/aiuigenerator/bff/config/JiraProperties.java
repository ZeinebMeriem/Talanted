package com.aiuigenerator.bff.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.jira")
public class JiraProperties {
    private static final Logger logger = LoggerFactory.getLogger(JiraProperties.class);

    private String baseUrl;
    private String email;
    private String apiToken;
    private int timeoutSeconds = 30;

    /**
     * Comma-separated labels used to identify "frontend" tasks for interface generation.
     * Example: ui,interface,ux
     */
    private String frontendLabels = "ui,interface,ux";

    @PostConstruct
    public void validateConfig() {
        if (baseUrl == null || baseUrl.isBlank()) {
            logger.warn("JIRA_BASE_URL not configured - Jira integration will be disabled");
        }
        if (email == null || email.isBlank()) {
            logger.warn("JIRA_EMAIL not configured - Jira integration will be disabled");
        }
        if (apiToken == null || apiToken.isBlank()) {
            logger.warn("JIRA_API_TOKEN not configured - Jira integration will be disabled");
        }
        if (baseUrl != null && email != null && apiToken != null) {
            logger.info("Jira integration enabled: {}", baseUrl);
        }
    }

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank() &&
                email != null && !email.isBlank() &&
                apiToken != null && !apiToken.isBlank();
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getApiToken() {
        return apiToken;
    }

    public void setApiToken(String apiToken) {
        this.apiToken = apiToken;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public String getFrontendLabels() {
        return frontendLabels;
    }

    public void setFrontendLabels(String frontendLabels) {
        this.frontendLabels = frontendLabels;
    }
}
