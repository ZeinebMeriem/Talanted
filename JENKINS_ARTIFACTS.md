# Les Artifacts dans Jenkins - Explication Complète

## 🎯 Qu'est-ce qu'un Artifact ?

Un **artifact** = un fichier ou un ensemble de fichiers que Jenkins **sauvegarde** après la fin du build pour qu'on puisse les télécharger, examiner ou déployer.

### Sans Artifacts
```
Jenkins Build
    ↓ compile + test
    ↓ génère fichiers (.jar, .dist, .html)
    ↓ BUILD FINISHED
    ↓ Tous les fichiers = SUPPRIMÉS (tempfiles nettoyés)

Résultat: Rien à télécharger
```

### Avec Artifacts
```
Jenkins Build
    ↓ compile + test
    ↓ génère fichiers (.jar, .dist, .html)
    ↓ archiveArtifacts (copie fichiers → Jenkins storage)
    ↓ BUILD FINISHED
    ↓ Fichiers CONSERVÉS dans Jenkins

Résultat: Téléchargeables depuis Jenkins UI
```

---

## 📍 Artifacts dans Notre Jenkinsfile

### Stage: Archive Artifacts (ligne 240-250)

```groovy
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
```

### Décortication

#### 1. `archiveArtifacts` — Sauvegarde les fichiers
```groovy
archiveArtifacts artifacts: 'spring-bff/target/*.jar,frontend/dist/**'
```

Cela sauvegarde :
- **`spring-bff/target/*.jar`** → All JAR files (Spring Boot compiled)
- **`frontend/dist/**`** → All files in dist folder (Built React app)

#### 2. `junit` — Archive les rapports de test
```groovy
junit testResults: 'spring-bff/target/surefire-reports/*.xml'
```

Cela sauvegarde les résultats de test en XML pour que :
- Jenkins affiche un beau graphique "Test Results"
- Historique des tests visibles dans l'UI

#### 3. `allowEmptyArchive: true` & `allowEmptyResults: true`
Si pas de fichiers trouvés = ne pas échouer le build (continue anyway).

---

## 📊 Flowchart Maven/npm → Artifacts

### Backend (.jar)
```
mvn clean verify
    ↓
target/classes/ (compiled Java)
    ↓
target/*.jar (packaged JAR)
    ↓
archiveArtifacts artifacts='spring-bff/target/*.jar'
    ↓
Jenkins storage: builds/123/archive/spring-bff/target/*.jar
    ↓
Téléchargeable via Jenkins UI
```

**Fichiers archivés** :
```
spring-bff/target/
  ├── ai-ui-generator-bff-1.0.0.jar ← ARTIFACT
  ├── classes/
  ├── surefire-reports/
  │   └── TEST-*.xml ← ARTIFACT (junit)
  └── ...
```

### Frontend (dist)
```
npm run build
    ↓
dist/ (minified React build)
    ├── index.html
    ├── assets/
    │   ├── main.abc123.js
    │   └── main.xyz456.css
    └── ...
    ↓
archiveArtifacts artifacts='frontend/dist/**'
    ↓
Jenkins storage: builds/123/archive/frontend/dist/**
    ↓
Téléchargeable via Jenkins UI
```

**Fichiers archivés** :
```
frontend/dist/
  ├── index.html ← ARTIFACT
  ├── assets/ ← ARTIFACT
  │   ├── main.*.js
  │   └── main.*.css
  └── ...
```

---

## 🔄 Quand les Artifacts Sont Créés

### Timeline Build #123

```
1. Checkout (Télécharge git repo)
2. Frontend Build (npm ci + npm run build) → crée dist/
3. Frontend - SonarQube (analyse code)
4. Backend Build (mvn clean verify) → crée target/
5. Backend - SonarQube (analyse code)
6. Backend - OWASP Dependency Check (sécurité)
7. FastAPI Build (pytest)
8. FastAPI - SonarQube (analyse code)
9. Docker Build (crée images Docker)
10. Docker Push (envoie à registry)
11. Archive Artifacts ← ICI ! (copie target/ et dist/ vers Jenkins storage)
    ↓
12. Post-Build (final cleanup)
```

