package com.aiuigenerator.bff.dto;

/**
 * DTOs for GitLab push functionality
 */
public class GitLabClientDto {

    /**
     * Request to push generated code to GitLab
     * Token is no longer needed - fetched from stored OAuth2 credential
     */
    public static class PushToGitLabRequest {
        public String gitlabUrl;           // ex: https://gitlab.com or https://gitlab.company.com
        public String projectPath;         // ex: group/project
        // public String token;            // REMOVED - now fetched from OAuth2 storage
        public String branch;              // ex: main, feature/ai-generated
        public String commitMessage;       // ex: "feat: AI-generated UI"
        public boolean autoCreate;         // Auto-create project if doesn't exist

        public PushToGitLabRequest() {}

        public PushToGitLabRequest(
            String gitlabUrl,
            String projectPath,
            String branch,
            String commitMessage,
            boolean autoCreate
        ) {
            this.gitlabUrl = gitlabUrl;
            this.projectPath = projectPath;
            this.branch = branch;
            this.commitMessage = commitMessage;
            this.autoCreate = autoCreate;
        }
    }

    /**
     * Response after pushing to GitLab
     */
    public static class PushToGitLabResponse {
        public boolean success;
        public String projectUrl;         // https://gitlab.com/group/project
        public String branch;             // the branch pushed to
        public String commitHash;         // git commit SHA-1 hash
        public String message;            // Status message

        public PushToGitLabResponse() {}

        public PushToGitLabResponse(
            boolean success,
            String projectUrl,
            String branch,
            String commitHash,
            String message
        ) {
            this.success = success;
            this.projectUrl = projectUrl;
            this.branch = branch;
            this.commitHash = commitHash;
            this.message = message;
        }

        /**
         * Create an error response
         */
        public static PushToGitLabResponse error(String message) {
            return new PushToGitLabResponse(false, null, null, null, message);
        }

        /**
         * Create a success response
         */
        public static PushToGitLabResponse success(
            String projectUrl,
            String branch,
            String commitHash
        ) {
            return new PushToGitLabResponse(
                true,
                projectUrl,
                branch,
                commitHash,
                "Successfully pushed to GitLab"
            );
        }
    }

    /**
     * Internal class to hold push result from GitLabService
     */
    public static class PushResult {
        public String projectUrl;
        public String branch;
        public String commitHash;

        public PushResult(String projectUrl, String branch, String commitHash) {
            this.projectUrl = projectUrl;
            this.branch = branch;
            this.commitHash = commitHash;
        }
    }

    /**
     * Request to validate GitLab token
     */
    public static class ValidateTokenRequest {
        public String gitlabUrl;  // ex: https://gitlab.com or https://gitlab.company.com
        public String token;      // Personal Access Token

        public ValidateTokenRequest() {}

        public ValidateTokenRequest(String gitlabUrl, String token) {
            this.gitlabUrl = gitlabUrl;
            this.token = token;
        }
    }

    /**
     * Response from token validation
     */
    public static class ValidateTokenResponse {
        public boolean valid;

        public ValidateTokenResponse(boolean valid) {
            this.valid = valid;
        }
    }
}
