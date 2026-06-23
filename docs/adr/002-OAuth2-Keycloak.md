# ADR-002: OAuth2/OIDC Identity Provider - Keycloak

## Status: ACCEPTED

## Context
Talanted needs:
- Secure user authentication
- Multi-user isolation (different users ≠ see each other's projects)
- Enterprise-grade security standards
- Self-hosted option (no vendor lock-in)

Alternative options evaluated:
1. **Auth0** → Commercial ($$$, ~$50-1000/month)
2. **Cognito** → AWS lock-in, proprietary
3. **Okta** → Enterprise-only, overkill for MVP
4. **Keycloak** → Open-source, self-hosted
5. **Firebase Authent** → Vendor lock-in (Google)

## Decision
Use **Keycloak** as OAuth2/OIDC provider.

## Justification

### Why Keycloak?
✅ **Open-source** (free, no licensing, Apache 2.0)
✅ **Self-hosted** (full control, privacy, no 3rd party dependency)
✅ **Complete feature set** (OAuth2, SAML, Kerberos, LDAP)
✅ **Docker ready** (`docker run keycloak` or docker-compose)
✅ **Mature ecosystem** (300k+ users, large community)
✅ **Production-tested** (used by major companies)
✅ **User management** (CRUD, roles, permissions built-in)
✅ **Realm-based multi-tenancy** (future scalability)

### Multi-user Isolation Architecture
```
[User Login Screen]
  ↓ (User enters: developpeur/developpeur)
[Keycloak OAuth2 / OIDC Server]
  ↓ (Validates credentials via MongoDB)
[JWT Token Generated]
  (JWT includes JWT payload with sub = userId)
  ↓
[Frontend stores token in localStorage]
  ↓
[Every API call to Spring BFF]
  Header: Authorization: Bearer {jwt}
  ↓
[Spring Security Filter]
  1. Validates JWT signature (using Keycloak public key)
  2. Extracts sub claim (userId) from JWT
  ↓
[Spring BFF adds userId to SecurityContext]
  ↓
[GenerationService.listGenerations(userId)]
  Query: MongoDB findByUserId(userId)
  ↓
[Result: Only that user's projects returned]
```

### Result: Complete Isolation
- User A logs in → sees only User A's projects (10 projects)
- User B logs in → sees only User B's projects (empty)
- User A can NEVER access User B's data (enforced at 3 levels: JWT, Spring, MongoDB)

## Trade-offs

### PROS:
✅ Open-source (save license costs)
✅ Self-hosted (no 3rd party dependency, full privacy)
✅ Complete OAuth2 compliance
✅ Easy Docker integration
✅ User management built-in
✅ Realm-based multi-tenancy ready
✅ Free forever

### CONS:
❌ Require running Keycloak service (added operational load)
❌ OAuth2 adds ~500ms first login time
❌ Token refresh logic needed (15 min expiry default)
❌ Keycloak updates = maintenance burden
❌ If Keycloak is down → users can't login (single point of failure)

## Consequences
- **Dev mode**: Uses hardcoded `developpeur/developpeur` (DEV ONLY)
- **Production**: Requires proper OAuth2 apps + HTTPS + strong passwords
- **Fallback**: If Keycloak fails, implement fallback auth (short-term workaround)

## Future Evolution
- S11: Add Cognito migration script if AWS-first strategy
- S12: Add LDAP backend for enterprise SSO
- S13: Multi-realm for SaaS (different customers)

## References
- Keycloak official docs: https://www.keycloak.org/docs
- OAuth2 RFC 6749: https://tools.ietf.org/html/rfc6749
- OIDC specification: https://openid.net/specs/openid-connect-core-1_0.html