**Après stage 11** :
- Jenkins crée un dossier : `/var/jenkins/workspace/builds/123/archive/`
- Copie les fichiers matchant les patterns
- Les rend téléchargeables via Jenkins UI

---

## 💾 Où Sont Stockés les Artifacts ?

Jenkins sauvegarde les artifacts sur le **serveur Jenkins lui-même** :

```
Jenkins Home Directory:
/var/jenkins_home/jobs/ai-ui-generator/builds/123/archive/
├── spring-bff/
│   └── target/
│       ├── ai-ui-generator-bff-1.0.0.jar (20 MB)
│       └── TEST-*.xml
└── frontend/
    └── dist/
        ├── index.html (15 KB)
        ├── assets/
        │   ├── main.abc123.js (300 KB)
        │   └── main.xyz456.css (50 KB)
        └── ...
```

**Limite de stockage** : Configurable dans Jenkins settings (disque du serveur)
- Exemple : Garder uniquement 10 derniers builds (voir option line 5 : `buildDiscarder(logRotator(numToKeepStr: '10'))`)

---

## 🎯 Use Cases des Artifacts

### 1️⃣ Release Management
```
Build #523 réussit
    ↓
archiveArtifacts → ai-ui-generator-bff-1.0.0.jar
    ↓
DevOps telecharge le JAR
    ↓
Le déploie en production
```

### 2️⃣ Trouver une Version Compilée
```
"Jen'ai que le source code. Je veux la version compilée du build #100"
    ↓
Jenkins UI → Build #100 → Artifacts
    ↓
Télécharge: ai-ui-generator-bff-1.0.0.jar
```

### 3️⃣ Audit des Tests
```
Build #523 → junit artifacts
    ↓
Jenkins affiche: "127 tests passed, 2 failed"
    ↓
Click sur failed test
    ↓
Voit le XML détaillé
```

### 4️⃣ Packaging Distribué
```
Frontend Vue.js compilé
    ↓
Backend JAR compilé
    ↓
Les deux artifacts
    ↓
Packaging dans Docker ou ZIP livrable
```

---

## ⚙️ Configuration des Artifacts

### Syntax Globbing Patterns (Wildcards)

```groovy
// EXACTEMENT DANS TARGET ROOT
'spring-bff/target/*.jar'
    ↓ Match: spring-bff/target/app.jar
    ↓ Match: spring-bff/target/app-sources.jar
    ✗ NO Match: spring-bff/target/classes/App.class (sous-dossier)

// TOUS LES FICHIERS DE FAÇON RECURSIVE
'frontend/dist/**'
    ↓ Match: frontend/dist/index.html
    ↓ Match: frontend/dist/assets/main.js
    ↓ Match: frontend/dist/assets/icons/logo.png (any depth)
    ✓ Tout ce qui est dans dist/ recursively

// SPECIFIC EXTENSIONS
'target/**/*.xml'
    ↓ Match: target/test-reports/*.xml
    ✓ Only XML files anywhere in target/

// MULTIPLE PATTERNS (Comma-separated)
'spring-bff/target/*.jar, frontend/dist/**, monitoring/logs/*.log'
    ↓ Archive 3 things
```

### Nôtre Pattern
```groovy
artifacts: 'spring-bff/target/*.jar,frontend/dist/**'
```

Cela archive :
1. `spring-bff/target/*.jar` → Spring Boot JAR (production binary)
2. `frontend/dist/**` → Compiled React app (every file recursively)

---

## 📥 Télécharger les Artifacts

### Via Jenkins UI

```
1. Open Jenkins → ai-ui-generator job
2. Click on Build #123
3. Left sidebar: "Artifacts"
4. Click on file to download

   Download:
   - spring-bff/target/ai-ui-generator-bff-1.0.0.jar
   - frontend/dist/index.html
   - etc.
```

