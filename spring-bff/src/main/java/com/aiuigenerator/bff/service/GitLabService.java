package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.aiuigenerator.bff.domain.FileEntry;
import com.aiuigenerator.bff.dto.GitLabClientDto;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for pushing generated code to GitLab
 */
@Service
public class GitLabService {
    private static final Logger log = LoggerFactory.getLogger(GitLabService.class);

    private static final String GIT_AUTHOR_EMAIL = "ai-generator@aiuigenerator.com";
    private static final String GIT_AUTHOR_NAME = "AI Generator";
    private static final int GIT_TIMEOUT_SECONDS = 120;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    /**
     * Determine auth header for GitLab API based on token type
     * OAuth2 access tokens use 'Authorization: Bearer', PATs use 'PRIVATE-TOKEN'
     */
    private String[] gitlabAuthHeader(String token) {
        if (token != null && token.startsWith("glpat-")) {
            return new String[]{"-H", "PRIVATE-TOKEN: " + token};
        }
        return new String[]{"-H", "Authorization: Bearer " + token};
    }

    /**
     * Ensure GitLab project exists, creating if necessary
     */
    public boolean ensureProjectExists(String gitlabUrl, String token, String projectPath) {
        // Skip if using mock token (dev mode - no real GitLab connection needed)
        if (token != null && token.startsWith("dev-token-")) {
            log.info("Dev mode with mock token: Skipping project existence check for {}", projectPath);
            return true;
        }

        try {
            String url = normalizeGitLabUrl(gitlabUrl);
            String apiUrl = url + "/api/v4/projects";

            // Extract group and project name from path (e.g., "group/project" or "user/project")
            String[] parts = projectPath.split("/");
            if (parts.length < 2) {
                log.warn("Invalid project path format: {}", projectPath);
                return false;
            }

            String groupName = parts[0];
            String projectName = parts[1];

            // First, try to check if project already exists
            String projectId = URLEncode(projectPath);
            String getUrl = apiUrl + "/" + projectId;

            String[] authHeader = gitlabAuthHeader(token);
            List<String> checkCmd = new java.util.ArrayList<>(java.util.Arrays.asList(
                    "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}"));
            checkCmd.add(authHeader[0]);
            checkCmd.add(authHeader[1]);
            checkCmd.add(getUrl);
            ProcessBuilder checkPb = new ProcessBuilder(checkCmd);

            Process checkProcess = checkPb.start();
            boolean completed = checkProcess.waitFor(10, java.util.concurrent.TimeUnit.SECONDS);

            if (!completed) {
                checkProcess.destroy();
                return false;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(checkProcess.getInputStream()));
            String statusCode = reader.readLine();
            reader.close();

            if (statusCode != null && statusCode.startsWith("20")) {
                log.info("Project {} already exists", projectPath);
                return true;
            }

            // Project doesn't exist, create it
            log.info("Creating new GitLab project: {}", projectPath);

            String createPayload = String.format(
                    "{\"name\":\"%s\",\"namespace_id\":\"%s\",\"visibility\":\"private\",\"initialize_with_readme\":false}",
                    projectName, groupName);

            List<String> createCmd = new java.util.ArrayList<>(java.util.Arrays.asList(
                    "curl", "-s", "-X", "POST",
                    "-H", "Content-Type: application/json",
                    "-d", createPayload,
                    "-w", "%{http_code}",
                    "-o", "/dev/null"));
            createCmd.add(authHeader[0]);
            createCmd.add(authHeader[1]);
            createCmd.add(apiUrl);
            ProcessBuilder createPb = new ProcessBuilder(createCmd);

            Process createProcess = createPb.start();
            completed = createProcess.waitFor(15, java.util.concurrent.TimeUnit.SECONDS);

            if (!completed) {
                createProcess.destroy();
                log.warn("Create project request timed out");
                return false;
            }

            reader = new BufferedReader(new InputStreamReader(createProcess.getInputStream()));
            statusCode = reader.readLine();
            reader.close();

            boolean created = statusCode != null && (statusCode.startsWith("20") || statusCode.equals("201"));
            if (created) {
                log.info("Successfully created GitLab project: {}", projectPath);
            } else {
                log.warn("Failed to create GitLab project: HTTP {}", statusCode);
            }
            return created;

        } catch (Exception e) {
            log.error("Error ensuring GitLab project exists", e);
            return false;
        }
    }

    /**
     * URL encode for GitLab API (replace / with %)
     */
    private String URLEncode(String projectPath) {
        // GitLab uses %2F for forward slash in project path encoding
        return projectPath.replace("/", "%2F");
    }

