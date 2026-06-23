# Quick Start: Jenkins + SonarQube for AI UI Generator

**TL;DR** — Replace GitHub Actions with Jenkins in 5 minutes

---

## 🚀 Start Jenkins + SonarQube

```bash
# Option 1: Jenkins + SonarQube only (recommended)
cd jenkins
docker-compose -f docker-compose-jenkins.yml up -d

# Option 2: Full stack (all services for complete testing)
cd ..
docker-compose -f docker-compose-full-ci.yml up -d

# Wait for health checks
docker-compose ps
```

**Access**:
- Jenkins: http://localhost:8080 (admin / admin)
- SonarQube: http://localhost:9010 (admin / admin)

---

## ⚙️ Configure Jenkins (5 steps)

### 1. Create SonarQube Token

```
http://localhost:9010
→ Account (top right) → Security → Generate Tokens
→ Name: jenkins-ci
→ Copy token
```

### 2. Install Required Plugins

**Manage Jenkins** → **Manage Plugins** → **Available** → Search & install:
- Blue Ocean
- Pipeline: Stage View
- Git
- Docker
- SonarQube Scanner
- Maven

**Restart Jenkins**

### 3. Add SonarQube Server

**Manage Jenkins** → **Configure System** → Find "SonarQube Servers"
```
Name: SonarQube-Server
Server URL: http://sonarqube:9000
Authentication Token: <paste your token>
Save
```

### 4. Add SonarQube Credentials

**Manage Jenkins** → **Credentials** → **System** → **Global Credentials**
```
Kind: Secret text
Secret: <paste SonarQube token>
ID: sonar-token
Save
```

### 5. Create Pipeline Job

**New Item** → `ai-ui-generator` → **Pipeline**
```
Definition: Pipeline script from SCM
SCM: Git
Repository URL: <your repo URL>
Branch: */main
Script Path: Jenkinsfile

Build Triggers: ✓ GitHub hook trigger (or GitLab hook)

Save
```

---

## 🔗 Configure Git Webhook

### GitHub

Settings → Webhooks → Add webhook
```
Payload URL: http://your-jenkins:8080/github-webhook/
Content type: application/json
Events: Push events, Pull requests
Active: ✓
```

### GitLab

Settings → Webhooks
```
URL: http://your-jenkins:8080/gitlab-webhook/
Triggers: Push, Merge requests
Active: ✓
```

---

## ▶️ Run Your First Build

**Option A: Git webhook** (automatic)
```bash
git commit --allow-empty -m "trigger jenkins"
git push origin main
# Jenkins triggers automatically (15 seconds)
```

**Option B: Manual trigger**
```
Jenkins UI → ai-ui-generator → Build with Parameters
→ BUILD_TYPE: FULL
→ RUN_SONARQUBE: ✓
→ PUSH_DOCKER: (leave unchecked)
→ Build
```

---

## 📊 Monitor Build

1. **Jenkins UI**: http://localhost:8080 → Job → Build → Console
2. **Blue Ocean**: http://localhost:8080 → "Open Blue Ocean" button
3. **SonarQube**: http://localhost:9010 → Projects

---

## 📋 What the Jenkinsfile Does

```
git push
    ↓
Frontend Build    Backend Build    FastAPI Build
(npm test, lint)  (mvn verify)     (pytest)
    ↓                 ↓                 ↓
SonarQube Analysis (all 3 in parallel)
    ↓
Backend Security (OWASP dependency check)
    ↓
Docker Build (all 3 images)
    ↓
Archive Artifacts (JAR, dist, reports)
    ↓
✅ Success / ❌ Failure → Email
```

---

## 🐛 Troubleshooting

### Jenkins won't start
```bash
# Check logs
docker-compose -f jenkins/docker-compose-jenkins.yml logs jenkins

# Port 8080 in use?
lsof -i :8080
kill -9 <PID>

# Restart
docker-compose -f jenkins/docker-compose-jenkins.yml restart
```

