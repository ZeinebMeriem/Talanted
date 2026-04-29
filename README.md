# UI Generator

A full-stack enterprise application that transforms natural language prompts, design documents, images, and wireframes into production-ready React + Tailwind CSS code. Users describe their interface requirements or upload visual mockups; a multi-agent AI pipeline analyzes, plans, and generates semantically faithful, accessible React components with live preview, version control, and direct GitLab integration.

---

## Features

- **Text-to-UI Generation** — Describe any interface in natural language; get production-ready React + Tailwind code in seconds
- **Visual Document Import** — Upload PDF, images, or wireframes; OCR and diagram extraction automatically parse intent
- **Multi-AI Provider Support** — Groq, Google Gemini, OpenAI, or local Ollama (auto-fallback)
- **Live Preview** — See generated UIs render in real-time
- **Version Control & Rollback** — Track all edits, roll back to any previous version instantly
- **File-by-File Editing** — Modify individual files with targeted AI rewrites using inline instructions
- **Jira Integration** — Fetch frontend tasks directly from Jira boards
- **GitLab Push** — Export generated code directly to GitLab repositories with commit messaging
- **Quality Evaluation** — Automated scoring: semantic fidelity, code quality, completeness, accessibility, visual richness
- **OAuth2 Authentication** — Secure login via Keycloak with role-based access control
- **Admin Dashboard** — Monitor users, project stats, service health, and daily activity
- **Streaming Progress** — Real-time Server-Sent Events show generation pipeline progress
- **Project Export** — Download code as ZIP or fork/duplicate for variations

---

## Architecture

```
┌──────────────────────────────────────────────┐
│         Frontend — React 18 + Vite           │
│                   :5173                      │
└────────────────────┬─────────────────────────┘
                     │ REST / SSE
┌────────────────────▼─────────────────────────┐
│       Spring BFF — Spring Boot 3             │
│               :8081                          │
│  Auth gateway · REST API · MongoDB · MinIO   │
└────────────────────┬─────────────────────────┘
                     │ HTTP
┌────────────────────▼─────────────────────────┐
│        FastAPI AI Pipeline — Python          │
│                  :8000                       │
│  OCR → Planner → Designer → Coder → Scorer  │
└──────────────────────────────────────────────┘

Infrastructure
  MongoDB  :27017   Data persistence
  MinIO    :9000    S3-compatible file storage
  Keycloak :8083    OAuth2 / OIDC
```

---

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React UI (Vite) |
| Spring BFF | 8081 | REST API + auth gateway |
| FastAPI | 8000 | AI pipeline engine |
| MongoDB | 27017 | Data persistence |
| Keycloak | 8083 | OAuth2 / OIDC server |
| MinIO API | 9000 | S3-compatible storage |
| MinIO Console | 9001 | Storage admin UI |
| Mongo Express | 8082 | MongoDB UI *(dev profile only)* |
| SonarQube | 9010 | Code quality *(optional)* |

---

## Prerequisites

- Docker & Docker Compose (v20.10+)
- Git
- At least one LLM API key (Groq free tier recommended)

---

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd ui-generator

# 2. Copy environment template
cp .env.example .env

# 3. Add at least one LLM provider key in .env
#    GROQ_API_KEY=sk-...          (free, fast)
#    GEMINI_API_KEY=...           (free tier)
#    OPENAI_API_KEY=sk-...        (paid)

# 4. Start all services
docker compose up --build -d

# 5. Wait ~60 seconds for services to become healthy
docker compose ps

# 6. Open the app
#    http://localhost:5173
#    Default credentials: developpeur / developpeur
```

---

## Environment Variables

### Required — pick at least one LLM provider

```env
GROQ_API_KEY=sk-...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...

PLANNER_PROVIDER=gemini       # groq | gemini | openai | ollama
CODER_PROVIDER=gemini
```

### Optional integrations

```env
# Jira
JIRA_BASE_URL=https://mycompany.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=...

# Pexels (stock images in generated UIs)
PEXELS_API_KEY=...

# Local Ollama fallback
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5-coder
NO_LOCAL_MODEL=false
```

### Infrastructure defaults (override in production)

```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
APP_SECURITY_DEV_MODE=true    # Set false in production
```

---

## API Endpoints

### Generations `/api/generations`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/stream` | Streaming generation with SSE progress |
| POST | `/` | Non-streaming generation |
| GET | `/` | List user's projects |
| GET | `/{id}` | Get project details |
| GET | `/{id}/code` | Get full code bundle |
| GET | `/{id}/export` | Download as ZIP |
| POST | `/{id}/rollback` | Revert to previous version |
| POST | `/{id}/edit-file` | AI-targeted file edit |
| POST | `/{id}/duplicate` | Fork project |
| POST | `/{id}/push-to-gitlab` | Push to GitLab repository |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/me` | Current user profile |
| GET | `/api/user/stats` | User project stats |
| GET | `/api/admin/*` | Admin dashboard endpoints |
| GET | `/api/jira/frontend-tasks` | Jira UI task list |
| POST | `/api/ted/chat` | TED assistant chat |

---

## Tech Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, react-oidc-context

**BFF** — Spring Boot 3.2, Spring Security (OAuth2), Spring Data MongoDB, Java 17

**AI Pipeline** — FastAPI, Python 3.11, Groq / Gemini / OpenAI / Ollama, Pydantic

**Storage** — MongoDB 7, MinIO (S3-compatible)

**Auth** — Keycloak 25 (OAuth2/OIDC, JWT, RBAC)

---

## Development

```bash
# Run frontend locally with hot reload
docker compose up -d --scale frontend=0
cd frontend && npm install && npm run dev

# View logs
docker compose logs -f spring-bff
docker compose logs -f fastapi-ai

# MongoDB admin UI (dev profile)
docker compose --profile dev up -d mongo-express
# http://localhost:8082

# MinIO console
# http://localhost:9001  (minioadmin / minioadmin)

# Keycloak admin
# http://localhost:8083/admin  (admin / admin)
```

---

## Production Notes

- Set `APP_SECURITY_DEV_MODE=false` and configure Keycloak with real JWKS/issuer URIs
- Never commit `.env` — use a secrets manager in production
- Each generation takes 30–600 seconds; set `FASTAPI_TIMEOUT_SECONDS=3600`
- Update `CORS_ALLOWED_ORIGINS` to your production domain
