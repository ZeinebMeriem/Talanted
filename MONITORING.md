# 📊 MONITORING & OBSERVABILITY GUIDE

**Prometheus + Grafana Stack for AI UI Generator**

Last Updated: 2026-05-11
Status: Ready to implement

---

## 🎯 Overview

Complete monitoring setup for the AI UI Generator with:
- **Prometheus** (metrics collection & storage)
- **Grafana** (dashboards & visualization)
- **Alerting** (automated notifications)
- **Service Health Tracking** (all components)

---

## 📁 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MONITORING STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Prometheus (port 9090)                                │
│  ├─ Scrapes metrics from services                      │
│  ├─ Stores time-series data                            │
│  └─ Evaluates alert rules                              │
│                                                         │
│  Grafana (port 3000)                                   │
│  ├─ Visualizes Prometheus data                         │
│  ├─ Pre-built dashboards                               │
│  └─ Alerting via email/Slack                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ▲
         │ Scrapes metrics from:
         │
    ┌────┴─────────────────────────────────┐
    │                                       │
    ▼                                       ▼
Spring BFF (8081)              FastAPI (8000)
/actuator/prometheus           /metrics

    ▼                                       ▼
MongoDB (27017)                Jenkins (8080)
mongo-exporter                 prometheus-plugin

    ▼                                       ▼
Keycloak (8083)                SonarQube (9010)
optional-exporter              optional-exporter
```

---

## 🚀 Quick Start (5 minutes)

### Step 1: Start Prometheus + Grafana

```bash
# Copy monitoring files to your project
mkdir -p monitoring/{prometheus,grafana}

# Then start the stack
docker-compose -f docker-compose-monitoring.yml up -d

# Verify services
docker-compose -f docker-compose-monitoring.yml ps
```

### Step 2: Access Dashboards

```
Prometheus:  http://localhost:9090
Grafana:     http://localhost:3000 (admin / admin)
```

### Step 3: View Pre-built Dashboards

1. Login to Grafana (admin / admin)
2. Go to **Dashboards > Browse**
3. Select:
   - ✅ **AI UI Generator Overview** (all metrics)
   - ✅ **Spring Boot Metrics** (JVM, HTTP requests)
   - ✅ **FastAPI Performance** (generation pipeline)
   - ✅ **MongoDB Performance** (queries, indexing)
   - ✅ **Infrastructure** (CPU, memory, disk)

---

## 📊 Metrics Being Collected

### Spring BFF (via Spring Boot Actuator)

```
JVM Metrics:
  - jvm_memory_used_bytes
  - jvm_threads_live
  - jvm_gc_memory_allocated_bytes_total
  - jvm_gc_pause_seconds

HTTP Metrics:
  - http_server_requests_seconds (latency)
  - http_server_requests_seconds_count (request count)

Database Metrics:
  - jdbc_connections_active
  - mongodb_driver_pool_checkedout

Custom Metrics (if instrumented):
  - generation_duration_seconds
  - generation_success_total
  - quality_score_gauge
```

### FastAPI (via prometheus_client)

```
Request Metrics:
  - request_count (by endpoint)
  - request_duration_seconds (latency)

Custom Metrics:
  - generation_duration_seconds (by stage)
  - llm_api_calls_total (by provider)
  - build_success_rate
  - accessibility_score_gauge
```

### MongoDB (via mongo-exporter sidecar)

```
Replication:
  - mongodb_memberstate
  - mongodb_replset_election_date

Operations:
  - mongodb_op_counters_repl_total
  - mongodb_op_counters_total (read/write/insert/delete)

Storage:
  - mongodb_storage_data_size_bytes
  - mongodb_connections (current, available, total)

Query Performance:
  - mongodb_server_query_exec_seconds (via profiler)
```

### System-level (via node-exporter)

```
CPU:
  - node_cpu_seconds_total
  - node_load15

Memory:
  - node_memory_MemAvailable_bytes
  - node_memory_MemFree_bytes

Disk:
  - node_filesystem_avail_bytes
  - node_filesystem_size_bytes

Network:
  - node_network_receive_bytes_total
  - node_network_transmit_bytes_total
