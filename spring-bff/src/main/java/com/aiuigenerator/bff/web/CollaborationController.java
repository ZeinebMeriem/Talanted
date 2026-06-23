package com.aiuigenerator.bff.web;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Real-time collaboration over STOMP/WebSocket.
 *
 * Frontend connects to /ws/collab (SockJS).
 * Subscribe to  /topic/project/{id}/events  to receive events.
 * Send to        /app/project/{id}/event     to broadcast an event.
 *
 * Event types:
 *   cursor    – user moved their cursor (position in editor)
 *   edit      – user saved a file edit
 *   presence  – user joined / left the session
 */
@Controller
public class CollaborationController {

    private static final Logger log = LoggerFactory.getLogger(CollaborationController.class);

    // projectId → list of connected user display names
    private final Map<String, CopyOnWriteArrayList<String>> presence = new ConcurrentHashMap<>();

    // projectId → [userName, lockedAtEpochMs]
    private final Map<String, String[]> projectLocks = new ConcurrentHashMap<>();
    private static final long LOCK_TIMEOUT_MS = 60_000;

    private final SimpMessagingTemplate messaging;

    public CollaborationController(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public record CollabEvent(
        String type,        // cursor | edit | presence
        String projectId,
        String userId,
        String userName,
        Object data,        // type-specific payload
        String timestamp
    ) {}

    private boolean isLockExpired(String[] lock) {
        try { return System.currentTimeMillis() - Long.parseLong(lock[1]) > LOCK_TIMEOUT_MS; }
        catch (Exception e) { return true; }
    }

    private Map<String, Object> currentLockData(String projectId) {
        String[] lock = projectLocks.get(projectId);
        if (lock == null || isLockExpired(lock)) {
            projectLocks.remove(projectId);
            return Map.of("locked", false, "lockedBy", "");
        }
        return Map.of("locked", true, "lockedBy", lock[0]);
    }

    private String resolveUserName(CollabEvent event, Principal principal) {
        if (event != null && event.userName() != null && !event.userName().isBlank()
                && !event.userName().equals("anonymous")) {
            return event.userName();
        }
        return principal != null && principal.getName() != null ? principal.getName() : "anonymous";
    }

    /**
     * Explicit join sent by the client after connecting and subscribing.
     * Destination: /app/project/{id}/join
     */
    @MessageMapping("/project/{projectId}/join")
    public void join(
            @DestinationVariable String projectId,
            @Payload CollabEvent event,
            Principal principal) {

        String userName = resolveUserName(event, principal);
        List<String> users = presence.computeIfAbsent(projectId, k -> new CopyOnWriteArrayList<>());
        if (!users.contains(userName)) users.add(userName);

        Map<String, Object> joinData = new java.util.HashMap<>();
        joinData.put("action", "join");
        joinData.put("users", List.copyOf(users));
        joinData.putAll(currentLockData(projectId));

        CollabEvent joined = new CollabEvent(
            "presence", projectId, userName, userName,
            joinData,
            Instant.now().toString()
        );
        messaging.convertAndSend("/topic/project/" + projectId + "/events", joined);
        log.info("Collab: {} joined project {}", userName, projectId);
    }

    /**
     * Relay any event from one client to all subscribers of the project topic.
     * Destination: /app/project/{id}/event
     */
    @MessageMapping("/project/{projectId}/event")
    public void relay(
            @DestinationVariable String projectId,
            @Payload CollabEvent event,
            Principal principal) {

        String userName = resolveUserName(event, principal);

        if ("lock".equals(event.type())) {
            String[] existing = projectLocks.get(projectId);
            boolean canAcquire = existing == null || isLockExpired(existing) || userName.equals(existing[0]);
            if (canAcquire) {
                projectLocks.put(projectId, new String[]{userName, String.valueOf(System.currentTimeMillis())});
                CollabEvent lockEvent = new CollabEvent("lock", projectId, userName, userName,
                    Map.of("locked", true, "lockedBy", userName, "denied", false),
                    Instant.now().toString());
                messaging.convertAndSend("/topic/project/" + projectId + "/events", lockEvent);
            } else {
                CollabEvent denyEvent = new CollabEvent("lock", projectId, existing[0], existing[0],
                    Map.of("locked", true, "lockedBy", existing[0], "denied", true),
                    Instant.now().toString());
                messaging.convertAndSend("/topic/project/" + projectId + "/events", denyEvent);
            }
            return;
        }

        if ("unlock".equals(event.type())) {
            String[] existing = projectLocks.get(projectId);
            if (existing != null && userName.equals(existing[0])) {
                projectLocks.remove(projectId);
                CollabEvent unlockEvent = new CollabEvent("unlock", projectId, userName, userName,
                    Map.of("locked", false, "lockedBy", ""),
                    Instant.now().toString());
                messaging.convertAndSend("/topic/project/" + projectId + "/events", unlockEvent);
            }
            return;
        }

        CollabEvent enriched = new CollabEvent(
            event.type(),
            projectId,
            userName,
            userName,
            event.data(),
            Instant.now().toString()
        );
        messaging.convertAndSend("/topic/project/" + projectId + "/events", enriched);
    }

    /**
     * Remove a user from presence when they leave.
     * Destination: /app/project/{id}/leave
     */
    @MessageMapping("/project/{projectId}/leave")
    public void leave(
            @DestinationVariable String projectId,
            @Payload CollabEvent event,
            Principal principal) {

        String userName = resolveUserName(event, principal);
        List<String> users = presence.get(projectId);
        if (users != null) users.remove(userName);
        // Release lock if this user held it
        String[] lock = projectLocks.get(projectId);
        if (lock != null && userName.equals(lock[0])) projectLocks.remove(projectId);

        CollabEvent left = new CollabEvent(
            "presence", projectId, userName, userName,
            Map.of("action", "leave", "users", presence.getOrDefault(projectId, new CopyOnWriteArrayList<>())),
            Instant.now().toString()
        );
        messaging.convertAndSend("/topic/project/" + projectId + "/events", left);
        log.info("Collab: {} left project {}", userName, projectId);
    }
}
