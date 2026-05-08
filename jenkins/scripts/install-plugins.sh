#!/bin/bash
# Jenkins plugins installer script
# This runs in the Jenkins container during startup

set -e

JENKINS_CLI_JAR="/usr/share/jenkins/jenkins-cli.jar"
JENKINS_USER="admin"
JENKINS_PASSWORD="admin"
JENKINS_URL="http://localhost:8080"

# Function to wait for Jenkins to be ready
wait_for_jenkins() {
    local max_retries=30
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if curl -s "${JENKINS_URL}/api/json" > /dev/null 2>&1; then
            echo "✅ Jenkins is ready"
            return 0
        fi
        echo "⏳ Waiting for Jenkins... ($retry/$max_retries)"
        sleep 2
        retry=$((retry + 1))
    done
    echo "❌ Jenkins failed to start"
    return 1
}

# Wait for Jenkins
wait_for_jenkins

# Install required plugins
echo "📦 Installing Jenkins plugins..."

PLUGINS=(
    "blueocean:latest"
    "pipeline-stage-view:latest"
    "git:latest"
    "timestamper:latest"
    "ansicolor:latest"
    "sonarqube-generic-coverage:latest"
    "cloudbees-bitbucket-cloud-integration:latest"
    "docker:latest"
    "docker-pipeline:latest"
    "echarts-api:latest"
    "performance:latest"
    "htmlpublisher:latest"
    "junit:latest"
    "xunit:latest"
    "jacoco:latest"
    "maven-plugin:latest"
    "msbuild:latest"
)

for plugin in "${PLUGINS[@]}"; do
    echo "Installing: $plugin"
    java -jar "${JENKINS_CLI_JAR}" -s "${JENKINS_URL}" \
        -auth "${JENKINS_USER}:${JENKINS_PASSWORD}" \
        install-plugin "$plugin" || echo "⚠️ Warning: Could not install $plugin"
done

# Restart Jenkins to load plugins
echo "🔄 Restarting Jenkins..."
java -jar "${JENKINS_CLI_JAR}" -s "${JENKINS_URL}" \
    -auth "${JENKINS_USER}:${JENKINS_PASSWORD}" \
    safe-restart || true

echo "✅ Jenkins plugins installation complete"
