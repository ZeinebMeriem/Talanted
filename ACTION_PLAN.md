# 🎯 ACTION PLAN: Jenkins + SonarQube Implementation

**Status**: All files created ✅ | Ready to deploy | ~30 minutes total

---

## 📋 STEP-BY-STEP ROADMAP

### **PHASE 1: Commit Files to Git (5 minutes)**

```bash
# 1. Stage all Jenkins files
git add Jenkinsfile
git add JENKINS_QUICKSTART.md
git add JENKINS_SETUP_SUMMARY.md
git add docker-compose-full-ci.yml
git add jenkins/

# 2. Commit
git commit -m "feat: add Jenkins + SonarQube CI/CD pipeline replacing GitHub Actions

- Add Jenkinsfile with multi-stage pipeline (frontend/backend/fastapi)
- Add Docker Compose for Jenkins + SonarQube stack
- Add Jenkins Configuration as Code (JCasC)
- Add complete setup guides and documentation
- Replace 5 GitHub Actions workflows with single Jenkinsfile

CI/CD now runs locally with docker-compose, supporting:
- Parallel builds (frontend + backend + fastapi)
- SonarQube code quality gates
- OWASP security scanning
- Docker image build & push
- Parameter-driven builds"

# 3. Push to repository
git push origin main
```

---

### **PHASE 2: Start Jenkins + SonarQube Services (5 minutes)**

```bash
# 1. Navigate to jenkins directory
cd jenkins

# 2. Make setup script executable
chmod +x setup.sh

# 3. Run automated setup (RECOMMENDED — easiest)
./setup.sh

# OR manually start (if you prefer):
docker-compose -f docker-compose-jenkins.yml up -d

# 4. Wait for services to be healthy
docker-compose -f docker-compose-jenkins.yml ps
# Wait until you see "healthy" status (60-90 seconds)

# 5. View service URLs
echo ""
echo "✅ Jenkins:   http://localhost:8080"
echo "✅ SonarQube: http://localhost:9010"
echo "✅ PostgreSQL: localhost:5432 (backend only)"
```

**Expected output**:
```
CONTAINER NAME              STATUS
ai-ui-jenkins              healthy (8080)
ai-ui-sonarqube           healthy (9010)
ai-ui-sonarqube-db        healthy (5432)
```

---

### **PHASE 3: Configure Jenkins (10 minutes)**

#### **3.1: Open Jenkins**
- Go to: http://localhost:8080
- Login: `admin` / `admin`

#### **3.2: Install Required Plugins**
1. Click **Manage Jenkins** (left sidebar)
2. Click **Manage Plugins**
3. Click **Available** tab
4. Search and **install** these plugins:
   ```
   ✓ Blue Ocean
   ✓ Pipeline: Stage View
   ✓ Git
   ✓ Timestamper
   ✓ AnsiColor
   ✓ Docker
   ✓ Docker Pipeline
   ✓ SonarQube Scanner
   ✓ Maven Integration
   ```

5. Click **Install without restart** or **Restart when complete**
6. Wait for installation (2-3 minutes)

#### **3.3: Create SonarQube Token**
1. Open SonarQube: http://localhost:9010
2. Login: `admin` / `admin`
3. Click your **avatar** (top right) → **My Account** → **Security**
4. Click **Generate Tokens**
   - **Name**: `jenkins-ci`
   - Click **Generate**
