# 🎤 Transcript AI — Real-Time Speech-to-Text & Requirements Analysis

A real-time speech-to-text system with **AI-powered requirements analysis**. Record meetings, get live transcription with speaker diarization, then automatically extract requirements, detect ambiguities, generate architecture diagrams, and produce PDF reports — all from a single conversation.

Supports **English**, **French**, and **Arabic/Tunisian dialect** (including code-switching).

## ✨ Features

### Speech-to-Text
- 🎙️ **Real-time streaming transcription** via ElevenLabs Scribe v2
- 👥 **Speaker diarization** — color-coded speaker segments
- 🌍 **Multi-language**: English, French, Arabic, Tunisian dialect
- 🔄 **Code-switching detection**: handles mixed-language speech
- 🔤 **RTL support**: automatic right-to-left for Arabic text

### AI Analysis Pipeline (RAG + Qwen 2.5)
- 📋 **Requirements extraction** — functional & non-functional with priority levels
- 📝 **Meeting summary** — participants, topics, key decisions, action items
- ⚠️ **Ambiguity detection** — find vague, contradictory, or incomplete statements
- ❓ **Clarification questions** — prioritized follow-up questions for the client
- 🧭 **Consultant guidance** — insights, hidden requirements, risk areas, stakeholder analysis
- 📊 **Architecture diagrams** — auto-generated Mermaid flowcharts from transcript
- 📄 **PDF reports** — professional A4 report combining all analysis sections

### Frontend
- 🎨 **React UI** with live waveform visualizer and animations
- 📋 **Copy to clipboard** with speaker labels
- ⬇️ **Download** PDF reports and diagram images
- 📈 **Pipeline progress bar** with step-by-step tracking

## 🏗️ Architecture

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Streaming API** | 5001 | Flask + SocketIO | Recording, transcription, WebSocket events |
| **Pipeline API** | 8080 | FastAPI + Uvicorn | AI analysis, RAG, PDF/diagram generation |
| **Frontend** | 5173 | React 19 + Vite | User interface |

