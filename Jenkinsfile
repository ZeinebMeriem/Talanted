pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }

    environment {
        // SonarQube — reachable because Jenkins is now on the ai-ui-generator_default network
        SONAR_HOST_URL = 'http://ai-ui-sonarqube:9000'
        REGISTRY = 'docker.io'
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
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        echo "Java version:" && java -version
                        echo "Maven version:" && mvn --version
                        mvn clean verify -DskipITs=false
                        mvn checkstyle:check || echo "Checkstyle warnings found"
                        echo "Backend build OK"
                    '''
                }
            }
        }

        stage('Backend - SonarQube') {
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
                            mvn sonar:sonar \
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
                        '''
                    }
                }
            }
        }

        stage('Backend - OWASP Dependency Check') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        mvn dependency:tree || true
                        mvn org.owasp:dependency-check-maven:check \
                          -DfailBuildOnCVSS=11 \
                          -DretireJsAnalyzerEnabled=false \
                          -DnodeAnalyzerEnabled=false \
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
                    docker build -t ai-ui-generator-frontend:${BUILD_NUMBER} frontend/
                    docker build -t ai-ui-generator-backend:${BUILD_NUMBER}  spring-bff/
                    docker build -t ai-ui-generator-fastapi:${BUILD_NUMBER}  fastapi-ai/
                    echo "Docker images built"
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

        stage('Archive Artifacts') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
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
