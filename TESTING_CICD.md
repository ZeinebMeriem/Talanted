# Comment Tester le Pipeline CI/CD

## 🏠 **Méthode 1: Tester Localement (Sans GitHub)**

### Étape 1: Run le script de test local

```bash
# Depuis la racine du projet
bash scripts/run-ci-locally.sh
```

**Cela teste:**
- ✅ Frontend: TypeScript, Build, Dependencies
- ✅ Backend: Maven build, Tests
- ✅ FastAPI: Python syntax, Tests

**Output attendu:**
```
🚀 Testing CI/CD Pipeline Locally
==================================

FRONTEND CI
========================================
→ 1. Install dependencies
✓ PASSED

→ 2. TypeScript type check
✓ PASSED

→ 3. Build frontend
✓ PASSED

...

SUMMARY
========================================
Passed: 9
Failed: 0
✅ All checks passed locally!
```

---

### Étape 2: Tester chaque service individuellement

**Frontend:**
```bash
cd frontend
npm ci           # Install deps
npm run build    # Builds TypeScript + Vite
npx tsc --noEmit # Type check
```

**Backend:**
```bash
cd spring-bff
mvn clean package -DskipTests  # Build JAR
mvn test                       # Run tests (requires Docker)
```

**FastAPI:**
```bash
cd fastapi-ai
pip install -r requirements.txt
pytest tests/ -v               # Run tests
```

---

## 🌐 **Méthode 2: Tester sur GitHub**

### Étape 1: Initialiser un repo GitHub

```bash
# Si vous n'avez pas encore de repo GitHub:
git init
git add .
git commit -m "Initial commit"

# Ajouter remote (remplacer YOUR_ORG et YOUR_REPO)
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Étape 2: Créer une Pull Request

```bash
# Créer une branche de test
git checkout -b test/ci-pipeline

# Faire une petite modification (ex: update README)
echo "" >> README.md

# Commit et push
git add README.md
git commit -m "test: trigger CI pipeline"
git push origin test/ci-pipeline
```

Puis sur GitHub:
1. Allez dans votre repo
2. Cliquez **"Compare & pull request"**
3. Laissez la PR ouverte

### Étape 3: Regarder les workflows en direct

1. Allez à **Actions** tab
2. Sélectionnez **"Full Stack CI"** workflow
3. Vous verrez:
   ```
   Frontend CI - Running...
   Backend CI - Running...
   FastAPI CI - Running...
   Docker Build Check - Queued...
   ```

---

## 📊 **Voir les Résultats du Pipeline**

### 1. **Dashboard Actions**

```
https://github.com/YOUR_ORG/YOUR_REPO/actions
```

Vous verrez:
- ✅ **Frontend CI** - avec status (success/failure)
- ✅ **Backend CI** - avec status
- ✅ **FastAPI CI** - avec status
- ✅ **Full Stack CI** - résumé global

### 2. **Détails d'un workflow**

Cliquez sur "Full Stack CI" → Voyez tous les jobs:

```
Frontend CI / Test & Build Frontend
└─ ✓ Setup Node.js
└─ ✓ Install dependencies
└─ ✓ Type check
└─ ✓ Build
└─ ✓ Upload artifacts

Backend CI / Build & Test Spring BFF
└─ ✓ Setup JDK 17
└─ ✓ Build with Maven
└─ ✓ Run tests
└─ ✓ Upload test reports

FastAPI CI / Test & Lint FastAPI
└─ ✓ Install dependencies
└─ ✓ Python syntax check
└─ ✓ Run tests
└─ ✓ Upload coverage
```

### 3. **Logs détaillés**

Cliquez sur chaque **job** → Voyez:
- ✅ Logs complets
- ✅ Temps d'exécution
- ✅ Artifacts générés
- ✅ Erreurs (le cas échéant)

---

## 🔍 **Interpréter les Résultats**

### ✅ **Succès (Green)**
```
✓ Frontend CI - PASSED (2m 34s)
✓ Backend CI - PASSED (5m 12s)
✓ FastAPI CI - PASSED (3m 18s)
✓ Docker Build Check - PASSED (1m 45s)
```

→ Tous les tests passent, vous pouvez merger la PR!

### ❌ **Échec (Red)**
```
✗ Frontend CI - FAILED (2m 34s)
  → TypeScript compilation error
  → See logs for details
