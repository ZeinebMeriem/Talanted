package com.aiuigenerator.bff.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.aiuigenerator.bff.dto.CodeFileDto;
import com.aiuigenerator.bff.dto.GitLabPushDto;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;

@Service
public class SimpleGitLabService {
    private static final Logger log = LoggerFactory.getLogger(SimpleGitLabService.class);

    public GitLabPushDto.PushResponse pushCode(
            String gitlabUrl,
            String personalAccessToken,
            String projectPath,
            String branch,
            String commitMessage,
            List<CodeFileDto> files,
            boolean forceOverwrite) {

        String tempDir = null;
        try {
            // 1. Create temp directory
            tempDir = Files.createTempDirectory("gitlab-push-").toAbsolutePath().toString();
            log.info("Created temp dir for push, fileCount={}", files.size());

            // 2. Write each file to its proper path
            Path root = Paths.get(tempDir);
            for (CodeFileDto file : files) {
                Path target = root.resolve(file.path).normalize();
                if (!target.startsWith(root)) {
                    throw new Exception("Unsafe file path rejected: " + file.path);
                }
                Files.createDirectories(target.getParent());
                Files.write(target, file.content.getBytes(StandardCharsets.UTF_8));
            }
            log.info("Wrote {} files to temp dir", files.size());

            // 3. Initialize git repo
            runGit(tempDir, "git", "init");
            runGit(tempDir, "git", "config", "user.email", "dev@talan.com");
            runGit(tempDir, "git", "config", "user.name", "Talan Dev");

            // 4. Add and commit
            runGit(tempDir, "git", "add", ".");
            runGit(tempDir, "git", "commit", "-m", commitMessage);

            // 5. Push to GitLab — PAT embedded in URL, never logged
            String normalizedUrl = normalizeUrl(gitlabUrl);
            String domain = normalizedUrl.replaceAll("^https?://", "");
            String remoteUrl = "https://oauth2:" + personalAccessToken + "@" + domain + "/" + projectPath + ".git";

            runGit(tempDir, "git", "remote", "add", "origin", remoteUrl);
            runGit(tempDir, "git", "branch", "-M", branch);
            if (forceOverwrite) {
                runGit(tempDir, "git", "push", "-u", "--force", "origin", branch);
            } else {
                runGit(tempDir, "git", "push", "-u", "origin", branch);
            }

            String projectUrl = normalizedUrl + "/" + projectPath;
            log.info("Successfully pushed to {}", projectUrl);

            return GitLabPushDto.PushResponse.success(projectUrl);

        } catch (Exception e) {
            String safeMessage = e.getMessage() == null ? "Unknown error"
                    : e.getMessage().replaceAll("https://[^@]+@", "https://***@");
            log.error("Push failed: {}", safeMessage);
            return GitLabPushDto.PushResponse.error("Push failed: " + safeMessage);
        } finally {
            if (tempDir != null) {
                try {
                    Files.walk(Paths.get(tempDir))
                            .sorted(Comparator.reverseOrder())
                            .forEach(path -> {
                                try {
                                    Files.delete(path);
                                } catch (IOException e) {
                                    log.warn("Could not delete temp file: {}", path);
                                }
                            });
                    log.info("Cleaned up temp dir");
                } catch (IOException e) {
                    log.warn("Error cleaning temp dir: {}", e.getMessage());
                }
            }
        }
    }

    private void runGit(String workDir, String... cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(new File(workDir));
        pb.redirectErrorStream(true);

        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder output = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
        }

        boolean completed = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
        if (!completed) {
            process.destroy();
            throw new Exception("Git command timeout");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new Exception("Git command failed (exit " + exitCode + "): " + output.toString());
        }

        // Log command name only — never log args that may contain the PAT
        log.debug("Git command succeeded: {}", cmd[0] + (cmd.length > 1 ? " " + cmd[1] : ""));
    }

    private String normalizeUrl(String url) {
        return url.replaceAll("/$", "");
    }
}
