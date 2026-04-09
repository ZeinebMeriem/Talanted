# UI Generator — PFE Project Status & Planning
**Degree:** Engineer (Ingénieur) — WEB-2025-09
**Title:** Génération automatique d'interfaces web à partir de descriptions textuelles
**Duration:** 6 months (estimated Jan 2026 → Jun 2026)
**Current date:** March 2026 (Week ~10/24)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Compose                        │
│                                                             │
│  [React Frontend :5173] ──► [Spring BFF :8081]             │
│         │                        │                          │
│         │                  [MongoDB :27017]                 │
│         │                  [MinIO :9000]                    │
│         │                  [Keycloak :8083]                 │
│         │                        │                          │
│         └──────────────► [FastAPI AI :8000]                │
│                                  │                          │
│                     ┌────────────┼────────────┐            │
│                  [OCR]    [Planner]    [Coder]             │
│                  [Doc]   [Designer] [Validator]            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ COMPLETED FEATURES

### 1. Infrastructure & DevOps
- [x] Full Docker Compose stack (8 services)
- [x] MongoDB 7 persistence
- [x] MinIO S3-compatible file storage (uploaded docs stored 24h)
- [x] Keycloak 25 identity provider
- [x] CI-ready architecture (all services containerized)

### 2. Authentication & Security
- [x] OIDC/OAuth2 login via Keycloak
- [x] JWT-based API security (Spring Security + Bearer tokens)
- [x] Role-based access control (developer / admin roles)
- [x] Email verification flow
- [x] Password reset flow
- [x] Custom Keycloak login theme (dark branded UI)
- [x] Custom email templates (HTML + plain text)
- [x] Session expired / error pages

### 3. Generation Pipeline (FastAPI)
- [x] Multi-stage pipeline: OCR → DocExtract → TextPrep → Planner → Designer → Codegen → Validator
- [x] Multi-provider support: Gemini, OpenAI, Groq, Anthropic (Claude), OpenRouter, Ollama
- [x] Per-role provider selection (PLANNER_PROVIDER / CODER_PROVIDER env vars)
- [x] Document extraction (PDF, DOCX, TXT, Markdown)
- [x] Image processing & OCR agent
- [x] HTML/CSS/Vanilla JS generation
- [x] React generation (partial)
- [x] Quality report (score, issues, provider, durations, retry count)
- [x] Configurable timeout (default 10 min)

### 4. Core Application (Frontend + BFF)
- [x] Project creation with prompt + document upload (PDF, DOCX, TXT, PNG, JPG)
- [x] Drag & drop document upload zone
- [x] Real-time build progress bar with stage messages
- [x] In-browser preview (iframe with inlined CSS/JS)
- [x] Syntax-highlighted code editor
- [x] File explorer (multi-file navigation)
- [x] ZIP download of generated project
- [x] Version history & rollback
- [x] Template chips (Dashboard, Landing Page, E-commerce, Portfolio)
- [x] Per-user project isolation (JWT sub claim)
- [x] Audit event logging

### 5. Admin Dashboard (Superadmin)
- [x] Platform stats (total users, projects, success rate)
- [x] Daily generation chart (last 7 days, CSS bar chart)
- [x] User management table (enable/disable, delete, project count)
- [x] Click user → side panel showing their projects
- [x] Recent activity feed (latest 50 generations)
- [x] Failed generations list
- [x] Service health monitoring (FastAPI, Keycloak, MinIO, MongoDB)
- [x] Export users as CSV
- [x] Superadmin-specific navigation (no Home tab)

### 6. User Profile
- [x] Profile page with stats (total projects, completed, success rate)
- [x] Email verified badge, roles display

---

## ❌ MISSING / TO ADD (for Engineer-level PFE)

### Priority 1 — Core Added Value (April)
- [ ] **Iterative editing** — user types "make the navbar blue" → AI updates only that part
- [ ] **Real-time streaming** — show tokens appearing live during generation (SSE/WebSocket)
- [ ] **React generation** — fix and stabilize React + Tailwind output (currently only HTML/CSS is reliable)
- [ ] **Mobile preview toggle** — switch between desktop / tablet / mobile viewport in preview

### Priority 2 — Quality & Evaluation (April–May)
- [ ] **Evaluation methodology** — benchmark prompts, measure: generation time, code validity, visual similarity score
- [ ] **Comparison table** — vs Lovable, v0.dev, GitHub Copilot (features, cost, privacy)
- [ ] **Unit & integration tests** — FastAPI agents + Spring BFF endpoints (pytest + JUnit)
- [ ] **Prompt quality analysis** — how prompt length/detail affects output quality

### Priority 3 — UX Improvements (May)
- [ ] **Prompt history** — show previous prompts as suggestions
- [ ] **Template library** — save generated UIs as reusable templates
- [ ] **Inline code editing** — allow manual edits in the code editor and re-preview without re-generating
- [ ] **Generation cancellation** — cancel button while generating

