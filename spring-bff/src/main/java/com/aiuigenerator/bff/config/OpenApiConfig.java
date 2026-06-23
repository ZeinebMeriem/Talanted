package com.aiuigenerator.bff.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI aiUiGeneratorOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("AI UI Generator — BFF API")
                .description("Backend for Frontend REST API for the AI UI Generator platform. " +
                    "Handles authentication, project management, code generation, " +
                    "accessibility auditing, Jira integration, and GitLab push.")
                .version("1.0.0")
                .contact(new Contact()
                    .name("AI UI Generator Team")
                    .email("dev@ai-ui-generator.local"))
                .license(new License()
                    .name("MIT")
                    .url("https://opensource.org/licenses/MIT")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT token from Keycloak OAuth2/OIDC")));
    }
}
