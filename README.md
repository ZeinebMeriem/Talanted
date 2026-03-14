# AI UI Generator

> Describe your idea. Get a working interface.

A full-stack application that generates functional UI code from natural language prompts using a multi-agent AI pipeline. Built as a PFE (Projet de Fin d'Études) at **Talan**.

---

## Architecture

```
Frontend (React)  →  Spring BFF (Java)  →  FastAPI AI (Python)
                           │                      │
                       MongoDB              MinIO Storage
                           │
                       Keycloak (OAuth2/OIDC)
```

**6 microservices, all containerized with Docker Compose.**

---

## Features

- **AI Code Generation** — Natural language prompt → working React or HTML/CSS app
- **Multi-LLM Support** — Gemini, Groq, OpenAI, or local Ollama (air-gapped)
- **Live Preview** — Rendered app in real-time inside the browser
- **Code Editor** — Browse and view all generated files
- **Version History** — Every generation is versioned, rollback anytime
- **ZIP Download** — Export the full project as a ZIP
- **My Projects** — Card grid of all past generations
- **User Profile** — Stats dashboard (total projects, success rate)
- **Custom Login UI** — Animated dark Keycloak theme matching the app
- **User Registration** — Self sign-up enabled
- **Audit Logs** — Full action trail per generation
- **Enterprise Auth** — Keycloak OAuth2/OIDC with JWT validation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Spring Boot 3 (Java 17) |
| AI Pipeline | FastAPI (Python 3.11) |
| LLM | Google Gemini 2.0 Flash (default) |
| Auth | Keycloak 25 (OAuth2/OIDC) |
| Database | MongoDB 7 |
| File Storage | MinIO (S3-compatible) |
| Deployment | Docker Compose |

---

## Getting Started

### Prerequisites
- Docker Desktop (running)
- A free [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Run

```bash
# 1. Clone
git clone https://github.com/AI-UI-GENERATOR/UI-GENERATOR.git
cd UI-GENERATOR

# 2. Configure environment
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

# 3. Start all services
docker compose up -d --build

# 4. Open the app (wait ~60s for Keycloak to be ready)
http://localhost:5173
```

### Default Credentials

| Service | URL | Login |
|---------|-----|-------|
| App | http://localhost:5173 | `developpeur` / `developpeur` |
| Keycloak Admin | http://localhost:8083 | `admin` / `admin` |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| MongoDB Express | http://localhost:8082 | *(dev profile only)* |

---

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Spring BFF | http://localhost:8081 |
| BFF Health | http://localhost:8081/actuator/health |
| FastAPI | http://localhost:8000 |
| FastAPI Health | http://localhost:8000/health |
| Keycloak | http://localhost:8083 |
| MinIO | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

---

## LLM Configuration

Configure in `.env`:

```bash
# Choose provider: gemini | groq | openai | ollama
PLANNER_PROVIDER=gemini
CODER_PROVIDER=gemini

# API Keys
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=
OPENAI_API_KEY=

# Local Ollama (no internet required)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5:3b
```

---

## Project Structure

```
├── frontend/               React + Vite (TypeScript)
│   └── src/
│       ├── App.tsx         Auth wrapper (OIDC)
│       ├── AiEditor.tsx    Main application UI
│       └── api.ts          API client
├── spring-bff/             Spring Boot 3 (Java)
│   └── src/main/java/
│       ├── config/         Security, CORS, S3
│       ├── domain/         MongoDB documents
│       ├── repo/           Spring Data repositories
│       ├── service/        Business logic
│       └── web/            REST controllers
├── fastapi-ai/             FastAPI (Python)
│   └── app/
│       ├── main.py         API entry point
│       ├── schemas.py      Pydantic models
│       └── pipeline/       8 AI agents + orchestrator
├── keycloak/
│   ├── realm-ai-ui.json    Realm configuration
│   └── themes/             Custom dark login UI
├── docs/
│   └── PROJECT_REPORT.md  Full technical report
└── docker-compose.yml      Full stack deployment
```

---

## AI Pipeline

The generation goes through 8 specialized agents:

```
Prompt → OCR → DocExtract → TextPrep → Planner → DesignSystem → Codegen → ImageAgent → Validator
```

Each agent has a single responsibility. Output: `uiSpec + codeBundle + aiReport`.

---

## Security

- All `/api/**` endpoints require a valid JWT (`Authorization: Bearer <token>`)
- JWT validated against Keycloak JWKS endpoint
- Stateless — no server-side sessions
- CORS restricted to frontend origin

---

## Why This Project Is Different from Lovable / v0.dev

| | This project | Lovable / v0 |
|--|--|--|
| Hosting | Self-hosted (on-premise) | Cloud SaaS only |
| LLM | Multi-provider + local Ollama | Single provider |
| Auth | Enterprise Keycloak (SSO/RBAC) | Basic OAuth |
| Offline | Works air-gapped (Ollama) | No |
| Audit | Full audit trail | No |
| Versioning | Built-in rollback | Paid plans only |

---

## License

PFE Project — Talan © 2025
