# Jenkins + SonarQube Setup Guide

Complete guide to replace GitHub Actions with Jenkins and SonarQube for the AI UI Generator project.

---

## 📋 Prerequisites

- Docker & Docker Compose (v20.10+)
- Git repository with Jenkinsfile in root
- Minimum 4GB RAM available for containers
- Ports available: 8080 (Jenkins), 9010 (SonarQube), 5432 (PostgreSQL)

---

## 🚀 Quick Start

### Step 1: Start Jenkins + SonarQube

```bash
# Navigate to jenkins directory
cd jenkins

# Start services using the new docker-compose file
docker-compose -f docker-compose-jenkins.yml up -d

# Wait for services to be healthy (60-90 seconds)
docker-compose -f docker-compose-jenkins.yml ps

# Check logs
docker-compose -f docker-compose-jenkins.yml logs -f jenkins
docker-compose -f docker-compose-jenkins.yml logs -f sonarqube
```

### Step 2: Access Jenkins

**URL**: http://localhost:8080

**Default Credentials**:
- Username: `admin`
- Password: `admin`

> ⚠️ **Change default password immediately in production**

### Step 3: Access SonarQube

**URL**: http://localhost:9010

**Default Credentials**:
- Username: `admin`
- Password: `admin`

---

## 🔧 Jenkins Configuration

### 1. Install Required Plugins

**Method A: Manual (Quick)**

1. Go to **Manage Jenkins** → **Manage Plugins** → **Available**
2. Search and install these plugins:
   - Blue Ocean
   - Pipeline: Stage View
   - Git
   - Timestamper
   - AnsiColor
   - Docker
   - Docker Pipeline
   - SonarQube Scanner
   - Maven Integration
   - Email Extension
   - JUnit Plugin
   - Jacoco

3. Restart Jenkins: **Manage Jenkins** → **Restart Jenkins**

**Method B: Automated (Recommended)**

```bash
# Make script executable
chmod +x jenkins/scripts/install-plugins.sh

# Run from Jenkins container
docker exec ai-ui-jenkins bash /var/jenkins_home/jenkins-config/scripts/install-plugins.sh
```

### 2. Configure SonarQube Integration

#### 2a. Create SonarQube Token

