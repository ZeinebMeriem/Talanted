# Persistence des Données - Docker & Volumes

## 🎯 La Question: Si je fais `docker compose down`, mes données disparaissent-elles?

**Réponse courte**:
```
docker compose down          → Containers arrêtés ✅ Données PERSISTENT
docker compose down -v       → Containers + volumes SUPPRIMÉS ❌ PERTE DE DONNÉES
```

---

## 📊 État Actuel: Volumes dans Notre Stack

### Volumes Nommés (Docker-managed)

```yaml
# docker-compose.yml, ligne 299-305
volumes:
  mongo_data:              ← MongoDB (10 projets, users)
  minio_data:              ← MinIO (fichiers, avatars)
  keycloak_data:           ← Keycloak (realm config, users)
  sonarqube_db_data:       ← SonarQube database
  sonarqube_data:          ← SonarQube reports
  sonarqube_logs:          ← SonarQube logs
```

### Bind Mounts (Host filesystem)

```yaml
# fastapi-ai service
volumes:
  - ./projects:/app/projects        ← Generated code (local disk)

# frontend service
volumes:
  - ./frontend/src:/app/src         ← Source React (local disk)
```

---

## 🔄 Flowchart: Avant/Après Docker Restart

### Scenario 1: `docker compose down` (normal)

```
BEFORE:
  Docker running:
    ✅ MongoDB container (ai-ui-mongo)
    ✅ MinIO container (ai-ui-minio)
    ✅ Keycloak container (ai-ui-keycloak)
    ✅ Spring BFF container
    ✅ React frontend
    ✅ FastAPI container

  Volumes: MOUNTED
  Data in Docker volumes & bind mounts

COMMAND: docker compose down

DURING:
  ✅ Containers STOP
  ✅ Network REMOVED
  ✅ Volumes UNMOUNTED from containers
  ✅ Volumes REMAIN on disk
  ✅ Bind mounts REMAIN on disk

AFTER:
  ❌ No containers running
  ✅ Data SAFE on disk:
     - /var/lib/docker/volumes/ai-ui-generator_mongo_data/_data/
     - /var/lib/docker/volumes/ai-ui-generator_minio_data/_data/
     - /var/lib/docker/volumes/ai-ui-generator_keycloak_data/_data/
     - ./projects/ (local)
     - ./frontend/src/ (local)

RESTART: docker compose up

  ✅ Containers START
  ✅ Volumes REMOUNT
  ✅ Data REAPPEARS
  ✅ No data loss!
```

### Scenario 2: `docker compose down -v` (DANGER!)

```
BEFORE: Same as above

COMMAND: docker compose down -v

DURING:
  ✅ Containers STOP
  ❌ Volumes DELETED
  ✅ Bind mounts REMAIN (local ./projects/)

AFTER:
  ❌ mongodb_data: GONE (all projects lost!)
  ❌ minio_data: GONE (all uploaded files lost!)
  ❌ keycloak_data: GONE (all users lost!)
  ✅ ./projects/: Still there
  ✅ ./frontend/src/: Still there

RESULT: ☠️ Data loss (MongoDB, MinIO, Keycloak)
```

---

## 📈 Où Sont Les Données Exactement?

### MongoDB (10 Projets)

```
Docker Volume:
  /var/lib/docker/volumes/ai-ui-generator_mongo_data/_data/
                                                    ↓
  Contains: MongoDB data files (BSON format)
  Size: ~100 MB (10 projects)

What's stored:
  • generation collection (projects, code, versions)
  • userProfile collection (avatars, bios, timezone)
  • auditEvent collection (user actions)
  • codeVersion collection (rollback history)

Survit à:
  ✅ docker compose down
  ✅ docker compose stop
  ❌ docker compose down -v
  ❌ docker volume rm ai-ui-generator_mongo_data
```

### MinIO (Fichiers & Avatars)

```
Docker Volume:
  /var/lib/docker/volumes/ai-ui-generator_minio_data/_data/
                                                      ↓
  Contains: S3-compatible files
  Size: ~200 MB (if users uploaded images)

What's stored:
  • Generated code bundles (.zip files)
  • Avatar images (user profiles)
  • Accessibility reports (PDF, JSON)
  • Generated dist/ bundles

Survit à:
  ✅ docker compose down
  ✅ docker compose stop
  ❌ docker compose down -v
  ❌ docker volume rm ai-ui-generator_minio_data
```

### Keycloak (Users & Realm)

