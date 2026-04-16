# UI Generator

> Describe your idea. Get a working interface.

[![Frontend CI](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/frontend.yml/badge.svg?branch=main)](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/backend.yml/badge.svg?branch=main)](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/backend.yml)
[![FastAPI CI](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/fastapi.yml/badge.svg?branch=main)](https://github.com/AI-UI-GENERATOR/UI-GENERATOR/actions/workflows/fastapi.yml)

A full-stack application that generates functional React UI code from natural language prompts or uploaded documents. Built as a PFE (Projet de Fin d'Études) at **Talan**.

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

### Generation

- **Code Generation** — Natural language prompt → working React + Tailwind app
- **Document-to-UI** — Upload a PDF or image (wireframe, mockup, spec) → UI generated from its content
- **Multi-Provider Support** — Gemini, Groq, OpenAI, Anthropic, OpenRouter, or local Ollama (air-gapped)
- **Live Preview** — Rendered app in real-time inside the browser (iframe, Vite build)
- **Quality Report** — Each generation includes a structured design report (colors, typography, components used)

### Editing

- **Chat-Based Editing** — Describe a change in natural language → the right file is updated automatically
- **Auto File Detection** — The system picks which file to edit based on the instruction (no manual file selection)
- **New Page Creation** — Asking to "add a statistics page" creates a separate `pages/StatistiquesPage.tsx` and updates routing automatically
- **Code Viewer** — Browse all generated source files; always in sync with the live preview (reads from disk)

### Versioning

- **Version History** — A new version is created after every successful chat edit
- **Rollback** — Restore any previous version; preview and code viewer both update instantly
- **Persistent Chat History** — Conversation is saved per project and reloaded on next open (like Lovable)

### User & Admin

- **My Projects** — Card grid of all past generations with preview thumbnails
- **User Profile** — Stats dashboard (total projects, tokens used, success rate)
- **Admin Dashboard** — Per-user statistics, Keycloak user list, document management
- **ZIP Download** — Export the full project as a ZIP
- **Audit Logs** — Full action trail per generation
- **Custom Login UI** — Animated dark Keycloak theme matching the app design
- **User Registration** — Self sign-up with email verification (Gmail SMTP)
- **Enterprise Auth** — Keycloak 25 OAuth2/OIDC with JWT validation, RBAC roles

### Integrations

- **TED Chatbot** — AI assistant that understands your entire project structure and provides context-aware coding suggestions
- **GitLab Integration** — Push generated projects directly to GitLab (gitlab.com or self-hosted)
- **Jira Integration** — Import user stories from Jira boards and convert them to UI specs

---

## Tech Stack

| Layer        | Technology                                 |
| ------------ | ------------------------------------------ |
| Frontend     | React 18 + TypeScript + Vite + TailwindCSS |
| Backend      | Spring Boot 3 (Java 17)                    |
| AI Pipeline  | FastAPI (Python 3.11)                      |
| LLM          | Google Gemini 2.0 Flash (default)          |
| Auth         | Keycloak 25 (OAuth2/OIDC)                  |
| Database     | MongoDB 7                                  |
| File Storage | MinIO (S3-compatible)                      |
| Deployment   | Docker Compose                             |

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

# 4. Open the app (wait ~60s for Keycloak to initialize)
http://localhost:5173
```

### Default Credentials

| Service         | URL                   | Login                         |
| --------------- | --------------------- | ----------------------------- |
| App             | http://localhost:5173 | `developpeur` / `developpeur` |
| Keycloak Admin  | http://localhost:8083 | `admin` / `admin`             |
| MinIO Console   | http://localhost:9001 | `minioadmin` / `minioadmin`   |
| MongoDB Express | http://localhost:8082 | _(dev profile only)_          |

---

## Service URLs

| Service        | URL                                   |
| -------------- | ------------------------------------- |
| Frontend       | http://localhost:5173                 |
| Spring BFF     | http://localhost:8081                 |
| BFF Health     | http://localhost:8081/actuator/health |
| FastAPI        | http://localhost:8000                 |
| FastAPI Health | http://localhost:8000/health          |
| Keycloak       | http://localhost:8083                 |
| MinIO          | http://localhost:9000                 |
| MinIO Console  | http://localhost:9001                 |

---

## LLM Configuration

Configure in `.env`:

```bash
# Choose provider: gemini | groq | openai | anthropic | openrouter | ollama
PLANNER_PROVIDER=gemini
CODER_PROVIDER=gemini

# API Keys (set only the ones you use)
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

# Local Ollama (no internet required)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5:3b

# Optional: separate planner and coder models
ANTHROPIC_PLANNER_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_CODER_MODEL=claude-sonnet-4-6
```

---

## Project Structure

```
├── frontend/                   React + Vite (TypeScript)
│   └── src/
│       ├── App.tsx             Auth wrapper (OIDC)
│       ├── AiEditor.tsx        Main application UI (editor, preview, chat, versioning)
│       └── api.ts              API client
├── spring-bff/                 Spring Boot 3 (Java)
│   └── src/main/java/
│       ├── config/             Security, CORS, S3, MongoDB
│       ├── domain/             MongoDB documents (Generation, CodeVersion, ChatMessage, AuditLog)
│       ├── repo/               Spring Data repositories
│       ├── service/            Business logic (GenerationService, FastApiClient, KeycloakAdminService)
│       └── web/                REST controllers (GenerationController, AdminController, UserController)
├── fastapi-ai/                 FastAPI (Python)
│   └── app/
│       ├── main.py             API entry point + internal endpoints
│       ├── schemas.py          Pydantic models
│       └── pipeline/           Multi-agent orchestrator + 7 specialized agents
│           ├── orchestrator.py     Main pipeline + edit_file logic
│           ├── agents/
│           │   ├── ocr_agent.py        Image/PDF text extraction
│           │   ├── doc_extract_agent.py  Document structure analysis
│           │   ├── text_prep_agent.py    Text normalization
│           │   ├── planner_agent.py      UI spec planning
│           │   ├── design_agent.py       Design system generation
│           │   ├── codegen_agent.py      React code generation
│           │   └── image_agent.py        Image asset handling
│           └── llm_provider.py     Multi-provider LLM abstraction
├── keycloak/
│   ├── realm-ai-ui.json        Realm configuration (users, clients, roles)
│   └── themes/                 Custom dark login/register/email UI
├── docs/
│   └── PROJECT_REPORT.md       Full technical report
└── docker-compose.yml          Full stack deployment
```

---

## Generation Pipeline

The generation goes through 7 specialized processing stages:

```
Input (prompt or document)
    │
    ▼
OCR Processing         — Extracts text from images/PDFs (pytesseract + PIL)
    │
    ▼
Document Processing    — Identifies UI sections from document content
    │
    ▼
Text Preparation       — Normalizes and structures the input text
    │
    ▼
Planning               — Produces a structured UI specification (JSON)
    │
    ▼
Design System          — Generates color palette, typography, component list
    │
    ▼
Code Generation        — Generates full React + Tailwind TSX code
    │
    ▼
Image Processing       — Handles image assets if any
    │
    ▼
Output: uiSpec + codeBundle + qualityReport
```

Each stage has a single responsibility. The orchestrator handles inter-stage communication and error recovery.

---

## Interactive Editing Pipeline

When the user sends a message in the editor:

```
User instruction
    │
    ▼
_detect_new_page_intent()   — Is this asking to CREATE a new page?
    │ yes                        │ no
    ▼                            ▼
_create_new_page()          _pick_file_to_edit()   — Which file to modify?
  1. Generate                    │
     pages/XxxPage.tsx            ▼
  2. Update App.tsx          Edit the file
     (import + route)             │
    │                            │
    └──────────────┬─────────────┘
                   ▼
             Vite build
                   │
                   ▼
          New CodeVersion saved
          Chat message saved to MongoDB
```

---

## Versioning

Every successful chat edit creates a new `CodeVersion` in MongoDB containing a snapshot of all source files. Rollback writes those files back to disk and rebuilds — both the preview and the code viewer reflect the restored state instantly.

---

## Security

- All `/api/**` endpoints require a valid JWT (`Authorization: Bearer <token>`)
- JWT validated against Keycloak JWKS endpoint (stateless)
- Role-based access: `app-user` for regular users, `app-admin` for admin dashboard
- CORS restricted to frontend origin
- MinIO pre-signed URLs for secure file access

---

## Why This Project Is Different from Lovable / v0.dev

|              | This project                   | Lovable / v0    |
| ------------ | ------------------------------ | --------------- |
| Hosting      | Self-hosted (on-premise)       | Cloud SaaS only |
| Providers    | Multi-provider + local Ollama  | Single provider |
| Input        | Prompt or document (PDF/image) | Prompt only     |
| Auth         | Enterprise Keycloak (SSO/RBAC) | Basic OAuth     |
| Offline      | Works air-gapped (Ollama)      | No              |
| Audit        | Full audit trail               | No              |
| Versioning   | Built-in rollback (all plans)  | Paid plans only |
| Chat history | Persistent per project         | Yes (paid)      |

---

## Development Setup

### Local Development

```bash
# 1. Install dependencies
cd frontend && npm install
cd ../spring-bff && mvn clean install
cd ../fastapi-ai && pip install -r requirements.txt

# 2. Start services
docker compose up -d mongo keycloak minio

# 3. Run services locally (optional, for faster iteration)
# In separate terminals:
# Terminal 1: fastapi-ai
cd fastapi-ai && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: frontend
cd frontend && npm run dev

# Terminal 3: spring-bff
cd spring-bff && mvn spring-boot:run
```

### File Structure for Development

- **Frontend Changes**: `frontend/src/` — Changes hot-reload with Vite
- **Backend Changes**: `spring-bff/src/main/java/` — Rebuild: `mvn compile`
- **AI Pipeline**: `fastapi-ai/app/pipeline/` — Restart uvicorn for changes

### Key Files to Modify

- **Add a new API endpoint**: `spring-bff/src/main/java/com/aiuigenerator/bff/web/`
- **Change UI layout**: `frontend/src/App.tsx` or `AiEditor.tsx`
- **Modify code generation**: `fastapi-ai/app/pipeline/agents/planner_agent.py`
- **Add a new integration**: `spring-bff/src/main/java/com/aiuigenerator/bff/service/`

---

## Troubleshooting

### Frontend doesn't launch in Docker

**Problem**: Container exits or shows ECONNREFUSED
**Solution**:
```bash
# Check logs
docker logs ai-ui-frontend

# Rebuild from scratch
docker compose down
docker compose up -d --build frontend
```

### FastAPI health check failing

**Problem**: `ai-ui-fastapi` marked as unhealthy
**Solution**:
```bash
# Check if Groq/Gemini API key is set
docker compose exec fastapi-ai env | grep GROQ_API_KEY

# View logs
docker logs ai-ui-fastapi
```

### Spring BFF can't reach FastAPI

**Problem**: Generation fails with "Cannot connect to fastapi-ai"
**Solution**:
```bash
# Verify both services are running
docker ps | grep ai-ui

# Check connectivity inside Spring container
docker exec ai-ui-spring-bff curl http://fastapi-ai:8000/health
```

### MongoDB full or corrupted

**Problem**: Generations not saved to database
**Solution**:
```bash
# Clear all projects from MongoDB
docker exec ai-ui-mongo mongosh ai_ui_generator --eval "db.generations.deleteMany({})"

# Or reset MongoDB volume
docker compose down -v
docker compose up -d mongo
```

### Keycloak login not working

**Problem**: "Invalid client" or redirect loop
**Solution**:
```bash
# Re-import realm configuration
docker compose exec -T keycloak bash -c "
  wget -q -O /tmp/realm.json https://.../realm-ai-ui.json
  /opt/keycloak/bin/kc.sh import --dir /opt/keycloak/data/import
"
```

---

## Contributing

Contributions are welcome! Please:

1. **Fork the repository** and create a feature branch: `git checkout -b feature/your-feature`
2. **Make changes** following the existing code style
3. **Test locally** with the development setup above
4. **Commit with clear messages**: `git commit -m "feat: add TED chatbot integration"`
5. **Push and create a Pull Request**

### CI/CD Pipeline

All pull requests and pushes automatically trigger our CI/CD pipeline:

- **Frontend**: TypeScript strict mode, build, security audit
- **Backend**: Maven build, unit tests, OWASP dependency check
- **FastAPI**: Python lint, type checking, pytest, coverage

See [.github/CICD.md](.github/CICD.md) for detailed pipeline documentation.

---

PFE Project — Talan © 2026
