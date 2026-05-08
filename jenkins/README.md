# Jenkins + SonarQube CI/CD Pipeline

Complete CI/CD setup replacing GitHub Actions with Jenkins and SonarQube for the AI UI Generator project.

## 📦 What's Included

- **Jenkinsfile** — Multi-stage declarative pipeline for all 3 services
- **Docker Compose** — Jenkins + SonarQube + PostgreSQL stack
- **Configuration as Code** — Jenkins JCasC (jenkins-casc.yaml)
- **Setup Scripts** — Automated installation and configuration
- **Setup Guide** — Complete step-by-step instructions

## 🚀 Quick Start (3 Steps)

### 1. Start Services

```bash
cd jenkins
# Use the compose file for Jenkins only
docker-compose -f docker-compose-jenkins.yml up -d

# OR use the full stack (includes all services)
cd ..
docker-compose -f docker-compose-full-ci.yml up -d
```

### 2. Access Jenkins & Configure

- **Jenkins**: http://localhost:8080 (admin / admin)
- **SonarQube**: http://localhost:9010 (admin / admin)
- Follow **SETUP_GUIDE.md** for detailed configuration

### 3. Create Pipeline Job

1. Jenkins → New Item → **ai-ui-generator**
2. Pipeline → **Pipeline script from SCM**
3. Git repository URL → **Script Path: Jenkinsfile**
4. Save and trigger build

## 📁 File Structure

```
jenkins/
├── docker-compose-jenkins.yml      # Jenkins + SonarQube containers
├── jenkins-casc.yaml               # Jenkins Configuration as Code
├── SETUP_GUIDE.md                  # Complete step-by-step guide
├── setup.sh                        # Automated setup script
└── scripts/
    └── install-plugins.sh          # Plugin installation script

Jenkinsfile                        # Pipeline definition (root)
docker-compose-full-ci.yml        # Full stack with all services
```

## 📊 Pipeline Stages

**Jenkinsfile** supports:

1. **Checkout** — Clone repository
2. **Frontend Build** — npm install, TypeScript check, test, build
3. **Frontend SonarQube** — Code quality analysis
4. **Backend Build** — Maven build, test, checkstyle
5. **Backend SonarQube** — Code quality + coverage analysis
6. **Backend Security** — OWASP dependency check
7. **FastAPI Build** — pip install, pytest
8. **FastAPI SonarQube** — Python code analysis
9. **Docker Build** — Build frontend, backend, fastapi images
10. **Docker Push** — Push to registry (optional)
11. **Archive Artifacts** — Store JAR, dist, test reports

## 🎯 Key Features

✅ **Multi-pipeline** — Parallel builds for frontend, backend, FastAPI
✅ **SonarQube integration** — Automatic code quality gates
✅ **Security scanning** — OWASP dependency check
✅ **Artifact management** — Automated archiving
✅ **Docker support** — Build and push container images
✅ **Flexible parameters** — Choose what to build
✅ **Configuration as Code** — Infrastructure as code with JCasC
✅ **Email notifications** — Failure/success alerts
✅ **Blue Ocean UI** — Modern pipeline visualization

## 🔑 Configuration

### Environment Variables

Create `.env` file:

```env
# SonarQube
SONAR_TOKEN=squ_xxxxxxxxxxxxxxxxxxxx

# GitHub/GitLab webhooks
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# Docker Registry
DOCKER_USERNAME=your_username
DOCKER_PASSWORD=your_password

# Email
MAIL_USERNAME=mailtrap_user
MAIL_PASSWORD=mailtrap_pass
```

Then load in docker-compose:

```yaml
services:
  jenkins:
    env_file: .env
```

### SonarQube Integration

1. Create SonarQube token: http://localhost:9010 → Account → Security
2. Add credentials in Jenkins: Manage Jenkins → Credentials
3. Projects auto-created:
   - `ai-ui-generator-frontend`
   - `ai-ui-generator-backend`
   - `ai-ui-generator-fastapi`

### Git Webhooks

**GitHub**:
```
Webhook URL: http://jenkins-domain:8080/github-webhook/
Events: Push events, Pull requests
```

**GitLab**:
```
Webhook URL: http://jenkins-domain:8080/gitlab-webhook/
Triggers: Push events, Merge requests
```

## 📈 Build Parameters

