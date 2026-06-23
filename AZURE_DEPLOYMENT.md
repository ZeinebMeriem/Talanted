# 🚀 AI UI Generator — Déploiement sur Azure

**Date**: 2026-06-02
**Status**: Guide complet pour production

---

## 📊 Vue d'ensemble

Ce projet compte **13 services Docker** qui nécessitent une orchestration robuste sur Azure.

### Architecture actuellement
```
docker-compose.yml
├─ Frontend (React 5173)
├─ Backend (Spring Boot 8081)
├─ FastAPI (Python 8000)
├─ MongoDB (27017)
├─ MinIO (9000/9001)
├─ Keycloak (8083)
├─ SonarQube (9010)
├─ Monitoring (Prometheus, Grafana, AlertManager)
└─ Transcript AI (5001, 8082)
```

---

## 🎯 OPTIONS DE DÉPLOIEMENT

### **Option 1: Azure Container Instances (ACI) — Simple ⭐ RECOMMANDÉ**
**Pour**: MVP, démo, prototype
**Avantages**:
- ✅ Serverless, pas d'infra à gérer
- ✅ Facturation à la seconde
- ✅ Déploiement rapide (5 min)
- ✅ Parfait pour développement

**Inconvénients**:
- ❌ Pas de scaling auto
- ❌ Données non persistantes par défaut
- ❌ Coût peut monter vite à forte charge

---

### **Option 2: Azure Kubernetes Service (AKS) — Production ⭐⭐⭐**
**Pour**: Production, haute disponibilité
**Avantages**:
- ✅ Auto-scaling horizontal
- ✅ Load balancing natif
- ✅ Monitoring/alertes intégrées
- ✅ Rollout zéro-downtime

**Inconvénients**:
- ❌ Courbe d'apprentissage Kubernetes
- ❌ Coût infrastructure + management

---

### **Option 3: Azure App Service + Managed Databases**
**Pour**: SaaS simple
**Avantages**:
- ✅ Très simple à mettre en place
- ✅ SSL/HTTPS gratuit
- ✅ Managed backup

**Inconvénients**:
- ❌ Services multi-conteneurs complexes
- ❌ Pas idéal pour 13 services

---

## 🏗️ STRATÉGIE RECOMMANDÉE: AKS

### **Étape 1: Préparer l'environnement Azure**

```bash
# 1. Installer Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Se connecter
az login
az account set --subscription "<votre-subscription-id>"

# 3. Créer un groupe de ressources
az group create \
  --name ai-ui-generator-rg \
  --location eastus

# 4. Créer un registre Docker (Azure Container Registry)
az acr create \
  --resource-group ai-ui-generator-rg \
  --name aiuigeneratoracr \
  --sku Basic

# 5. Se connecter au registre
az acr login --name aiuigeneratoracr
```

### **Étape 2: Créer le cluster AKS**

```bash
# Créer AKS cluster
az aks create \
  --resource-group ai-ui-generator-rg \
  --name ai-ui-aks \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity \
  --network-plugin azure \
  --attach-acr aiuigeneratoracr \
  --zones 1 2 3

# Obtenir les credentials
az aks get-credentials \
  --resource-group ai-ui-generator-rg \
  --name ai-ui-aks

# Vérifier
kubectl cluster-info
kubectl get nodes
```

### **Étape 3: Construire et pousser les images Docker**

```bash
# 1. Construire les images
docker build -t aiuigeneratoracr.azurecr.io/frontend:1.0 ./frontend
docker build -t aiuigeneratoracr.azurecr.io/spring-bff:1.0 ./spring-bff
docker build -t aiuigeneratoracr.azurecr.io/fastapi-ai:1.0 ./fastapi-ai
docker build -t aiuigeneratoracr.azurecr.io/transcript-streaming:1.0 ./transcript-ai -f transcript-ai/Dockerfile.streaming

# 2. Les pousser vers Azure
docker push aiuigeneratoracr.azurecr.io/frontend:1.0
docker push aiuigeneratoracr.azurecr.io/spring-bff:1.0
docker push aiuigeneratoracr.azurecr.io/fastapi-ai:1.0
docker push aiuigeneratoracr.azurecr.io/transcript-streaming:1.0
```

### **Étape 4: Déployer sur AKS avec Helm ou YAML**

#### **Option A: Déploiement YAML manuel**

```bash
# Créer un namespace
kubectl create namespace ai-ui

# Créer les secrets pour les variables d'environnement
kubectl create secret generic ai-ui-secrets \
  --from-literal=MONGO_INITDB_DATABASE=ai_ui_generator \
  --from-literal=MINIO_ROOT_USER=minioadmin \
  --from-literal=MINIO_ROOT_PASSWORD=minioadmin \
  --from-literal=GROQ_API_KEY=<votre-clé> \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD=admin \
  -n ai-ui

# Appliquer les manifests Kubernetes
kubectl apply -f k8s/mongodb.yaml -n ai-ui
kubectl apply -f k8s/minio.yaml -n ai-ui
kubectl apply -f k8s/keycloak.yaml -n ai-ui
kubectl apply -f k8s/fastapi.yaml -n ai-ui
kubectl apply -f k8s/spring-bff.yaml -n ai-ui
kubectl apply -f k8s/frontend.yaml -n ai-ui
kubectl apply -f k8s/monitoring.yaml -n ai-ui
```

