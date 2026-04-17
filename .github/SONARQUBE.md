# SonarQube Integration Guide

## Overview

This project integrates SonarQube for centralized code quality analysis across 3 services:
- **Frontend** (React/TypeScript)
- **Backend** (Spring Boot/Java)
- **FastAPI** (Python)

---

## Local Setup

### 1. Start SonarQube

Run the full stack with SonarQube:

```bash
docker compose up -d
```

This starts:
- SonarQube instance on http://localhost:9000
- PostgreSQL database for SonarQube
- All other services (Frontend, Backend, FastAPI, MongoDB, etc.)

**Wait for SonarQube to be healthy** (30-60 seconds):

```bash
docker compose logs -f sonarqube
```

Look for: `SonarQube is up` message

### 2. First-Time Setup

Access SonarQube dashboard:

```
URL: http://localhost:9010
Default login: admin / admin
```

**⚠️ IMPORTANT: Change the default password:**

1. Click profile icon (top right) → My Account
2. Change password (note it down for GitHub secrets)
3. Log out and log back in

### 3. Generate SonarQube Token

1. Go to **Administration** → **Security** → **Users**
2. Find the `admin` user, click **Edit**
3. Scroll to "Tokens" section
4. Click **Generate**
5. Name it: `github-actions`
6. Copy the token (you'll need it for GitHub secrets)
7. Click **Save**

### 4. Create Projects (Manual or Auto-Created)

SonarQube will auto-create projects on first scan. Or create them manually:

1. Click **Create Project** → **Manually**
2. Create 3 projects:
   - **Project key**: `ai-ui-generator-frontend`
   - **Project key**: `ai-ui-generator-backend`
   - **Project key**: `ai-ui-generator-fastapi`

---

## GitHub Actions Setup

### 1. Add GitHub Secrets

Go to: **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Example |
|---|---|---|
| `SONAR_HOST_URL` | Your SonarQube server URL | `http://sonarqube:9000` (for GitHub Actions) OR `https://your-sonarqube.com` (SaaS) |
| `SONAR_TOKEN` | Token generated in step 3 above | `squ_XXXXXXXXXXXXXXXXXXXX...` |

**For local testing:**
- Use `SONAR_HOST_URL = http://sonarqube:9000` (Docker internal DNS)

**For production/SaaS:**
- Use your actual SonarQube server URL or [SonarCloud.io](https://sonarcloud.io)

### 2. Verify Secrets Are Set

```bash
# These should NOT show errors on GitHub Actions runs:
# - "Missing SONAR_HOST_URL"
# - "Missing SONAR_TOKEN"
```

---

## How It Works

### On Each Push to main/develop:

1. **GitHub Actions triggers** (per service):
   - Frontend CI → Type check, build, SonarQube scan
   - Backend CI → Maven build, tests, SonarQube scan
   - FastAPI CI → Pytest, coverage, SonarQube scan

2. **SonarQube scan step**:
   - Analyzes code quality
   - Detects bugs, vulnerabilities, code smells
   - Sends results to SonarQube server
   - Compares with previous scans

3. **Results appear in SonarQube dashboard**:
   - Metrics for each project
   - Code coverage trends
   - Quality gates status
   - Issue history

### Example Workflow Timeline:

```
09:00 - Developer pushes code to main
09:01 - GitHub Actions starts workflows
09:02 - Frontend CI runs (includes SonarQube scan)
09:03 - Backend CI runs (includes SonarQube scan)
09:04 - FastAPI CI runs (includes SonarQube scan)
09:05 - SonarQube processes results
09:06 - Dashboard updated with new metrics
```

---

## Viewing Results

### 1. In SonarQube Dashboard

```
http://localhost:9000 (local)
or your SonarQube instance
```

Click on any project to see:
- Code quality metrics (A-F rating)
- Bugs and vulnerabilities found
- Code coverage percentage
- Code duplication metrics
- Issues by severity (Blocker, Critical, Major, Minor, Info)
- Trends over time (graphs)

### 2. In GitHub Actions Logs

Each workflow shows the SonarQube scan output:

```
✓ SonarQube Scan
  └─ Project key: ai-ui-generator-frontend
  └─ Bugs: 2
  └─ Vulnerabilities: 0
  └─ Code smells: 5
```

---

## Configuration Files

### `sonar-project.properties`

Global SonarQube configuration (root of repo):

```properties
sonar.projectName=AI UI Generator
sonar.exclusions=**/node_modules/**,**/dist/**,**/target/**
sonar.sourceEncoding=UTF-8
```

### Workflow-Specific Configuration

Each workflow (`.github/workflows/*.yml`) has its own settings:

**Frontend:**
```yaml
-Dsonar.projectKey=ai-ui-generator-frontend
-Dsonar.sources=frontend/src
-Dsonar.exclusions=**/*.test.ts,**/*.spec.ts,**/*.d.ts
```

**Backend:**
```yaml
-Dsonar.projectKey=ai-ui-generator-backend
-Dsonar.sources=spring-bff/src/main/java
-Dsonar.tests=spring-bff/src/test/java
-Dsonar.java.binaries=spring-bff/target/classes
-Dsonar.junit.reportPaths=spring-bff/target/surefire-reports
```

**FastAPI:**
```yaml
-Dsonar.projectKey=ai-ui-generator-fastapi
-Dsonar.sources=fastapi-ai/app
-Dsonar.tests=fastapi-ai/tests
-Dsonar.python.coverage.reportPaths=fastapi-ai/coverage.xml
```

---

## Testing Locally

### Test Frontend Analysis:

```bash
# Push changes to main/develop (or trigger manually)
git push origin main

# Watch GitHub Actions
open https://github.com/YOUR_USERNAME/ai-ui-generator-fixed/actions

# Wait for "Frontend CI" to complete
# Then check SonarQube dashboard
open http://localhost:9000/projects/ai-ui-generator-frontend
```

### Test All 3 Services:

Make a change in each service:
- Modify `frontend/src/App.tsx`
- Modify `spring-bff/src/main/java/...`
- Modify `fastapi-ai/app/main.py`

Push and monitor:
```bash
git add .
git commit -m "test: trigger sonarqube analysis"
git push origin main
```

Then check all 3 projects in SonarQube dashboard.

---

## Troubleshooting

### "SonarQube Scan Failed" in GitHub Actions

**Problem**: `Error: SONAR_TOKEN not set`

**Solution**: Check GitHub Secrets are added correctly:
```
Settings → Secrets and variables → Actions →
  ✓ SONAR_HOST_URL exists
  ✓ SONAR_TOKEN exists
```

---

### "SonarQube is unreachable"

**Problem**: `Error connecting to http://sonarqube:9000`

**For Local Testing:**
- Ensure `docker compose up -d` is running
- Check SonarQube service is healthy: `docker compose ps sonarqube`
- Wait 60 seconds for startup

**For GitHub Actions:**
- If SonarQube is local, it won't be accessible from GitHub
- Use SonarCloud.io (SaaS) instead: https://sonarcloud.io
- Or use a publicly accessible SonarQube server

---

### "Project key already exists"

**Problem**: `Error: Project key ai-ui-generator-frontend already exists`

**Solution**:
1. In SonarQube, delete the project (Administration → Projects)
2. Re-run the workflow

---

### SonarQube Slow to Start

**Problem**: Workflows timeout waiting for SonarQube

**Solution:**
- First run is slow (initialization): 30-60 seconds normal
- Increase health check timeout in `docker-compose.yml`
- Or just wait and re-run the workflow

---

## Switching to SonarCloud (SaaS)

Instead of self-hosted SonarQube, use [SonarCloud.io](https://sonarcloud.io):

### Setup Steps:

1. Create free SonarCloud account: https://sonarcloud.io
2. Create organization
3. Generate token in SonarCloud
4. Update GitHub Secrets:
   ```
   SONAR_HOST_URL = https://sonarcloud.io
   SONAR_TOKEN = your_sonarcloud_token
   ```
5. Update project keys in workflows to match SonarCloud

**Advantages:**
- No self-hosting needed
- Free for open-source projects
- Easier scalability
- Automatic backups

---

## Next Steps

1. ✅ Start SonarQube: `docker compose up -d`
2. ✅ Set up admin password
3. ✅ Generate GitHub token
4. ✅ Add GitHub Secrets
5. ✅ Push changes to main
6. ✅ Monitor GitHub Actions and SonarQube dashboard

**Expected Time**: 5-10 minutes for first full analysis

---

## Resources

- [SonarQube Documentation](https://docs.sonarqube.org)
- [SonarQube Scan GitHub Action](https://github.com/SonarSource/sonarqube-scan-action)
- [Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
- [Code Coverage Integration](https://docs.sonarqube.org/latest/analyzing-source-code/test-coverage/overview/)
