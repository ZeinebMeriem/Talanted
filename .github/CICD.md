# CI/CD Pipeline Documentation

## Overview

The project uses **GitHub Actions** for automated testing, building, and deployment.

## Workflows

### 1. **Frontend CI** (`.github/workflows/frontend.yml`)
Runs on: Push/PR to `main` or `develop` (frontend changes)

**Steps**:
- ✅ Install dependencies (`npm ci`)
- ✅ Type check (TypeScript strict mode)
- ✅ Build (`npm run build`)
- ✅ Security audit (npm audit, snyk)

**Artifacts**: `frontend/dist` (5 days retention)

---

### 2. **Backend (Spring BFF) CI** (`.github/workflows/backend.yml`)
Runs on: Push/PR to `main` or `develop` (spring-bff changes)

**Steps**:
- ✅ Build with Maven (`mvn clean package`)
- ✅ Run unit tests (`mvn test`)
- ✅ Code quality checks (checkstyle)
- ✅ Dependency scanning (OWASP, Maven dependency check)

**Artifacts**:
- `spring-bff/target/*.jar` (5 days)
- Test reports (7 days)

---

### 3. **FastAPI CI** (`.github/workflows/fastapi.yml`)
Runs on: Push/PR to `main` or `develop` (fastapi-ai changes)

**Steps**:
- ✅ Install dependencies (`pip install -r requirements.txt`)
- ✅ Lint (Ruff)
- ✅ Type check (mypy)
- ✅ Run tests (`pytest`)
- ✅ Code coverage (codecov)
- ✅ Security scan (bandit, Safety)

**Artifacts**:
- HTML coverage report (7 days)
- Security reports (7 days)

---

### 4. **Full Stack CI** (`.github/workflows/ci.yml`)
Runs on: **ALL** push/PR events (orchestrates all above)

**Flow**:
1. Frontend CI
2. Backend CI
3. FastAPI CI
4. Docker build check (all 3 images)
5. Summary report

**Exit Code**: Fails if ANY component fails

---

### 5. **Deploy to Production** (`.github/workflows/deploy.yml`)
Runs on: **Push to `main` branch ONLY**

**Requirements**:
- `DOCKER_USERNAME` secret
- `DOCKER_PASSWORD` secret
- `DOCKER_REGISTRY` secret

**Steps**:
- Build all 3 Docker images
- Push to Docker Hub/Registry
- Tag with `latest` and commit SHA
- Notify on success/failure

---

## Setup Instructions

### 1. Enable GitHub Actions
1. Go to **Settings** → **Actions** → **General**
2. Enable "Allow all actions and reusable workflows"

### 2. Add Secrets (For Deployment)
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub token/password
   - `DOCKER_REGISTRY`: e.g. `docker.io/yourusername`

### 3. Configure Branch Protection (Optional but Recommended)
1. Go to **Settings** → **Branches** → **Add rule**
2. Set rule for `main` branch:
   - ✅ Require CI builds to pass before merging
   - ✅ Require reviews before merging
   - ✅ Dismiss stale reviews on new commits

---

## Workflow Files Structure

```
.github/workflows/
├── frontend.yml      # React + TypeScript CI
├── backend.yml       # Spring BFF CI
├── fastapi.yml       # FastAPI CI
├── ci.yml            # Main orchestrator
└── deploy.yml        # Production deployment
```

---

## Status Badges

Add these to your README for status visibility:

```markdown
![Frontend CI](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/frontend.yml/badge.svg)
![Backend CI](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/backend.yml/badge.svg)
![FastAPI CI](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/fastapi.yml/badge.svg)
```

---

## Troubleshooting

### Workflow not running?
- Check if changes match the `paths` filter
- Verify GitHub Actions is enabled
- Check `.github/workflows/` syntax with `yamllint`

### Tests failing locally but passing in CI?
- Ensure same Node/Java/Python versions
- Check environment variables in GitHub Secrets
- Review artifact uploads for logs

### Build timeout?
- Increase `runner` resources (not possible on free tier)
- Optimize build steps (cache dependencies)
- Split into smaller workflows

### Docker build fails?
- Verify Dockerfile is correct
- Check Buildx is properly configured
- Ensure secrets are set correctly

---

## Caching Strategy

| Component | Cache Method | TTL |
|-----------|-------------|-----|
| Node packages | actions/setup-node | 7 days |
| Maven | actions/setup-java | 7 days |
| Python pip | actions/setup-python | 7 days |
| Docker layers | type=gha | GH Actions default |

---

## Security Considerations

### Secrets Management
- ✅ All secrets are encrypted
- ✅ Only non-PR workflows can access secrets
- ✅ Rotate Docker credentials annually

### Supply Chain Security
- Dependency scanning (npm audit, maven, Safety)
- Container scanning (optional: add Trivy)
- Code signing (optional: add sigstore)

---

## Next Steps

1. **Add Status Badges** to README.md
2. **Configure Branch Protection** rules
3. **Set up Docker Hub** credentials (if deploying)
4. **Monitor Workflow Runs** in Actions tab
5. **Integrate with Slack** (optional) for notifications

---

## File Locations

All workflow files are in:
```
.github/workflows/
```

To add a new workflow, create a `.yml` file in this directory.

**GitHub Actions Docs**: https://docs.github.com/en/actions
