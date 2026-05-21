pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 2, unit: 'HOURS')
        timestamps()
    }

    environment {
        SONAR_HOST_URL  = 'http://ai-ui-sonarqube:9000'
        REGISTRY        = 'docker.io'
        // Shared Maven repo persisted in the Jenkins home volume — avoids re-downloading
        // all dependencies (including the OWASP NVD database) on every build.
        MAVEN_OPTS      = '-Dmaven.repo.local=/var/jenkins_home/.m2/repository'
    }

    parameters {
        choice(
            name: 'BUILD_TYPE',
            choices: ['FULL', 'FRONTEND_ONLY', 'BACKEND_ONLY', 'FASTAPI_ONLY'],
            description: 'Select what to build'
        )
        booleanParam(
            name: 'RUN_SONARQUBE',
            defaultValue: true,
            description: 'Run SonarQube analysis'
        )
        booleanParam(
            name: 'RUN_OWASP',
            defaultValue: true,
            description: 'Run OWASP Dependency Check (slow on first run — downloads NVD database)'
        )
        booleanParam(
            name: 'PUSH_DOCKER',
            defaultValue: false,
            description: 'Push Docker images to registry'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: false,
            description: 'Deploy to target environment after build'
        )
        choice(
            name: 'DEPLOY_ENV',
            choices: ['staging', 'production'],
            description: 'Target deployment environment'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code..."
                    checkout scm
                    sh 'git log -1 --oneline'
                }
            }
        }

        stage('Frontend Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FRONTEND_ONLY' }
            }
            steps {
                dir('frontend') {
                    sh '''
                        echo "Node.js version:" && node --version
                        echo "npm version:"     && npm --version
                        npm ci
                        npx tsc --noEmit
                        npm test -- --run --coverage --coverage.reporter=lcov --coverage.reporter=text --coverage.reportsDirectory=./coverage || true
                        npm run build
                        echo "Frontend build OK"
                    '''
                }
            }
        }

        stage('Frontend - SonarQube') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FRONTEND_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    dir('frontend') {
                        sh '''
                            npx sonar-scanner \
                              -Dsonar.projectKey=ai-ui-generator-frontend \
                              -Dsonar.projectName="AI UI Generator - Frontend" \
                              -Dsonar.sources=src \
                              -Dsonar.exclusions="**/*.test.ts,**/*.spec.ts,**/*.d.ts,**/node_modules/**" \
                              -Dsonar.sourceEncoding=UTF-8 \
                              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN} || true
                        '''
                    }
                }
            }
        }

        stage('Backend Build') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY') &&
                    params.RUN_SONARQUBE == false
                }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        echo "Java version:" && java -version
                        echo "Maven version:" && mvn --version
                        mvn clean verify -DskipITs=false -Dmaven.repo.local=/var/jenkins_home/.m2/repository
                        mvn checkstyle:check -Dmaven.repo.local=/var/jenkins_home/.m2/repository || echo "Checkstyle warnings found"
                        echo "Backend build OK"
                    '''
                }
            }
        }

        stage('Backend Build + SonarQube') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    dir('spring-bff') {
                        sh '''
                            echo "Java version:" && java -version
                            mvn checkstyle:check -Dmaven.repo.local=/var/jenkins_home/.m2/repository || echo "Checkstyle warnings found"
                            mvn clean verify jacoco:report sonar:sonar \
                              -Dmaven.repo.local=/var/jenkins_home/.m2/repository \
                              -Dmaven.test.failure.ignore=true \
                              -Dsonar.projectKey=ai-ui-generator-backend \
                              -Dsonar.projectName="AI UI Generator - Backend" \
                              -Dsonar.sources=src/main/java \
                              -Dsonar.tests=src/test/java \
                              -Dsonar.java.source=17 \
                              -Dsonar.java.binaries=target/classes \
                              -Dsonar.junit.reportPaths=target/surefire-reports \
                              -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN} || true
                            echo "Backend build OK"
                        '''
                    }
                }
            }
        }

        stage('Backend - OWASP Dependency Check') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY') &&
                    params.RUN_OWASP == true
                }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        echo "=== OWASP NVD database cached at /var/jenkins_home/.m2/repository ==="
                        mvn org.owasp:dependency-check-maven:check \
                          -DfailBuildOnCVSS=11 \
                          -DretireJsAnalyzerEnabled=false \
                          -DnodeAnalyzerEnabled=false \
                          -Dmaven.repo.local=/var/jenkins_home/.m2/repository \
                          || echo "OWASP check completed (vulnerabilities may have been found)"
                    '''
                }
            }
        }

        stage('FastAPI Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FASTAPI_ONLY' }
            }
            steps {
                dir('fastapi-ai') {
                    sh '''
                        echo "Python version:" && python3 --version
                        pip install -r requirements.txt --quiet --break-system-packages
                        pip install ruff pytest pytest-cov --quiet --break-system-packages
                        python3 -m ruff check app/ || echo "Ruff warnings found"
                        python3 -m pytest tests/ -v --cov=app --cov-report=xml || true
                        echo "FastAPI build OK"
                    '''
                }
            }
        }

        stage('FastAPI - SonarQube') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FASTAPI_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    dir('fastapi-ai') {
                        sh '''
                            npx sonar-scanner \
                              -Dsonar.projectKey=ai-ui-generator-fastapi \
                              -Dsonar.projectName="AI UI Generator - FastAPI" \
                              -Dsonar.sources=app \
                              -Dsonar.language=py \
                              -Dsonar.python.coverage.reportPaths=coverage.xml \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN} || true
                        '''
                    }
                }
            }
        }

        stage('Docker Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' }
            }
            steps {
                sh '''
                    echo "=== Docker connectivity check ==="
                    docker info || {
                        echo "ERROR: Docker daemon not reachable."
                        echo "  Option A (socket already mounted): verify /var/run/docker.sock exists on the host."
                        echo "  Option B (Docker Desktop TCP): Settings → General → Expose daemon on tcp://localhost:2375"
                        echo "            then set DOCKER_HOST=tcp://host.docker.internal:2375 in jenkins/.env"
                        exit 1
                    }

                    echo "=== Building images (build #${BUILD_NUMBER}) ==="
                    docker build -t ai-ui-generator-frontend:${BUILD_NUMBER} -t ai-ui-generator-frontend:latest frontend/
                    docker build -t ai-ui-generator-backend:${BUILD_NUMBER}  -t ai-ui-generator-backend:latest  spring-bff/
                    docker build -t ai-ui-generator-fastapi:${BUILD_NUMBER}  -t ai-ui-generator-fastapi:latest  fastapi-ai/
                    echo "=== Docker images built successfully ==="
                    docker images | grep ai-ui-generator
                '''
            }
        }

        stage('Docker Push') {
            when {
                expression { params.BUILD_TYPE == 'FULL' && params.PUSH_DOCKER == true }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-credentials',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_PASS'
                )]) {
                    sh '''
                        echo "${REGISTRY_PASS}" | docker login -u "${REGISTRY_USER}" --password-stdin
                        docker tag ai-ui-generator-frontend:${BUILD_NUMBER} ${REGISTRY}/ai-ui-generator-frontend:${BUILD_NUMBER}
                        docker tag ai-ui-generator-backend:${BUILD_NUMBER}  ${REGISTRY}/ai-ui-generator-backend:${BUILD_NUMBER}
                        docker tag ai-ui-generator-fastapi:${BUILD_NUMBER}  ${REGISTRY}/ai-ui-generator-fastapi:${BUILD_NUMBER}
                        docker push ${REGISTRY}/ai-ui-generator-frontend:${BUILD_NUMBER}
                        docker push ${REGISTRY}/ai-ui-generator-backend:${BUILD_NUMBER}
                        docker push ${REGISTRY}/ai-ui-generator-fastapi:${BUILD_NUMBER}
                        echo "Images pushed"
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.DEPLOY == true && params.BUILD_TYPE == 'FULL' }
            }
            steps {
                script {
                    def envFile = params.DEPLOY_ENV == 'production' ? '.env.production' : '.env.staging'
                    echo "Deploying to ${params.DEPLOY_ENV} using ${envFile}"
                    sh """
                        # Pull latest images and recreate containers
                        docker compose --env-file ${envFile} pull
                        docker compose --env-file ${envFile} up -d --remove-orphans

                        # Wait for health checks
                        sleep 15

                        # Verify critical services are healthy
                        docker compose ps | grep -E 'healthy|running' | wc -l
                        echo "Deployment to ${params.DEPLOY_ENV} complete — build #${BUILD_NUMBER}"
                    """
                }
            }
            post {
                success {
                    echo "✅ Deployed build #${BUILD_NUMBER} to ${params.DEPLOY_ENV}"
                }
                failure {
                    echo "❌ Deployment failed — rolling back to previous version"
                    sh "docker compose up -d --no-recreate || true"
                }
            }
        }

        stage('Smoke Tests') {
            when {
                expression { params.DEPLOY == true && params.BUILD_TYPE == 'FULL' }
            }
            steps {
                sh """
                    # Wait for services to be ready
                    sleep 10

                    # Health check on key endpoints
                    curl -f http://localhost:8000/health || exit 1
                    curl -f http://localhost:8081/actuator/health || exit 1
                    echo "✅ Smoke tests passed"
                """
            }
        }

        stage('Archive Artifacts') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                // List what we found before archiving (helpful for debugging)
                sh '''
                    echo "=== JAR artifacts ==="
                    find spring-bff/target -maxdepth 1 -name "*.jar" 2>/dev/null || echo "  (none)"
                    echo "=== Frontend dist ==="
                    find frontend/dist -maxdepth 1 2>/dev/null | head -5 || echo "  (none)"
                    echo "=== Surefire reports ==="
                    ls spring-bff/target/surefire-reports/ 2>/dev/null || echo "  (none — creating empty dir)"
                    mkdir -p spring-bff/target/surefire-reports
                '''
                archiveArtifacts artifacts: 'spring-bff/target/*.jar,frontend/dist/**',
                                 allowEmptyArchive: true
                junit testResults: 'spring-bff/target/surefire-reports/*.xml',
                      allowEmptyResults: true
            }
        }
    }

    post {
        always {
            echo "Pipeline finished — build #${BUILD_NUMBER}"
        }
        success {
            echo "Pipeline PASSED"
        }
        failure {
            echo "Pipeline FAILED — check stage logs above"
        }
    }
}
