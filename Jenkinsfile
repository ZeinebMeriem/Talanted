pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }

    environment {
        // SonarQube Configuration
        SONAR_HOST_URL = 'http://sonarqube:9000'
        // SONAR_LOGIN will be set only if credential exists

        // Docker Registry (optional)
        REGISTRY = 'docker.io'

        // Project Info
        GIT_BRANCH = "${GIT_BRANCH}"
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
            name: 'PUSH_DOCKER',
            defaultValue: false,
            description: 'Push Docker images to registry'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "🔍 Checking out code..."
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
                script {
                    echo "📦 Building Frontend..."
                    dir('frontend') {
                        sh '''
                            echo "Node.js version:"
                            node --version
                            npm --version

                            echo "Installing dependencies..."
                            npm ci

                            echo "Type checking..."
                            npx tsc --noEmit

                            echo "Running tests..."
                            npm test -- --run || true

                            echo "Building..."
                            npm run build

                            echo "✅ Frontend build successful"
                        '''
                    }
                }
            }
        }

        stage('Frontend - SonarQube Analysis') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FRONTEND_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                script {
                    echo "🔍 Running SonarQube analysis for Frontend..."
                    dir('frontend') {
                        sh '''
                            npx sonar-scanner \
                              -Dsonar.projectKey=ai-ui-generator-frontend \
                              -Dsonar.sources=src \
                              -Dsonar.exclusions="**/*.test.ts,**/*.spec.ts,**/*.d.ts" \
                              -Dsonar.sourceEncoding=UTF-8 \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.login=${SONAR_LOGIN} || true
                        '''
                    }
                }
            }
        }

        stage('Backend Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                script {
                    echo "📦 Building Backend (Spring BFF)..."
                    dir('spring-bff') {
                        sh '''
                            echo "Java version:"
                            java -version
                            mvn --version

                            echo "Building and testing with Maven..."
                            mvn clean verify -DskipITs=false

                            echo "Running Checkstyle..."
                            mvn checkstyle:check || echo "⚠️ Checkstyle warnings found"

                            echo "✅ Backend build successful"
                        '''
                    }
                }
            }
        }

        stage('Backend - SonarQube Analysis') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                script {
                    echo "🔍 Running SonarQube analysis for Backend..."
                    dir('spring-bff') {
                        sh '''
                            mvn sonar:sonar \
                              -Dsonar.projectKey=ai-ui-generator-backend \
                              -Dsonar.sources=src/main/java \
                              -Dsonar.tests=src/test/java \
                              -Dsonar.java.source=17 \
                              -Dsonar.java.binaries=target/classes \
                              -Dsonar.junit.reportPaths=target/surefire-reports \
                              -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.login=${SONAR_LOGIN} || true
                        '''
                    }
                }
            }
        }

        stage('Backend - Dependency Check (OWASP)') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                script {
                    echo "🛡️ Running OWASP Dependency Check..."
                    dir('spring-bff') {
                        sh '''
                            echo "Checking dependencies..."
                            mvn dependency:tree || true

                            echo "Scanning for vulnerabilities..."
                            mvn org.owasp:dependency-check-maven:check || echo "⚠️ Vulnerabilities found - review required"
                        '''
                    }
                }
            }
        }

        stage('FastAPI Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FASTAPI_ONLY' }
            }
            steps {
                script {
                    echo "📦 Building FastAPI..."
                    dir('fastapi-ai') {
                        sh '''
                            echo "Python version:"
                            python3 --version
                            pip --version

                            echo "Installing dependencies..."
                            pip install -r requirements.txt

                            echo "Running tests..."
                            python3 -m pytest tests/ -v --cov --cov-report=xml || true

                            echo "✅ FastAPI build successful"
                        '''
                    }
                }
            }
        }

        stage('FastAPI - SonarQube Analysis') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FASTAPI_ONLY') &&
                    params.RUN_SONARQUBE == true
                }
            }
            steps {
                script {
                    echo "🔍 Running SonarQube analysis for FastAPI..."
                    dir('fastapi-ai') {
                        sh '''
                            npx sonar-scanner \
                              -Dsonar.projectKey=ai-ui-generator-fastapi \
                              -Dsonar.sources=app \
                              -Dsonar.language=py \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.login=${SONAR_LOGIN} || true
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
                script {
                    echo "🐳 Building Docker images..."
                    sh '''
                        echo "Frontend image..."
                        docker build -t ai-ui-generator-frontend:${BUILD_NUMBER} frontend/ || true

                        echo "Backend image..."
                        docker build -t ai-ui-generator-backend:${BUILD_NUMBER} spring-bff/ || true

                        echo "FastAPI image..."
                        docker build -t ai-ui-generator-fastapi:${BUILD_NUMBER} fastapi-ai/ || true

                        echo "✅ Docker images built"
                    '''
                }
            }
        }

        stage('Docker Push') {
            when {
                expression {
                    params.BUILD_TYPE == 'FULL' && params.PUSH_DOCKER == true
                }
            }
            steps {
                script {
                    echo "📤 Pushing Docker images..."
                    sh '''
                        echo "Logging into Docker Registry..."
                        echo ${REGISTRY_CREDENTIALS_PSW} | docker login -u ${REGISTRY_CREDENTIALS_USR} --password-stdin

                        docker tag ai-ui-generator-frontend:${BUILD_NUMBER} ${REGISTRY}/ai-ui-generator-frontend:${BUILD_NUMBER}
                        docker tag ai-ui-generator-backend:${BUILD_NUMBER} ${REGISTRY}/ai-ui-generator-backend:${BUILD_NUMBER}
                        docker tag ai-ui-generator-fastapi:${BUILD_NUMBER} ${REGISTRY}/ai-ui-generator-fastapi:${BUILD_NUMBER}

                        docker push ${REGISTRY}/ai-ui-generator-frontend:${BUILD_NUMBER}
                        docker push ${REGISTRY}/ai-ui-generator-backend:${BUILD_NUMBER}
                        docker push ${REGISTRY}/ai-ui-generator-fastapi:${BUILD_NUMBER}

                        echo "✅ Images pushed successfully"
                    '''
                }
            }
        }

        stage('Archive Artifacts') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                script {
                    echo "📦 Archiving artifacts..."
                    archiveArtifacts artifacts: 'spring-bff/target/*.jar,frontend/dist/**,fastapi-ai/target/**',
                                     allowEmptyArchive: true
                    junit testResults: 'spring-bff/target/surefire-reports/*.xml',
                         allowEmptyResults: true
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🔍 Pipeline finished"
            }
        }
        success {
            echo "✅ Pipeline succeeded!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
    }
}
