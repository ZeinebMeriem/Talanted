#!/bin/bash

# Jenkins + SonarQube Setup Script
# This script automates the setup of Jenkins and SonarQube for the AI UI Generator

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Jenkins + SonarQube Setup for AI UI Generator          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker installed${NC}"
echo -e "${GREEN}✅ Docker Compose installed${NC}"

# Check available ports
echo -e "${YELLOW}🔌 Checking available ports...${NC}"

for port in 8080 9010 5432; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required ports are available${NC}"

# Create jenkins directory structure
echo -e "${YELLOW}📁 Creating Jenkins directory structure...${NC}"

mkdir -p jenkins/jenkins-config/shared-library
mkdir -p jenkins/scripts

echo -e "${GREEN}✅ Directory structure created${NC}"

# Start services
echo -e "${YELLOW}🚀 Starting Jenkins + SonarQube...${NC}"

if [ -f "docker-compose-jenkins.yml" ]; then
    echo "Found docker-compose-jenkins.yml"
    docker-compose -f docker-compose-jenkins.yml down --volumes 2>/dev/null || true
    docker-compose -f docker-compose-jenkins.yml up -d
else
    echo -e "${YELLOW}⚠️  docker-compose-jenkins.yml not found, skipping setup${NC}"
fi

echo -e "${GREEN}✅ Services started${NC}"

# Wait for services
echo -e "${YELLOW}⏳ Waiting for services to be healthy (this may take 2-3 minutes)...${NC}"

MAX_RETRIES=60
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    if docker-compose -f docker-compose-jenkins.yml ps | grep -q "healthy"; then
        HEALTHY_COUNT=$(docker-compose -f docker-compose-jenkins.yml ps | grep "healthy" | wc -l)
        if [ $HEALTHY_COUNT -ge 3 ]; then
            echo -e "${GREEN}✅ All services are healthy${NC}"
            break
        fi
    fi

    echo -n "."
    sleep 2
    RETRY=$((RETRY + 1))
done

echo
echo

# Display service information
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Services Started Successfully              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${GREEN}✅ Jenkins${NC}"
echo -e "   URL: ${YELLOW}http://localhost:8080${NC}"
echo -e "   User: ${YELLOW}admin${NC}"
echo -e "   Password: ${YELLOW}admin${NC}"
echo -e "   ⚠️  Change password immediately!"
echo

echo -e "${GREEN}✅ SonarQube${NC}"
echo -e "   URL: ${YELLOW}http://localhost:9010${NC}"
echo -e "   User: ${YELLOW}admin${NC}"
echo -e "   Password: ${YELLOW}admin${NC}"
echo -e "   ⚠️  Change password immediately!"
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "   1. Open Jenkins: http://localhost:8080"
echo -e "   2. Create SonarQube token in: http://localhost:9010 → Account → Security"
echo -e "   3. Configure Jenkins → Manage Jenkins → Manage Plugins"
echo -e "   4. Install required plugins (see SETUP_GUIDE.md)"
echo -e "   5. Add SonarQube server in Jenkins → Configure System"
echo -e "   6. Create pipeline job pointing to your Git repository with Jenkinsfile"
echo -e "   7. Configure Git Webhook to: http://your-jenkins:8080/github-webhook/"
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📚 Documentation:${NC}"
echo -e "   Full setup guide: ${YELLOW}jenkins/SETUP_GUIDE.md${NC}"
echo -e "   Jenkinsfile: ${YELLOW}Jenkinsfile${NC}"
echo -e "   Docker Compose: ${YELLOW}jenkins/docker-compose-jenkins.yml${NC}"
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🐛 Troubleshooting:${NC}"
echo -e "   View Jenkins logs:      ${YELLOW}docker-compose -f jenkins/docker-compose-jenkins.yml logs -f jenkins${NC}"
echo -e "   View SonarQube logs:    ${YELLOW}docker-compose -f jenkins/docker-compose-jenkins.yml logs -f sonarqube${NC}"
echo -e "   Stop services:          ${YELLOW}docker-compose -f jenkins/docker-compose-jenkins.yml down${NC}"
echo -e "   Restart services:       ${YELLOW}docker-compose -f jenkins/docker-compose-jenkins.yml restart${NC}"
echo

echo -e "${GREEN}✅ Setup complete!${NC}"
echo