```
Docker Volume:
  /var/lib/docker/volumes/ai-ui-generator_keycloak_data/_data/
                                                        ↓
  Contains: Keycloak internal database
  Size: ~50 MB (1000 users)

What's stored:
  • Users (admin, developpeur, etc.)
  • Realm configuration (ai-ui realm)
  • Login sessions
  • API tokens
  • OTP seeds (2FA)

Survit à:
  ✅ docker compose down
  ✅ docker compose stop
  ❌ docker compose down -v
  ❌ docker volume rm ai-ui-generator_keycloak_data
```

### Local ./projects/ (Generated Code)

```
Bind Mount (Host filesystem):
  c:\Users\merye\Downloads\ai-ui-generator-fixed\projects\
                                         ↓
  Contains: Generated code directories
  Size: Varies (each project ~50-100 MB)

Structure:
  projects/
  ├── project-1/
  │   ├── src/components/
  │   ├── src/pages/
  │   └── dist/ (compiled)
  ├── project-2/
  └── ...

Survit à:
  ✅ docker compose down
  ✅ docker compose down -v ← Still safe!
  ✅ docker system prune -a
  ✅ Anything (it's on your host disk)
```

### ./frontend/src/ (Source)

```
Bind Mount (Host filesystem):
  c:\Users\merye\Downloads\ai-ui-generator-fixed\frontend\src\
                                          ↓
  Contains: React source code
  Size: ~50 MB

What's stored:
  • .tsx components
  • Editor logic
  • API client
  • Styles

Survit à:
  ✅ Everything (on your host disk, git tracked)
```

---

## 🛡️ Test: Verify Persistence

### Step 1: Start system

```bash
docker compose up -d
```

### Step 2: Create a project in UI

```
1. Open http://localhost:5173
2. Create project: "Test Persistence"
3. Generate UI
4. Upload avatar in profile
5. Verify data shows
```

### Step 3: Stop docker (normal way)

```bash
docker compose down

# Wait 5 seconds

docker ps  # Should show: CONTAINER ID  IMAGE  STATUS
           # (empty list - all stopped)
```

### Step 4: **Verify data is still on disk**

```bash
# Check MongoDB volume still exists
docker volume ls | grep mongo_data
# Output: DRIVER  local  local   ai-ui-generator_mongo_data

# Check MinIO volume still exists
docker volume ls | grep minio_data
# Output: DRIVER  local  local   ai-ui-generator_minio_data

# Check local ./projects/ still exists
ls -la projects/
# Output: drwx... test-persistence-project/
```

### Step 5: Restart system

```bash
docker compose up -d

# Wait for health checks (30 seconds)
```

### Step 6: **Verify data is BACK**

```
1. Open http://localhost:5173
2. Login again (Keycloak data restored)
3. Projects list shows "Test Persistence" ✅
4. Your profile avatar is there ✅
5. Generated code still in project ✅
```

---

## ⚠️ Dangerous Commands (Don't Do These)

### ❌ DANGEROUS: Remove volumes

```bash
docker compose down -v

# This DELETES:
#   ✅ mongo_data → LOSE ALL PROJECTS
#   ✅ minio_data → LOSE ALL FILES
#   ✅ keycloak_data → LOSE ALL USERS
#   ✓ But keeps ./projects/ (local disk)
```

### ❌ DANGEROUS: Remove specific volume

```bash
docker volume rm ai-ui-generator_mongo_data

# Deletes MongoDB BEFORE data backup!
```

### ❌ DANGEROUS: System prune all

```bash
docker system prune -a

# This KEEPS volumes:
#   ✅ Volumes safe (--volumes flag needed)
# This REMOVES:
#   ✅ Unused images
#   ✅ Stopped containers
```

### ❌ DANGEROUS: Wrong compose file

```bash
cd ../other-project/
docker compose down

# Might stop WRONG containers!
```

---

## ✅ Safe Operations

### Safe: Stop without removing

```bash
docker compose stop

# Containers PAUSE
# Data REMAINS
# Easy to restart: docker compose start
```

### Safe: Down (normal)

```bash
docker compose down

# Containers REMOVED
# Networks REMOVED
# Volumes REMAIN ✅
# Data PERSISTENT ✅
```

### Safe: Restart

```bash
docker compose restart

# Containers RESTART with same data
# Volumes NOT touched
```

### Safe: Pull updates + restart

```bash
docker compose pull
docker compose up -d

# Gets latest images
# Restarts with existing volumes
# Data NOT lost
```

---

## 🔐 Backup Strategy

### What to Backup

