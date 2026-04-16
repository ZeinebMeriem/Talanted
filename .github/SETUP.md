# GitHub Actions Setup Guide

## 1️⃣ Enable GitHub Actions

1. Go to your GitHub repository
2. Click **Settings** → **Actions** → **General**
3. Under "Actions permissions", select "Allow all actions and reusable workflows"
4. Click **Save**

## 2️⃣ Configure Branch Protection (Recommended)

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Set rule for `main` branch:
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

4. Select required status checks:
   - `Frontend CI / Test & Build Frontend`
   - `Backend (Spring BFF) CI / Build & Test Spring BFF`
   - `FastAPI CI / Test & Lint FastAPI`
   - `Full Stack CI / Docker Build Check`

## 3️⃣ Add Docker Registry Secrets (For Deployment)

### Option A: Docker Hub

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name**: `DOCKER_USERNAME`
   - **Value**: Your Docker Hub username
4. Repeat for:
   - **Name**: `DOCKER_PASSWORD`
   - **Value**: Your Docker Hub access token (NOT password!)
   - **Name**: `DOCKER_REGISTRY`
   - **Value**: `docker.io/your-username`

### Option B: GitHub Container Registry (GHCR)

1. Generate a Personal Access Token (PAT):
   - Go to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Click **Generate new token**
   - Select scope: `write:packages`
   - Generate and copy token

2. Add secrets:
   - **Name**: `DOCKER_USERNAME`
   - **Value**: Your GitHub username
   - **Name**: `DOCKER_PASSWORD`
   - **Value**: Your PAT from above
   - **Name**: `DOCKER_REGISTRY`
   - **Value**: `ghcr.io/your-username`

## 4️⃣ Verify Workflows

1. Go to **Actions** tab
2. You should see workflows:
   - Frontend CI
   - Backend (Spring BFF) CI
   - FastAPI CI
   - Full Stack CI
   - Deploy to Production

3. Click on any workflow to see recent runs
4. Green checkmarks = passing ✅
5. Red X = failing ❌

## 5️⃣ Test a Workflow Run

To validate everything works:

1. Make a small change (e.g., update README)
2. Create a PR
3. Go to **Actions** tab
4. Watch workflows run in real-time
5. All 3 should pass: Frontend, Backend, FastAPI

## 6️⃣ Deploy to Docker Hub (Optional)

After setting up secrets:

1. Push to `main` branch (not PR)
2. Workflows will run
3. Go to **Actions** → **Deploy to Production**
4. Should see "Build and push" steps
5. Check your Docker Hub for new images:
   - `docker.io/your-username/ui-generator-frontend:latest`
   - `docker.io/your-username/ui-generator-bff:latest`
   - `docker.io/your-username/ui-generator-fastapi:latest`

## 7️⃣ Monitor Builds

### View Build Logs
1. Go to **Actions**
2. Click on a workflow run
3. Click on a job to see detailed logs

### Common Issues
- ❌ **"No secrets found"** → Add secrets in Step 3
- ❌ **"Tests failing"** → Check build logs for errors
- ❌ **"Docker push failing"** → Verify credentials are correct

### Status Badges
Add to README.md:
```markdown
[![Frontend CI](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/frontend.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/frontend.yml)
```

## 8️⃣ Build Logs Location

After each run, check:
- **Frontend artifacts**: `.github/workflows/frontend.yml` → upload-artifact
- **Backend artifacts**: `.github/workflows/backend.yml` → upload-artifact
- **FastAPI artifacts**: `.github/workflows/fastapi.yml` → upload-artifact

## 9️⃣ Troubleshooting

### Workflow not running?
- Check `.github/workflows/` files are correctly formatted (use `yamllint`)
- Verify `on:` triggers match your branch
- Check `paths:` filters include your changes

### Tests timing out?
- GitHub Actions free tier has 6-hour timeout limit
- Optimize builds: use caching, parallel steps
- Split large workflows

### Docker credentials failing?
- Verify username and password/token are correct
- For Docker Hub: use access token, NOT password
- For GHCR: use PAT with `write:packages` scope

---

## Useful Commands

### Test locally before pushing:
```bash
# Run frontend tests
cd frontend && npm run build

# Run backend tests
cd spring-bff && mvn test

# Run FastAPI tests
cd fastapi-ai && pytest tests/
```

### View workflow file syntax:
```bash
# Validate YAML
yamllint .github/workflows/

# Or use online validator
# https://www.yamllint.com/
```

---

For more info: https://docs.github.com/en/actions