### Via CLI

```bash
# Download a specific artifact
curl -u user:pass \
  http://jenkins.example.com/job/ai-ui-generator/123/artifact/spring-bff/target/ai-ui-generator-bff-1.0.0.jar \
  -o app.jar

# Download all artifacts as ZIP
curl -u user:pass \
  http://jenkins.example.com/job/ai-ui-generator/123/artifact/* \
  -o build-123.zip
```

### Via Jenkins API

```groovy
// In another Jenkins job
copyArtifacts(
    projectName: 'ai-ui-generator',
    selector: specific(123),
    filter: 'spring-bff/target/*.jar',
    target: 'dependencies/'
)
```

---

## 🚨 Important: Artifacts vs Logs

| | Artifacts | Logs |
|---|---|---|
| **Ce que c'est** | Fichiers générés utiles (JAR, dist/) | Output texte du build (echo, npm output) |
| **Conservé** | ✅ Oui (à télécharger) | ✅ Oui (visitable en UI) |
| **Disque** | Peut prendre bcp place | Plutôt léger |
| **Utilité** | Déploiement, debugging | Comprendre ce qui s'est passé |

**Exemple** :
```
Logs:
  [14:32:12] npm run build
  [14:32:45] Compiled 15 components
  [14:32:46] Bundle size: 300KB

Artifacts:
  frontend/dist/index.html
  frontend/dist/assets/main.*.js
```

---

## 🎛️ Notre Configuration Détaillée

```groovy
stage('Archive Artifacts') {
    when {
        // Archive SEULEMENT si:
        // - BUILD_TYPE = FULL ou BACKEND_ONLY
        // (pas pour Frontend-only or FastAPI-only)
        expression {
            params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY'
        }
    }
    steps {
        // 1. Archive JAR + dist
        archiveArtifacts artifacts: 'spring-bff/target/*.jar,frontend/dist/**',
                         allowEmptyArchive: true  // Si files manquent, continuer

        // 2. Archive test results (JUnit XML)
        junit testResults: 'spring-bff/target/surefire-reports/*.xml',
              allowEmptyResults: true  // Si tests manquent, continuer
    }
}
```

### Pourquoi BACKEND_ONLY mais pas FRONTEND_ONLY ?

Parce que :
- **Backend JAR** = Toujours utile (déployer le serveur)
- **Frontend dist/** = Intégré dans Backend (servi par Spring Boot)
- Frontend seul = moins utile (sans backend pour le servir)

---

## 📈 Limitations & Best Practices

### ⚠️ Limitations

**1. Espace disque**
```
Si tu gardes 10 builds avec 50MB d'artifacts chacun
= 500MB utilisés juste pour les artifacts
```

**Solution** : `buildDiscarder(logRotator(numToKeepStr: '10'))`
→ Garde seulement 10 derniers, supprime les autres artifacts

**2. Performance**
```
Si tu archives 10,000+ fichiers
→ Archive stage peut prendre du temps
```

**Solution** : Archive seulement ce qui est utile (JAR + dist, pas node_modules)

**3. Chemins longs**
```
Windows path > 260 chars = problème
```

**Solution** : Garder les chemins courts

### ✅ Best Practices

**1. Archive uniquement le nécessaire**
```groovy
// ❌ TOO MUCH
archiveArtifacts 'spring-bff/**'  // Include node_modules? NO

// ✅ GOOD
archiveArtifacts 'spring-bff/target/*.jar'  // Just the JAR
```

**2. Separate by type**
```groovy
// Binaries
archiveArtifacts 'spring-bff/target/**/*.jar'

// Reports
archiveArtifacts 'spring-bff/target/surefire-reports/**'

// Bundles
archiveArtifacts 'frontend/dist/**'
```

**3. Nommage cohérent**
```groovy
// Before archiving, rename to something meaningful
sh '''
  mv spring-bff/target/*.jar spring-bff/target/app-v${BUILD_NUMBER}.jar
'''

