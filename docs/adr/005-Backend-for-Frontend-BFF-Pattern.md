# ADR-005: Backend-for-Frontend (BFF) Pattern

## Status: ACCEPTED

## Context
Talanted has multiple independent services:
- **React frontend** (needs OAuth2, projects, previews, chat)
- **FastAPI** (generates code, handles AI agents)
- **Keycloak** (manages auth tokens)
- **MongoDB** (persists data)
- **MinIO** (stores files/avatars)

How should frontend communicate with these services?

### Option 1: Direct Integration (Bad ❌)
```
[React]
  ├─→ [Keycloak] OAuth2
  ├─→ [FastAPI] /generate
  ├─→ [MongoDB] driver (NO! exposes DB)
  └─→ [MinIO] S3 client
```

Problems:
- React directly calls MongoDB? Security risk!
- 5 different API contracts to maintain
- Auth logic scattered everywhere
- Cross-origin (CORS) nightmare
- No request aggregation

### Option 2: Backend-for-Frontend (Good ✅)
```
[React]
  ↓ (Single entry point)
[Spring BFF] ← Single gateway
  ├─→ [Keycloak]
  ├─→ [FastAPI]
  ├─→ [MongoDB]
  └─→ [MinIO]
```

## Decision
Use **Backend-for-Frontend (BFF) Pattern** via Spring Boot 3.2.

## Justification

### What is BFF?

BFF is an API gateway layer that:
1. **Routes requests** from frontend to correct backend service
2. **Centralizes auth** (JWT validation, RBAC)
3. **Aggregates data** (combine 3 backend responses → 1 response)
4. **Transforms responses** (format for frontend needs)
5. **Manages cross-cutting concerns** (logging, monitoring, rate limiting)

### Architecture

```
┌─────────────────────────────────────────┐
│         React Frontend (5173)            │
│     Single API contract to learn        │
└──────────────┬──────────────────────────┘
               │ HTTP REST + JWT
               │ One API, one domain
               ↓
┌──────────────────────────────────────────┐
│    Spring BFF (8081) - API Gateway       │
│                                          │
│  @RestController                         │
│  public class GenerationController {     │
│    @PostMapping("/api/generations")      │
│    public void generate() {              │
│      // 1. Extract userId from JWT      │
│      String userId = jwtToken.get("sub");│
│      // 2. Store in MongoDB              │
│      repo.save(project);                 │
│      // 3. Call FastAPI                  │
│      fastapi.generate(userId, files);   │
│      // 4. Stream progress back          │
│      return sseStream;                   │
│    }                                      │
│  }                                        │
└──────┬───────────────┬───────┬───────────┘
       │               │       │
       ↓               ↓       ↓
   Keycloak       FastAPI    MongoDB
   (Auth)         (AI)       (Data)
```

### Example: Generate UI Flow

**Frontend Request**:
```typescript
// frontend/src/api.ts
const response = await client.post('/api/generations/stream', {
  prompt: 'A dashboard with 3 cards'
}, {
  headers: {
    'Authorization': `Bearer ${token}`  // ← JWT token
  }
})
```

**BFF Processing** (Spring):
```java
@PostMapping("/api/generations/stream")
public ResponseEntity<StreamingResponseBody> generate(
  @RequestBody GenerationRequest request,
  @RequestHeader("Authorization") String authHeader
) {
  // 1. Extract + validate JWT
  String token = authHeader.replace("Bearer ", "");
  String userId = jwtService.extractUserId(token);

  // 2. Create project in MongoDB
  Generation gen = new Generation();
  gen.setUserId(userId);  // ← Multi-user isolation!
  repository.save(gen);

  // 3. Call FastAPI with userId context
  return ResponseEntity.ok(
    new StreamingResponseBody(output -> {
      fastApiClient.generateStream(
        userId,
        request.getPrompt(),
        output  // ← Write stream directly to response
      );
    })
  );
}
```