| Parameter | Values | Default | Use Case |
|-----------|--------|---------|----------|
| `BUILD_TYPE` | FULL, FRONTEND_ONLY, BACKEND_ONLY, FASTAPI_ONLY | FULL | Choose scope |
| `RUN_SONARQUBE` | true/false | true | Quality checks |
| `PUSH_DOCKER` | true/false | false | Registry push |

## 📋 Jenkinsfile Reference

### Stage Conditions

```groovy
// Frontend only
when {
    expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FRONTEND_ONLY' }
}

// SonarQube optional
when {
    expression {
        params.BUILD_TYPE == 'FULL' &&
        params.RUN_SONARQUBE == true
    }
}

// Docker push optional
when {
    expression {
        params.BUILD_TYPE == 'FULL' && params.PUSH_DOCKER == true
    }
}
```

### Environment Variables in Pipeline

```groovy
environment {
    SONAR_HOST_URL = 'http://sonarqube:9000'
    REGISTRY = 'docker.io'
    GIT_BRANCH = "${GIT_BRANCH}"
}
```

## 🔧 Customization Examples

### Add Slack Notifications

```groovy
post {
    success {
        sh '''
            curl -X POST -H 'Content-type: application/json' \\
                --data '{"text":"✅ Build ${BUILD_NUMBER} succeeded"}' \\
                YOUR_SLACK_WEBHOOK_URL
        '''
    }
    failure {
        sh '''
            curl -X POST -H 'Content-type: application/json' \\
                --data '{"text":"❌ Build ${BUILD_NUMBER} failed"}' \\
                YOUR_SLACK_WEBHOOK_URL
        '''
    }
}
```

### Add Performance Tests

```groovy
stage('Performance Testing') {
    steps {
        sh '''
            cd frontend
            npm run performance-test
        '''
    }
}
```

### Add Integration Tests

```groovy
stage('Integration Tests') {
    steps {
        sh '''
            docker-compose -f docker-compose-test.yml up -d
            sleep 10
            cd spring-bff
            mvn failsafe:integration-test
            docker-compose -f docker-compose-test.yml down
        '''
    }
}
```

## 🐛 Troubleshooting

### "port 8080 is already in use"

```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>

# Or use different port
docker run -p 9090:8080 jenkins/jenkins:lts-jdk17
```

### "SonarQube not responding"

```bash
# Check database
docker logs ai-ui-sonarqube-db

# Rebuild SonarQube
docker-compose -f docker-compose-jenkins.yml down -v
docker-compose -f docker-compose-jenkins.yml up -d
```

### "Maven/Node not found"

```bash
# Install tools in Jenkins container
docker exec ai-ui-jenkins apt-get update
docker exec ai-ui-jenkins apt-get install -y maven nodejs npm python3
```

### "Jenkinsfile not found"

```bash
# Ensure Jenkinsfile exists in repository root
git add Jenkinsfile
git commit -m "Add Jenkinsfile"
git push

# Or during job creation, specify correct path
Script Path: ./Jenkinsfile
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| **SETUP_GUIDE.md** | Complete step-by-step configuration guide |
| **Jenkinsfile** | Pipeline definition with all stages |
| **docker-compose-jenkins.yml** | Jenkins + SonarQube containers |
| **jenkins-casc.yaml** | Jenkins Configuration as Code |
| **setup.sh** | Automated setup script |

## 🔐 Production Checklist

- ✅ Change default passwords (admin/admin)
- ✅ Enable HTTPS with reverse proxy (Nginx/Apache)
- ✅ Use external secrets manager (Vault, AWS Secrets Manager)
- ✅ Configure Jenkins Security Realm (LDAP, Keycloak, SAML)
- ✅ Backup Jenkins home directory
- ✅ Set resource limits for containers
- ✅ Configure Jenkins → System → Location with domain name
- ✅ Test disaster recovery procedures
- ✅ Monitor CPU, memory, disk usage
- ✅ Set up log aggregation (ELK, Splunk)

## 📞 Support & Resources

- [Jenkins Official Documentation](https://www.jenkins.io/doc/)
- [Declarative Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [SonarQube Analysis Parameters](https://docs.sonarqube.org/latest/analysis/analysis-parameters/)
- [Docker in Docker Setup](https://www.jenkins.io/doc/book/installing-jenkins/docker/#docker-in-docker-dind)

## 📝 License

Same as AI UI Generator project

---

**Created**: 2026-05-08
**Updated**: 2026-05-08
**Status**: Production Ready
