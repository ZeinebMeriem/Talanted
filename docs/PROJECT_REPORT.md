# AI UI Generator — Rapport Technique Complet
### Projet de Fin d'Études — Talan
---

## Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Architecture Globale](#2-architecture-globale)
3. [Stack Technologique](#3-stack-technologique)
4. [Description Détaillée des Services](#4-description-détaillée-des-services)
   - 4.1 Frontend — React/Vite
   - 4.2 Spring BFF — Java/Spring Boot
   - 4.3 FastAPI AI Pipeline — Python
   - 4.4 Keycloak — Authentification
   - 4.5 MongoDB — Base de Données
   - 4.6 MinIO — Stockage Fichiers
5. [Fonctionnalités Implémentées](#5-fonctionnalités-implémentées)
6. [Sécurité](#6-sécurité)
7. [Pipeline AI Multi-Agent](#7-pipeline-ai-multi-agent)
8. [Module Utilisateur](#8-module-utilisateur)
9. [Thème Keycloak Personnalisé](#9-thème-keycloak-personnalisé)
10. [Structure du Projet](#10-structure-du-projet)
11. [Guide de Démarrage](#11-guide-de-démarrage)
12. [Valeur Ajoutée vs Concurrents](#12-valeur-ajoutée-vs-concurrents)
13. [Axes d'Amélioration Recommandés](#13-axes-damélioration-recommandés)

---

## 1. Présentation du Projet

**AI UI Generator** est une application web full-stack qui permet à un utilisateur de décrire une interface utilisateur en langage naturel et de recevoir en retour une application front-end fonctionnelle, complète et prête à utiliser.

### Objectif Principal
Automatiser la création d'interfaces utilisateur grâce à l'intelligence artificielle, en réduisant le temps de développement front-end de plusieurs jours à quelques secondes.

### Cas d'Usage
- Prototypage rapide d'interfaces pour des projets clients
- Génération de maquettes fonctionnelles pour des démonstrations
- Aide au développement front-end pour des équipes non spécialisées
- Exploration de concepts UI à partir d'une simple description textuelle

### Contexte Entreprise
Ce projet a été développé dans le cadre d'un PFE chez **Talan**, une société de conseil en technologies. Talan travaille avec des clients dans des secteurs variés (banque, assurance, industrie) où la rapidité de prototypage et la sécurité des données sont des enjeux critiques.

---

## 2. Architecture Globale

Le projet suit une **architecture microservices** : chaque composant est indépendant, déployé dans son propre conteneur Docker, et communique via des API REST.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                    │
│                                                                 │
│  ┌──────────────┐  JWT   ┌───────────────┐  HTTP  ┌──────────┐ │
│  │   Frontend   │───────▶│  Spring BFF   │───────▶│ FastAPI  │ │
│  │  React/Vite  │        │  Java :8081   │        │ AI :8000 │ │
│  │  :5173       │        └───────────────┘        └──────────┘ │
│  └──────────────┘               │  │                    │      │
│         │                       │  │              ┌─────┴────┐  │
│         │                  ┌────┘  └────┐         │  MinIO   │  │
│         │                  ▼           ▼          │ :9000    │  │
│         │            ┌──────────┐ ┌─────────┐    └──────────┘  │
│         │            │ MongoDB  │ │  MinIO  │                   │
│         │            │ :27017   │ │ (Files) │                   │
│         │            └──────────┘ └─────────┘                   │
│         │                                                       │
│         ▼  OIDC/OAuth2                                          │
│  ┌──────────────┐                                               │
│  │  Keycloak    │                                               │
│  │  Auth :8083  │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de Données Principal

```
1. Utilisateur ouvre l'app (localhost:5173)
        ↓
2. Redirection vers Keycloak pour authentification
        ↓
3. Keycloak émet un JWT token (OAuth2/OIDC)
        ↓
4. Utilisateur saisit un prompt ("Crée un dashboard e-commerce")
        ↓
5. Frontend envoie la requête au Spring BFF avec le JWT
        ↓
6. Spring BFF valide le JWT, crée une entrée MongoDB, appelle FastAPI
        ↓
7. FastAPI exécute le pipeline multi-agents (8 agents AI)
        ↓
8. Code généré (React/HTML) stocké dans MinIO
        ↓
9. Spring BFF retourne le bundle de code au Frontend
        ↓
10. Frontend affiche l'aperçu live + éditeur de code
```

---

## 3. Stack Technologique

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Frontend | React + TypeScript | 18 | Écosystème riche, typage fort |
| Build Tool | Vite | 5 | Hot reload ultra-rapide |
| Styling | TailwindCSS | 3 | Utility-first, productivité |
| Auth Client | react-oidc-context | 3 | Bibliothèque OIDC pour React |
| Backend | Spring Boot | 3.x | Standard entreprise Java |
| Security | Spring Security OAuth2 | 6 | Validation JWT robuste |
| Data | Spring Data MongoDB | 4 | ODM MongoDB pour Java |
| AI Pipeline | FastAPI | Python 3.11 | Ideal pour I/O async + LLM |
| LLM Provider | Google Gemini 2.0 Flash | — | 4M TPM gratuit, rapide |
| Auth Server | Keycloak | 25.0.6 | IAM open-source enterprise |
| Database | MongoDB | 7 | Schéma flexible pour JSON |
| File Storage | MinIO | 2025 | S3-compatible, auto-hébergé |
| Containerisation | Docker Compose | — | Déploiement reproductible |

---

## 4. Description Détaillée des Services

### 4.1 Frontend — React/Vite (`:5173`)

**Fichiers clés :**
- `App.tsx` — Wrapper d'authentification, gère le flux OIDC
- `AiEditor.tsx` — Composant principal (~2300 lignes), toute l'interface
- `api.ts` — Client API typé vers le Spring BFF

**Fonctionnement de l'authentification :**
```typescript
// App.tsx — Si non authentifié, redirection Keycloak
if (!auth.isAuthenticated) {
  auth.signinRedirect()
  return <LoadingScreen />
}
// Extraction des claims JWT
const profile = auth.user?.profile
const username = profile?.preferred_username
const email = profile?.email
const accessToken = auth.user?.access_token
```

**Structure de navigation (3 onglets) :**
1. **Home (⌂)** — Formulaire de génération + aperçu des projets récents
2. **All Projects (⊞)** — Grille de cartes avec miniatures, dates, statuts
3. **Profile (◉)** — Informations utilisateur + statistiques MongoDB

**Gestion d'état principale :**
```typescript
const [homeTab, setHomeTab] = useState<'create' | 'projects' | 'profile'>('create')
const [apiResult, setApiResult] = useState<GenerationApiResponse | null>(null)
const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
const [ideVisible, setIdeVisible] = useState(false)
const [history, setHistory] = useState<GenerationListItem[]>([])
const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
const [userStats, setUserStats] = useState<UserStats | null>(null)
```

**IDE intégré (quand un projet est ouvert) :**
- Arborescence de fichiers (tree view)
- Éditeur de code avec coloration syntaxique
- Aperçu live (iframe avec srcdoc)
- Onglet Logs (pipeline AI)
- Historique des versions + rollback
- Téléchargement ZIP

---

### 4.2 Spring BFF — Java/Spring Boot (`:8081`)

**Pattern BFF (Backend For Frontend) :**
Le BFF est le seul point d'entrée pour le frontend. Il agrège, transforme et sécurise les appels vers les services internes.

**Contrôleurs REST :**

| Contrôleur | Endpoints | Rôle |
|-----------|-----------|------|
| `GenerationController` | `POST /api/generations` | Créer une génération |
| | `GET /api/generations` | Lister les 50 dernières |
| | `GET /api/generations/{id}/code` | Récupérer le bundle de code |
| | `GET /api/generations/{id}/versions` | Historique des versions |
| | `POST /api/generations/{id}/rollback` | Rollback de version |
| | `GET /api/generations/{id}/audit` | Logs d'audit |
| `UserController` | `GET /api/user/me` | Profil depuis JWT |
| | `GET /api/user/stats` | Statistiques MongoDB |
| `ExportController` | `GET /api/generations/{id}/export` | Export ZIP |
| `SessionController` | `GET /api/session` | Info session |

**UserController — extraction des claims JWT :**
```java
@GetMapping("/me")
public ResponseEntity<Map<String, Object>> me(JwtAuthenticationToken token) {
    Map<String, Object> claims = token.getToken().getClaims();
    result.put("userId", claims.get("sub"));
    result.put("username", claims.get("preferred_username"));
    result.put("email", claims.get("email"));
    result.put("roles", getRolesFromRealmAccess(claims));
    return ResponseEntity.ok(result);
}

@GetMapping("/stats")
public ResponseEntity<Map<String, Object>> stats(JwtAuthenticationToken token) {
    long total = generationRepo.count();
    long completed = generationRepo.countByStatus(GenerationStatus.COMPLETED);
    long successRate = total > 0 ? Math.round((completed * 100.0) / total) : 0;
    // ...
}
```

**Configuration sécurité (SecurityConfig.java) :**
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/health/**").permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/api/**").authenticated()
    .anyRequest().permitAll())
.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
```

**Repositories MongoDB (Spring Data) :**
```java
// GenerationRepository.java
public interface GenerationRepository extends MongoRepository<Generation, String> {
    List<Generation> findTop50ByOrderByCreatedAtDesc();
    long countByStatus(GenerationStatus status);
}
```

---

### 4.3 FastAPI AI Pipeline — Python (`:8000`)

**Endpoints :**
- `GET /health` — Health check
- `POST /internal/generate` — Lancer une génération

**Modèles Pydantic (schemas.py) :**
```python
class GenerateRequest(BaseModel):
    generationId: str
    prompt: str
    mode: Literal['full', 'codegen_only'] = 'full'
    fileRefs: list[FileRef] = []
    uiSpec: dict | None = None

class GenerateResponse(BaseModel):
    uiSpec: dict
    codeBundle: CodeBundle       # {files: [{path, content}]}
    aiReport: AiReport           # {score, issues, llm_provider, pipeline, durations}
```

**Providers LLM supportés :**
```python
# llm_provider.py — sélection automatique selon config
PROVIDERS = {
    "gemini":  GeminiProvider,    # Google Gemini 2.0 Flash (défaut)
    "groq":    GroqProvider,      # Groq llama-3.3-70b
    "openai":  OpenAIProvider,    # OpenAI gpt-4o-mini
    "ollama":  OllamaProvider,    # Local (fallback air-gapped)
}
```

---

### 4.4 Keycloak — Authentification (`:8083`)

**Realm configuré : `ai-ui`**

**Configuration (`realm-ai-ui.json`) :**
```json
{
  "realm": "ai-ui",
  "displayName": "AI UI Generator",
  "loginTheme": "ai-ui-theme",
  "registrationAllowed": true,
  "loginWithEmailAllowed": true,
  "clients": [
    {
      "clientId": "ai-ui-frontend",
      "publicClient": true,
      "redirectUris": ["http://localhost:5173/*"],
      "standardFlowEnabled": true
    }
  ]
}
```

**Flux OAuth2 Authorization Code :**
```
1. Frontend redirige vers Keycloak (/authorize)
2. Keycloak affiche la page de connexion personnalisée
3. Utilisateur entre ses credentials
4. Keycloak émet un authorization code
5. Frontend échange le code contre un access_token (JWT)
6. JWT envoyé dans chaque requête API → Spring BFF
```

**JWT Claims utilisés :**
```json
{
  "sub": "uuid-keycloak-user-id",
  "preferred_username": "meriem",
  "email": "meriem@talan.com",
  "given_name": "Meriem",
  "family_name": "Boukraa",
  "realm_access": { "roles": ["user", "admin"] }
}
```

---

### 4.5 MongoDB (`:27017`)

**Collections :**

| Collection | Document | Contenu |
|-----------|---------|---------|
| `generations` | `Generation` | generationId, prompt, status, createdAt, activeVersion |
| `generation_files` | `GenerationFile` | Métadonnées des fichiers générés |
| `code_versions` | `CodeVersion` | Historique des versions de code |
| `ui_spec_versions` | `UiSpecVersion` | Historique des specs UI |
| `ai_reports` | `AiReport` | Score, issues, provider LLM, durées |
| `audit_events` | `AuditEvent` | Log de chaque action utilisateur |

---

### 4.6 MinIO — Stockage Fichiers (`:9000`)

- Compatible API S3 Amazon
- Stocke les fichiers générés (HTML, CSS, JSX, assets)
- Accessible depuis Spring BFF et FastAPI
- Remplaçable par AWS S3 ou Azure Blob Storage en production sans changement de code

---

## 5. Fonctionnalités Implémentées

### Génération d'Interface
- Saisie d'un prompt en langage naturel
- Upload de fichiers (images, documents) pour contextualiser la génération
- Sélection du framework de sortie (React ou HTML/CSS)
- Affichage en temps réel du progression du build

### Éditeur IDE Intégré
- Arborescence de fichiers générés
- Visualisation du code source avec coloration syntaxique
- Aperçu live dans une iframe (hot-reload)
- Onglet Logs : trace complète du pipeline AI
- Onglet Console : erreurs JavaScript du rendu

### Gestion des Projets
- Liste des 50 derniers projets (tri par date)
- Carte projet avec : miniature SVG générée, nom, date, statut
- Ouverture d'un projet depuis l'historique (rechargement du bundle MinIO)
- Barre de recherche / filtrage

### Versioning
- Chaque génération conserve un historique de versions
- Rollback possible vers n'importe quelle version précédente
- Comparaison des versions dans l'interface

### Export
- Téléchargement ZIP du projet complet
- Structure de fichiers préservée

### Module Utilisateur
- Page profil : nom, email, badge "email vérifié", rôles Keycloak
- Statistiques en temps réel depuis MongoDB :
  - Total projets générés
  - Projets complétés avec succès
  - Taux de succès (%)
- Activité récente : 5 derniers projets, cliquables
- Bouton de déconnexion

### Authentification Complète
- Connexion via Keycloak (OAuth2/OIDC)
- Inscription utilisateur (self-registration)
- Page login/register entièrement personnalisée (thème sombre)
- Sessions JWT stateless

### Audit
- Chaque action sur une génération est enregistrée
- Log consultable dans l'interface

---

## 6. Sécurité

### Couches de Sécurité

```
Layer 1 — Authentication  : Keycloak (OAuth2/OIDC)
Layer 2 — Authorization   : Spring Security (JWT validation)
Layer 3 — Transport       : HTTPS en production
Layer 4 — CORS            : Origines autorisées configurables
Layer 5 — CSRF            : Désactivé (API REST stateless — correct)
Layer 6 — Input Validation: UploadValidator.java (taille, type de fichier)
```

### Validation JWT (Spring BFF)
```java
// SecurityConfig.java
NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
decoder.setJwtValidator(withIssuer);
```

Chaque requête à `/api/**` :
1. Extrait le token `Authorization: Bearer <jwt>`
2. Vérifie la signature avec les clés publiques Keycloak (JWKS)
3. Vérifie l'issuer et l'expiration
4. Injecte `JwtAuthenticationToken` dans le contexte Spring

---

## 7. Pipeline AI Multi-Agent

Le cœur du projet est le pipeline FastAPI qui orchestre 8 agents spécialisés :

```
Prompt Utilisateur
       │
       ▼
┌─────────────┐   Extrait texte des images uploadées
│  OcrAgent   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐   Extrait texte des documents (PDF, DOCX)
│ DocExtractAgent  │
└──────┬───────────┘
       │
       ▼
┌──────────────┐   Nettoie et prépare le texte
│ TextPrepAgent│
└──────┬───────┘
       │
       ▼
┌──────────────┐   Crée la spec UI (layout, composants, pages)
│ PlannerAgent │◀── Gemini 2.0 Flash
└──────┬───────┘
       │
       ▼
┌─────────────────────┐   Génère les tokens de design
│ DesignSystemAgent   │   (couleurs, typographie, spacing)
└──────┬──────────────┘
       │
       ▼
┌──────────────────┐   Génère le code fichier par fichier
│ LlmCodegenAgent  │◀── Gemini 2.0 Flash
└──────┬───────────┘
       │
       ▼
┌────────────┐   Intègre les images Pexels
│ ImageAgent │
└──────┬─────┘
       │
       ▼
┌───────────────┐   Valide le code généré
│ ValidatorAgent│
└──────┬────────┘
       │
       ▼
{uiSpec, codeBundle, aiReport} → MongoDB + MinIO
```

**Avantage de l'architecture multi-agents :**
Chaque agent a une responsabilité unique. Si la génération d'images échoue, le code est tout de même livré. Si le validateur trouve des erreurs, elles sont reportées sans bloquer.

---

## 8. Module Utilisateur

Implémenté en trois couches :

**Backend — `UserController.java` :**
- `GET /api/user/me` → extrait les claims du JWT Keycloak (sub, email, username, roles)
- `GET /api/user/stats` → requête MongoDB : count total + count COMPLETED

**Frontend — `api.ts` :**
```typescript
export type UserProfile = {
  userId?: string; username?: string; email?: string;
  emailVerified?: boolean; firstName?: string; lastName?: string;
  roles?: string[]
}
export type UserStats = {
  totalGenerations?: number; completedGenerations?: number; successRate?: number
}
export async function getMe(accessToken?: string): Promise<UserProfile>
export async function getUserStats(accessToken?: string): Promise<UserStats>
```

**UI — `AiEditor.tsx` :**
- Les deux appels sont parallélisés : `await Promise.all([getMe(), getUserStats()])`
- Chargé en lazy (seulement quand l'onglet Profile est visité pour la première fois)

---

## 9. Thème Keycloak Personnalisé

**Problème :** La page de connexion par défaut de Keycloak est générique (fond blanc, bouton bleu basique) — incohérente avec le design sombre de l'application.

**Solution :** Création d'un thème Keycloak complet (`ai-ui-theme`) :

```
keycloak/themes/ai-ui-theme/
  login/
    theme.properties          ← Déclare le thème (parent: base)
    login.ftl                 ← Template FreeMarker page de connexion
    register.ftl              ← Template FreeMarker page d'inscription
    resources/css/login.css   ← CSS complet (dark theme)
```

**Design de la page login/register :**
- Layout deux colonnes : panel gauche (branding) + panel droit (formulaire)
- Panel gauche : logo ✦, nom app, tagline, liste de features, badge "Powered by Gemini AI"
- Panel droit : formulaire avec champs dark, bouton gradient indigo/violet
- Messages d'erreur stylisés (rouge/vert selon le type)
- Responsive (panel gauche masqué sur mobile)
- Couleur de fond : `#070b14` (identique à l'application)

**Activation dans docker-compose.yml :**
```yaml
volumes:
  - ./keycloak/realm-ai-ui.json:/opt/keycloak/data/import/realm-ai-ui.json:ro
  - ./keycloak/themes/ai-ui-theme:/opt/keycloak/themes/ai-ui-theme:ro
```

---

## 10. Structure du Projet

```
ai-ui-generator/
├── docker-compose.yml                    ← Orchestration des 6 services
├── .env                                  ← Variables d'environnement
├── .env.example                          ← Template
│
├── frontend/                             ← React + Vite (TypeScript)
│   ├── src/
│   │   ├── App.tsx                       ← Wrapper auth OIDC
│   │   ├── AiEditor.tsx                  ← Composant principal (2300 lignes)
│   │   └── api.ts                        ← Client API typé
│   ├── package.json
│   └── Dockerfile
│
├── spring-bff/                           ← Spring Boot 3 (Java)
│   └── src/main/java/com/aiuigenerator/bff/
│       ├── config/                       ← Security, CORS, S3, WebClient
│       │   ├── SecurityConfig.java
│       │   ├── CorsConfig.java
│       │   ├── S3Config.java
│       │   └── WebClientConfig.java
│       ├── domain/                       ← Documents MongoDB (8 entités)
│       ├── dto/                          ← Objets de transfert (9 DTOs)
│       ├── repo/                         ← Repositories Spring Data (6)
│       ├── service/                      ← Logique métier (5 services)
│       │   ├── GenerationService.java
│       │   ├── FastApiClient.java
│       │   ├── FileStorageService.java
│       │   └── AuditService.java
│       └── web/                          ← Contrôleurs REST (6)
│           ├── GenerationController.java
│           ├── UserController.java
│           └── ExportController.java
│
├── fastapi-ai/                           ← FastAPI Python
│   └── app/
│       ├── main.py                       ← Endpoints FastAPI
│       ├── schemas.py                    ← Modèles Pydantic
│       └── pipeline/
│           ├── orchestrator.py           ← Chef d'orchestre des agents
│           ├── llm_provider.py           ← Gemini/Groq/OpenAI/Ollama
│           └── agents/                   ← 8 agents spécialisés
│
├── keycloak/
│   ├── realm-ai-ui.json                  ← Configuration du realm
│   └── themes/ai-ui-theme/              ← Thème login personnalisé
│       └── login/
│           ├── login.ftl
│           ├── register.ftl
│           ├── theme.properties
│           └── resources/css/login.css
│
└── docs/
    └── PROJECT_REPORT.md                 ← Ce fichier
```

---

## 11. Guide de Démarrage

### Prérequis
- Docker Desktop installé et lancé
- Git

### Installation
```bash
# 1. Cloner le dépôt
git clone https://github.com/AI-UI-GENERATOR/UI-GENERATOR.git
cd UI-GENERATOR

# 2. Configurer l'environnement
cp .env.example .env

# 3. Ajouter la clé API Gemini dans .env
GEMINI_API_KEY=votre_cle_gemini_ici

# 4. Lancer tous les services
docker compose up -d --build

# 5. Attendre ~60s que Keycloak soit prêt, puis ouvrir
http://localhost:5173
```

### Identifiants par défaut
- Application : `http://localhost:5173`
- Login : `developpeur` / `developpeur`
- Admin Keycloak : `http://localhost:8083` → `admin` / `admin`
- MongoDB Express : `http://localhost:8082` (profile dev)

### Variables d'environnement importantes
```bash
GEMINI_API_KEY=          # Clé Google Gemini (obligatoire)
GROQ_API_KEY=            # Optionnel — fallback Groq
PLANNER_PROVIDER=gemini  # Provider pour l'agent planner
CODER_PROVIDER=gemini    # Provider pour l'agent codegen
```

---

## 12. Valeur Ajoutée vs Concurrents

### Analyse des Concurrents

| Outil | Modèle | LLM | Hébergement | Prix |
|-------|--------|-----|-------------|------|
| **Lovable.dev** | SaaS cloud | Claude | Cloud only | Payant |
| **v0.dev (Vercel)** | SaaS cloud | OpenAI | Cloud only | Freemium |
| **Bolt.new** | SaaS cloud | Claude/OpenAI | Cloud only | Payant |
| **Builder.io** | SaaS cloud | Propriétaire | Cloud only | Payant |
| **AI UI Generator** | **Auto-hébergé** | **Multi-LLM** | **On-premise** | **Open** |

---

### Ce que ce projet fait différemment

#### 1. Auto-hébergement complet (On-Premise)
Lovable, v0, Bolt sont des **SaaS cloud** — les données des utilisateurs et les prompts passent par des serveurs tiers.

**AI UI Generator** tourne entièrement en local ou sur les serveurs de l'entreprise :
- Aucune donnée ne quitte l'infrastructure
- Critique pour les secteurs réglementés : banque, santé, gouvernement, défense
- Talan travaille avec ce type de clients

#### 2. Support Multi-LLM avec Séparation des Rôles
Pas de dépendance à un seul fournisseur. Deux rôles distincts : **Planner** (spec UI) et **Coder** (génération code), chacun configurable indépendamment :

```
PLANNER_PROVIDER=gemini   CODER_PROVIDER=groq
PLANNER_PROVIDER=openai   CODER_PROVIDER=ollama
```

**Les concurrents sont mono-provider.** Ce projet permet de choisir le meilleur modèle pour chaque tâche, et de changer de provider sans modifier le code.

#### 3. Support LLM Local (Ollama — Air-Gapped)
Avec `CODER_PROVIDER=ollama`, l'application fonctionne **sans connexion Internet**.
Aucun concurrent ne propose cela. C'est indispensable pour les clients avec des réseaux isolés.

#### 4. Architecture IAM Enterprise (Keycloak)
Les concurrents utilisent un simple login GitHub/Google.
Ce projet utilise **Keycloak avec OAuth2/OIDC** :
- Support SSO d'entreprise (Active Directory, LDAP)
- Gestion des rôles (RBAC)
- Audit de toutes les connexions
- Thème personnalisé cohérent avec l'application

#### 5. Versioning et Rollback
Chaque génération conserve un historique de versions.
L'utilisateur peut revenir à n'importe quelle version précédente.
**Lovable propose cela uniquement dans son plan payant.**

#### 6. Pipeline Multi-Agent Transparent
L'utilisateur voit les logs de chaque agent dans l'interface.
Il comprend ce que l'IA fait à chaque étape.
Les concurrents sont des boîtes noires.

#### 7. Audit Trail Complet
Chaque action est enregistrée en base (audit_events).
Permet la traçabilité — requis dans certains contextes réglementaires.

---

## 13. Axes d'Amélioration Recommandés

Ces fonctionnalités permettraient de rendre le projet encore plus distinctif et professionnel :

### Priorité Haute

#### 1. Raffinement Itératif par Chat
Permettre à l'utilisateur de modifier l'interface générée via une conversation :
> "Rends le header plus compact" → régénère uniquement le Header.jsx

Les concurrents (Lovable notamment) proposent cela. C'est la fonctionnalité la plus attendue.

**Impact :** Transforme l'outil d'un "générateur one-shot" en "assistant de développement".

#### 2. Import de Design System
L'utilisateur upload un fichier JSON de tokens de design (couleurs, typographie, espacement) de son entreprise. L'IA les respecte à la génération.

**Impact :** Les grandes entreprises ont des chartes graphiques strictes. C'est ce qui rend l'outil utilisable en conditions réelles chez Talan.

#### 3. Export GitHub Direct
Un bouton "Push to GitHub" qui crée un dépôt et pousse le code généré.

**Impact :** Raccourcit le chemin de la génération à la mise en production.

---

### Priorité Moyenne

#### 4. Collaboration Multi-Utilisateurs
Partager un projet avec d'autres utilisateurs (lecture ou édition).
Grâce à Keycloak, les rôles sont déjà gérés — c'est une extension naturelle.

#### 5. Import Figma
Uploader un export Figma JSON et générer le code correspondant.
Les concurrents (Builder.io) proposent cela. C'est une demande fréquente des équipes design.

#### 6. Génération Multi-Pages
Aujourd'hui l'outil génère une page. Générer une application complète avec navigation entre pages (React Router).

#### 7. Score d'Accessibilité (WCAG)
Le ValidatorAgent pourrait vérifier les règles d'accessibilité (contraste, aria-labels, structure sémantique) et afficher un score.

**Impact :** Différenciant fort pour les marchés publics (accessibilité obligatoire).

---

### Priorité Basse

#### 8. Dashboard Administrateur
Vue admin (protégée par rôle Keycloak) :
- Tous les utilisateurs
- Toutes les générations
- Statistiques globales d'utilisation
- Gestion des quotas par utilisateur

#### 9. Export Multi-Framework
Générer en React (actuel) mais aussi Vue.js, Angular, ou Svelte selon le choix de l'utilisateur.

#### 10. Génération de Tests
Pour chaque composant généré, produire automatiquement les tests unitaires (Jest/Vitest).

---

### Résumé des Différenciants

```
✅ Déjà implémenté et différenciant :
   - Auto-hébergement (on-premise)
   - Multi-LLM + séparation Planner/Coder
   - Support Ollama (air-gapped)
   - Keycloak IAM enterprise
   - Versioning + rollback
   - Pipeline multi-agent transparent
   - Audit trail

🚀 À implémenter pour maximiser l'impact PFE :
   - Raffinement par chat (priorité 1)
   - Import de design system (priorité 2)
   - Export GitHub (priorité 3)
```

---

*Rapport généré le 14 mars 2026 — AI UI Generator PFE @ Talan*