**Result**:
- Frontend only knows about Spring BFF
- Backend complexity hidden
- User isolation enforced at every level

### Benefits of BFF

#### 1. **Single Entry Point for Frontend**
```
❌ Without BFF: React talks to 5 services
✅ With BFF: React talks to 1 service (Spring)
```

#### 2. **Centralized Authentication**
```java
// JWT validation happens ONCE in BFF
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(
    HttpServletRequest req,
    HttpServletResponse res,
    FilterChain chain
  ) throws ServletException, IOException {
    String token = extractToken(req);
    if (jwtValidator.isValid(token)) {
      String userId = extract(token, "sub");
      SecurityContextHolder.setContext(userId);  // ← Available to all services
    }
    chain.doFilter(req, res);
  }
}
```

#### 3. **Request Aggregation**
```java
// Frontend needs: projects list + user stats + admin count
// Instead of 3 requests, BFF aggregates:

@GetMapping("/api/dashboard")
public DashboardResponse getDashboard(@RequestHeader String auth) {
  String userId = extractUserId(auth);

  return DashboardResponse.builder()
    .projects(generationRepo.findByUserId(userId))      // ← MongoDB
    .stats(statsService.getUserStats(userId))           // ← Calculation
    .feedback(adminService.getPendingFeedback(userId))  // ← FastAPI
    .build();
}
```
Frontend gets everything in ONE request.

#### 4. **CORS Management**
```java
@Configuration
public class CorsConfig {
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList(
      "http://localhost:5173",           // Dev
      "https://talanted.com"             // Prod
    ));
    // ✅ CORS management centralized in BFF
  }
}
```

#### 5. **Response Transformation**
```java
// FastAPI returns: {files: [...], metadata: {...}}
// Frontend expects: {code: {...}, preview: {...}}
// BFF transforms:

@PostMapping("/api/generations/{id}/code")
public CodeResponse getCode(@PathVariable String id) {
  Generation gen = repo.findById(id);
  FastApiResponse fastApiResp = fastApi.getCode(gen);

  // Transform for frontend
  return CodeResponse.builder()
    .typescript(fastApiResp.getFiles())
    .hasPreview(true)
    .canDeploy(true)
    .build();
}
```

## Trade-offs

### PROS (BFF Pattern):
✅ Single API contract for frontend (easy to learn)
✅ Centralized auth logic (JWT validation at entry point)
✅ Request aggregation (multiple responses → one)
✅ Easy to add middleware (logging, metrics, rate limiting)
✅ Can transform responses (format for frontend)
✅ CORS management centralized
✅ Can load-balance to multiple FastAPI instances
✅ Hide backend complexity from frontend

### CONS (BFF Pattern):
❌ Extra latency (request goes through BFF first)
  → But minimal: < 10ms added
❌ BFF = single point of failure
  → Mitigation: Run 2x BFF behind load balancer (S11)
❌ Can become god service (do too much)
  → Mitigation: Keep BFF thin (routing + aggregation only)
❌ Extra code to maintain (BFF + FastAPI)

## Mitigation Strategies

### Prevent BFF from becoming too fat
- ✅ Business logic stays in FastAPI
- ✅ BFF only does: Routing, Auth, Aggregation, Transformation
- ✅ Code generation algorithms → FastAPI (not BFF)

### Prevent single point of failure
- S11: Add 2nd BFF instance behind load balancer
- S11: Add health checks + circuit breaker

### Prevent extra latency
- Use async/await (Spring Webflux for non-blocking I/O)
- Connection pooling to FastAPI

## Future Evolution
```
Phase 1 (Current): Single BFF instance
Phase 2 (S11): 2x BFF behind load balancer
Phase 3 (S13): API Gateway (Kong, AWS API Gateway) if many external clients
```

## References
- Sam Newman: Building Microservices - BFF chapter
- Netflix: Embracing the Differences in Micro Services Architectures
- Pat Helland: Data on the Outside vs. Inside
