# NeuralCoders — Presentation Guide (Updated)

> **Project:** AI Agent for Requirements Clarification & Analysis
> **Team:** NeuralCoders

---

## Slide 1 — Title

- **Project Name:** AI Agent for Requirements Clarification & Analysis
- **Team:** NeuralCoders
- **Visual:** Logo + key screenshot of the app in action

---

## Slide 2 — Problem Statement

**Key Points:**
- Requirements errors cost **100× more** to fix post-deployment (cite industry stats)
- Manual meeting documentation is **slow, error-prone, and incomplete**
- No existing tool can simultaneously: transcribe → analyze → detect ambiguities → generate specifications
- Client-consultant meetings involve **mixed languages** (EN/FR/Arabic dialect) — standard tools can't handle this

**Suggested Visual:** Diagram showing the "cost of bugs" iceberg or a broken telephone metaphor

---

## Slide 3 — Project Objectives

**Key Points:**
1. **Transcribe** client-consultant conversations in real-time (multilingual)
2. **Identify speakers** automatically (client vs. consultant)
3. **Extract structured requirements** (functional & non-functional, with prioritization)
4. **Detect ambiguities** and **generate clarification questions**
5. **Generate system architecture conception** (layers, DB schema, API endpoints, diagrams)
6. **Provide consultant guidance** (insights, risks, tech stack recommendations)
7. **Interactive Q&A** to build complete requirements specifications
8. **Generate professional PDF reports** (Analysis Report + Cahier des Charges)

---

## Slide 4 — System Architecture

**Key Points:**
- **3-tier microservices** architecture:

| Service | Tech | Port | Role |
|---------|------|------|------|
| Frontend | React 19 + Vite | 5173 | UI, waveform viz, real-time updates |
| Streaming API | Flask + Socket.IO | 5001 | Recording, transcription, WebSocket hub |
| Pipeline API | FastAPI | 8080 | AI analysis orchestration |

- **External Services:** ElevenLabs Scribe v2 (STT), Ollama + Qwen 2.5 (LLM), ChromaDB (vector store)
- **Communication:** WebSocket (Socket.IO) for real-time streaming; REST for file operations

**Suggested Visual:** Architecture diagram (use the one the app generates, or draw a 3-box + external services diagram)

---

## Slide 5 — Technology Stack

**Key Points:**

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Framer Motion, Mermaid.js |
| **Backend** | Flask, FastAPI, Socket.IO, Python 3.x |
| **AI/ML** | Qwen 2.5 (via Ollama — local, private, free), RAG with ChromaDB |
| **STT** | ElevenLabs Scribe v2 (99 languages, speaker diarization) |
| **Reports** | ReportLab (PDF generation) |
| **Diagrams** | Mermaid.js (client-side rendering) + mmdc (server-side) |

**Why local LLM (Qwen 2.5)?**
- Privacy: meeting content stays on-premise
- Cost: no per-token API charges
- Speed: optimized for structured JSON output

---

## Slide 6 — AI Pipeline (10-Step Process)

**Key Points — the pipeline runs sequentially for reliability:**

| Step | Task | What it does |
|------|------|-------------|
| 0 | **Conversation Context Analysis** | Identifies client vs. consultant, extracts project type, industry, pain points |
| 1 | **Ingest** | Indexes transcript into ChromaDB for RAG |
| 2 | **Requirements Extraction** | FR + NFR with IDs and priority levels |
| 3 | **Meeting Summary** | Participants, topics, key decisions |
| 4 | **Ambiguity Detection** | Finds vague statements + completeness score |
| 5 | **Clarification Questions** | Generates categorized & prioritized questions |
| 6a | **Consultant Guidance** | Insights, hidden requirements, risks, tech stack recommendation |
| 6b | **System Architecture** | Architecture style, layers, DB schema, API endpoints, ASCII diagrams |
| 7 | **Diagram Generation** | Mermaid sequence diagram from conversation |
| 8-9 | **Reports** | PDF + Markdown analysis report |
| 9b | ⭐ **Interactive Diagram Chat** | User refines diagrams & architecture via conversational AI — **drives the final system architecture & diagram choices** |
| 10 | ⭐ **Requirements Spec Q&A** | Interactive Q&A where AI asks clarification questions with suggestions → answers compiled into structured spec → **Cahier des Charges PDF** |

