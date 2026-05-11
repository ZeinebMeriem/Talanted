# 📊 BENCHMARKING GUIDE — AI UI Generator

**Last Updated**: 2026-05-11
**Status**: Framework established | Ready for baseline measurements
**Priority**: High (Performance optimization roadmap)

---

## Table of Contents

1. [Latency Benchmarks](#1-latency-benchmarks)
2. [Scalability Benchmarks](#2-scalability-benchmarks)
3. [LLM Provider Benchmarks](#3-llm-provider-benchmarks)
4. [Quality Metrics](#4-quality-metrics)
5. [Database Performance](#5-database-performance)
6. [File Storage Performance](#6-file-storage-performance)
7. [Resource Utilization](#7-resource-utilization)
8. [Regression Testing](#8-regression-testing)
9. [Tools & Instrumentation](#9-tools--instrumentation)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. LATENCY BENCHMARKS

### Performance Pipeline — Target Latencies

| Stage | Description | Target | Current | Priority | Notes |
|-------|-------------|--------|---------|----------|-------|
| **Extract** | OCR + PDF/image parsing | < 15s | 🔴 TBM* | 🔴 High | Multi-doc RAG can go to 30s |
| **Preparation** | Text consolidation + RAG chunking | < 2s | 🔴 TBM | 🟡 Medium | Usually sub-second |
| **Planning** | Structure generation (LLM) | < 45s | ~30s | 🔴 High | Primary bottleneck |
| **Design System** | Design tokens + color palette (LLM) | < 15s | 🔴 TBM | 🟡 Medium | Parallel-eligible |
| **Code Generation** | Per-file multi-agent codegen | < 120s/file | 🔴 TBM | 🔴 High | Sequential, not parallel |
| **Build** (Vite) | npm bundling + compilation | < 120s | 🔴 TBM | 🔴 High | Cached dependencies help |
| **Accessibility Audit** | WCAG 2.1 AA compliance scan | < 30s | 🔴 TBM | 🟡 Medium | Currently re-scanned per request |
| **UI Evaluation** | Quality scoring (LLM) | < 15s | 🔴 TBM | 🟢 Low | Parallel-eligible |
| **End-to-End Total** | Complete generation | < 1200s (20 min) | 🔴 TBM | 🔴 High | Production SLA |

*TBM = To Be Measured

### How to Measure

**Option 1: Manual Single Generation** (Quick)
```bash
# 1. Open browser DevTools (Network tab)
# 2. Create new generation with prompt
# 3. SSE stream shows progress events with stage timestamps
# 4. Check browser console for timing breakdowns
```

**Option 2: Extract from Database** (Recommended)
```javascript
// Query latest generation reports
db.ai_reports.find().sort({ createdAt: -1 }).limit(10).pretty()

// Look for durations object:
// {
//   "extract_ms": 5000,
//   "prep_ms": 800,
//   "plan_ms": 35000,
//   "design_ms": 12000,
//   "codegen_ms": 95000,
//   "build_ms": 45000,
//   "eval_ms": 8000
// }
```

### Data Collection Script
```python
# Save as benchmarks/collect_baseline.py
from pymongo import MongoClient
import json
from datetime import datetime, timedelta

client = MongoClient('mongodb://localhost:27017')
db = client['ai-ui-generator']

# Get last 100 generations with durations
reports = list(db.ai_reports.find(
    {'durations': {'$exists': True}},
    {'durations': 1, 'createdAt': 1, 'score': 1, 'retries_count': 1}
).sort('createdAt', -1).limit(100))

# Calculate stats
stages = ['extract_ms', 'prep_ms', 'plan_ms', 'design_ms', 'codegen_ms', 'build_ms', 'eval_ms']
baseline = {}

for stage in stages:
    values = [r['durations'].get(stage, 0) for r in reports if 'durations' in r]
    if values:
        baseline[stage] = {
            'p50': sorted(values)[len(values)//2],
            'p95': sorted(values)[int(len(values)*0.95)],
            'p99': sorted(values)[int(len(values)*0.99)],
            'avg': sum(values) / len(values),
            'min': min(values),
            'max': max(values)
        }

print(json.dumps(baseline, indent=2))
```

---

## 2. SCALABILITY BENCHMARKS

### Concurrent User Load Testing

#### Test Scenarios

| Scenario | Users | Pattern | Duration | Goal |
|----------|-------|---------|----------|------|
| **Baseline** | 1 | Steady | 5 min | Single user latency |
| **Light Load** | 5 | Ramp 1±10s | 10 min | Stability check |
| **Medium Load** | 10 | Ramp 2±5s | 15 min | Queue behavior |
| **Heavy Load** | 20 | Ramp 2±3s | 20 min | Failure point detection |
| **Spike Test** | 50 | Instant | 5 min | Recovery time |
| **Soak Test** | 10 | Steady | 60 min | Memory leaks? |

#### Metrics to Capture

```yaml
Per Test Run:
  - Response Time Percentiles: p50, p95, p99, p99.9
  - Error Rate: % failures vs. successes
  - Throughput: RPS per endpoint
  - Provider Failover: When did Gemini fallback activate?
  - Queue Depth: Max pending generations
  - Resource Usage: Memory ↑, CPU %, disk I/O
  - Build Success Rate: % rebuilt vs. first-attempt
```

#### Locust Script Skeleton
```python
# Save as benchmarks/locust_tasks.py
from locust import HttpUser, task, between
import random

class GenerateUser(HttpUser):
    wait_time = between(1, 5)  # Pause between requests

    @task(3)
    def create_generation(self):
        """POST /api/generations/stream with sample prompt"""
        prompts = [
            "Create a landing page with hero section, features grid, and CTA",
            "Build a dashboard with charts, tables, and KPI cards",
            "Design a mobile-first e-commerce product listing UI",
        ]

        files = {'prompt': (None, random.choice(prompts))}
        self.client.post('/api/generations/stream', files=files)

    @task(1)
    def list_projects(self):
        """GET /api/generations — list user projects"""
        self.client.get('/api/generations')
```

**Run with:**
```bash
locust -f benchmarks/locust_tasks.py \
  --host=http://localhost:8081 \
  --users=10 \
  --spawn-rate=2 \
  --run-time=15m \
  --csv=benchmarks/results/load_test_results
```

---

## 3. LLM PROVIDER BENCHMARKS

### Provider Performance Matrix

| Provider | Latency | Tokens/sec | Cost | Rate Limit | Reliability | Code Quality |
|----------|---------|------------|------|-----------|-------------|--------------|
| **Groq** | 🟢 Fastest | 🟢 High | ✅ Free | 30 RPM | 🟡 Good | 🟢 Excellent |
| **Gemini** | 🟡 Good | 🟡 Medium | ✅ Free | 15 RPM | 🟡 Good | 🟡 Good |
| **OpenAI** | 🟡 Good | 🟡 Medium | 💰 $$$ | 500 RPM | 🟢 Excellent | 🟢 Excellent |
| **Claude** | 🟡 Good | 🟡 Medium | 💰 $$ | 50 RPM | 🟢 Excellent | 🟢 Excellent |
| **Ollama (Local)** | 🟢 Fast | 🔴 Low | ✅ Free | Unlimited | 🔴 Variable | 🔴 Poor |

### Fallback Chain Execution

```
Primary Workflow:
┌─────────────────────────────────────────┐
│ Try GROQ (Planner + Coder)              │
│ Timeout: 120s | Rate limit: 30 RPM     │
└─────────────────┬───────────────────────┘
                  │ Fails or rate-limited
                  ▼
┌─────────────────────────────────────────┐
│ Try GEMINI (Fallback)                   │
│ Timeout: 120s | Rate limit: 15 RPM     │
│ Retry: Exponential backoff              │
│         (10s → 20s → 40s → 80s)        │
└─────────────────┬───────────────────────┘
                  │ Still fails
                  ▼
┌─────────────────────────────────────────┐
│ Use Hardcoded Default Plan              │
│ Generic structure, no LLM cost          │
└─────────────────────────────────────────┘

Fallover Latency Overhead: ~30-120s (per retry)
```

### Cost Analysis Per Generation

```
Tokens per stage (approx):
  Planner:     1,200 tokens × 2 providers tested = 2,400
  Designer:    1,000 tokens × 2 providers
  Coder:       8,192 tokens × 5-10 files = 40,960-81,920
  Evaluator:   500 tokens

Total: 45,000 - 85,000 tokens per generation

Provider Cost Breakdown (per 1M tokens):
  Groq:     $0.00 (free tier, max 30 RPM)
  Gemini:   $0.00 (free tier, limited)
  OpenAI:   $0.02-0.06 per generation
  Claude:   $0.03-0.15 per generation
  Ollama:   $0.00 (compute cost on hardware)
```

### How to Measure

**Track in Application:**
```python
# fastapi-ai/app/llm_provider.py — already instrumented
# Returns: llm_provider string like "groq:llama-3.3+gemini:gemini-1.5"

# Results stored in AiReport.llm_provider
db.ai_reports.find({'llm_provider': /groq/}).count()  # Count Groq usage
```

**Cost Attribution:**
```javascript
db.ai_reports.aggregate([
  {
    $group: {
      _id: '$llm_provider',
      count: { $sum: 1 },
      avg_score: { $avg: '$score' },
      avg_retries: { $avg: '$retries_count' }
    }
  },
  { $sort: { count: -1 } }
])
```

---

## 4. QUALITY METRICS

### Code Generation Quality Dimensions

Each generation receives automated scoring across 6 dimensions (0-100):

| Dimension | Definition | Target | Notes |
|-----------|-----------|--------|-------|
| **Semantic Fidelity** | Code matches natural language prompt intent | > 85 | "Does it do what was asked?" |
| **Code Quality** | React best practices, TypeScript typing, structure | > 80 | Checked by UIEvaluatorAgent |
| **Completeness** | All requested features implemented | > 85 | Feature checklist validation |
| **Accessibility** | WCAG 2.1 AA compliance (contrast, ARIA, keyboard) | > 75 | Critical for enterprise |
| **Visual Richness** | Design variety, animations, polish, responsiveness | > 75 | Subjective but measurable |
| **Global Score** | Weighted average of above | > 80 | Overall quality rating |

### Quality Targets by Domain

```
| Domain | Semantic | Code | Complete | Access | Visual | Overall |
|--------|----------|------|----------|--------|--------|---------|
| Landing Page | 85+ | 80+ | 90+ | 75+ | 85+ | 83+ |
| Dashboard | 80+ | 85+ | 85+ | 80+ | 75+ | 81+ |
| Mobile UI | 75+ | 80+ | 80+ | 85+ | 70+ | 78+ |
| E-Commerce | 80+ | 75+ | 85+ | 70+ | 85+ | 79+ |
| CRUD App | 85+ | 85+ | 85+ | 75+ | 65+ | 79+ |
| Minimum (Any) | 70+ | 70+ | 70+ | 70+ | 60+ | 70+ |
```

### Build Success Metrics

```yaml
First-Attempt Success:
  Target: > 95% (5% rebuild rate is acceptable)
  Current: 🔴 TBM
  Tracked: build_retries in AiReport

Common Failure Modes:
  - Missing React imports (auto-fixable)
  - Tailwind class typos (auto-fixable)
  - TypeScript type errors (sometimes auto-fixable)
  - Missing npm packages (detected at build time)
  - Syntax errors (detected at parse time)

Rebuild Strategy:
  Trigger: if (score === 0 || !buildSuccess)
  Auto-repair uses RepairAgent to fix common issues
  Max retries: 3 attempts before giving up
```

### How to Measure Quality

**Query Quality Scores:**
```javascript
// Get quality dimensions for latest 50 generations
db.ai_reports.find()
  .sort({ createdAt: -1 })
  .limit(50)
  .project({
    createdAt: 1,
    score: 1,
    'ui_evaluation.semantic_fidelity': 1,
    'ui_evaluation.code_quality': 1,
    'ui_evaluation.completeness': 1,
    'ui_evaluation.accessibility': 1,
    'ui_evaluation.visual_richness': 1,
    build_retries: 1,
    retries_count: 1
  })
```

**Quality Trend Dashboard (MongoDB aggregation):**
```javascript
db.ai_reports.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
  { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      avg_score: { $avg: '$score' },
      avg_semantic: { $avg: '$ui_evaluation.semantic_fidelity' },
      avg_code: { $avg: '$ui_evaluation.code_quality' },
      avg_access: { $avg: '$ui_evaluation.accessibility' },
      success_rate: { $avg: { $cond: ['$build_retries', 0, 1] } },
      count: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
])
```

---

## 5. DATABASE PERFORMANCE

### Query Performance Targets

| Operation | Description | Target | Current | Notes |
|-----------|-------------|--------|---------|-------|
| Find by ID | `db.generations.findOne({_id: id})` | < 5ms | 🔴 TBM | Indexed on _id |
| List by UserID | `db.generations.find({userId: uid})` (100 items) | < 25ms | 🔴 TBM | Needs compound index |
| Audit events | Aggregate by generation | < 100ms | 🔴 TBM | Check slow query log |
| Quality trends | Timeseries aggregation | < 250ms | 🔴 TBM | May need indexing |

### MongoDB Indexing Strategy

```javascript
// Create compound indexes for common queries
db.generations.createIndex({
  userId: 1,
  status: 1,
  createdAt: -1
}, { name: 'user_status_date' })

db.ai_reports.createIndex({
  generationId: 1,
  version: -1
}, { name: 'gen_version' })

db.audit_events.createIndex({
  generationId: 1,
  timestamp: -1
}, { name: 'audit_gen_timestamp' })

db.accessibility_audits.createIndex({
  generationId: 1,
  timestamp: -1
}, { name: 'a11y_gen_timestamp' })

// Check index usage
db.generations.aggregate([{ $indexStats: {} }])
```

### Collections Being Optimized

```yaml
generations:
  Fields: userId, status, createdAt, name, globalScore
  Query Pattern: List by userId + status, sorted by date
  Estimated Size: ~100KB per document × 1000s = 100+ MB
  Index Priority: HIGH

ai_reports:
  Fields: generationId, version, durations, score, ui_evaluation
  Query Pattern: Find latest by generationId, aggregate scores
  Estimated Size: ~5KB per report × 10000s = 50+ MB
  Index Priority: HIGH

audit_events:
  Fields: generationId, type, durationMs, timestamp, metadata
  Query Pattern: List by generation, aggregate by type
  Estimated Size: ~1KB per event × 100000s = 100+ MB
  Index Priority: MEDIUM

accessibility_audits:
  Fields: generationId, score, issues, timestamp
  Query Pattern: Find latest per generation, trend analysis
  Estimated Size: ~10KB per audit × 5000s = 50+ MB
  Index Priority: MEDIUM
```

### Enable MongoDB Profiler for Slow Queries

```javascript
// Enable profiling (log queries > 100ms)
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
  .pretty()

// Disable when done
db.setProfilingLevel(0)
```

---

## 6. FILE STORAGE PERFORMANCE

### MinIO Upload/Download Targets

| File Size | Upload Target | Download Target | Estimated Throughput |
|-----------|---------------|-----------------|----------------------|
| 1 MB | < 500ms | < 200ms | > 2 MB/s |
| 10 MB | < 2s | < 1s | > 5 MB/s |
| 50 MB | < 10s | < 5s | > 5 MB/s |

### Configured Limits

```yaml
Spring Boot file limits:
  max-file-size: 50MB
  max-request-size: 100MB

MinIO configuration:
  bucket: ai-ui-files
  auth: minioadmin / minioadmin (change in production!)
  region: us-east-1 (default)

Supported MIME Types:
  - application/pdf
  - application/vnd.openxml...  (DOCX, XLSX, PPTX)
  - image/jpeg, image/png, image/webp
  - text/plain, text/markdown
  - text/yaml, application/json
  - application/x-mmd (Mermaid)
  - application/excalidraw
```

### How to Measure

**Using MinIO CLI:**
```bash
# Install mc (MinIO Client)
npm install -g minio-cli

# Configure
mc alias set minio http://localhost:9000 minioadmin minioadmin

# Benchmark upload (1GB test file)
dd if=/dev/zero of=testfile.bin bs=1M count=1024
time mc cp testfile.bin minio/ai-ui-files/

# Benchmark download
time mc cp minio/ai-ui-files/testfile.bin ./testfile-download.bin

# Check bandwidth
mc du minio/ai-ui-files
```

**Track from API:**
```javascript
// In GenerationService.java, capture file upload timing
long uploadStart = System.currentTimeMillis();
String minioPath = fileStorage.putToMinio(objectKey, file);
long uploadDuration = System.currentTimeMillis() - uploadStart;
audit.recordEvent('FILE_UPLOAD', ..., { duration: uploadDuration, size: file.size() })
```

---

## 7. RESOURCE UTILIZATION

### Memory, CPU, and Disk I/O

#### FastAPI Container Memory Profile

```dockerfile
# Current: No limits
# Recommended: Add to docker-compose.yml

services:
  fastapi-ai:
    ...
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: 1.0
        reservations:
          memory: 1G
          cpus: 0.5
```

**Memory peaks occur during:**
- Document extraction (loading PDF into memory)
- LLM context window (full project files in prompt)
- Codebase indexing (RAG vector embeddings)

#### Spring Boot JVM Tuning

```bash
# Set in docker-compose.yml or Dockerfile
JAVA_OPTS: "-Xmx1g -Xms512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Meanings:
#   -Xmx1g:           Max heap 1GB
#   -Xms512m:         Initial heap 512MB
#   -XX:+UseG1GC:     Use newer G1 garbage collector
#   -XX:MaxGCPauseMillis=200: Target GC pause < 200ms
```

**Monitor with:**
```bash
jcmd <pid> GC.class_histogram     # Object count
jcmd <pid> VM.properties | grep gc # GC config
```

#### MongoDB Disk I/O

```bash
# Monitor disk usage
du -sh /var/lib/docker/volumes/*-mongodb/_data

# Expected sizes (per 10K generations):
# - Generations:  ~1GB
# - Reports:      ~50MB
# - Audit events: ~1GB
# Total:          ~2GB
```

#### Track CPU Usage During Codegen

```bash
# Real-time monitoring
docker stats --no-stream fastapi-ai spring-bff mongodb

# Output will show %CPU, MEM, MEM% for each service
# Codegen peak: CPU 80-100%, Memory 500MB-2GB
```

---

## 8. REGRESSION TESTING

### Automated Regression Detection

```yaml
Thresholds (alert if violated):
  Latency Regression:
    end_to_end_latency: > +10% vs baseline (600s → 660s)
    p95_latency: > +15% vs baseline

  Error Rate:
    build_failures: > 5%
    api_errors: > 1%

  Memory:
    growth_per_request: > 100MB
    peak_usage: > 2.5GB

  Quality Drift:
    avg_score: < (baseline - 5 points)
    accessibility: < (baseline - 3 points)

CI Pipeline Integration:
  - Run baseline benchmark on main branch
  - Store metrics in PostgreSQL benchmark_results table
  - On PR: Compare metrics vs. main
  - Report: "Performance: ✅ OK" or "⚠️ +8% latency regression"
```

### Baseline by Environment

```javascript
// Store in new collection: benchmarks

db.benchmarks.insertOne({
  branch: 'main',
  date: new Date(),
  environment: 'production',
  metrics: {
    end_to_end_latency: {
      mean: 600,
      p50: 580,
      p95: 750,
      p99: 900
    },
    build_success_rate: 0.98,
    accessibility_avg: 82,
    code_quality_avg: 79,
    memory_peak_mb: 1800,
    cpu_peak_percent: 95,
    mongodb_query_p95_ms: 45
  }
})

// On PR, compare:
db.benchmarks.find({ branch: 'main' }).sort({ date: -1 }).limit(1)
// vs new measurements
```

---

## 9. TOOLS & INSTRUMENTATION

### Recommended Tech Stack

#### Load Testing

```bash
# Option 1: Locust (Python, easiest for FastAPI/Spring)
pip install locust
locust -f benchmarks/locust_tasks.py --host=http://localhost:8081

# Option 2: k6 (Modern, scriptable)
brew install k6
k6 run benchmarks/k6_script.js

# Option 3: JMeter (Enterprise, heavy)
# Download from https://jmeter.apache.org/
```

#### Metrics Collection

```python
# FastAPI: Add prometheus_client
from prometheus_client import Counter, Histogram, start_http_server

request_count = Counter('requests_total', 'Total requests', ['method', 'endpoint'])
request_duration = Histogram('request_duration_seconds', 'Request latency', ['endpoint'])
generation_duration = Histogram('generation_duration_seconds', 'Generation latency', ['stage'])

# Spring Boot: Already has Actuator
# Uncomment in application.yml:
# management.endpoints.web.exposure.include=prometheus
# Visit: http://localhost:8081/actuator/prometheus
```

#### Visualization & Dashboards

```yaml
Option 1: Grafana + Prometheus
  - Free, open-source
  - Real-time dashboards
  - Alert rules
  - Setup: Docker image, connect to Prometheus

Option 2: Datadog / New Relic (Commercial)
  - APM integration
  - Error tracking
  - Cost analysis
  - Monthly: $200-500

Option 3: MongoDB Charts
  - Built-in to MongoDB Atlas
  - Query visualizations
  - Trend analysis
  - Free tier available
```

### Directory Structure

```
benchmarks/
├── README.md                      # Benchmarking guide
├── baseline_results.json          # Latest baseline measurements
├── locust_tasks.py               # Load testing scenarios
├── k6_script.js                  # k6 load test (alternative)
├── collect_baseline.py           # MongoDB metrics extraction
├── analyze_results.py            # Statistical analysis
├── conftest.py                   # pytest fixtures for benchmark tests
├── test_latency.py               # Unit latency tests
├── test_throughput.py            # Concurrent user tests
├── test_llm_providers.py         # Provider comparison
├── test_quality_metrics.py       # Quality score distribution
└── results/
    ├── 2026-05-11_baseline.json
    ├── 2026-05-18_load_test.csv
    └── trends.parquet
```

---

## 10. IMPLEMENTATION ROADMAP

### Phase 1: Establish Baselines (Week 1) 🔴 HIGH

**Tasks:**
- [ ] Run `collect_baseline.py` on last 100 generations
- [ ] Document current durations from MongoDB
- [ ] Create spreadsheet with p50/p95/p99 for each stage
- [ ] Set up MongoDB profiler for slow queries
- [ ] Take screenshots of resource usage (htop, docker stats)

**Expected output:**
```json
{
  "baseline_date": "2026-05-11",
  "end_to_end_latency_p95": 650,
  "build_success_rate": 0.94,
  "accessibility_avg": 81,
  "memory_peak_mb": 1950,
  "mongodb_query_p95_ms": 65
}
```

**Owner:** DevOps Lead
**Effort:** 2-4 hours
**Blocker:** Access to production MongoDB

---

### Phase 2: Load Testing (Week 2-3) 🟡 MEDIUM

**Tasks:**
- [ ] Install locust: `pip install locust`
- [ ] Create `benchmarks/locust_tasks.py` with generation workflow
- [ ] Run light load test: 5 concurrent users, 10 minutes
- [ ] Identify slowest bottleneck (Extract? Planning? Build?)
- [ ] Record p95 latency under load vs baseline
- [ ] Test provider failover (kill Groq, verify Gemini fallback)

**Expected findings:**
- Single-user p95: 650s → Multi-user p95: 750s (+15% expected)
- Queue grows on heavy load
- Identify if FastAPI or Spring BFF is bottleneck

**Owner:** Performance Engineer
**Effort:** 8-16 hours
**Blocker:** LLM API quotas (may need paid tier temporarily)

---

### Phase 3: Provider Benchmarks (Week 4) 🟡 MEDIUM

**Tasks:**
- [ ] Run 50 generations per provider (Groq, Gemini, OpenAI)
- [ ] Compare latency, cost, quality
- [ ] Build cost-vs-quality matrix
- [ ] Measure fallback chain latency overhead
- [ ] Determine optimal provider for each stage

**Expected matrix:**
```
Provider | Latency | Cost/gen | Quality | Reliability
---------|---------|----------|---------|-------------
Groq     | Fastest | Free     | Good    | Limited RPM
Gemini   | Medium  | Free     | Good    | Limited RPM
OpenAI   | Medium  | $0.05    | Best    | Reliable
Claude   | Slow    | $0.10    | Best    | Reliable
```

**Owner:** ML Engineer
**Effort:** 12-20 hours
**Blocker:** Budget for API calls

---

### Phase 4: Optimization (Week 5-6) 🟢 LOW

**Tasks:**
- [ ] Add uvicorn workers: 1 → 4 (FastAPI parallelism)
- [ ] Implement accessibility audit caching (24h TTL)
- [ ] Optimize MongoDB indexes (compound userId+status+date)
- [ ] Enable Vite build cache layer
- [ ] Test memory limits: `-Xmx1g` Spring, `--memory 2g` FastAPI
- [ ] Measure improvements

**Expected gains:**
- Throughput: 1 user → 4 concurrent (with workers)
- Cache hit rate: 80% for repeated projects
- Build time: -20-30% with Vite caching

**Owner:** Backend Engineer
**Effort:** 16-24 hours
**Blocker:** None (internal optimization)

---

### Phase 5: Continuous Monitoring (Ongoing) 🟢 LOW

**Tasks:**
- [ ] Set up Prometheus + Grafana (optional)
- [ ] Add benchmark validation to CI (fail if > +10% latency)
- [ ] Monthly regression testing (5 concurrent users, 1 hour)
- [ ] Weekly trend analysis (plot avg score, latency, cost)
- [ ] Quarterly review of optimization opportunities

**Owner:** DevOps / SRE
**Effort:** 4 hours/month
**Blocker:** None

---

## Quick Start Checklist

### Today (Start Baselines)
```bash
✅ Install Python dependencies:
pip install pymongo locust pandas matplotlib

✅ Run baseline collection:
python benchmarks/collect_baseline.py > baseline_results.json

✅ Check current resource usage:
docker stats --no-stream fastapi-ai spring-bff mongodb
```

### This Week (Set Targets)
```bash
✅ Review baseline_results.json
✅ Set latency SLA targets (Edit Section 1)
✅ Create MongoDB indexes (Section 5)
✅ Enable profiler (Section 5)
```

### Next Week (Load Testing)
```bash
✅ Create locust_tasks.py
✅ Run: locust -f benchmarks/locust_tasks.py --host=http://localhost:8081 -u 5 -r 1 -t 10m
✅ Extract results, compare vs baseline
```

---

## Success Criteria

- ✅ All pipeline stages < target latency
- ✅ Build success rate > 95%
- ✅ Quality scores stable (no regression)
- ✅ < 5% error rate under 20 concurrent users
- ✅ Memory leaks detected and fixed
- ✅ Cost per generation documented and optimized

---

## References & Related Files

| File | Purpose |
|------|---------|
| `fastapi-ai/app/pipeline/orchestrator.py` | Pipeline stages + timing |
| `spring-bff/src/main/java/com/aiuigenerator/bff/domain/AiReport.java` | Quality scores schema |
| `docker-compose.yml` | Resource limits (currently none) |
| `README.md` | Architecture overview |
| `JENKINS_SETUP_SUMMARY.md` | CI/CD performance |

---

## Contact & Questions

For benchmarking guidance:
- Performance issues? Start with **Section 2** (Load Testing)
- Quality concerns? Start with **Section 4** (Quality Metrics)
- Cost optimization? Start with **Section 3** (LLM Providers)
- Database slow? Start with **Section 5** (MongoDB Indexing)

---

**Last Updated:** 2026-05-11
**Next Review:** 2026-05-25
**Maintainer:** DevOps / Performance Engineering Team