External dependencies:
- **ElevenLabs API** — speech-to-text (Scribe v2 model)
- **Ollama** — local LLM inference (Qwen 2.5)
- **ChromaDB** — vector store for RAG context retrieval

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| Python | 3.10+ | [python.org](https://www.python.org/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Ollama | latest | [ollama.com](https://ollama.com/) |
| Microphone | — | System audio input |

### 1. Install dependencies

```bash
# Python packages
pip install -r requirements.txt

# Additional pipeline packages (if not already installed)
pip install fastapi uvicorn chromadb sentence-transformers reportlab

# Frontend packages
cd transcript-ui && npm install && cd ..
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
# Required
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional — defaults shown
OLLAMA_BASE_URL=http://localhost:11434
QWEN_MODEL=qwen2.5:3b
DEFAULT_LANGUAGE=en
```

### 3. Pull the LLM model

```bash
ollama pull qwen2.5:3b
```

### 4. Start all services

```bash
./start.sh
```

This starts all three services and prints their URLs:

```
  🎨 Frontend UI:        http://localhost:5173
  📡 Streaming API:      http://localhost:5001
  🤖 Pipeline API:       http://localhost:8080
  📖 Pipeline Docs:      http://localhost:8080/docs
```

Press `Ctrl+C` to stop everything.

### 5. Use the app

1. Open **http://localhost:5173** in your browser
2. Select a language (or leave on auto-detect)
3. Click **Start Recording** and speak
4. Click **Stop Recording** — transcription appears in real-time
5. The AI pipeline runs automatically, producing requirements, summaries, diagrams, and a PDF report

## 📁 Project Structure

```
elvenlabstest/
├── start.sh                    # Unified startup script (all 3 services)
├── api_server_streaming.py     # Flask + SocketIO streaming server (port 5001)
├── api_server.py               # Legacy Flask API (simple, non-streaming)
├── speech_to_text.py           # ElevenLabs Scribe v2 STT engine
├── language_utils.py           # Language detection & code-switching
├── config.py                   # App configuration
├── main.py                     # CLI interface for recording & transcription
├── .env                        # API keys (not committed)
├── requirements.txt            # Python dependencies
│
├── pipeline/                   # AI analysis pipeline
│   ├── api_server.py           # FastAPI REST API (port 8080)
│   ├── orchestrator.py         # Sequential pipeline coordinator
│   ├── rag_controller.py       # RAG: retrieve context + LLM analysis
│   ├── qwen_llm.py             # Qwen 2.5 client via Ollama
│   ├── vector_store.py         # ChromaDB vector store
│   ├── preprocessing.py        # Text chunking & cleaning
│   ├── diagram_generator.py    # Mermaid diagram generation & rendering
│   ├── report_generator.py     # PDF report generation (ReportLab)
│   └── pipeline_config.py      # Pipeline settings
│
├── transcript-ui/              # React frontend
│   ├── src/
│   │   ├── App.jsx             # Main application component
│   │   ├── main.jsx            # Entry point
│   │   └── App.css             # Styles
│   ├── package.json
│   └── vite.config.js
│
├── outputs/                    # Saved transcriptions
├── recordings/                 # Saved audio files
├── pipeline_outputs/
│   ├── reports/                # Generated PDF reports
│   └── diagrams/               # Generated Mermaid diagrams (.mmd + .png)
└── chroma_db/                  # ChromaDB persistent storage
```

## 🔧 API Reference

### Streaming API (port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Recording status, duration, transcription |
| `GET` | `/api/reports/<filename>` | Download a report or diagram file |

**Socket.IO events** (client to server):
- `start_recording` — begin streaming mic recording (`{ language?: string }`)
- `stop_recording` — stop and finalize transcription
- `run_pipeline` — manually trigger AI analysis (`{ text?: string }`)

**Socket.IO events** (server to client):
- `transcription_update` — real-time transcription chunks with speaker labels
- `recording_completed` — final transcription with full diarization
- `pipeline_progress` — step-by-step progress updates (1-8)
- `pipeline_completed` — all analysis results (requirements, summary, diagram, PDF, etc.)

### Pipeline API (port 8080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/ingest` | Ingest transcript files into ChromaDB |
| `POST` | `/ingest/live` | Ingest live transcript text |
| `POST` | `/analyse` | Run a single analysis task |
| `POST` | `/pipeline/run` | Full pipeline execution |
| `POST` | `/diagram` | Generate a Mermaid diagram |
| `GET` | `/stats` | Pipeline statistics |
| `GET` | `/reports` | List generated reports and diagrams |
| `GET` | `/reports/{filename}` | Download a specific file |
| `GET` | `/docs` | Interactive API documentation (Swagger) |

## ⚙️ Configuration

All settings can be overridden via environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | — | **Required.** ElevenLabs API key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `QWEN_MODEL` | `qwen2.5:3b` | LLM model for analysis |
| `QWEN_TEMPERATURE` | `0.3` | LLM temperature |
| `QWEN_MAX_TOKENS` | `4096` | Max output tokens |
| `QWEN_TIMEOUT` | `120` | LLM request timeout (seconds) |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-Transformer model |
| `RAG_TOP_K` | `5` | Context chunks retrieved per query |
| `CHUNK_SIZE` | `512` | Text chunk size for indexing |
| `PIPELINE_PORT` | `8080` | Pipeline API port |
| `DEFAULT_LANGUAGE` | `en` | Default transcription language |

## 🌍 Supported Languages

| Language | Code | Notes |
|----------|------|-------|
| English | `en` | Full support |
| French | `fr` | Full support |
| Arabic | `ar` | Full support, RTL rendering |
| Tunisian | `tn` | Treated as Arabic variant, handles code-switching |

Tunisian dialect typically involves mixing Arabic, French, and local expressions in a single conversation. The system handles this automatically.

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ELEVENLABS_API_KEY not found` | Create `.env` file with your API key |
| `Ollama not reachable` | Run `ollama serve` and `ollama pull qwen2.5:3b` |
| Port already in use | Run `./start.sh` — it kills stale processes automatically |
| Microphone not working | Check System Preferences > Privacy & Security > Microphone |
| Frontend not loading | Run `cd transcript-ui && npm install` |
| Pipeline analysis slow | Use a smaller model: `QWEN_MODEL=qwen2.5:1.5b` in `.env` |
| Diagram rendering fails | Install Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli` |

**Logs** are written to `/tmp/` when using `start.sh`:
- `/tmp/streaming_api.log`
- `/tmp/pipeline_api.log`
- `/tmp/frontend.log`

## 📝 CLI Usage

For command-line usage without the web UI:

```bash
# Interactive mode
python main.py

# Record and transcribe (10 seconds)
python main.py --record --duration 10

# Transcribe with specific language
python main.py --record --duration 10 --language fr

# Transcribe an existing audio file
python main.py --file path/to/audio.wav
```

## 📄 License

This project uses:
- [ElevenLabs](https://elevenlabs.io/) (Commercial API)
- [Ollama](https://ollama.com/) + [Qwen 2.5](https://huggingface.co/Qwen) (Open source)
- [ChromaDB](https://www.trychroma.com/) (Apache 2.0)
- [React](https://react.dev/) (MIT)
