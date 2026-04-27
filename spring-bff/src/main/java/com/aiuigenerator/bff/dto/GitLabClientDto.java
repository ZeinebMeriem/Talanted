package com.aiuigenerator.bff.dto;

/**
 * DTOs for GitLab push functionality
 */
public class GitLabClientDto {

    /**
     * Request to push generated code to GitLab
     * Token is now provided directly in the request
     */
    public static class PushToGitLabRequest {
        public String gitlabUrl;           // ex: https://gitlab.com or https://gitlab.company.com
        public String projectPath;         // ex: group/project
        public String token;               // GitLab Personal Access Token (provided by user)
        public String branch;              // ex: main, feature/ai-generated
        public String commitMessage;       // ex: "feat: AI-generated UI"
        public boolean autoCreate;         // Auto-create project if doesn't exist

        public PushToGitLabRequest() {}

        public PushToGitLabRequest(
            String gitlabUrl,
            String projectPath,
            String token,
            String branch,
            String commitMessage,
            boolean autoCreate
        ) {
            this.gitlabUrl = gitlabUrl;
            this.projectPath = projectPath;
            this.token = token;
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
        public String errorCode;          // INVALID_INPUT | AUTH_FAILED | PROJECT_NOT_FOUND | GIT_PUSH_FAILED | NETWORK_ERROR | null if success
        public String nextSteps;          // What the user should do next

        public PushToGitLabResponse() {}

        public PushToGitLabResponse(
            boolean success,
            String projectUrl,
            String branch,
            String commitHash,
            String message
        ) {
            this(success, projectUrl, branch, commitHash, message, null, null);
        }

        public PushToGitLabResponse(
            boolean success,
            String projectUrl,
            String branch,
            String commitHash,
            String message,
            String errorCode,
            String nextSteps
        ) {
            this.success = success;
            this.projectUrl = projectUrl;
            this.branch = branch;
            this.commitHash = commitHash;
            this.message = message;
            this.errorCode = errorCode;
            this.nextSteps = nextSteps;
        }

        /**
         * Create an error response with error code
         */
        public static PushToGitLabResponse error(String message, String errorCode, String nextSteps) {
            return new PushToGitLabResponse(false, null, null, null, message, errorCode, nextSteps);
        }

        /**
         * Create an error response (legacy)
         */
        public static PushToGitLabResponse error(String message) {
            return new PushToGitLabResponse(false, null, null, null, message, null, null);
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
                "Successfully pushed to GitLab",
                null,
                null
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
