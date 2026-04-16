package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    /**
     * Validate GitLab token by checking user endpoint
     */
    public boolean validateToken(String gitlabUrl, String token) {
        try {
            String url = normalizeGitLabUrl(gitlabUrl);
            String apiUrl = url + "/api/v4/user";

            ProcessBuilder pb = new ProcessBuilder(
                    "curl",
                    "-s",
                    "-w", "%{http_code}",
                    "-H", "PRIVATE-TOKEN: " + token,
                    apiUrl);

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

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
            String httpCode = output.toString().substring(output.length() - 3);

            return httpCode.startsWith("20"); // 200-299 = success

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
            // 1. Create temp directory
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
            // Use force push to allow overwriting existing content on the branch
            executeGitCommand(tempDir, "push", "-u", "-f", "origin", branch);

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
