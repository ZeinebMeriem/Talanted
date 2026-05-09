package com.aiuigenerator.bff.service;

import com.aiuigenerator.bff.config.JiraProperties;
import com.aiuigenerator.bff.dto.JiraIssueDTO;
import com.aiuigenerator.bff.dto.JiraIssueListItemDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JiraService {
    private static final Logger logger = LoggerFactory.getLogger(JiraService.class);
    private static final long MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> IMAGE_MIME_TYPES = List.of(
            "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/bmp", "image/svg+xml");

    private final JiraProperties jiraProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public JiraService(JiraProperties jiraProperties, ObjectMapper objectMapper) {
        this.jiraProperties = jiraProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(jiraProperties.getTimeoutSeconds()))
                .build();
    }

    private static final Pattern PROJECT_KEY_IN_URL = Pattern.compile("(?:/projects/|projectKey=|project=)([A-Z][A-Z0-9]+)");

    public JiraIssueDTO getIssue(String issueKey) {
        if (!jiraProperties.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Jira integration is not configured");
        }

        try {
            // Fetch issue details
            String apiUrl = jiraProperties.getBaseUrl() + "/rest/api/3/issue/" + issueKey;
            logger.info("Fetching Jira issue: {}", issueKey);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header(HttpHeaders.AUTHORIZATION, getBasicAuthHeader())
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .timeout(Duration.ofSeconds(jiraProperties.getTimeoutSeconds()))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Jira issue not found: " + issueKey);
            } else if (response.statusCode() == 401) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Jira credentials");
            } else if (response.statusCode() != 200) {
                logger.error("Jira API error: {} - {}", response.statusCode(), response.body());
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Failed to fetch Jira issue: HTTP " + response.statusCode());
            }

            // Parse response
            JsonNode issueJson = objectMapper.readTree(response.body());
            JsonNode fields = issueJson.get("fields");

            String key = issueJson.get("key").asText();
            String summary = fields.get("summary").asText();
            String description = extractDescription(fields.get("description"));
            String acceptanceCriteria = extractAcceptanceCriteria(fields);
            String issueType = fields.get("issuetype").get("name").asText();
            String status = fields.get("status").get("name").asText();
            String priority = fields.has("priority") ? fields.get("priority").get("name").asText() : "None";
            String webUrl = jiraProperties.getBaseUrl() + "/browse/" + key;

            // Fetch attachments
            List<JiraIssueDTO.JiraAttachmentDTO> attachments = fetchAttachments(fields.get("attachment"));

            return new JiraIssueDTO(
                    key, summary, description, acceptanceCriteria,
                    issueType, status, priority, attachments, webUrl);

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error fetching Jira issue: {}", issueKey, e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to fetch Jira issue: " + e.getMessage());
        }
    }

    private String extractDescription(JsonNode descriptionNode) {
        if (descriptionNode == null || descriptionNode.isNull()) {
            return "";
        }

        // Jira uses Atlassian Document Format (ADF) - extract text content
        if (descriptionNode.has("content")) {
            StringBuilder text = new StringBuilder();
            extractTextFromADF(descriptionNode, text);
            return text.toString().trim();
        }

        return descriptionNode.asText("");
    }

    private void extractTextFromADF(JsonNode node, StringBuilder out) {
        if (node == null || node.isNull()) {
            return;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                extractTextFromADF(child, out);
            }
            return;
        }

        if (!node.isObject()) {
            return;
        }

        String type = node.has("type") ? node.get("type").asText() : null;

        if ("text".equals(type) && node.has("text")) {
            String t = node.get("text").asText();
            if (!t.isBlank()) {
                out.append(t).append(' ');
            }
            return;
        }

        JsonNode content = node.get("content");
        if (content != null && !content.isNull()) {
            extractTextFromADF(content, out);
            if ("paragraph".equals(type) || "heading".equals(type) || "listItem".equals(type)) {
                out.append('\n');
            }
        }
    }

    private String extractAcceptanceCriteria(JsonNode fields) {
        // Try common custom field names for acceptance criteria
        String[] possibleFields = {
                "customfield_10100", "customfield_10101", "customfield_10102",
                "customfield_10200", "customfield_11000"
        };

        for (String fieldName : possibleFields) {
            if (fields.has(fieldName)) {
                JsonNode field = fields.get(fieldName);
                if (field != null && !field.isNull()) {
                    if (field.isTextual()) {
                        return field.asText();
                    } else if (field.has("content")) {
                        StringBuilder text = new StringBuilder();
                        extractTextFromADF(field, text);
                        return text.toString().trim();
                    }
                }
            }
        }

        return "";
    }

    private List<JiraIssueDTO.JiraAttachmentDTO> fetchAttachments(JsonNode attachmentsNode) {
        List<JiraIssueDTO.JiraAttachmentDTO> attachments = new ArrayList<>();

        if (attachmentsNode == null || !attachmentsNode.isArray()) {
            return attachments;
        }

        long totalSize = 0;
        for (JsonNode attachment : attachmentsNode) {
            String filename = attachment.get("filename").asText();
            String mimeType = attachment.get("mimeType").asText();
            long size = attachment.get("size").asLong();
            String contentUrl = attachment.get("content").asText();

            // Skip if total size exceeds limit
            if (totalSize + size > MAX_ATTACHMENT_SIZE) {
                logger.warn("Skipping attachment {} - total size limit exceeded", filename);
                continue;
            }

            // Only download images
            if (!IMAGE_MIME_TYPES.contains(mimeType.toLowerCase())) {
                logger.debug("Skipping non-image attachment: {} ({})", filename, mimeType);
                continue;
            }

            try {
                // Download attachment content
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(contentUrl))
                        .header(HttpHeaders.AUTHORIZATION, getBasicAuthHeader())
                        .timeout(Duration.ofSeconds(jiraProperties.getTimeoutSeconds()))
                        .GET()
                        .build();

                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

                if (response.statusCode() == 200) {
                    String base64Content = Base64.getEncoder().encodeToString(response.body());
                    attachments.add(new JiraIssueDTO.JiraAttachmentDTO(filename, mimeType, size, base64Content));
                    totalSize += size;
                    logger.info("Downloaded attachment: {} ({} bytes)", filename, size);
                } else {
                    logger.warn("Failed to download attachment: {} (HTTP {})", filename, response.statusCode());
                }

            } catch (Exception e) {
                logger.error("Error downloading attachment: {}", filename, e);
            }
        }

        return attachments;
    }

    public List<JiraIssueListItemDTO> listFrontendTasks(String urlOrProjectKey) {
        return listFrontendTasks(urlOrProjectKey, false);
    }

    public List<JiraIssueListItemDTO> listFrontendTasks(String urlOrProjectKey, boolean includeAll) {
        if (!jiraProperties.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Jira integration is not configured");
        }

        String projectKey = extractProjectKey(urlOrProjectKey);
        if (projectKey == null || projectKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Could not determine Jira project key. Provide a board URL with /projects/PROJ or the project key directly."
            );
        }

        List<String> labels = parseLabels(jiraProperties.getFrontendLabels());
        if (labels.isEmpty()) {
            labels = List.of("ui", "interface", "ux");
        }

        String jql;
        if (includeAll) {
            jql = "project = \"" + projectKey + "\" AND statusCategory != Done ORDER BY updated DESC";
        } else {
            // Strict filtering: require BOTH labels AND summary keywords for UI/frontend tasks
            String labelsJql = String.join(",", labels.stream().map(l -> "\"" + l + "\"").toList());
            String keywordPattern = String.join(" OR summary ~ ",
                labels.stream().map(l -> "\"" + l + "\"").toList());
            jql = "project = \"" + projectKey + "\" AND (labels in (" + labelsJql
                + ") OR summary ~ " + keywordPattern + ") AND statusCategory != Done ORDER BY updated DESC";
        }

        try {
            // Jira Cloud has removed /rest/api/{2,3}/search for some tenants and requires /rest/api/3/search/jql.
            // We try search/jql first, then fall back to /rest/api/3/search for tenants that still support it.
            String apiUrlJql = jiraProperties.getBaseUrl() + "/rest/api/3/search/jql";
            String apiUrlV3 = jiraProperties.getBaseUrl() + "/rest/api/3/search";

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("jql", jql);
            body.put("maxResults", 50);
            body.put("fields", List.of("summary", "status", "issuetype", "priority", "labels", "updated"));
            String bodyJson = objectMapper.writeValueAsString(body);

            java.util.function.Function<String, HttpResponse<String>> doPost = (String url) -> {
                try {
                    HttpRequest req = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header(HttpHeaders.AUTHORIZATION, getBasicAuthHeader())
                            .header(HttpHeaders.ACCEPT, "application/json")
                            .header(HttpHeaders.CONTENT_TYPE, "application/json")
                            .timeout(Duration.ofSeconds(jiraProperties.getTimeoutSeconds()))
                            .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                            .build();
                    return httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            };

            HttpResponse<String> response = doPost.apply(apiUrlJql);

            if (response.statusCode() == 404) {
                logger.warn("Jira search/jql not found (404); falling back to /rest/api/3/search");
                response = doPost.apply(apiUrlV3);
            }

            if (response.statusCode() == 410) {
                logger.warn("Jira search returned 410; retrying with /rest/api/3/search/jql");
                response = doPost.apply(apiUrlJql);
            }

            if (response.statusCode() == 401) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Jira credentials");
            }
            if (response.statusCode() != 200) {
                logger.error("Jira search API error: {} - {}", response.statusCode(), response.body());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Failed to search Jira issues: HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            int total = root.path("total").asInt(-1);
            JsonNode issues = root.get("issues");
            if (issues == null || !issues.isArray()) {
                logger.info("Jira search returned no issues array (total={}) for jql={}", total, jql);
                return List.of();
            }

            List<JiraIssueListItemDTO> out = new ArrayList<>();
            List<String> uiFrontendKeywords = List.of("ui", "interface", "ux", "design", "frontend", "component", "page", "screen", "layout");
            final List<String> frontendLabels = labels; // Make effectively final for lambda

            for (JsonNode issue : issues) {
                String key = issue.path("key").asText();
                JsonNode fieldsNode = issue.path("fields");
                String summary = fieldsNode.path("summary").asText("");
                String issueType = fieldsNode.path("issuetype").path("name").asText("");
                String status = fieldsNode.path("status").path("name").asText("");
                String priority = fieldsNode.has("priority") ? fieldsNode.path("priority").path("name").asText("") : "";
                String updated = fieldsNode.path("updated").asText("");

                List<String> issueLabels = new ArrayList<>();
                JsonNode labelsNode = fieldsNode.path("labels");
                if (labelsNode.isArray()) {
                    for (JsonNode l : labelsNode) {
                        String s = l.asText();
                        if (s != null && !s.isBlank()) issueLabels.add(s);
                    }
                }

                // Strict filter: must have UI-related keyword in summary OR label, not backend tasks
                if (!includeAll) {
                    boolean hasUiLabel = issueLabels.stream()
                            .anyMatch(lbl -> frontendLabels.stream().anyMatch(l -> lbl.equalsIgnoreCase(l)));
                    boolean hasUiKeywordInSummary = uiFrontendKeywords.stream()
                            .anyMatch(kw -> summary.toLowerCase().contains(kw.toLowerCase()));

                    if (!hasUiLabel && !hasUiKeywordInSummary) {
                        logger.debug("Filtering out non-frontend task: {} - {}", key, summary);
                        continue;
                    }
                }

                String webUrl = jiraProperties.getBaseUrl() + "/browse/" + key;
                out.add(new JiraIssueListItemDTO(key, summary, issueType, status, priority, issueLabels, updated, webUrl));
            }

            logger.info("Jira search returned {} issues (total={}) includeAll={} for jql={}", out.size(), total, includeAll, jql);

            if (out.isEmpty() && includeAll) {
                boolean canBrowseProject = canBrowseProject(projectKey);
                if (!canBrowseProject) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Jira credentials cannot browse project " + projectKey
                                    + ". Ensure the Jira API user has 'Browse Projects' permission."
                    );
                }
            }

            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error searching Jira frontend tasks: {}", urlOrProjectKey, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to search Jira issues: " + e.getMessage());
        }
    }

    private static List<String> parseLabels(String s) {
        if (s == null || s.isBlank()) return Collections.emptyList();
        return Arrays.stream(s.split(","))
                .map(String::trim)
                .filter(x -> !x.isBlank())
                .distinct()
                .toList();
    }


    private static String extractProjectKey(String urlOrProjectKey) {
        if (urlOrProjectKey == null) return null;
        String s = urlOrProjectKey.trim();
        if (s.isBlank()) return null;

        // Direct project key like "ABC"
        if (s.matches("^[A-Z][A-Z0-9]+$")) return s;

        // Try parse common Jira URLs
        Matcher m = PROJECT_KEY_IN_URL.matcher(s);
        if (m.find()) {
            return m.group(1);
        }

        return null;
    }

    private boolean canBrowseProject(String projectKey) {
        try {
            String apiUrl = jiraProperties.getBaseUrl() + "/rest/api/3/project/" + projectKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header(HttpHeaders.AUTHORIZATION, getBasicAuthHeader())
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .timeout(Duration.ofSeconds(jiraProperties.getTimeoutSeconds()))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) return true;
            if (response.statusCode() == 401) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Jira credentials");
            }
            // Jira often returns 404 for projects the user cannot access.
            if (response.statusCode() == 403 || response.statusCode() == 404) {
                logger.warn("Jira project access denied for {} (HTTP {})", projectKey, response.statusCode());
                return false;
            }

            logger.warn("Unexpected Jira project response for {}: HTTP {}", projectKey, response.statusCode());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Failed to verify Jira project access: HTTP " + response.statusCode());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            logger.warn("Error verifying Jira project access for {}", projectKey, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to verify Jira project access: " + e.getMessage());
        }
    }

    private String getBasicAuthHeader() {
        String credentials = jiraProperties.getEmail() + ":" + jiraProperties.getApiToken();
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }
}
