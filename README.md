# AI UI Generator (PFE) — MVP runnable

Ce workspace contient une base exécutable (MVP) conforme à l’architecture des diagrammes :

- Frontend: Vite + React + TypeScript
- BFF: Spring Boot (Maven, Java 17)
- Service IA: FastAPI (pipeline multi-agents, déterministe pour l’instant)
- Data: MongoDB + MinIO via Docker Compose
- Sécurité: Keycloak (OIDC) + JWT (Spring Resource Server)

## Prérequis

- Docker Desktop (Windows)

## Démarrage (1 commande)

1. (Optionnel) Copie l’exemple d’env:
   - `copy .env.example .env`
2. Lance:
   - `docker compose up --build`

## URLs

- Frontend: http://localhost:5173
- BFF (Spring): http://localhost:8081
  - Health: http://localhost:8081/actuator/health
- FastAPI: http://localhost:8000
  - Health: http://localhost:8000/health
- MinIO Console: http://localhost:9001
- Mongo Express (DB UI): http://localhost:8082
- Keycloak: http://localhost:8083
  - Admin: `admin` / `admin`
  - User demo: `developpeur` / `developpeur`

## Flux MVP

- Le frontend redirige vers Keycloak pour login (OIDC).
- Les endpoints `/api/**` du BFF sont protégés (JWT). Sans token → `401`.
- Frontend envoie `prompt + fichiers` à `POST /api/generations` avec `Authorization: Bearer <token>`
- Le BFF valide, persiste une génération en Mongo, stocke les fichiers en MinIO, appelle FastAPI `/internal/generate`
- FastAPI exécute un pipeline multi-agents (OCR/extraction/spec/validation/codegen) et renvoie `uiSpec + codeBundle + aiReport`

## Sortie HTML/CSS vs React

- Dans l’UI, l’étape “Choose your framework” permet de choisir **HTML/CSS** ou **React**.
- Le frontend injecte `Framework: ...` dans le prompt auto.
- Le service IA choisit la cible automatiquement (par défaut: HTML/CSS):
  - `Framework: HTML/CSS` → `index.html` + `styles.css`
  - `Framework: React` → `src/App.tsx` (placeholder React pour le moment)

## Smoke test JWT (PowerShell)

- Sans token (doit répondre 401):
  - `curl.exe -i http://localhost:8081/api/generations`

- Avec token Keycloak (doit répondre 200):
  - `$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:8083/realms/ai-ui/protocol/openid-connect/token" -ContentType "application/x-www-form-urlencoded" -Body @{grant_type='password'; client_id='ai-ui-cli'; username='developpeur'; password='developpeur'}).access_token; curl.exe -s -o NUL -w "%{http_code}`n" -H "Authorization: Bearer $token" http://localhost:8081/api/generations`

## Suite

Prochaines étapes (pipeline IA complet): implémenter l’extraction réelle via MinIO (PDF/image/docx), ajouter un agent LLM pour construire le `uiSpec` (JSON strict), renforcer la validation + retries, puis améliorer le codegen React.
