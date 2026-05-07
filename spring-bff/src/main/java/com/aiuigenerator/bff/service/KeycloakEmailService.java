package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.publisher.Mono;

@Service
public class KeycloakEmailService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakEmailService.class);

    private final WebClient webClient;
    private final String keycloakInternalUrl;
    private final String keycloakRealm;
    private final String keycloakAdminToken;

    public KeycloakEmailService(
            WebClient webClient,
            @Value("${app.keycloak.internal-url:http://keycloak:8080}") String keycloakInternalUrl,
            @Value("${app.keycloak.realm:ai-ui}") String keycloakRealm,
            @Value("${KEYCLOAK_ADMIN_TOKEN:}") String keycloakAdminToken) {
        this.webClient = webClient;
        this.keycloakInternalUrl = keycloakInternalUrl;
        this.keycloakRealm = keycloakRealm;
        this.keycloakAdminToken = keycloakAdminToken;
    }

    /**
     * Send email verification message to user via Keycloak Admin API.
     *
     * This calls Keycloak's endpoint to send an email verification link to the user.
     * The user must have a valid email address set in Keycloak.
     *
     * Keycloak will send an email with a link that the user can click to verify their
     * email address. The link will be valid for a configured time period (default ~7 days).
     *
     * @param keycloakUserId The Keycloak user ID (UUID)
     * @return true if email was sent successfully, false otherwise
     */
    public boolean sendVerificationEmail(String keycloakUserId) {
        if (keycloakAdminToken == null || keycloakAdminToken.isBlank()) {
            log.warn("KEYCLOAK_ADMIN_TOKEN not configured - email verification disabled");
            return false;
        }

        String url = String.format(
                "%s/admin/realms/%s/users/%s/send-email-verification",
                keycloakInternalUrl, keycloakRealm, keycloakUserId);

        try {
            webClient.put()
                    .uri(url)
                    .header("Authorization", "Bearer " + keycloakAdminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Mono.just("[]"), String.class)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            log.info("Email verification sent to Keycloak user: {}", keycloakUserId);
            return true;

        } catch (WebClientResponseException e) {
            log.error("Failed to send email verification for user {}: {} - {}",
                    keycloakUserId, e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Error sending email verification for user {}: {}", keycloakUserId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Check if a user's email is verified in Keycloak.
     *
     * @param keycloakUserId The Keycloak user ID (UUID)
     * @return true if email is verified, false otherwise
     */
    public boolean isEmailVerified(String keycloakUserId) {
        // This is typically done via JWT token claims which already contain email_verified
        // This method can be extended if needed for direct Keycloak admin API calls
        return false;
    }
}