```

Cliquez sur le job ❌ → Lisez le log:
```
src/App.tsx:10:5 - error TS2345: Argument of type
'string' is not assignable to parameter of type 'number'
```

---

## 🔧 **Tester Spécifiquement Chaque Workflow**

### Tester Frontend seul

Modifiez seulement des fichiers `frontend/`:
```bash
echo "test" >> frontend/src/App.tsx
git add frontend/
git commit -m "test: frontend change"
git push
```

→ Seul **Frontend CI** s'exécute (plus rapide)

### Tester Backend seul

Modifiez seulement des fichiers `spring-bff/`:
```bash
echo "test" >> spring-bff/pom.xml
git add spring-bff/
git commit -m "test: backend change"
git push
```

→ Seul **Backend CI** s'exécute

### Tester FastAPI seul

Modifiez seulement des fichiers `fastapi-ai/`:
```bash
echo "test" >> fastapi-ai/requirements.txt
git add fastapi-ai/
git commit -m "test: fastapi change"
git push
```

→ Seul **FastAPI CI** s'exécute

---

## 📈 **Exemples de Workflows**

### Exemple 1: Tests passent ✅

```
🌍 GitHub Actions - Front page

My Repository > Actions

RECENT WORKFLOWS
┌─────────────────────────────────────────┐
│ Full Stack CI                           │
│ test/ci-pipeline pushed                 │
│ ✓ PASSED (12m 34s)                      │
│                                         │
│ Frontend CI ✓                           │
│ Backend CI ✓                            │
│ FastAPI CI ✓                            │
│ Docker Build Check ✓                    │
└─────────────────────────────────────────┘
```

### Exemple 2: Frontend failing ❌

```
Full Stack CI

Jobs
├─ Frontend CI ✗ FAILED (2m 34s)
│  └─ Step: Build
│     Error: npm ERR! code ERESOLVE
│     Unable to resolve dependency tree
│
├─ Backend CI ⏭ SKIPPED
├─ FastAPI CI ⏭ SKIPPED
└─ Docker Build Check ⏭ SKIPPED
```

---

## 🐛 **Dépanner les Erreurs**

### Erreur: "No workflows found"
```bash
# Vérifier que les fichiers workflow existent
ls -la .github/workflows/

# Vérifier la syntaxe YAML
yamllint .github/workflows/
```

### Erreur: "npm ERR! Unable to resolve dependency tree"
```bash
# Localement:
cd frontend
rm -rf node_modules package-lock.json
npm install  # Réinstall clean
npm run build
```

### Erreur: "Maven build failed"
```bash
# Localement:
cd spring-bff
mvn clean
mvn install -DskipTests
mvn test
```

### Erreur: "Python test failed"
```bash
# Localement:
cd fastapi-ai
pip install --upgrade pip
pip install -r requirements.txt
pytest tests/ -v
```

---

## 📝 **Checklist: Tester Complètement**

### Local Test Checklist ✓
- [ ] Frontend builds sans erreurs
- [ ] TypeScript strict mode passe
- [ ] Backend Maven build réussit
- [ ] FastAPI tests passent
- [ ] Run script local complètement

### GitHub Test Checklist ✓
- [ ] Push vers GitHub réussit
- [ ] Actions tab montre les workflows
- [ ] Tous les jobs deviennent verts ✓
- [ ] Artifacts sont uploadés
- [ ] Pas d'erreurs dans les logs

### Deployment Test Checklist ✓ (optionnel)
- [ ] Docker Hub secrets configurés
- [ ] Push vers `main` déclenche Deploy
- [ ] Images pushées à Docker registy
- [ ] Tags `latest` et SHA présents

---

## 📚 **Quick Links**

```
GitHub Actions Tab:
  https://github.com/YOUR_ORG/YOUR_REPO/actions

Workflow Artifacts:
  https://github.com/YOUR_ORG/YOUR_REPO/actions → Job → Artifacts

Workflow Logs:
  https://github.com/YOUR_ORG/YOUR_REPO/actions → Job → Logs

Local Test Docs:
  Read: .github/CICD.md
  Read: .github/SETUP.md
```

---

## 🎯 **Étapes Rapides**

**Test local (5 minutes):**
```bash
bash scripts/run-ci-locally.sh
```

**Test GitHub (10 minutes):**
```bash
git checkout -b test/ci
echo "test" >> README.md
git add README.md
git commit -m "test: CI"
git push origin test/ci
# Go to GitHub → Open PR → Watch Actions
```

**Voir les résultats:**
- Local: `✅ Script output`
- GitHub: `https://github.com/YOUR_ORG/YOUR_REPO/actions`