```
1. CRITICAL: Docker volumes
   - mongo_data       (most important)
   - minio_data       (files + avatars)
   - keycloak_data    (users + config)

2. IMPORTANT: Local bind mounts
   - ./projects/      (generated code)
   - ./frontend/src/  (should be git!)
   - ./keycloak/      (realm config)

3. NICE-TO-HAVE: SonarQube
   - sonarqube_data
   - sonarqube_db_data
```

### Backup MongoDB

```bash
# Method 1: Docker exec to mongodump

docker exec ai-ui-mongo mongodump \
  --out=/backup/mongo_dump

# Wait for completion

docker cp ai-ui-mongo:/backup/mongo_dump ./backup/mongo_dump_$(date +%Y%m%d)
```

### Backup MinIO

```bash
# Method 1: Direct filesystem copy
cp -r /var/lib/docker/volumes/ai-ui-generator_minio_data/_data \
      ./backup/minio_backup_$(date +%Y%m%d)

# Method 2: Using mc (MinIO client)
mc cp --recursive local/ai-ui-files ./backup/minio_files/
```

### Backup Everything (Easy Way)

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Stop services (safer)
docker compose down

# Copy volumes
cp -r /var/lib/docker/volumes/ai-ui-generator_mongo_data/_data "$BACKUP_DIR/mongo"
cp -r /var/lib/docker/volumes/ai-ui-generator_minio_data/_data "$BACKUP_DIR/minio"
cp -r /var/lib/docker/volumes/ai-ui-generator_keycloak_data/_data "$BACKUP_DIR/keycloak"

# Copy local data
cp -r ./projects "$BACKUP_DIR/projects"
cp -r ./keycloak "$BACKUP_DIR/keycloak_config"

# Restart
docker compose up -d

echo "Backup complete: $BACKUP_DIR"
```

### Restore from Backup

```bash
#!/bin/bash
# restore.sh

BACKUP_DIR="./backups/20260512_140000"

# Stop services
docker compose down

# Remove old volumes
docker volume rm ai-ui-generator_mongo_data
docker volume rm ai-ui-generator_minio_data
docker volume rm ai-ui-generator_keycloak_data

# Create fresh volumes
docker volume create ai-ui-generator_mongo_data
docker volume create ai-ui-generator_minio_data
docker volume create ai-ui-generator_keycloak_data

# Restore data
cp -r "$BACKUP_DIR/mongo" /var/lib/docker/volumes/ai-ui-generator_mongo_data/_data
cp -r "$BACKUP_DIR/minio" /var/lib/docker/volumes/ai-ui-generator_minio_data/_data
cp -r "$BACKUP_DIR/keycloak" /var/lib/docker/volumes/ai-ui-generator_keycloak_data/_data

# Restore local data
rm -rf ./projects ./keycloak
cp -r "$BACKUP_DIR/projects" ./
cp -r "$BACKUP_DIR/keycloak_config" ./keycloak

# Restart
docker compose up -d

echo "Restore complete from: $BACKUP_DIR"
```

---

## 📊 Current Persistence Status

### Our Stack: 100% PERSISTENT ✅

```
Component        Storage              Status      Risk Level
──────────────────────────────────────────────────────────────
MongoDB          Docker volume        Persistent  🟢 Low
MinIO            Docker volume        Persistent  🟢 Low
Keycloak         Docker volume        Persistent  🟢 Low
Projects (code)  ./projects/ (local)  Persistent  🟢 Low
Frontend source  ./frontend/src/ (git) Version-controlled 🟢 Low
SonarQube        Docker volumes       Persistent  🟡 Medium (less critical)

Overall Risk:    🟢 Very Low (proper volumes configured)
```

---

## 🎯 Summary: The One Command You Need

```bash
# SAFE - Use this for normal stop/restart
docker compose down

# After that, data is SAFE on disk
# To restart:
docker compose up -d

# EVERYTHING comes back with all data intact ✅
```

---

## 🚨 REMEMBER

| Action | Volumes | Data | Result |
|--------|---------|------|--------|
| `docker compose stop` | Stay mounted | SAFE ✅ | Can restart anytime |
| `docker compose down` | Unmount but keep | SAFE ✅ | Default, use this |
| `docker compose down -v` | DELETED | LOST ❌ | Don't do this! |
| `docker volume rm NAME` | DELETED | LOST ❌ | Don't do this! |
| Power off computer | N/A | SAFE ✅ | Data on disk, restarts OK |
| Computer SSD fails | N/A | LOST ❌ | Reason to backup! |