archiveArtifacts 'spring-bff/target/app-v${BUILD_NUMBER}.jar'
```

**4. Nettoyer régulièrement**
```groovy
options {
    buildDiscarder(logRotator(
        numToKeepStr: '10',          // Keep 10 builds
        artifactDaysToKeepStr: '30', // Delete artifacts after 30 days
        artifactNumToKeepStr: '5'    // Keep artifacts only on 5 latest
    ))
}
```

---

## 🔗 Notre Configuration Complète avec Nettoyage

```groovy
// Top of pipeline
options {
    buildDiscarder(logRotator(
        numToKeepStr: '10',              // Garder 10 builds complets
        artifactDaysToKeepStr: '30',     // Artifacts pendant 30 jours
        artifactNumToKeepStr: '5'        // Mais artifacts sur 5 derniers seulement
    ))
    timeout(time: 1, unit: 'HOURS')
    timestamps()
}

// ...

stage('Archive Artifacts') {
    when {
        expression { params.BUILD_TYPE == 'FULL' || params.BUILD_TYPE == 'BACKEND_ONLY' }
    }
    steps {
        // Archive pour déploiement
        archiveArtifacts artifacts: 'spring-bff/target/*.jar,frontend/dist/**',
                         allowEmptyArchive: true

        // Archive résultats de test (pour rapports)
        junit testResults: 'spring-bff/target/surefire-reports/*.xml',
              allowEmptyResults: true
    }
}
```

**Résultat** :
- ✅ Build #123 complet (logs + artifacts) = conservé
- ✅ Build #120 complet = conservé (dans les 10 derniers)
- ✅ Build #115 logs = conservé, artifacts = supprimés (> 5)
- ❌ Build #100 = complètement supprimé (> 10)

---

## 📊 Exemple Concret

### Build #523 Lance

```groovy
stage('Frontend Build') {
    // npm run build → crée frontend/dist/
}

stage('Backend Build') {
    // mvn package → crée spring-bff/target/ai-ui-generator-bff-1.0.0.jar
}

stage('Archive Artifacts') {
    archiveArtifacts 'spring-bff/target/*.jar,frontend/dist/**'
}
```

### Après Build Success

```
Jenkins Home:
/var/jenkins_home/jobs/ai-ui-generator/builds/523/archive/
├── spring-bff/
│   └── target/
│       └── ai-ui-generator-bff-1.0.0.jar (25 MB) ← ARTIFACT
└── frontend/
    └── dist/
        ├── index.html (12 KB) ← ARTIFACT
        ├── assets/
        │   ├── main.a1b2c3d4.js (280 KB) ← ARTIFACT
        │   ├── main.x5y6z7w8.css (48 KB) ← ARTIFACT
        │   └── ...

Build #523 UI:
┌─────────────────────────────────────────┐
│ Build #523 - SUCCESS                    │
├─────────────────────────────────────────┤
│ [Artifacts] (link)                      │
│   - spring-bff/target/ai-ui-...jar      │
│   - frontend/dist/index.html            │
│   - frontend/dist/assets/main.*.js      │
│   - frontend/dist/assets/main.*.css     │
└─────────────────────────────────────────┘
```

**DevOps peut** :
```bash
# Download
wget http://jenkins/job/ai-ui-generator/523/artifact/spring-bff/target/*.jar

# Deploy
java -jar ai-ui-generator-bff-1.0.0.jar
```

---

## 💡 Résumé

| Aspect | Description |
|--------|-------------|
| **Définition** | Fichiers sauvegardés après le build pour téléchargement |
| **Stockage** | Jenkins home `/builds/[number]/archive/` |
| **Notre usage** | `.jar` pour backend + `dist/` pour frontend |
| **Commande** | `archiveArtifacts` + `junit` |
| **Patterns** | Glob patterns: `*.jar`, `**` (recursive) |
| **Durée** | Configurable (10 builds, 30 jours, 5 artifacts) |
| **Use case** | Déploiement, releases, debugging |
