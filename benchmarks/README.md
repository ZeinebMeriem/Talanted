# 📊 Benchmarking Tools

This directory contains scripts and configuration files for performance benchmarking of the AI UI Generator.

## Quick Start

### 1. Collect Baseline Metrics (5 minutes)

```bash
# Install dependencies
pip install pymongo

# Run baseline collection
python collect_baseline.py

# Output: benchmarks/baseline_2026-05-11_143000.json
# Shows: latency p95, avg quality score, build success rate, database stats
```

**What it measures:**
- Pipeline stage latencies (Extract, Plan, Design, Codegen, Build, Eval)
- End-to-end generation time (p50, p95, p99)
- Quality scores per generation
- Build success rate & retries
- LLM provider distribution
- MongoDB collection sizes

### 2. Run Load Test (10 minutes)

```bash
# Install dependencies
pip install locust

# Start load test UI
locust -f locust_tasks.py --host=http://localhost:8081

# Then open: http://localhost:8089
# Set:
#   - Number of users: 5
#   - Spawn rate: 1
#   - Run time: 5m
# Click "Start swarming"
```

**What it measures:**
- Response time under load (p50, p95, p99)
- Error rates
- Throughput (requests/second)
- Memory & CPU usage during test
- Provider failover triggers

### 3. Analyze Results

```bash
# View baseline JSON
cat baseline_2026-05-11_143000.json | jq .

# Extract key metrics
python collect_baseline.py --days=30  # Last 30 days of data
```

---

## File Guide

### `collect_baseline.py`
Collects performance baselines from MongoDB's AiReport collection.

**Usage:**
```bash
# Default: last 7 days
python collect_baseline.py

# Custom period
python collect_baseline.py --days=30

# Remote MongoDB
python collect_baseline.py --host=mongodb.example.com --port=27017

# Custom output
python collect_baseline.py --output=my_baseline.json
```

**Output includes:**
- Pipeline stage durations (min, max, p95, p99)
- End-to-end latency statistics
- Quality scores (semantic, code, accessibility, etc.)
- Retry metrics (LLM retries, build retries)
- LLM provider distribution
- Database collection stats

### `locust_tasks.py`
Load testing script simulating concurrent users.

**Tasks:**
- 70% of traffic: Create new generations
- 20% of traffic: List user's projects
- 10% of traffic: Get generation details & quality scores

**Usage:**
```bash
# UI mode (interactive dashboard)
locust -f locust_tasks.py --host=http://localhost:8081

# Headless mode with reports
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=10 \
  --spawn-rate=2 \
  --run-time=5m \
  --headless \
  --csv=results/load_test

# Spike test (50 users instantly)
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=50 \
  --spawn-rate=50 \
  --run-time=5m
```

**Output:**
- `results/load_test_stats.csv` — Per-request statistics
- `results/load_test_failures.csv` — Failed requests
- Console output — Real-time progress and summary

---

## Test Scenarios

### Baseline (Single User)
```bash
python collect_baseline.py --days=1
# Measures: Typical latency, success rate, quality baseline
# Time: 5 minutes
```

### Light Load (5 concurrent users, 10 minutes)
```bash
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=5 \
  --spawn-rate=1 \
  --run-time=10m \
  --csv=results/light_load
```

### Medium Load (10 concurrent users, 15 minutes)
```bash
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=10 \
  --spawn-rate=2 \
  --run-time=15m \
  --csv=results/medium_load
```

### Heavy Load (20 concurrent users, 20 minutes)
```bash
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=20 \
  --spawn-rate=2 \
  --run-time=20m \
  --csv=results/heavy_load
```

### Spike Test (Sudden spike to 50 users)
```bash
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=50 \
  --spawn-rate=50 \
  --run-time=5m \
  --csv=results/spike_test
```

### Soak Test (10 users for 1 hour, detect memory leaks)
```bash
locust -f locust_tasks.py \
  --host=http://localhost:8081 \
  --users=10 \
  --spawn-rate=1 \
  --run-time=60m \
  --csv=results/soak_test
```

---

## Interpreting Results

### Baseline Collection

**Example output:**
```json
{
  "generations": {
    "end_to_end": {
      "mean_ms": 600000,
      "p95_ms": 720000,
      "p99_ms": 900000
    },
    "quality": {
      "avg_score": 82.5,
      "p95_score": 88
    },
    "retries": {
      "build_success_rate": 0.94
    },
    "stages": {
      "plan_ms": { "mean_ms": 35000, "p95_ms": 42000 },
      "codegen_ms": { "mean_ms": 380000, "p95_ms": 450000 },
      "build_ms": { "mean_ms": 120000, "p95_ms": 180000 }
    }
  }
}
```

**Key metrics:**
- **p95 latency 720s**: 95% of generations complete within 12 minutes
- **Avg score 82.5**: Average quality is "Good"
- **Success rate 94%**: Most generations build on first try
- **Plan stage 35s**: Planner LLM is ~3.5min of the 10min total

### Load Test Results

**From Locust dashboard:**
- **Response Time**: Shows how latency increases under load
  - Single user: 600s p95
  - 10 users: 750s p95 (+25% expected)
  - 20 users: 900s p95 (+50%, queueing effect)

- **Failure Rate**: If > 1%, there's a problem
  - 0% = Stable
  - 1-5% = Some rate-limiting
  - > 5% = Need to optimize

- **RPS (Requests/sec)**: Throughput capacity
  - Single generation takes 10 min = 0.0017 RPS per user
  - 10 users = 0.017 RPS max

---

## Common Issues & Solutions

### Issue: "Connection refused" errors
**Solution:**
```bash
# Check if services are running
docker compose ps

# Ensure BFF is healthy
docker compose logs spring-bff | tail -20
```

### Issue: "Rate limit exceeded" errors
**Why:** Hitting LLM API quotas (Groq 30 RPM, Gemini 15 RPM)

**Solution:**
- Reduce concurrent users (--users=5 instead of 20)
- Increase wait time between requests (--spawn-rate=0.5)
- Wait between test runs (Groq quota resets hourly)

### Issue: "Build failures" spiking during load test
**Why:** Might be resource contention or timeouts

**Solution:**
```bash
# Check Vite build times
docker compose logs fastapi-ai | grep build_ms

# Check Spring BFF memory
docker stats spring-bff

# Add memory limit test
docker compose up -d
docker update --memory 2g spring-bff
locust ... --users=5  # Try lighter load
```

### Issue: MongoDB slow queries
**Solution:**
```javascript
# Enable profiler
db.setProfilingLevel(1, { slowms: 100 })

# Find slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10)

# Create missing index if needed
db.generations.createIndex({ userId: 1, status: 1, createdAt: -1 })
```

---

## Next Steps

1. **Run baseline first** (collect current metrics)
2. **Run light load test** (verify stability)
3. **Identify bottleneck** (which stage takes longest?)
4. **Optimize** (see BENCHMARKING.md for recommendations)
5. **Re-baseline** (confirm improvement)

See [BENCHMARKING.md](../BENCHMARKING.md) for detailed interpretation and optimization strategies.

---

## Requirements

```bash
# Python 3.8+
python --version

# Install dependencies
pip install pymongo locust

# Verify installations
python -c "import pymongo; import locust; print('✅ Ready')"
```

## Contact

For benchmarking questions, refer to the main [BENCHMARKING.md](../BENCHMARKING.md) guide.
