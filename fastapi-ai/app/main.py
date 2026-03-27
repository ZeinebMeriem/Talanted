from __future__ import annotations

import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .pipeline.orchestrator import Orchestrator
from .schemas import (
    AiReport,
    CodeBundle,
    CodeFile,
    GenerateRequest,
    GenerateResponse,
    EditFileRequest,
    EditFileResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="AI UI Generator - FastAPI (MVP)")

orchestrator = Orchestrator()

# Serve built React projects as static files
PROJECTS_DIR = os.environ.get("PROJECTS_DIR", "/app/projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)
app.mount("/projects", StaticFiles(directory=PROJECTS_DIR, html=True), name="projects")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s:\n%s", request.method, request.url.path, tb)
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb[-2000:]})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/generate", response_model=GenerateResponse)
def internal_generate(payload: GenerateRequest) -> GenerateResponse:
    return orchestrator.run(payload)


@app.post("/internal/edit-file", response_model=EditFileResponse)
def internal_edit_file(payload: EditFileRequest) -> EditFileResponse:
    return orchestrator.edit_file(payload)
