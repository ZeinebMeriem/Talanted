# ADR-004: MongoDB for Semi-Structured Data

## Status: ACCEPTED

## Context
Talanted data models are semi-structured:
- **Projects**: Have variable fields depending on generation type
- **Generated code**: JSON with files + metadata (flexible structure)
- **Accessibility reports**: Nested structures with varying levels
- **User profiles**: Optional fields (avatar, timezone, language)
- **Version history**: Arbitrary snapshots of past states

Traditional relational schema would require:
- Complex migrations for schema changes
- Downtime to alter tables
- Rigid structure (every project must fit same schema)

## Decision
Use **MongoDB** (document-oriented database).

## Justification

### Why MongoDB?

#### 1. **Schema Flexibility** (key advantage)
```javascript
// Project can have ANY structure - no pre-defined schema
db.generation.insertOne({
  projectId: "123",
  name: "My Dashboard",
  generatedFiles: [{name: "App.tsx", content: "..."}],
  qualityScore: {semantic: 0.9, code: 0.85},
  wcagReport: {issues: [...], score: 0.88}
})

// Later: Add new field without migration
db.generation.updateOne(
  {projectId: "123"},
  {$set: {performanceMetrics: {...}}}
)
// Zero downtime! ✅
```

#### 2. **Document-Oriented** (natural fit for generated code)
```javascript
// One document = one complete project snapshot
{
  projectId: "456",
  name: "Landing Page",
  files: [
    {name: "App.tsx", content: "...", type: "component"},
    {name: "styles.css", content: "...", type: "stylesheet"},
    {name: "package.json", content: "...", type: "config"}
  ],
  metadata: {
    createdAt: DateTime,
    source: "text-prompt",
    provider: "gemini"
  }
}
```
vs relational (would need 3+ tables + joins)

#### 3. **Indexing** (excellent for query performance)
```javascript
// Multi-user isolation queries are fast
db.generation.createIndex({userId: 1, createdAt: -1})
// → O(1) lookup even with 1M projects

db.generation.createIndex({status: 1})
// → Fast filtering by status (PROCESSING, COMPLETED, FAILED)

db.userProfile.createIndex({keycloakId: 1})
// → OAuth2 user lookups are instant
```

#### 4. **Replication** (built-in high availability)
```javascript
// MongoDB replica sets give:
// - Automatic failover
// - Read scaling (read from secondaries)
// - Backup during replication
```

### Alternatives Evaluated

#### **PostgreSQL** (Relational)
**Pros**:
- ✅ ACID transactions (100% guarantee)
- ✅ Complex joins
- ✅ Query optimization mature
- ✅ Industry standard for 30+ years

**Cons**:
- ❌ Rigid schemas (migration = downtime)
- ❌ Complex joins for nested data
- ❌ Overkill for semi-structured data
- ❌ Schema changes = complex migrations

#### **Firebase (Firestore)** (NoSQL)
**Pros**:
- ✅ Managed service (no ops)
- ✅ Real-time subscriptions

**Cons**:
- ❌ Vendor lock-in (Google)
- ❌ Expensive at scale
- ❌ Limited query capabilities
- ❌ Data export difficult

#### **DynamoDB** (AWS)
**Pros**:
- ✅ Serverless (we scale)
- ✅ Managed service

**Cons**:
- ❌ AWS lock-in
- ❌ Price unpredictable (pay per request)
- ❌ Limited querying (flat structure only)

## Trade-offs

### PROS (MongoDB):
✅ Schema flexibility (add fields anytime)
✅ Natural fit for documents/JSON
✅ Horizontal scaling (sharding ready)
✅ Excellent indexing support
✅ Open-source + self-hosted option
✅ No downtime for schema changes
✅ Great for MVP phase (requirements evolving)

### CONS (MongoDB):
❌ No ACID transactions (eventual consistency)
  → Acceptable for Talanted (not banking system)
❌ Larger disk footprint (stores schema in each doc)
❌ Denormalization sometimes needed for performance
❌ Less mature than SQL for complex analytics

## Consequences
- **Data consistency**: Best effort + eventual consistency model
- **Transactions**: Multi-document transactions supported (since v4.0)
- **If strict consistency critical**: Can migrate to PostgreSQL later (pain: ~1 week)
- **Scaling**: MongoDB sharding = automatic (future-proof)

## Storage Strategy
```javascript
// Collections created:
db.generation              // Projects + code
db.userProfile             // User data
db.auditEvent              // Audit trail
db.codeVersion             // Version history

// Indexes:
generation: userId, createdAt, status
userProfile: keycloakId, email
auditEvent: userId, generationId, timestamp
```

## Future Evolution
- S10: Add read replicas for reports (secondary reads)
- S11: Add archival policy (old projects → cold storage)
- S12: Enable sharding if > 100GB data

## References
- MongoDB docs: https://docs.mongodb.com
- Document vs Relational: https://www.mongodb.com/databases/relational-vs-document-databases
- ACID in MongoDB: https://docs.mongodb.com/manual/core/transactions/
