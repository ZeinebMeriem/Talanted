package com.aiuigenerator.bff.dto;

/**
 * Simple DTO for GitLab push functionality
 */
public class GitLabPushDto {

    /**
     * Request to push code to GitLab
     */
    public static class PushRequest {
        public String gitlabUrl;              // e.g., https://gitlab.com
        public String projectPath;            // e.g., group/project
        public String personalAccessToken;    // User's GitLab PAT
        public String branch;                 // e.g., main
        public String commitMessage;          // e.g., feat: generated UI
        public boolean forceOverwrite;        // force-push to overwrite existing branch

        public PushRequest() {}
    }

    /**
     * Response after push
     */
    public static class PushResponse {
        public boolean success;
        public String message;
        public String projectUrl;

        public PushResponse(boolean success, String message, String projectUrl) {
            this.success = success;
            this.message = message;
            this.projectUrl = projectUrl;
        }

        public static PushResponse success(String projectUrl) {
            return new PushResponse(true, "Successfully pushed to GitLab", projectUrl);
        }

        public static PushResponse error(String message) {
            return new PushResponse(false, message, null);
        }
    }
}