1. Login to SonarQube: http://localhost:9010
2. Go to **Account** → **Security** → **Generate Tokens**
3. Create token named: `jenkins-ci`
4. Copy token value (you'll need it)

#### 2b. Add SonarQube Server in Jenkins

1. Go to **Manage Jenkins** → **Configure System**
2. Find **SonarQube Servers** section
3. Click **Add SonarQube**
   - **Name**: `SonarQube-Server`
   - **Server URL**: `http://sonarqube:9000`
   - **Server Authentication Token**: (paste your token)
4. **Save**

### 3. Create Pipeline Credentials

1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global Credentials**
2. Click **Add Credentials** and create these:

#### SonarQube Token
```
Kind: Secret text
Secret: <paste your SonarQube token>
ID: sonar-token
Description: SonarQube Analysis Token
```

#### GitHub Token (if using GitHub)
```
Kind: Secret text
Secret: <your GitHub PAT>
ID: github-token
Description: GitHub Personal Access Token
Scope: Global
```

#### GitLab Token (if using GitLab)
```
Kind: Secret text
Secret: <your GitLab PAT>
ID: gitlab-token
Description: GitLab Personal Access Token
Scope: Global
```

#### Docker Registry (if pushing images)
```
Kind: Username with password
Username: <your Docker username>
Password: <your Docker password>
ID: docker-registry
Description: Docker Registry Credentials
Scope: Global
```

---

## 📝 Create Jenkins Pipeline Job

### Method A: Declarative Pipeline (Recommended)

1. Click **New Item** on Jenkins home
2. Enter name: `ai-ui-generator`
3. Select **Pipeline**
4. Click **OK**

#### In the Pipeline section:

```
Definition: Pipeline script from SCM
SCM: Git
  Repository URL: <your git repo URL>
  Branch: */main
  Script Path: Jenkinsfile
```

5. Scroll down → **Build Triggers**
   - ✅ **GitHub hook trigger for GITScm polling** (if using GitHub)
   - ✅ **GitLab push events** (if using GitLab)
   - ✅ **Poll SCM**: `H/15 * * * *` (every 15 minutes)

6. **Save**

### Method B: Multibranch Pipeline (Enterprise)

1. Click **New Item**
2. Select **Multibranch Pipeline**
3. **Branch Sources** → **Add source** → **Git**
   - **Project Repository**: `<your repo URL>`
   - **Credentials**: (select the appropriate credentials)
4. **Build Configuration** → **Mode**: `by Jenkinsfile`
5. **Save**

---

## 🔄 Git Webhook Setup

### For GitHub

1. Go to your GitHub repository
2. **Settings** → **Webhooks** → **Add webhook**
3. **Payload URL**: `http://your-jenkins-domain:8080/github-webhook/`
4. **Content type**: `application/json`
5. **Events**: Select "Push events" and "Pull requests"
6. **Save**

### For GitLab

1. Go to your GitLab repository
2. **Settings** → **Webhooks**
3. **URL**: `http://your-jenkins-domain:8080/gitlab-webhook/`
4. **Trigger**: Check "Push events" and "Merge request events"
5. **Save**

---

## 📊 SonarQube Project Setup

### Create Projects in SonarQube

1. Login to SonarQube: http://localhost:9010
2. Click **Create project** → **Manually**

#### Project 1: Frontend
```
Project key: ai-ui-generator-frontend
Project name: AI UI Generator - Frontend
Visibility: Public
```

#### Project 2: Backend
```
Project key: ai-ui-generator-backend
Project name: AI UI Generator - Backend
Visibility: Public
```

#### Project 3: FastAPI
```
Project key: ai-ui-generator-fastapi
Project name: AI UI Generator - FastAPI
Visibility: Public
```

3. For each project, keep the **project key** handy (used in Jenkinsfile)

---

## 🧪 Run First Build

### Option 1: Manual Trigger

1. Go to Jenkins home
2. Click **ai-ui-generator** job
3. Click **Build with Parameters**
4. Select parameters:
   - **BUILD_TYPE**: `FULL`
   - **RUN_SONARQUBE**: ✅ checked
   - **PUSH_DOCKER**: ⬜ unchecked
5. Click **Build**

### Option 2: Auto Trigger via Webhook

1. Push to main branch:
```bash
git add .
git commit -m "trigger jenkins build"
git push origin main
```

2. Jenkins should trigger automatically within 15 seconds

---

## 📈 Monitor Build Results

### Jenkins UI

1. **Blue Ocean** (Modern UI): Click **Open Blue Ocean** on job page
2. **Classic UI**: Click job → **Build History** → Click build number

### SonarQube Results

1. Go to **Projects** → Select project
2. View:
   - **Code Quality** (issues, bugs, vulnerabilities)
   - **Coverage** (if JaCoCo/Coverage reports configured)
   - **Duplications**
   - **Maintainability Rating**

---

## 🔌 Environment Variables

Create a `.env` file for Jenkins container (optional, for sensitive data):

```env
# SonarQube
SONAR_TOKEN=squ_xxxxxxxxxxxxxxxxxxxx

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# GitLab (optional)
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# Docker Registry
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password

# Email Notifications
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password

# Git SSH Key (optional)
GIT_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----\n..."
```

Then load in docker-compose:

```yaml
services:
  jenkins:
    env_file: .env
```

---

## 🐛 Troubleshooting

### Jenkins not starting

```bash
# Check logs
docker-compose -f docker-compose-jenkins.yml logs jenkins

# Verify port 8080 is free
netstat -tuln | grep 8080

# Rebuild container
docker-compose -f docker-compose-jenkins.yml down
docker-compose -f docker-compose-jenkins.yml up -d --build
```

### SonarQube not responding

```bash
# Check PostgreSQL database
docker-compose -f docker-compose-jenkins.yml logs sonarqube-db

# Verify database connection
docker exec ai-ui-sonarqube-db psql -U sonar -d sonarqube -c "SELECT 1"

# Rebuild SonarQube
docker-compose -f docker-compose-jenkins.yml down -v
docker-compose -f docker-compose-jenkins.yml up -d
```

### SonarQube Analysis fails in Jenkins

1. **Verify token**: Go to SonarQube → Generate new token
2. **Update credentials**: Manage Jenkins → Credentials → Edit sonar-token
3. **Check network**: Ensure Jenkins container can reach SonarQube
   ```bash
   docker exec ai-ui-jenkins curl -v http://sonarqube:9000
   ```

### Maven/Node not found in Jenkinsfile

```bash
# Install in Jenkins container
docker exec ai-ui-jenkins apt-get update
docker exec ai-ui-jenkins apt-get install -y maven nodejs npm python3 python3-pip

# Or use pre-built Jenkins image with these tools
# Image: jenkins/jenkins:lts-jdk17 already includes Java + Maven
```

---

## 📋 Jenkinsfile Parameters Explained

The `Jenkinsfile` supports runtime parameters:

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| `BUILD_TYPE` | FULL, FRONTEND_ONLY, BACKEND_ONLY, FASTAPI_ONLY | N/A | Select what to build |
| `RUN_SONARQUBE` | true/false | true | Run SonarQube analysis |
| `PUSH_DOCKER` | true/false | false | Push images to registry |

**Example builds**:
- Quick frontend-only: `BUILD_TYPE=FRONTEND_ONLY`, `RUN_SONARQUBE=false`
- Full analysis: `BUILD_TYPE=FULL`, `RUN_SONARQUBE=true`
- Release build: `BUILD_TYPE=FULL`, `PUSH_DOCKER=true`

---

## 📧 Email Notifications

### Configure Email in Jenkins

1. **Manage Jenkins** → **Configure System**
2. Find **E-mail Notification** section
   - **SMTP server**: `smtp.mailtrap.io`
   - **SMTP port**: `2525`
   - **Use SMTP Authentication**: ✅
   - **User name**: (from Mailtrap)
   - **Password**: (from Mailtrap)
   - **Use TLS**: ✅
   - **SMTP TLS port**: `2525`

3. **Save**

### Add to Jenkinsfile

```groovy
post {
    failure {
        emailext(
            subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: """
                Build failed for ${env.JOB_NAME}
                Build URL: ${env.BUILD_URL}
                Failed stage: Check logs above
            """,
            to: "team@company.com,ci-alerts@company.com"
        )
    }
    success {
        emailext(
            subject: "Build Success: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: "Build ${env.BUILD_NUMBER} completed successfully",
            to: "devops@company.com"
        )
    }
}
```

---

## 🔐 Production Deployment Checklist

- ✅ Change default Jenkins `admin` password
- ✅ Enable LDAP/SSO authentication
- ✅ Configure backup strategy for workspace
- ✅ Set up HTTPS (use reverse proxy like Nginx)
- ✅ Store credentials in external vault (AWS Secrets Manager, HashiCorp Vault)
- ✅ Configure Jenkins → **Configure System** → **Location** with your domain
- ✅ Test disaster recovery (backup restore)
- ✅ Set resource limits in docker-compose
- ✅ Configure Jenkins → **Configure Global Security** → Set security realm
- ✅ Monitor Jenkins metrics (memory, CPU, disk)

---

## 📚 Next Steps

1. **Customize Jenkinsfile** for your environment
2. **Create additional pipeline jobs** for different branches
3. **Set up pipeline notifications** (Slack, Teams, etc.)
4. **Configure artifact retention** policy
5. **Implement blue/green deployment** stages
6. **Add security scanning** (SAST, DAST)
7. **Set up database backups** for SonarQube PostgreSQL
8. **Document CI/CD workflow** for your team

---

## 🔗 Useful Links

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Declarative Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [SonarQube Analysis Parameters](https://docs.sonarqube.org/latest/analysis/analysis-parameters/)
- [Docker-in-Docker (DinD) Setup](https://www.jenkins.io/doc/book/installing-jenkins/docker/#docker-in-docker-dind)
- [Blue Ocean Tutorial](https://www.jenkins.io/doc/book/blueocean/getting-started/)