```

---

## 📈 Pre-built Dashboards

### 1. **AI UI Generator Overview** (Main Dashboard)
Show all key metrics at a glance:

```
┌─────────────────────────────────────────────────┐
│ AI UI Generator Overview                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Services Status  │  Uptime              │     │
│  ✅ Spring BFF    │  ⏱️  Production-ready │     │
│  ✅ FastAPI       │                      │     │
│  ✅ MongoDB       │                      │     │
│  ✅ Grafana       │                      │     │
│                                                 │
├─────────────────────────────────────────────────┤
│ Generation Performance                          │
│  ┌─────────────┬──────────────┬─────────────┐ │
│  │ P95 Latency │ Success Rate │ Quality Avg │ │
│  │   750s      │    94%       │    82/100   │ │
│  └─────────────┴──────────────┴─────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│ Resource Utilization                            │
│  CPU: 45% ████░░░░░░  MEM: 62% ██████░░░░     │
│  Disk: 38% ███░░░░░░░                          │
│                                                 │
├─────────────────────────────────────────────────┤
│ Request Rate (last 24h)                         │
│  /api/generations:     2,450 req/day            │
│  /api/user/me:         1,280 req/day            │
│  /api/admin/stats:       180 req/day            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. **Spring Boot Metrics**
JVM, HTTP, database connections:
- JVM Memory (heap, non-heap)
- Thread count
- Garbage collection pauses
- HTTP request latency (p50, p95, p99)
- Response codes (2xx, 4xx, 5xx)
- Database connection pool

### 3. **FastAPI Performance**
Generation pipeline metrics:
- Generation latency by stage (Extract, Plan, Design, Code, Build, Eval)
- LLM API call counts by provider
- Build success/failure rates
- Quality scores (semantic, code, accessibility)
- Provider fallback events

### 4. **MongoDB**
Database health:
- Connection count (current/available/total)
- Operation counts (read, write, insert, delete)
- Query execution time (p95, p99)
- Collection sizes
- Index usage

### 5. **Infrastructure**
System health:
- CPU usage per container
- Memory usage trend
- Disk I/O
- Network traffic
- Container restarts

---

## 🔧 Configuration Files

### 1. **docker-compose-monitoring.yml**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - ai-ui-generator_default

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - ai-ui-generator_default

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - ai-ui-generator_default

volumes:
  prometheus_data:
  grafana_data:

networks:
  ai-ui-generator_default:
    external: true
```

### 2. **monitoring/prometheus/prometheus.yml**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'ai-ui-generator'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  # Spring BFF (JVM metrics)
  - job_name: 'spring-bff'
    static_configs:
      - targets: ['spring-bff:8081']
    metrics_path: '/actuator/prometheus'
    scrape_interval: 5s

  # FastAPI (if instrumented)
  - job_name: 'fastapi-ai'
    static_configs:
      - targets: ['fastapi-ai:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 10s

  # MongoDB (via mongo-exporter if running)
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongo-exporter:9216']
    scrape_interval: 10s

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Jenkins (if instrumented)
  - job_name: 'jenkins'
    static_configs:
      - targets: ['jenkins:8080']
    metrics_path: '/prometheus/metrics'
    scrape_interval: 10s

  # SonarQube
  - job_name: 'sonarqube'
    static_configs:
      - targets: ['sonarqube:9000']
    metrics_path: '/api/ce/info'
    scrape_interval: 30s
```

### 3. **monitoring/prometheus/alerts.yml**

```yaml
groups:
  - name: ai-ui-generator
    interval: 30s
    rules:
      # Service availability
      - alert: ServiceDown
        expr: up{job=~"spring-bff|fastapi-ai|mongodb"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.job }} is DOWN"
          description: "{{ $labels.job }} has been unavailable for 5+ minutes"

      # Generation latency
      - alert: HighGenerationLatency
        expr: histogram_quantile(0.95, request_duration_seconds{endpoint="/api/generations/stream"}) > 900
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High generation latency (p95 > 15 min)"
          description: "Generation time has exceeded 15 minutes threshold"

      # Build success rate
      - alert: LowBuildSuccessRate
        expr: build_success_rate < 0.90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low build success rate (< 90%)"
          description: "Generation builds are failing more than expected"

      # Quality score degradation
      - alert: QualityDegradation
        expr: avg(quality_score_gauge) < 75
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Quality scores degraded (avg < 75)"
          description: "Average generation quality has dropped below 75"

      # Memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage (> 85%)"
          description: "System memory is critically low"

      # Disk space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space (< 15% available)"
          description: "Disk is running out of space"

      # MongoDB connection pool
      - alert: MongoDBConnectionExhaustion
        expr: mongodb_connections{connection_type="current"} > 400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB running out of connections"
          description: "Active connections approaching total limit"

      # JVM GC pauses
      - alert: HighGCPauseTime
        expr: histogram_quantile(0.95, jvm_gc_pause_seconds) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High garbage collection pause time"
          description: "GC p95 pause time exceeds 2 seconds"

      # HTTP error rate
      - alert: HighErrorRate
        expr: (rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m])) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP error rate (> 5%)"
          description: "API errors are above threshold"
```