**Talking Point:** Each step feeds the next via RAG context — the model "remembers" earlier analysis

---

## Slide 7 — Core Feature: Real-Time Transcription

**Key Points:**
- **ElevenLabs Scribe v2** API — state-of-the-art accuracy
- Real-time audio streaming with **chunked processing** (5-second windows with overlap)
- **Speaker diarization:** automatic speaker identification
- **Multilingual:** English, French, Arabic/Tunisian dialect
- Language auto-detection with **voting system** across chunks
- **Waveform visualization** in the UI (real-time audio feedback)
- Final full-audio re-transcription with diarization for consistency

**Suggested Visual:** Screenshot of the recording UI with waveform

---

## Slide 8 — Core Feature: Context-Aware AI Analysis

**Key Points:**
- **RAG architecture:** transcript chunks stored in ChromaDB, retrieved as context for each analysis task
- **Conversation context analysis (Step 0)** is the key innovation:
  - Identifies who is the client and who is the consultant
  - Extracts project type, industry, desired features, pain points
  - This context enriches ALL subsequent analysis steps
- **Structured JSON output:** every LLM call produces validated JSON (with repair/retry logic)
- **Hallucination filtering:** post-processing removes fabricated requirements

**Technical Detail:** The `qwen_llm.py` `analyse_transcript()` method builds cumulative prompts with:
1. Conversation context summary
2. Prior transcript chunks (RAG)
3. Task-specific system prompts
4. Current transcript

---

## Slide 9 — Core Feature: System Architecture Conception

**Key Points — NEW feature not in original spec:**
- AI generates a **complete system architecture** from the conversation:
  - Architecture style recommendation (microservices, monolithic, etc.)
  - System layers with components and technologies
  - Database schema with entities, fields, types, constraints, relationships
  - API endpoints with methods, paths, and descriptions
  - Security architecture
  - Integration points
  - ASCII diagrams (system, data flow, ER, infrastructure)
- All included in both the PDF report and the Specification PDF

**Suggested Visual:** Screenshot of the architecture section in the generated PDF

---

## Slide 10 — Interactive Features: The AI Assistant Popup

**Key Points — This is the post-pipeline interactive experience:**

The `DiagramChatPopup` is a **floating multi-tab AI assistant** with 3 tabs:

### Tab 1: Chat
- Conversational AI for refining diagrams, reports, and requirements
- Shows Mermaid diagram code + can render to PNG
- Quick suggestion buttons for common actions
- Context-aware: has full report content loaded

### Tab 2: Requirements Specification (Interactive Q&A)
- **3-phase workflow:**
  1. **Q&A Phase:** AI presents clarification questions from the analysis, each with **numbered AI-generated suggestions** the user can click or type custom answers
  2. **Generation Phase:** compiles all answers into a structured spec document
  3. **Completion Phase:** shows summary, auto-generates Specification PDF, transitions to Chat with full context
- Progress bar showing question X of Y
- Category icons (⚙️ functional, 🛡️ non-functional, 💻 technical, 📅 timeline)
- Priority badges (must_ask, should_ask, nice_to_ask)

### Tab 3: Project Specification (PDF)
- One-click generation of a **"Cahier des Charges"** PDF
- Merges pipeline results + Q&A answers into a polished 12-section document

**Suggested Visual:** Screenshots/recording of the popup in action across the 3 tabs

---

## Slide 11 — Project Specification PDF ("Cahier des Charges")

