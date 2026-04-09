# UI Generator

> Describe your idea. Get a working interface.

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

## License

PFE Project — Talan © 2026
