package com.aiuigenerator.bff.dto;

/**
 * DTOs for GitLab push functionality
 */
public class GitLabClientDto {

    /**
     * Request to push generated code to GitLab
     */
    public static class PushToGitLabRequest {
        public String gitlabUrl;           // ex: https://gitlab.com or https://gitlab.company.com
        public String projectPath;         // ex: group/project
        public String token;               // Personal Access Token
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
}