**Key Points:**
- Professional, client-facing document generated by `specification_generator.py` (1127 lines)
- **12 Sections:**
  1. Executive Summary (with key metrics table)
  2. Project Context & Objectives
  3. Functional Requirements (prioritized table)
  4. Non-Functional Requirements
  5. System Architecture (with ASCII diagrams)
  6. Data Model & API Design (with entity tables, ER diagrams)
  7. Security & Integration
  8. Technology Stack (with confidence levels and alternatives)
  9. Risk Assessment & Warnings
  10. Requirements Specification (from Q&A)
  11. Open Items & Next Steps
  12. Appendix: Diagrams
- Cover page, table of contents, branded header/footer on every page
- Zebra-striped tables, color-coded priorities, callout boxes

**Talking Point:** This is a key deliverable — clients receive a complete specification document from just a conversation

---

## Slide 12 — Two PDF Reports: Analysis vs. Specification

**Key Points — distinguish the two outputs:**

| | Analysis Report | Project Specification |
|---|---|---|
| **Generator** | `report_generator.py` (1740 lines) | `specification_generator.py` (1127 lines) |
| **Purpose** | Internal analysis document | Client-facing "Cahier des Charges" |
| **Content** | Requirements, ambiguities, guidance, transcript | Complete spec with architecture, data model, timeline |
| **Format** | PDF + Markdown | PDF only |
| **When** | Automatically after pipeline | On-demand after Q&A |

---

## Slide 13 — Implementation Highlights

**Key Points:**

1. **Robust JSON Parsing:**
   - LLMs often produce malformed JSON → `_fix_json_string()` auto-repairs
   - Retry logic with temperature adjustment on failures
   - Fallback suggestions for requirement spec chat

2. **WebSocket Architecture:**
   - All interactive features use Socket.IO events
   - Background thread processing (non-blocking AI calls)
   - Session management per client (`diagram_chat_sessions`, `requirements_spec_sessions`)

3. **RAG with ChromaDB:**
   - Transcripts chunked into ~200-word segments with overlap
   - Cosine similarity retrieval for relevant context
   - Conversation context injected into every analysis prompt

4. **Error Handling:**
   - Graceful degradation: if one pipeline step fails, others continue
   - Timeout protection on AI responses (120s client-side)
   - Hallucination filtering on requirements output

---

## Slide 14 — Live Demo Plan

**Demo Flow (suggested order):**

1. **Record a conversation** (or paste a sample transcript)
   - Show waveform visualization
   - Show real-time transcription appearing
2. **Pipeline kicks off automatically**
   - Show the 10-step progress notifications in the UI
3. **Review pipeline results**
   - Show the generated analysis sections (requirements, ambiguities, guidance)
4. **Open the AI Assistant popup**
   - **Chat tab:** Ask the AI to modify the diagram
   - **Requirements tab:** Answer a few Q&A questions, show AI suggestions
   - **Specification tab:** Generate the PDF
5. **Download the reports**
   - Show both the Analysis PDF and the Specification PDF

**Fallback:** If live demo is risky, pre-record a screen capture and narrate over it

---

## Slide 15 — Conclusion & Q&A

**Key Takeaways:**
- End-to-end automation: from voice → structured specification in minutes
- AI-powered: every step leverages Qwen 2.5 with RAG for context-aware analysis
- Interactive: not just analysis, but collaborative requirements building
- Privacy-first: local LLM, no data leaves your machine
- Two deliverables: Analysis Report (internal) + Cahier des Charges (client-facing)

**Likely Questions:**
- *Q: Why Qwen and not GPT/Claude?* → Privacy, cost, speed for structured output
- *Q: How accurate is the transcription?* → ElevenLabs Scribe v2 is SOTA, supports 99 languages
- *Q: Can it handle long meetings?* → Chunked processing + RAG ensures context across the full transcript
- *Q: What if the LLM makes mistakes?* → JSON repair, retry logic, hallucination filtering, completeness scoring
- *Q: How is this different from just using ChatGPT?* → Specialized pipeline (not generic chat), RAG context, structured output, PDF reports, interactive Q&A, runs locally