### 4. **monitoring/grafana/provisioning/dashboards/ai-ui-generator.json**

This file would contain the full Grafana dashboard definition (large JSON).
See "Grafana Dashboard Setup" below.

---

## 🎨 Grafana Dashboard Setup

### Automatic Provisioning

Place JSON dashboard files in:
```
monitoring/grafana/provisioning/dashboards/
├── ai-ui-generator.json
├── spring-boot.json
├── fastapi.json
├── mongodb.json
└── infrastructure.json
```

Grafana automatically loads them on startup.

### Manual Dashboard Creation

**If not using provisioning, manually create dashboards:**

1. Login to Grafana (http://localhost:3000)
2. **Add Data Source**:
   - Type: Prometheus
   - URL: http://prometheus:9090
   - Save & Test

3. **Create Dashboard** → Add Panel

**Example Panel: Generation Latency p95**
```
Query: histogram_quantile(0.95, rate(request_duration_seconds_bucket{endpoint="/api/generations/stream"}[5m]))
Title: "Generation Latency (p95)"
Unit: seconds
Threshold: 900 (15 min, orange), 1200 (20 min, red)
```

**Example Panel: Build Success Rate**
```
Query: build_success_rate
Title: "Build Success Rate"
Unit: percentUnit
Min: 0
Max: 1
Threshold: 0.95 (green), 0.90 (orange), 0.85 (red)
```

---

## 📢 Alerting Setup

### Email Notifications

1. Grafana → **Configuration → Notification channels**
2. **New channel** → Email
3. Configure SMTP:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   From Email: alerts@company.com
   From Name: AI UI Generator Alerts
   ```

### Slack Integration

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Grafana → **Notification channels** → Slack
3. Paste webhook URL
4. Test notification

### Alert Rules

Attach alerts to dashboards:
1. Edit Panel → **Alert** tab
2. Set condition: `avg(quality_score_gauge) < 75`
3. Select notification channel
4. Save

---

## 🔍 How to Use

### View Real-Time Metrics

```
http://localhost:3000/d/ai-ui-generator-overview
```

Dashboard refreshes every 5 seconds showing:
- Current generation latency
- Success rate
- Resource usage
- Error rates

### Check Service Health

```
http://localhost:9090/targets
```

Shows all scraped endpoints and their status.

### Query Historical Data

```
http://localhost:9090/graph
```

**Example queries:**
```
# Average generation time last 24h
avg(increase(request_duration_seconds_sum{endpoint="generations"}[24h]))

# Build failure rate
1 - (build_success_total / generation_total)

# Memory usage trend
node_memory_MemAvailable_bytes / 1024^3
```

### Set Up Custom Alerts

**Alert: Generation latency > 15 min**
```
if: histogram_quantile(0.95, rate(request_duration_seconds_bucket{endpoint="/stream"}[5m])) > 900
for: 10m
severity: warning
message: "Generation latency exceeding SLA"
```

---

## 🛠️ Integration with Existing Services

### Spring Boot (Already Enabled)

Spring Boot Actuator automatically exposes metrics on `/actuator/prometheus`.
No changes needed!

### FastAPI (Needs Instrumentation)

**Install prometheus_client:**
```bash
pip install prometheus-client
```

**Add to fastapi-ai/app/main.py:**
```python
from prometheus_client import Counter, Histogram, generate_latest
import time

# Define metrics
generation_counter = Counter('generation_total', 'Total generations', ['status'])
generation_duration = Histogram('generation_duration_seconds', 'Generation latency', ['stage'])
quality_score = Gauge('quality_score_gauge', 'Generation quality score')

# Track in orchestrator
start = time.time()
result = orchestrator.run(payload)
duration = time.time() - start

generation_duration.labels(stage='full').observe(duration)
generation_counter.labels(status='success').inc()
quality_score.set(result.aiReport.score)

# Expose metrics endpoint
@app.get('/metrics')
def metrics():
    return generate_latest()
```

### MongoDB (Optional: mongo-exporter)

```bash
# Add to docker-compose as sidecar
mongo-exporter:
  image: percona/mongodb-exporter
  ports:
    - "9216:9216"
  environment:
    MONGODB_URI: "mongodb://mongodb:27017"
  depends_on:
    - mongodb
```

### Jenkins (Optional)

Install Prometheus plugin:
1. Jenkins → **Manage Plugins**
2. Search "Prometheus"
3. Install & Restart

Metrics available at: `http://jenkins:8080/prometheus`

---

## 📊 Useful Dashboard Queries

### Generation Pipeline Performance

```
# Average latency per stage
avg by(stage) (rate(generation_duration_seconds_sum[5m]) / rate(generation_duration_seconds_count[5m]))

# P95 latency over time
histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))

# Success rate trend
rate(generation_success_total[5m]) / rate(generation_total[5m])
```

### Resource Monitoring

```
# CPU usage
rate(node_cpu_seconds_total[5m])

# Memory trend
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

### Database Performance

```
# MongoDB query count
rate(mongodb_op_counters_total[5m])

# Connection pool utilization
mongodb_connections{connection_type="current"} / mongodb_connections{connection_type="total"}

# JDBC connection pool (Spring)
jdbc_connections_active / jdbc_connections_max
```

---

## 🚀 Implementation Checklist

### Phase 1: Deploy Stack (Today)
- [ ] Create `monitoring/` directory
- [ ] Copy `prometheus.yml` and `alerts.yml`
- [ ] Start with `docker-compose-monitoring.yml`
- [ ] Verify services running (http://localhost:9090, http://localhost:3000)

### Phase 2: Connect Services (This week)
- [ ] Verify Spring BFF metrics working
- [ ] Add prometheus_client to FastAPI
- [ ] Optional: Add mongo-exporter for MongoDB
- [ ] Test all scrape targets in Prometheus UI

### Phase 3: Dashboards (This week)
- [ ] Create main overview dashboard
- [ ] Create Spring Boot metrics dashboard
- [ ] Create FastAPI performance dashboard
- [ ] Create Infrastructure dashboard

### Phase 4: Alerting (Next week)
- [ ] Configure email notifications
- [ ] Optional: Slack integration
- [ ] Create alert rules (latency, success rate, resources)
- [ ] Test alert delivery

### Phase 5: Tuning (Ongoing)
- [ ] Set realistic thresholds based on baseline
- [ ] Adjust scrape intervals as needed
- [ ] Archive old data (Prometheus retention: 15 days default)
- [ ] Monthly review of alert effectiveness

---

## 📋 File Structure

```
monitoring/
├── docker-compose-monitoring.yml    ← Start stack here
├── README.md                        ← This file
├── prometheus/
│   ├── prometheus.yml               ← Scrape config
│   └── alerts.yml                   ← Alert definitions
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml       ← Data source config
        └── dashboards/
            ├── ai-ui-generator.json ← Main dashboard
            ├── spring-boot.json     ← JVM metrics
            ├── fastapi.json         ← Generation pipeline
            ├── mongodb.json         ← Database
            └── infrastructure.json  ← System health
```

---

## 🔗 Default Access

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **Prometheus** | http://localhost:9090 | N/A | N/A |
| **Grafana** | http://localhost:3000 | admin | admin |
| **Spring BFF Metrics** | http://localhost:8081/actuator/prometheus | N/A | N/A |
| **Node Exporter** | http://localhost:9100/metrics | N/A | N/A |

---

## 🆘 Troubleshooting

### Prometheus can't scrape Spring BFF
```
Error: "Couldn't resolve host"
Solution: Check docker network - both containers must be on same network
docker network inspect ai-ui-generator_default
```

### Grafana metrics not showing
```
Error: "No data points"
Solution: Verify data source pointing to http://prometheus:9090
Grafana → Configuration → Data Sources → Edit Prometheus
```

### Alerts not firing
```
Check: prometheus/alerts.yml syntax with promtool
promtool check rules prometheus/alerts.yml
```

### Disk space growing
```
Prometheus stores ~1GB per week of data
Increase retention: Add to prometheus.yml:
--storage.tsdb.retention.time=30d  (default: 15d)
```

---

## 📚 Next Steps

1. **Today**: Deploy monitoring stack
2. **This week**: Instrument services and create dashboards
3. **Next week**: Configure alerting
4. **Ongoing**: Monitor trends and optimize thresholds

See individual service documentation for specific instrumentation details.
