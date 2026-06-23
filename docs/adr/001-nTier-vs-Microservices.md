# ADR-001: Architecture N-tiers vs Microservices

## Status: ACCEPTED

## Context
Talanted orchestrates multiple services:
- React frontend (5173)
- Spring BFF (8081)
- FastAPI pipeline (8000)
- MongoDB database (27017)
- MinIO storage (9000)
- Keycloak auth (8083)

Question: How to structure these services?

## Decision
Use **N-tiers Architecture with Backend-for-Frontend (BFF) pattern**.

## Justification

### Why N-tiers?
1. **Simple deployment**: `docker compose up -d` ← everything works in one command
2. **Low latency**: HTTP communication < 100ms (same Docker network)
3. **Easy debugging**: Request flow is linear and traceable
4. **MVP speed**: Market faster than competitors
5. **Single repository**: Easier onboarding for new developers

### Why NOT Microservices?
Microservices would give:
- Independent scaling per service
- Fault isolation (one service crash ≠ entire system down)
- Technology diversity per service

But costs:
- Kubernetes complexity (steep learning curve)
- DevOps overhead (monitoring, logging, tracing)
- Overkill for MVP phase
- Distributed tracing nightmares
- Operational burden at scale

## Trade-offs

### PROS (N-tiers):
✅ One-command deployment (`docker compose up -d`)
✅ Tight integration for real-time features (SSE streaming)
✅ Single repository = easier onboarding
✅ CI/CD simple (no service coordination)
✅ Debugging without distributed tracing
✅ Minimal operational overhead

### CONS (N-tiers):
❌ Tight coupling between frontend and backend
❌ BFF = single point of failure
❌ Can't scale services independently
❌ Shared resources (database, storage)

## Consequences
- If traffic > 10k req/s → Migrate to Kubernetes (S12+)
- For MVP (6 months): N-tiers is optimal choice
- Refactoring effort if needed: ~2 weeks

## Future Evolution
```
Phase 1 (Current - 6 months): N-tiers Docker Compose
Phase 2 (Year 2): Kubernetes + service mesh (if scale > 100 concurrent)
Phase 3 (Year 3): Serverless functions (if variable traffic patterns)
```

## References
- Netflix: Backend for Frontend article
- Martin Fowler: Microservices Patterns
- Sam Newman: Building Microservices book
- Sam Newman: BFF chapter
