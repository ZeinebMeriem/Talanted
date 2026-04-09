package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.dto.JiraIssueDTO;
import com.aiuigenerator.bff.dto.JiraIssueListItemDTO;
import com.aiuigenerator.bff.service.JiraService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jira")
public class JiraController {
    private static final Logger logger = LoggerFactory.getLogger(JiraController.class);

    private final JiraService jiraService;

    public JiraController(JiraService jiraService) {
        this.jiraService = jiraService;
    }

    @GetMapping("/issues/{issueKey}")
    public ResponseEntity<JiraIssueDTO> getIssue(@PathVariable String issueKey) {
        logger.info("Fetching Jira issue: {}", issueKey);
        JiraIssueDTO issue = jiraService.getIssue(issueKey);
        return ResponseEntity.ok(issue);
    }

    /**
     * Given a Jira URL (board/project) or a project key, return a list of FRONTEND TASKS ONLY.
     *
     * Strict filtering: only issues matching labels configured in JIRA_FRONTEND_LABELS (default: ui,interface,ux).
     * This ensures only UI/frontend tasks can be selected for code generation.
     */
    @GetMapping("/frontend-tasks")
    public ResponseEntity<List<JiraIssueListItemDTO>> listFrontendTasks(
            @RequestParam(name = "url", required = false) String url,
            @RequestParam(name = "projectKey", required = false) String projectKey) {
        String input = (url != null && !url.isBlank()) ? url : projectKey;
        logger.info("Listing Jira frontend tasks for input={}", input);
        List<JiraIssueListItemDTO> issues = jiraService.listFrontendTasks(input, false);
        return ResponseEntity.ok(issues);
    }
}
