"""FastAPI backend — REST API for the AI processing pipeline.

Endpoints:
  GET  /health           — Health check
  POST /ingest           — Ingest transcripts into ChromaDB
  POST /analyse          — Run RAG analysis (requirements | summary | diagram)
  POST /pipeline/run     — Full pipeline execution
  POST /diagram          — Generate a Mermaid diagram
  GET  /stats            — Pipeline stats
  GET  /reports          — List generated reports
  GET  /reports/{name}   — Download a report file
  POST /ingest/live      — Ingest live transcript text

CORS enabled for the React frontend.
"""
from __future__ import annotations

import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from pipeline.pipeline_config import PipelineConfig
from pipeline.orchestrator import PipelineOrchestrator

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Transcript AI Pipeline",
    description="RAG-powered transcript analysis with Qwen 2.5",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for CPU-bound pipeline work (so FastAPI stays responsive)
_executor = ThreadPoolExecutor(max_workers=2)

# Lazy-init pipeline (heavy init — only when first needed)
_pipeline: Optional[PipelineOrchestrator] = None


def _get_pipeline() -> PipelineOrchestrator:
    global _pipeline
    if _pipeline is None:
        _pipeline = PipelineOrchestrator()
    return _pipeline


# ── Request schemas ───────────────────────────────────────────────────────────

class AnalyseRequest(BaseModel):
    text: str = Field(..., description="Transcript text to analyse")
    task: str = Field("requirements", description="Analysis task: requirements | summary | diagram | system_architecture")


class PipelineRunRequest(BaseModel):
    text: Optional[str] = Field(None, description="Optional transcript text (else uses files on disk)")
    tasks: list = Field(["requirements", "summary", "system_architecture", "diagram"], description="Tasks to run")


class DiagramRequest(BaseModel):
    description: str = Field(..., description="What the diagram should show")


class IngestLiveRequest(BaseModel):
    text: str = Field(..., description="Live transcript text to ingest")
    source: str = Field("live_session", description="Source label")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "Transcript AI Pipeline",
        "model": PipelineConfig.QWEN_MODEL,
        "ollama": PipelineConfig.OLLAMA_BASE_URL,
    }


@app.post("/ingest")
async def ingest_transcripts():
    """Ingest all transcript files from disk into ChromaDB."""
    loop = asyncio.get_event_loop()
    pipeline = _get_pipeline()
    result = await loop.run_in_executor(_executor, pipeline.ingest_only)
    return result


@app.post("/ingest/live")
async def ingest_live(req: IngestLiveRequest):
    """Ingest live transcript text into ChromaDB."""
    pipeline = _get_pipeline()
    chunks = pipeline.rag.ingest_text(req.text, source=req.source)
    return {"chunks_ingested": chunks, "source": req.source}


@app.post("/analyse")
async def analyse(req: AnalyseRequest):
    """Run a single RAG analysis task."""
    loop = asyncio.get_event_loop()
    pipeline = _get_pipeline()
    result = await loop.run_in_executor(
        _executor,
        lambda: pipeline.analyse_only(req.text, task=req.task),
    )
    return result


@app.post("/pipeline/run")
async def run_pipeline(req: PipelineRunRequest):
    """Run the full pipeline (ingest → analyse → diagram → PDF)."""
    loop = asyncio.get_event_loop()
    pipeline = _get_pipeline()
    result = await loop.run_in_executor(
        _executor,
        lambda: pipeline.run(transcript_text=req.text, tasks=req.tasks),
    )
    return result


@app.post("/diagram")
async def generate_diagram(req: DiagramRequest):
    """Generate a Mermaid diagram from a description."""
    loop = asyncio.get_event_loop()
    pipeline = _get_pipeline()
    result = await loop.run_in_executor(
        _executor,
        lambda: pipeline.diagram_only(req.description),
    )
    return result


@app.get("/stats")
async def stats():
    """Pipeline stats."""
    pipeline = _get_pipeline()
    return pipeline.stats()


@app.get("/reports")
async def list_reports():
    """List all generated reports and diagrams."""
    PipelineConfig.ensure_dirs()
    reports = []
    for d in [PipelineConfig.REPORTS_DIR, PipelineConfig.DIAGRAMS_DIR]:
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                fpath = os.path.join(d, f)
                reports.append({
                    "name": f,
                    "path": fpath,
                    "size_kb": round(os.path.getsize(fpath) / 1024, 1),
                    "type": "report" if d == PipelineConfig.REPORTS_DIR else "diagram",
                })
    return {"reports": reports}


@app.get("/reports/{filename}")
async def download_report(filename: str):
    """Download a specific report file."""
    for d in [PipelineConfig.REPORTS_DIR, PipelineConfig.DIAGRAMS_DIR]:
        fpath = os.path.join(d, filename)
        if os.path.exists(fpath):
            return FileResponse(fpath, filename=filename)
    raise HTTPException(status_code=404, detail="Report not found")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 70)
    print("🚀 Transcript AI Pipeline — FastAPI Server")
    print(f"   Model: {PipelineConfig.QWEN_MODEL}")
    print(f"   Ollama: {PipelineConfig.OLLAMA_BASE_URL}")
    print(f"   Port: {PipelineConfig.API_PORT}")
    print("=" * 70 + "\n")

    PipelineConfig.ensure_dirs()
    uvicorn.run(
        "pipeline.api_server:app",
        host=PipelineConfig.API_HOST,
        port=PipelineConfig.API_PORT,
        reload=False,
        workers=1,
        log_level="info",
    )