    /**
     * Validate GitLab token by checking user endpoint
     */
    public boolean validateToken(String gitlabUrl, String token) {
        // Skip validation for mock tokens (dev mode)
        if (token != null && token.startsWith("dev-token-")) {
            log.debug("Dev mode mock token: Auto-validating");
            return true;
        }

        try {
            String url = normalizeGitLabUrl(gitlabUrl);
            String apiUrl = url + "/api/v4/user";

            log.debug("Validating token for GitLab URL: {}", apiUrl);

            // Use separate output and error streams for cleaner parsing
            String[] authHeader = gitlabAuthHeader(token);
            List<String> cmd = new java.util.ArrayList<>(java.util.Arrays.asList(
                    "curl", "-s", "-o", "/tmp/gitlab_response.txt", "-w", "%{http_code}"));
            cmd.add(authHeader[0]);
            cmd.add(authHeader[1]);
            cmd.add(apiUrl);
            ProcessBuilder pb = new ProcessBuilder(cmd);

            Process process = pb.start();
            boolean completed = process.waitFor(10, java.util.concurrent.TimeUnit.SECONDS);

            if (!completed) {
                process.destroy();
                log.warn("GitLab token validation timeout");
                return false;
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.warn("GitLab token validation failed with exit code: {}", exitCode);
                return false;
            }

            // Read only stdout which contains the HTTP code
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String httpCode = reader.readLine();
            reader.close();

            if (httpCode == null || httpCode.trim().isEmpty()) {
                log.warn("No HTTP code returned from GitLab");
                return false;
            }

            httpCode = httpCode.trim();
            log.debug("GitLab validation HTTP code: {}", httpCode);
            boolean isValid = httpCode.startsWith("20"); // 200-299 = success

            if (isValid) {
                log.info("GitLab token validation successful for URL: {}", url);
            } else {
                log.warn("GitLab token validation failed with HTTP {}", httpCode);
            }

            return isValid;

        } catch (Exception e) {
            log.error("Error validating GitLab token", e);
            return false;
        }
    }

    /**
     * Push code to GitLab repository
     */
    public GitLabClientDto.PushResult pushCode(
            String gitlabUrl,
            String token,
            String projectPath,
            String branch,
            List<FileEntry> files,
            String commitMessage) throws GitLabServiceException {
        String tempDir = null;
        try {
            // Skip actual push if using dev mode mock token (for testing without real GitLab)
            if (token != null && token.startsWith("dev-token-")) {
                log.info("Mock token detected: Skipping actual push, returning mock response for project {}", projectPath);
                String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
                String projectUrl = buildProjectUrl(normalizedUrl, projectPath);
                return new GitLabClientDto.PushResult(projectUrl, branch, "dev-commit-" + System.currentTimeMillis());
            }

            // Real credentials: perform actual git push
            tempDir = createTempDirectory();
            log.info("Created temp dir: {}", tempDir);

            // 2. Write files to temp directory
            writeFilesToDisk(tempDir, files);
            log.info("Wrote {} files to disk", files.size());

            // 3. Initialize git repo
            executeGitCommand(tempDir, "init");
            executeGitCommand(tempDir, "config", "user.email", GIT_AUTHOR_EMAIL);
            executeGitCommand(tempDir, "config", "user.name", GIT_AUTHOR_NAME);

            // 4. Commit files
            executeGitCommand(tempDir, "add", ".");
            executeGitCommand(tempDir, "commit", "-m", commitMessage);

            // 5. Get project URL with token
            String normalizedUrl = normalizeGitLabUrl(gitlabUrl);
            String projectUrl = buildProjectUrl(normalizedUrl, projectPath);
            String projectUrlWithToken = buildProjectUrlWithToken(normalizedUrl, projectPath, token);

            // 6. Add remote and push (use URL with token for authentication)
            executeGitCommand(tempDir, "remote", "add", "origin", projectUrlWithToken);
            executeGitCommand(tempDir, "branch", "-M", branch);
            // Push with --force: safely overwrite remote branch with generated code
            // Since we generate fresh code each time, we always want to replace the remote
            executeGitCommand(tempDir, "push", "-u", "--force", "origin", branch);

            // 7. Get commit hash
            String commitHash = getCommitHash(tempDir);
            log.info("Pushed to {} branch {} with commit {}", projectUrl, branch, commitHash);

            return new GitLabClientDto.PushResult(projectUrl, branch, commitHash);

        } catch (Exception e) {
            log.error("Failed to push code to GitLab", e);
            throw new GitLabServiceException("Git push failed: " + e.getMessage(), e);
        } finally {
            // Clean up temp directory
            if (tempDir != null) {
                deleteTempDirectory(tempDir);
                log.info("Cleaned up temp dir: {}", tempDir);
            }
        }
    }