#### **Option B: Déploiement avec Helm (recommandé)**

```bash
# Créer un chart Helm
helm create ai-ui-generator

# Déployer
helm install ai-ui ./ai-ui-generator \
  -n ai-ui \
  --create-namespace \
  -f values-prod.yaml
```

---

## 📁 FICHIERS NÉCESSAIRES

### **1. Fichier Docker Compose → Manifests Kubernetes**

Créer `k8s/mongodb.yaml`:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_DATABASE
          valueFrom:
            secretKeyRef:
              name: ai-ui-secrets
              key: MONGO_INITDB_DATABASE
        volumeMounts:
        - name: mongo-storage
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: mongo-storage
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  type: ClusterIP
```

### **2. Fichier Ingress pour routage**

Créer `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-ui-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ai-ui.example.com
    secretName: ai-ui-tls
  rules:
  - host: ai-ui.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 5173
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: spring-bff
            port:
              number: 8080
      - path: /ai
        pathType: Prefix
        backend:
          service:
            name: fastapi-ai
            port:
              number: 8000
```

---

## 🗄️ SERVICES GÉRÉS AZURE

| Service Docker | Équivalent Azure | Setup |
|---|---|---|
| **MongoDB** | Azure Cosmos DB (MongoDB API) | [Créer instance](https://portal.azure.com) |
| **MinIO** | Azure Blob Storage | [Storage Account](https://docs.microsoft.com/azure/storage/) |
| **Keycloak** | Azure AD B2C | [Configuration](https://docs.microsoft.com/azure/active-directory-b2c/) |
| **PostgreSQL (SonarQube)** | Azure Database for PostgreSQL | [Créer DB](https://docs.microsoft.com/azure/postgresql/) |
| **Prometheus/Grafana** | Azure Monitor + Application Insights | Natif dans Azure |

### **Exemple: Remplacer MongoDB → Azure Cosmos DB**

```bash
# Créer Cosmos DB
az cosmosdb create \
  --name ai-ui-mongo \
  --resource-group ai-ui-generator-rg \
  --kind MongoDB

# Obtenir la chaîne de connexion
az cosmosdb keys list \
  --name ai-ui-mongo \
  --resource-group ai-ui-generator-rg \
  --type connection-strings
```

Puis dans le deployment Kubernetes:
```yaml
env:
- name: SPRING_DATA_MONGODB_URI
  valueFrom:
    secretKeyRef:
      name: ai-ui-secrets
      key: MONGODB_URI  # Chaîne Cosmos DB
```

---

## 🔐 SÉCURITÉ EN PRODUCTION

### **1. Gestion des secrets**

```bash
# Utiliser Azure Key Vault au lieu de secrets Kubernetes
az keyvault create \
  --name ai-ui-kv \
  --resource-group ai-ui-generator-rg

# Stocker les secrets
az keyvault secret set \
  --vault-name ai-ui-kv \
  --name GROQ-API-KEY \
  --value "<votre-clé>"

# Accès depuis AKS
kubectl apply -f - <<EOF
apiVersion: keyvault.azure.com/v1
kind: SecretProviderClass
metadata:
  name: ai-ui-secrets
spec:
  provider: azure
  parameters:
    usePodIdentity: "true"
    keyVaultName: ai-ui-kv
    objects: |
      array:
        - |
          objectName: GROQ-API-KEY
          objectType: secret
EOF
```

### **2. SSL/TLS avec cert-manager**

```bash
# Installer cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace

# Créer ClusterIssuer Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### **3. Network Policies**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-ui-network-policy
spec:
  podSelector:
    matchLabels:
      app: spring-bff
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

---

## 📊 MONITORING & ALERTES

### **1. Application Insights + Azure Monitor**

```bash
# Créer Application Insights
az monitor app-insights component create \
  --app ai-ui-insights \
  --location eastus \
  --resource-group ai-ui-generator-rg

# Obtenir la clé d'instrumentation
az monitor app-insights component show \
  --app ai-ui-insights \
  --resource-group ai-ui-generator-rg \
  --query instrumentationKey
```

### **2. Alertes autoconfigurées**

```yaml
# kubectl apply -f k8s/monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    rule_files:
    - '/etc/prometheus/alerts.yml'
    scrape_configs:
    - job_name: 'spring-bff'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: spring-bff
```

---

## 🚀 CI/CD: Jenkins → Azure

### **Modifier Jenkinsfile pour pousser vers Azure**

