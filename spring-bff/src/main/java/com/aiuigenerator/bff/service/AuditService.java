package com.aiuigenerator.bff.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import com.aiuigenerator.bff.domain.AuditEvent;
import com.aiuigenerator.bff.repo.AuditEventRepository;
import com.aiuigenerator.bff.web.CorrelationIdFilter;

import de.huxhorn.sulky.ulid.ULID;

@Service
public class AuditService {

    private final AuditEventRepository repo;
    private final ULID ulid = new ULID();

    public AuditService(AuditEventRepository repo) {
        this.repo = repo;
    }

    public void recordEvent(String type, String generationId, String sessionId, long durationMs,
            Map<String, Object> details) {
        AuditEvent e = new AuditEvent();
        e.setEventId(ulid.nextULID());
        e.setType(type);
        e.setGenerationId(generationId);
        e.setSessionId(sessionId);
        e.setCorrelationId(MDC.get(CorrelationIdFilter.MDC_KEY));
        e.setTimestamp(Instant.now());
        e.setDurationMs(durationMs);
        e.setDetails(details);
        repo.save(e);
    }

    public List<AuditEvent> listEventsForGeneration(String generationId) {
        return repo.findTop200ByGenerationIdOrderByTimestampAsc(generationId);
    }
}