### SonarQube returns 503
```bash
# Wait longer (takes 2-3 minutes)
docker-compose -f jenkins/docker-compose-jenkins.yml logs sonarqube

# Check database
docker-compose -f jenkins/docker-compose-jenkins.yml logs sonarqube-db

# Full rebuild
docker-compose -f jenkins/docker-compose-jenkins.yml down -v
docker-compose -f jenkins/docker-compose-jenkins.yml up -d
```

### "Jenkinsfile not found"
```bash
# Ensure Jenkinsfile in repo root
ls -la Jenkinsfile

# Git add & push
git add Jenkinsfile
git commit -m "Add Jenkinsfile"
git push origin main
```

### "Maven not found"
```bash
# Install in Jenkins
docker exec ai-ui-jenkins apt-get update
docker exec ai-ui-jenkins apt-get install -y maven
```

### "SonarQube Scanner not installed"
```bash
# Use Maven plugin instead (automatic)
cd spring-bff && mvn sonar:sonar ...

# Or install npm package
docker exec ai-ui-jenkins npm install -g sonar-scanner
```

---

## 🎯 Parameters Explained

**BUILD_TYPE**:
- `FULL` — Frontend + Backend + FastAPI + SonarQube + Docker
- `FRONTEND_ONLY` — Skip backend and FastAPI
- `BACKEND_ONLY` — Skip frontend and FastAPI
- `FASTAPI_ONLY` — Skip frontend and backend

**RUN_SONARQUBE**:
- `true` (default) — Run SonarQube analysis
- `false` — Skip quality checks (faster)

**PUSH_DOCKER**:
- `true` — Push images to Docker registry
- `false` (default) — Build only, no push

---

## 📚 Full Documentation

| File | Content |
|------|---------|
| **JENKINS_SETUP_SUMMARY.md** | Complete overview (this project) |
| **jenkins/SETUP_GUIDE.md** | Step-by-step detailed guide |
| **jenkins/README.md** | Quick reference |
| **Jenkinsfile** | Pipeline code |

---

## ⏱️ Expected Times

| Task | Time |
|------|------|
| Start Docker services | 60-90 seconds |
| Jenkins ready | 30 seconds |
| SonarQube ready | 2-3 minutes |
| Install plugins | 2-5 minutes |
| Configure metrics | 5 minutes |
| Create job | 2 minutes |
| First build (full) | 3-5 minutes |
| **Total setup** | **15-20 minutes** |

---

## ✅ Checklist

- [ ] Docker Compose started: `docker-compose ps`
- [ ] Jenkins accessible: http://localhost:8080
- [ ] SonarQube accessible: http://localhost:9010
- [ ] SonarQube token created: Account → Security
- [ ] Plugins installed: 6+ plugins
- [ ] SonarQube server added: Configure System
- [ ] Credentials added: ID `sonar-token`
- [ ] Pipeline job created: `ai-ui-generator`
- [ ] Jenkinsfile in repo: `git log --name-status`
- [ ] Git webhook configured: GitHub/GitLab settings
- [ ] Test build triggered: See console logs
- [ ] SonarQube projects created: 3 projects

---

## 💡 Pro Tips

1. **Blue Ocean** is prettier than classic UI — use it!
   ```
   Jenkins → Open Blue Ocean
   ```

2. **View console logs** while build is running for real-time feedback

3. **Re-run failed builds** to debug without full rebuild:
   ```
   Build → Console → Scroll to failure
   Fix issue → Trigger build again
   ```

4. **Check SonarQube dashboard** for code quality trends
   ```
   http://localhost:9010 → Projects
   ```

5. **Use BUILD_TYPE=FRONTEND_ONLY** for quick testing of frontend changes

---

## 🚀 Next (Advanced)

After basic setup works:

1. **Email notifications** → Configure SMTP
2. **Slack integration** → Add webhook
3. **Artifact retention** → Set expiration
4. **HTTPS** → Nginx reverse proxy
5. **LDAP/SSO** → Keycloak integration (already available!)
6. **Backup strategy** → Backup Jenkins home daily
7. **Monitoring** → Prometheus + Grafana

---

**Questions?** Check **jenkins/SETUP_GUIDE.md** for detailed answers