```groovy
// Ajouter à Jenkinsfile
environment {
    AZURE_REGISTRY = 'aiuigeneratoracr.azurecr.io'
    AZURE_RESOURCE_GROUP = 'ai-ui-generator-rg'
    AZURE_CLUSTER_NAME = 'ai-ui-aks'
}

stage('Docker Push to Azure') {
    when {
        expression { params.PUSH_DOCKER == true }
    }
    steps {
        script {
            withCredentials([usernamePassword(credentialsId: 'azure-registry',
                                            usernameVariable: 'ACR_USER',
                                            passwordVariable: 'ACR_PASSWORD')]) {
                sh '''
                    docker login -u ${ACR_USER} -p ${ACR_PASSWORD} ${AZURE_REGISTRY}
                    docker tag ai-ui-frontend:latest ${AZURE_REGISTRY}/frontend:${BUILD_NUMBER}
                    docker tag ai-ui-spring-bff:latest ${AZURE_REGISTRY}/spring-bff:${BUILD_NUMBER}
                    docker tag ai-ui-fastapi:latest ${AZURE_REGISTRY}/fastapi-ai:${BUILD_NUMBER}

                    docker push ${AZURE_REGISTRY}/frontend:${BUILD_NUMBER}
                    docker push ${AZURE_REGISTRY}/spring-bff:${BUILD_NUMBER}
                    docker push ${AZURE_REGISTRY}/fastapi-ai:${BUILD_NUMBER}
                '''
            }
        }
    }
}

stage('Deploy to AKS') {
    when {
        expression { params.DEPLOY == true }
    }
    steps {
        script {
            sh '''
                # Obtenir les credentials AKS
                az aks get-credentials \
                  --resource-group ${AZURE_RESOURCE_GROUP} \
                  --name ${AZURE_CLUSTER_NAME}

                # Mettre à jour les images dans Kubernetes
                kubectl set image deployment/frontend \
                  frontend=${AZURE_REGISTRY}/frontend:${BUILD_NUMBER} \
                  -n ai-ui

                kubectl set image deployment/spring-bff \
                  spring-bff=${AZURE_REGISTRY}/spring-bff:${BUILD_NUMBER} \
                  -n ai-ui

                kubectl set image deployment/fastapi-ai \
                  fastapi-ai=${AZURE_REGISTRY}/fastapi-ai:${BUILD_NUMBER} \
                  -n ai-ui

                # Attendre que le rollout se termine
                kubectl rollout status deployment/frontend -n ai-ui
            '''
        }
    }
}
```

---

## 💰 ESTIMATION DE COÛT (mensuel)

| Service | Tier | Coût |
|---------|------|------|
| **AKS** (3 nodes Standard D2s_v3) | Production | ~$300 |
| **Azure Container Registry** | Basic | ~$5 |
| **MongoDB/Cosmos DB** | 400 RU | ~$30 |
| **Blob Storage** | Hot, 100 GB | ~$2 |
| **Azure Database PostgreSQL** | General Purpose, 1 vCore | ~$50 |
| **Application Insights** | PAYG | ~$5 |
| **Bandwidth sortant** | 100 GB | ~$20 |
| **Total** | | ~**$412/mois** |

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] Azure CLI installé et connecté
- [ ] Groupe de ressources créé
- [ ] Azure Container Registry créé
- [ ] Images Docker construites et pushées
- [ ] Cluster AKS créé (3 nœuds)
- [ ] Namespaces Kubernetes créés
- [ ] Secrets stockés dans Key Vault
- [ ] Manifests YAML appliqués
- [ ] Ingress configuré avec SSL
- [ ] Monitoring (Application Insights) activé
- [ ] Backups automatiques configurés
- [ ] DNS pointé vers Azure
- [ ] Tests de connectivité réussis

---

## 🔗 RESSOURCES

- [Azure Kubernetes Service Docs](https://docs.microsoft.com/azure/aks/)
- [Azure Container Registry](https://docs.microsoft.com/azure/container-registry/)
- [Kubernetes best practices](https://docs.microsoft.com/azure/aks/best-practices)
- [Azure Monitor + Application Insights](https://docs.microsoft.com/azure/azure-monitor/)
- [Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

## 🆘 DÉPANNAGE COURANT

### "Erreur: Pod pending (ImagePullBackOff)"
```bash
# Vérifier l'push des images
az acr repository list --name aiuigeneratoracr

# Vérifier les logs du pod
kubectl describe pod <pod-name> -n ai-ui
kubectl logs <pod-name> -n ai-ui --previous
```

### "Impossible de se connecter à la BD"
```bash
# Tester la connectivité
kubectl exec -it <pod> -n ai-ui -- /bin/bash
curl -v telnet mongodb:27017
```

### "OutOfMemory sur un pod"
```bash
# Augmenter les limits
kubectl edit deployment spring-bff -n ai-ui
# Augmenter: memory: "2Gi" (limites)
```

---

**Prêt à déployer? Demandez de créer les fichiers YAML Kubernetes! 🚀**
