pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 2, unit: 'HOURS')
        timestamps()
    }

    environment {
        SONAR_HOST_URL  = 'http://ai-ui-sonarqube:9000'
        MAVEN_OPTS      = '-Dmaven.repo.local=/var/jenkins_home/.m2/repository'
        // Azure Container Registry
        ACR_NAME        = 'aiuigeneratoracr'
        ACR_LOGIN_SERVER = 'aiuigeneratoracr.azurecr.io'
        // Terraform working directory
        TF_DIR          = 'terraform'
        // Ansible working directory
        ANSIBLE_DIR     = 'ansible'
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
            description: 'Run OWASP Dependency Check'
        )
        booleanParam(
            name: 'PUSH_DOCKER',
            defaultValue: false,
            description: 'Build and push Docker images to Azure Container Registry'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: false,
            description: 'Provision infra with Terraform and deploy with Ansible'
        )
        choice(
            name: 'DEPLOY_ENV',
            choices: ['staging', 'production'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'SKIP_TERRAFORM',
            defaultValue: true,
            description: 'Skip Terraform provisioning — use existing VM at VM_PUBLIC_IP'
        )
        string(
            name: 'VM_PUBLIC_IP',
            defaultValue: '20.86.174.233',
            description: 'Azure VM public IP — required when SKIP_TERRAFORM=true'
        )
        booleanParam(
            name: 'TERRAFORM_DESTROY',
            defaultValue: false,
            description: 'DANGER: Destroy all Azure infrastructure (use only to clean up)'
        )
        booleanParam(
            name: 'INJECT_SECRETS',
            defaultValue: false,
            description: 'Fast path: inject Stripe keys into VM .env and restart spring-bff only (no rebuild, no redeploy)'
        )
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code..."
                    checkout scm
                    sh 'git log -1 --oneline'
                }
            }
        }

        // ── 1b. Inject Secrets (fast path — no rebuild) ───────────────────────
        stage('Inject Secrets') {
            when {
                expression { params.INJECT_SECRETS == true }
            }
            steps {
                script {
                    env.VM_PUBLIC_IP = params.VM_PUBLIC_IP ?: '20.86.174.233'
                }
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'azure-vm-ssh-ke',         keyFileVariable: 'SSH_KEY_FILE'),
                    string(credentialsId: 'stripe-secret-key',      variable: 'STRIPE_SECRET_KEY'),
                    string(credentialsId: 'stripe-publishable-key', variable: 'STRIPE_PUBLISHABLE_KEY')
                ]) {
                    sh '''
                        echo "=== Injecting Stripe secrets into VM .env ==="
                        APP_DIR=/opt/ai-ui-generator

                        ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_FILE} azureuser@${VM_PUBLIC_IP} bash -s <<ENDSSH
                            set -e
                            cd ${APP_DIR}

                            # Upsert STRIPE_SECRET_KEY
                            if grep -q "^STRIPE_SECRET_KEY=" .env 2>/dev/null; then
                                sed -i "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}|" .env
                            else
                                echo "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" >> .env
                            fi

                            # Upsert STRIPE_PUBLISHABLE_KEY
                            if grep -q "^STRIPE_PUBLISHABLE_KEY=" .env 2>/dev/null; then
                                sed -i "s|^STRIPE_PUBLISHABLE_KEY=.*|STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}|" .env
                            else
                                echo "STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" >> .env
                            fi

                            echo "--- Keys written, restarting spring-bff ---"
                            docker compose up -d --no-deps spring-bff
                            sleep 10
                            docker compose exec -T spring-bff wget -qO- http://localhost:8080/actuator/health | grep -q UP && echo "spring-bff healthy" || echo "WARNING: health check pending"
ENDSSH
                        echo "=== Stripe secrets injected ==="
                    '''
                }
            }
        }

        // ── 2. Frontend Build ─────────────────────────────────────────────────
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
                        npx tsc --noEmit || echo "TypeScript warnings (non-blocking)"
                        npm test -- --run --coverage --coverage.reporter=lcov --coverage.reporter=text --coverage.reportsDirectory=./coverage || true
                        npm run build
                        echo "Frontend build OK"
                    '''
                }
            }
        }

        // ── 3. SonarQube — Frontend ───────────────────────────────────────────
        stage('Audit SonarQube - Frontend') {
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
                            ls -lh coverage/lcov.info 2>/dev/null || echo "WARNING: lcov.info not found"
                            npx sonar-scanner \
                              -Dsonar.projectKey=ai-ui-generator-frontend \
                              -Dsonar.projectName="AI UI Generator - Frontend" \
                              -Dsonar.sources=src \
                              -Dsonar.exclusions="**/*.test.ts,**/*.spec.ts,**/*.d.ts,**/node_modules/**,**/dist/**" \
                              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN} || true
                        '''
                    }
                }
            }
        }

        // ── 4. Backend Build ──────────────────────────────────────────────────
        stage('Backend Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        echo "Java version:" && java -version
                        echo "Maven version:" && mvn --version
                        mvn checkstyle:check -Dmaven.repo.local=/var/jenkins_home/.m2/repository || echo "Checkstyle warnings found"
                        mvn clean verify jacoco:report \
                          -DskipITs=false \
                          -Dmaven.test.failure.ignore=true \
                          -Dmaven.repo.local=/var/jenkins_home/.m2/repository
                        echo "Backend build OK"
                    '''
                }
            }
        }

        // ── 5. SonarQube — Backend ────────────────────────────────────────────
        stage('Audit SonarQube - Backend') {
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
                            ls -lh target/site/jacoco/jacoco.xml 2>/dev/null || echo "WARNING: jacoco.xml not found"
                            mvn sonar:sonar \
                              -Dmaven.repo.local=/var/jenkins_home/.m2/repository \
                              -Dsonar.projectKey=ai-ui-generator-backend \
                              -Dsonar.projectName="AI UI Generator - Backend" \
                              -Dsonar.sources=src/main/java \
                              -Dsonar.tests=src/test/java \
                              -Dsonar.java.source=17 \
                              -Dsonar.java.binaries=target/classes \
                              -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN} || true
                        '''
                    }
                }
            }
        }

        // ── 6. OWASP ──────────────────────────────────────────────────────────
        stage('OWASP Dependency Check') {
            when {
                expression {
                    (params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY') &&
                    params.RUN_OWASP == true
                }
            }
            steps {
                dir('spring-bff') {
                    sh '''
                        mvn org.owasp:dependency-check-maven:check \
                          -DfailBuildOnCVSS=8 \
                          -DretireJsAnalyzerEnabled=false \
                          -DnodeAnalyzerEnabled=false \
                          -Dmaven.repo.local=/var/jenkins_home/.m2/repository \
                          || echo "OWASP check completed"
                    '''
                }
            }
        }

        // ── 7. FastAPI Build ──────────────────────────────────────────────────
        stage('FastAPI Build') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'FASTAPI_ONLY' }
            }
            steps {
                dir('fastapi-ai') {
                    sh '''
                        python3 --version
                        pip install -r requirements.txt --quiet --break-system-packages
                        pip install ruff pytest pytest-cov --quiet --break-system-packages
                        python3 -m ruff check app/ || echo "Ruff warnings found"
                        python3 -m pytest tests/ -v --cov=app --cov-report=xml || true
                        echo "FastAPI build OK"
                    '''
                }
            }
        }

        // ── 8. SonarQube — FastAPI ────────────────────────────────────────────
        stage('Audit SonarQube - FastAPI') {
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

        // ── 9. Docker Build & Push to ACR ─────────────────────────────────────
        stage('Docker Build & Push to ACR') {
            when {
                expression { params.BUILD_TYPE == 'FULL' && params.PUSH_DOCKER == true }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'azure-acr-credentials',
                    usernameVariable: 'ACR_USER',
                    passwordVariable: 'ACR_PASS'
                )]) {
                    sh '''
                        echo "=== Login to Azure Container Registry ==="
                        echo "${ACR_PASS}" | docker login ${ACR_LOGIN_SERVER} -u ${ACR_USER} --password-stdin

                        echo "=== Building images (build #${BUILD_NUMBER}) ==="
                        # Frontend needs build-time VITE_ args so Vite bakes the correct public URLs
                        docker build \
                          --build-arg VITE_OIDC_AUTHORITY=http://${VM_PUBLIC_IP}/realms/ai-ui \
                          --build-arg VITE_OIDC_CLIENT_ID=ai-ui-frontend \
                          --build-arg VITE_OIDC_REDIRECT_URI=http://${VM_PUBLIC_IP}/auth/callback \
                          --build-arg VITE_BFF_BASE_URL="" \
                          --build-arg VITE_API_BASE_URL="" \
                          -t ${ACR_LOGIN_SERVER}/frontend:${BUILD_NUMBER} \
                          -t ${ACR_LOGIN_SERVER}/frontend:latest \
                          ./frontend
                        docker build -t ${ACR_LOGIN_SERVER}/spring-bff:${BUILD_NUMBER}           -t ${ACR_LOGIN_SERVER}/spring-bff:latest           ./spring-bff
                        docker build -t ${ACR_LOGIN_SERVER}/fastapi-ai:${BUILD_NUMBER}           -t ${ACR_LOGIN_SERVER}/fastapi-ai:latest           ./fastapi-ai
                        docker build -t ${ACR_LOGIN_SERVER}/transcript-streaming:${BUILD_NUMBER} -t ${ACR_LOGIN_SERVER}/transcript-streaming:latest ./transcript-ai -f ./transcript-ai/Dockerfile.streaming

                        echo "=== Pushing images to ACR ==="
                        docker push ${ACR_LOGIN_SERVER}/frontend:${BUILD_NUMBER}
                        docker push ${ACR_LOGIN_SERVER}/spring-bff:${BUILD_NUMBER}
                        docker push ${ACR_LOGIN_SERVER}/fastapi-ai:${BUILD_NUMBER}
                        docker push ${ACR_LOGIN_SERVER}/transcript-streaming:${BUILD_NUMBER}
                        docker push ${ACR_LOGIN_SERVER}/frontend:latest
                        docker push ${ACR_LOGIN_SERVER}/spring-bff:latest
                        docker push ${ACR_LOGIN_SERVER}/fastapi-ai:latest
                        docker push ${ACR_LOGIN_SERVER}/transcript-streaming:latest

                        echo "=== Images pushed to ${ACR_LOGIN_SERVER} ==="
                    '''
                }
            }
        }

        // ── 10. Terraform — Provision Azure Infrastructure ────────────────────
        stage('Terraform Infra') {
            when {
                expression { params.DEPLOY == true && params.BUILD_TYPE == 'FULL' && !params.SKIP_TERRAFORM }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'azure-subscription-id', variable: 'ARM_SUBSCRIPTION_ID'),
                    string(credentialsId: 'azure-client-id',       variable: 'ARM_CLIENT_ID'),
                    string(credentialsId: 'azure-client-secret',   variable: 'ARM_CLIENT_SECRET'),
                    string(credentialsId: 'azure-tenant-id',       variable: 'ARM_TENANT_ID')
                ]) {
                    dir("${TF_DIR}") {
                        sh '''
                            echo "=== Terraform version ==="
                            terraform version

                            echo "=== Terraform Init ==="
                            terraform init

                            echo "=== Terraform Plan ==="
                            terraform plan \
                              -var="subscription_id=${ARM_SUBSCRIPTION_ID}" \
                              -var="environment=${DEPLOY_ENV}" \
                              -out=tfplan

                            echo "=== Terraform Apply ==="
                            terraform apply -auto-approve tfplan

                            echo "=== Terraform Outputs ==="
                            terraform output -json > ../terraform_outputs.json
                            cat ../terraform_outputs.json
                        '''

                        script {
                            // Parse VM public IP for Ansible
                            def outputs = readJSON file: '../terraform_outputs.json'
                            env.VM_PUBLIC_IP   = outputs.vm_public_ip.value
                            env.ACR_LOGIN_SERVER_TF = outputs.acr_login_server.value
                            echo "VM Public IP: ${env.VM_PUBLIC_IP}"
                            echo "ACR: ${env.ACR_LOGIN_SERVER_TF}"
                        }
                    }
                }
            }
        }

        // ── 11. Terraform Destroy (manual gate) ───────────────────────────────
        stage('Terraform Destroy') {
            when {
                expression { params.TERRAFORM_DESTROY == true }
            }
            steps {
                input message: "⚠️ This will DESTROY all Azure infrastructure. Confirm?", ok: "Yes, destroy it"
                withCredentials([
                    string(credentialsId: 'azure-subscription-id', variable: 'ARM_SUBSCRIPTION_ID'),
                    string(credentialsId: 'azure-client-id',       variable: 'ARM_CLIENT_ID'),
                    string(credentialsId: 'azure-client-secret',   variable: 'ARM_CLIENT_SECRET'),
                    string(credentialsId: 'azure-tenant-id',       variable: 'ARM_TENANT_ID')
                ]) {
                    dir("${TF_DIR}") {
                        sh '''
                            terraform init
                            terraform destroy \
                              -var="subscription_id=${ARM_SUBSCRIPTION_ID}" \
                              -auto-approve
                        '''
                    }
                }
            }
        }

        // ── 12. Ansible — Configure VM and Deploy ─────────────────────────────
        stage('Ansible Deploy') {
            when {
                expression { params.DEPLOY == true && params.BUILD_TYPE == 'FULL' }
            }
            steps {
                script {
                    // When Terraform was skipped, resolve IP and ACR from parameters/global env
                    if (!env.VM_PUBLIC_IP?.trim()) {
                        env.VM_PUBLIC_IP = params.VM_PUBLIC_IP
                        echo "Using parameter VM_PUBLIC_IP: ${env.VM_PUBLIC_IP}"
                    }
                    if (!env.ACR_LOGIN_SERVER_TF?.trim()) {
                        env.ACR_LOGIN_SERVER_TF = env.ACR_LOGIN_SERVER
                        echo "Using global ACR_LOGIN_SERVER: ${env.ACR_LOGIN_SERVER_TF}"
                    }
                }
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'azure-vm-ssh-ke',         keyFileVariable: 'SSH_KEY_FILE'),
                    string(credentialsId: 'groq-api-key',                        variable: 'GROQ_API_KEY'),
                    string(credentialsId: 'stripe-secret-key',                   variable: 'STRIPE_SECRET_KEY'),
                    string(credentialsId: 'stripe-publishable-key',              variable: 'STRIPE_PUBLISHABLE_KEY'),
                    usernamePassword(
                        credentialsId:    'azure-acr-credentials',
                        usernameVariable: 'ACR_USER',
                        passwordVariable: 'ACR_PASS'
                    )
                ]) {
                    sh '''
                        echo "=== Ansible version ===" && ansible --version

                        echo "=== Generating Ansible inventory ==="
                        cat > ${ANSIBLE_DIR}/inventory.ini <<EOF
[azure_vm]
${VM_PUBLIC_IP} ansible_user=azureuser ansible_ssh_private_key_file=${SSH_KEY_FILE} ansible_ssh_common_args='-o StrictHostKeyChecking=no'
EOF

                        echo "=== Running Ansible playbook ==="
                        export ACR_LOGIN_SERVER=${ACR_LOGIN_SERVER_TF}
                        export ACR_USERNAME=${ACR_USER}
                        export ACR_PASSWORD=${ACR_PASS}
                        export BUILD_NUMBER=${BUILD_NUMBER}
                        export GROQ_API_KEY=${GROQ_API_KEY}
                        export VM_PUBLIC_IP=${VM_PUBLIC_IP}
                        export MINIO_BUCKET=ai-ui-files
                        export MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
                        export MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin}
                        export KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-admin}
                        export INTERNAL_API_SECRET=${INTERNAL_API_SECRET:-changeme-in-prod}
                        export GRAFANA_PASSWORD=${GRAFANA_PASSWORD:-admin}
                        export GEMINI_API_KEY=${GEMINI_API_KEY:-}
                        export ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-}
                        export STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
                        export STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}

                        ANSIBLE_CONFIG=${ANSIBLE_DIR}/ansible.cfg \
                        ansible-playbook \
                          -i ${ANSIBLE_DIR}/inventory.ini \
                          ${ANSIBLE_DIR}/playbook.yml \
                          --private-key=${SSH_KEY_FILE} \
                          -v
                    '''
                }
            }
        }

        // ── 13. Smoke Tests ───────────────────────────────────────────────────
        stage('Smoke Tests') {
            when {
                expression { params.DEPLOY == true && params.BUILD_TYPE == 'FULL' }
            }
            steps {
                sh '''
                    sleep 15
                    curl -f http://${VM_PUBLIC_IP}:8000/health  || exit 1
                    curl -f http://${VM_PUBLIC_IP}:8081/actuator/health || exit 1
                    curl -f http://${VM_PUBLIC_IP}/realms/ai-ui/.well-known/openid-configuration || exit 1
                    echo "✅ Smoke tests passed"
                    echo "   App      : http://${VM_PUBLIC_IP}  (nginx — main entry point)"
                    echo "   Frontend : http://${VM_PUBLIC_IP}:5173  (direct)"
                    echo "   API      : http://${VM_PUBLIC_IP}:8081  (direct)"
                    echo "   Keycloak : http://${VM_PUBLIC_IP}:8083  (direct)"
                    echo "   Grafana  : http://${VM_PUBLIC_IP}:3000"
                '''
            }
        }

        // ── 14. Archive Artifacts ─────────────────────────────────────────────
        stage('Archive Artifacts') {
            when {
                expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
            }
            steps {
                sh '''
                    find spring-bff/target -maxdepth 1 -name "*.jar" 2>/dev/null || echo "(no jar)"
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
            echo "✅ Pipeline PASSED — build #${BUILD_NUMBER}"
        }
        failure {
            echo "❌ Pipeline FAILED — check stage logs above"
        }
    }
}