5. **Copy the token** (you'll need it next)
   ```
   Example: squ_1234567890abcdefghijklmnop
   ```

#### **3.4: Add SonarQube Server in Jenkins**
1. Go back to Jenkins: http://localhost:8080
2. Click **Manage Jenkins** → **Configure System**
3. Scroll down to **SonarQube Servers**
4. Click **Add SonarQube**
   ```
   Name:                    SonarQube-Server
   Server URL:              http://sonarqube:9000
   Server Auth Token:       <paste your token>
   ```
5. Click **Save**

#### **3.5: Add Credentials**
1. Click **Manage Jenkins** → **Credentials**
2. Click **System** → **Global Credentials**
3. Click **Add Credentials**
   ```
   Kind:          Secret text
   Secret:        <paste your SonarQube token>
   ID:            sonar-token
   Description:   SonarQube Analysis Token
   Scope:         Global
   ```
4. Click **Create**

---

### **PHASE 4: Create Pipeline Job (5 minutes)**

1. Go to Jenkins home: http://localhost:8080
2. Click **New Item** (left sidebar)
3. Enter name: `ai-ui-generator`
4. Select: **Pipeline**
5. Click **OK**

#### **Configure Pipeline:**
```
In the Pipeline section:

Definition:        Pipeline script from SCM
SCM:               Git
  Repository URL:  https://github.com/YOUR-USERNAME/YOUR-REPO.git
  Branch:          */main
  Script Path:     Jenkinsfile

Build Triggers:
  ✓ GitHub hook trigger for GITScm polling
  (or GitLab push events if using GitLab)

Poll SCM:
  (Optional) H/15 * * * *   ← polls every 15 minutes
```

7. Click **Save**

---

### **PHASE 5: Configure Git Webhook (5 minutes)**

#### **If using GitHub:**
1. Go to your GitHub repository
2. Settings → **Webhooks** → **Add webhook**
   ```
   Payload URL:   http://your-jenkins-domain:8080/github-webhook/
   Content type:  application/json
   Events:
     ✓ Push events
     ✓ Pull requests
   Active:        ✓
   ```
3. Click **Add webhook**

#### **If using GitLab:**
1. Go to your GitLab repository
2. Settings → **Webhooks**
   ```
   URL:       http://your-jenkins-domain:8080/gitlab-webhook/
   Triggers:
     ✓ Push events
     ✓ Merge request events
   Active:    ✓
   ```
3. Click **Add webhook**

---

### **PHASE 6: Test First Build (5 minutes)**

#### **Option A: Automatic (via Git)**
```bash
# Make empty commit to trigger webhook
git commit --allow-empty -m "trigger jenkins build"
git push origin main

# Jenkins should start building within 15 seconds
# Go to: http://localhost:8080 → ai-ui-generator → watch build
```

#### **Option B: Manual (in Jenkins UI)**
1. Go to: http://localhost:8080
2. Click on **ai-ui-generator** job
3. Click **Build with Parameters**
4. Select:
   - `BUILD_TYPE`: `FULL`
   - `RUN_SONARQUBE`: ✓ checked
   - `PUSH_DOCKER`: ☐ unchecked
5. Click **Build**

#### **Monitor Build:**
```
Method 1 (Modern UI):
http://localhost:8080 → Click "Open Blue Ocean"
→ Watch real-time pipeline progression

Method 2 (Classic UI):
http://localhost:8080 → ai-ui-generator → Latest build → Console
→ Scroll to see logs
```

---

### **PHASE 7: Verify SonarQube Results (2 minutes)**

1. After build completes, go to: http://localhost:9010
2. Click **Projects**
3. You should see 3 new projects:
   ```
   ✓ ai-ui-generator-frontend
   ✓ ai-ui-generator-backend
   ✓ ai-ui-generator-fastapi
   ```
4. Click each project to view:
   - Code issues
   - Bugs found
   - Code coverage
   - Duplications
   - Security vulnerabilities

---

### **PHASE 8: Optional — Change Default Passwords (2 minutes)**

⚠️ **FOR PRODUCTION ONLY** — Development is fine with defaults

#### **Jenkins:**
1. http://localhost:8080 → **Manage Jenkins** → **Manage Users**
2. Click **admin** → **Configure**
3. Set new password → **Save**

#### **SonarQube:**
1. http://localhost:9010 → Click avatar → **My Account**
2. Click **Security** → **Change password**
3. Enter new password → **Save**

---

## 📊 EXPECTED TIMELINE

| Phase | Task | Time | ✅ Status |
|-------|------|------|----------|
| 1 | Commit files | 5 min | Ready |
| 2 | Start services | 2 min | Ready |
| 3 | Configure Jenkins | 10 min | Ready |
| 4 | Create job | 5 min | Ready |
| 5 | Setup webhook | 5 min | Ready |
| 6 | Test build | 5 min | Ready |
| 7 | Check SonarQube | 2 min | Ready |
| 8 | Secure (optional) | 2 min | Ready |
| **TOTAL** | | **~35 minutes** | |

---

## 🚨 WHAT IF SOMETHING GOES WRONG?

### **Jenkins won't start**
```bash
# Check logs
docker-compose -f docker-compose-jenkins.yml logs jenkins | tail -50

# Port 8080 in use?
lsof -i :8080
kill -9 <PID>

# Full restart
docker-compose -f docker-compose-jenkins.yml down
docker-compose -f docker-compose-jenkins.yml up -d
```

### **SonarQube returns 503 error**
```bash
# It's still starting (takes 2-3 minutes)
docker-compose -f docker-compose-jenkins.yml logs sonarqube | grep -i "started"

# Wait and refresh browser in 30 seconds

# If still failing
docker-compose -f docker-compose-jenkins.yml down -v
docker-compose -f docker-compose-jenkins.yml up -d
```

### **Build fails with "Jenkinsfile not found"**
```bash
# Ensure Jenkinsfile exists in repo root
ls -la Jenkinsfile

# Not there? Stage and commit it
git add Jenkinsfile
git commit -m "Add Jenkinsfile"
git push origin main

# Retry build
```

### **"Maven not found" error**
```bash
# Tools are pre-installed in Jenkins LTS image
# Try rebuilding Jenkins image
docker-compose -f docker-compose-jenkins.yml build --no-cache jenkins
docker-compose -f docker-compose-jenkins.yml up -d
```

---

## ✅ SUCCESS CHECKLIST

After completing all 8 phases, verify:

- [ ] All Jenkins files committed to Git
- [ ] Jenkins running: http://localhost:8080 ✅
- [ ] SonarQube running: http://localhost:9010 ✅
- [ ] 9+ plugins installed in Jenkins
- [ ] SonarQube server configured in Jenkins
- [ ] Credentials `sonar-token` created
- [ ] Pipeline job `ai-ui-generator` created
- [ ] Git webhook configured
- [ ] First build triggered successfully
- [ ] SonarQube shows 3 projects
- [ ] Build logs visible in console
- [ ] No timeouts or connection errors

---

## 🎯 WHAT'S NEXT AFTER SUCCESS?

1. **Run builds regularly**
   - Every time you push to `main`
   - Check SonarQube for quality metrics
   - Monitor Jenkins pipeline

2. **Fine-tune parameters**
   - Try `BUILD_TYPE=FRONTEND_ONLY` for quick tests
   - Set `RUN_SONARQUBE=false` to skip analysis if in hurry

3. **Add email notifications**
   - Configure SMTP in Jenkins
   - Get alerts on build failures

4. **Set quality gates**
   - SonarQube → Projects → Quality Gates
   - Block merges if quality issues found

5. **Scale to production**
   - Use HTTPS
   - Configure LDAP/SSO
   - Setup regular backups

---

## 📞 NEED HELP?

If you get stuck at any phase:

1. **Check logs**:
   ```bash
   docker-compose -f jenkins/docker-compose-jenkins.yml logs <service_name>
   ```

2. **Read detailed guide**:
   ```bash
   cat jenkins/SETUP_GUIDE.md
   ```

3. **Check Jenkinsfile**:
   ```bash
   cat Jenkinsfile | grep stage
   ```

4. **Restart everything**:
   ```bash
   docker-compose -f jenkins/docker-compose-jenkins.yml down
   docker-compose -f jenkins/docker-compose-jenkins.yml up -d
   ```

---

**Ready to start?** → Run **PHASE 1** now! 🚀