    /**
     * Create temp directory for git operations
     */
    private String createTempDirectory() throws IOException {
        Path tempPath = Files.createTempDirectory("gitlab-push-");
        return tempPath.toAbsolutePath().toString();
    }

    /**
     * Write files to disk maintaining directory structure
     */
    private void writeFilesToDisk(String baseDir, List<FileEntry> files) throws IOException {
        for (FileEntry file : files) {
            Path filePath = Paths.get(baseDir, file.path());

            // Create parent directories
            Files.createDirectories(filePath.getParent());

            // Write file content
            Files.write(
                    filePath,
                    file.content().getBytes(StandardCharsets.UTF_8),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING);
        }
    }

    /**
     * Execute a git command in the specified directory
     */
    private void executeGitCommand(String workDir, String... cmd) throws GitLabServiceException {
        try {
            String[] fullCmd = new String[cmd.length + 1];
            fullCmd[0] = "git";
            System.arraycopy(cmd, 0, fullCmd, 1, cmd.length);

            ProcessBuilder pb = new ProcessBuilder(fullCmd);
            pb.directory(new File(workDir));
            pb.redirectErrorStream(true);

            // Set environment variables to prevent interactive prompts and signing
            Map<String, String> env = pb.environment();
            env.put("GIT_TERMINAL_PROMPT", "0");  // Disable interactive password prompts
            env.put("GIT_AUTHOR_NAME", GIT_AUTHOR_NAME);
            env.put("GIT_AUTHOR_EMAIL", GIT_AUTHOR_EMAIL);
            env.put("GIT_COMMITTER_NAME", GIT_AUTHOR_NAME);
            env.put("GIT_COMMITTER_EMAIL", GIT_AUTHOR_EMAIL);

            Process process = pb.start();

            // Capture output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // Wait for completion with timeout
            boolean completed = process.waitFor(GIT_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
            if (!completed) {
                process.destroy();
                throw new GitLabServiceException("Git command timeout");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                String errorMsg = String.format(
                        "Git command failed with exit code %d: %s",
                        exitCode,
                        output.toString());
                throw new GitLabServiceException(errorMsg);
            }

            log.debug("Git command executed: {} {}", String.join(" ", cmd), output.toString());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GitLabServiceException("Git command interrupted", e);
        } catch (IOException e) {
            throw new GitLabServiceException("Failed to execute git command: " + e.getMessage(), e);
        }
    }

    /**
     * Get the current commit hash
     */
    private String getCommitHash(String workDir) throws GitLabServiceException {
        try {
            ProcessBuilder pb = new ProcessBuilder("git", "rev-parse", "HEAD");
            pb.directory(new File(workDir));

            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String hash = reader.readLine();

            process.waitFor();

            return hash != null ? hash.trim() : "unknown";

        } catch (Exception e) {
            throw new GitLabServiceException("Failed to get commit hash", e);
        }
    }

    /**
     * Delete temp directory recursively
     */
    private void deleteTempDirectory(String dirPath) {
        try {
            Files.walk(Paths.get(dirPath))
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete {}", path, e);
                        }
                    });
        } catch (IOException e) {
            log.warn("Failed to cleanup temp directory {}", dirPath, e);
        }
    }

    /**
     * Normalize GitLab URL (remove trailing slash)
     */
    private String normalizeGitLabUrl(String url) {
        if (url == null) {
            return "https://gitlab.com";
        }
        return url.replaceAll("/$", ""); // Remove trailing slash
    }

    /**
     * Build project URL from GitLab URL and project path
     * Handles both HTTPS and SSH formats
     */
    private String buildProjectUrl(String gitlabUrl, String projectPath) {
        // For git push, we need HTTPS format: https://gitlab.com/group/project.git
        return gitlabUrl + "/" + projectPath + ".git";
    }

    /**
     * Build project URL with token embedded for git authentication
     * GitLab format: https://oauth2:token@gitlab.com/group/project.git
     */
    private String buildProjectUrlWithToken(String gitlabUrl, String projectPath, String token) {
        // Extract domain from URL (e.g., from https://gitlab.com -> gitlab.com)
        String domain = gitlabUrl.replaceAll("^https?://", "");
        // Use oauth2 as username, token as password for GitLab authentication
        return "https://oauth2:" + token + "@" + domain + "/" + projectPath + ".git";
    }

    /**
     * Get project URL (for display)
     */
    public String getProjectUrl(String gitlabUrl, String projectPath) {
        return normalizeGitLabUrl(gitlabUrl) + "/" + projectPath;
    }

    /**
     * Custom exception for GitLab service errors
     */
    public static class GitLabServiceException extends Exception {
        public GitLabServiceException(String message) {
            super(message);
        }

        public GitLabServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