### Priority 4 — Report & Defense (May–June)
- [ ] **Technical report** (rapport de PFE) — architecture, methodology, evaluation
- [ ] **User manual / demo video**
- [ ] **Deployment** — deploy on a VPS or cloud (Render, Railway, or university server)
- [ ] **Poster / presentation slides**

---

## 📅 WEEKLY PLANNING (6 months)

### Phase 1 — Foundation (Weeks 1–6, Jan–Feb 2026) ✅ DONE
| Week | Tasks | Status |
|------|-------|--------|
| 1–2 | Project setup, Docker Compose, architecture design | ✅ |
| 3–4 | Keycloak integration, authentication, JWT security | ✅ |
| 5–6 | FastAPI AI pipeline, multi-agent architecture, Gemini integration | ✅ |

### Phase 2 — Core Features (Weeks 7–12, Feb–Mar 2026) ✅ DONE
| Week | Tasks | Status |
|------|-------|--------|
| 7–8 | Code generation, preview iframe, file explorer, ZIP download | ✅ |
| 9–10 | Version control, rollback, audit logs, per-user isolation | ✅ |
| 11–12 | Admin dashboard, user management, document upload zone | ✅ |

### Phase 3 — Added Value (Weeks 13–17, Apr 2026) ← YOU ARE HERE
| Week | Tasks | Status |
|------|-------|--------|
| 13 | Iterative editing — "update the header color" prompt chaining | ⬜ |
| 14 | Real-time streaming (SSE) — show generation token by token | ⬜ |
| 15 | React + Tailwind generation stabilization + mobile preview toggle | ⬜ |
| 16 | Inline code editing (edit in browser → re-preview live) | ⬜ |
| 17 | Prompt suggestions, template library | ⬜ |

### Phase 4 — Quality & Evaluation (Weeks 18–20, May 2026)
| Week | Tasks | Status |
|------|-------|--------|
| 18 | Write automated tests (pytest for FastAPI agents, JUnit for BFF) | ⬜ |
| 19 | Benchmark: define 10 standard prompts, measure time + quality + validity | ⬜ |
| 20 | Comparison vs Lovable/v0.dev — feature matrix + screenshots | ⬜ |

### Phase 5 — Report & Deployment (Weeks 21–24, May–Jun 2026)
| Week | Tasks | Status |
|------|-------|--------|
| 21 | Deploy on VPS (Docker Compose on remote server) | ⬜ |
| 22 | Technical report writing — chapters 1–3 (context, architecture, implementation) | ⬜ |
| 23 | Technical report writing — chapters 4–5 (evaluation, conclusion) | ⬜ |
| 24 | Final review, demo video, defense preparation | ⬜ |

---

## 🎯 ADDED VALUE — Engineer Degree Justification

Your project differentiates from existing tools on these dimensions:

| Dimension | Your project | Lovable / v0.dev |
|-----------|-------------|-----------------|
| **Privacy** | Self-hosted, data stays local | Cloud-only, data leaves org |
| **Document input** | PDF/DOCX/image upload → AI reads specs | Text prompt only |
| **Multi-provider AI** | Gemini, Claude, Groq, Ollama (switchable) | Fixed provider |
| **Admin control** | Full user management, audit logs | No admin layer |
| **Cost** | Free with open models (Groq/Ollama) | $20–30/month subscription |
| **Offline mode** | Works with local Ollama (no internet) | Requires internet |
| **Customizable** | Open source, deployable anywhere | Closed SaaS |

### Research contribution for the report:
1. **Multi-agent architecture** — each agent (OCR, planner, coder, validator) has a single responsibility → testable, replaceable
2. **Provider abstraction** — same pipeline works with any LLM via adapter pattern
3. **Document-to-UI pipeline** — novel: user uploads a PDF spec and gets a working UI
4. **Evaluation framework** — define metrics: generation time, CSS validity, JS validity, visual fidelity score

---

## 🔧 IMMEDIATE NEXT STEPS (This week)

1. **Set up a better LLM** → Add `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY` in `.env` and rebuild fastapi-ai
2. **Test document upload** → Upload a PDF spec and generate a UI from it (core PFE demo)
3. **Start iterative editing** → Add a "refine" prompt input that sends the previous generationId + new instruction

---

## 📦 TECH STACK SUMMARY

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Custom CSS-in-JS (inline styles) |
| BFF | Spring Boot 3, Spring Security 6, Spring Data MongoDB |
| AI Service | FastAPI, Python 3.11, httpx |
| LLM | Gemini 2.0 Flash / Claude Sonnet 4.6 / Groq Llama |
| Auth | Keycloak 25, OIDC, JWT |
| Database | MongoDB 7 |
| File Storage | MinIO (S3-compatible) |
| Container | Docker Compose |
| Version Control | Git / GitHub |
