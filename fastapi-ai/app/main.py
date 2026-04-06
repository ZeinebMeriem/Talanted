from __future__ import annotations

import json
import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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
    ProjectFilesResponse,
    RestoreRequest,
    RestoreResponse,
    DuplicateResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="AI UI Generator - FastAPI (MVP)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/internal/generate/stream")
def internal_generate_stream(payload: GenerateRequest) -> StreamingResponse:
    """SSE endpoint: yields progress events then the final result.

    Each event is a Server-Sent Event line:
      data: {"type":"progress","stage":"planning","progress":28,"message":"..."}\n\n
      ...
      data: {"type":"complete","progress":100,"result":{...}}\n\n
      data: {"type":"error","message":"..."}\n\n
    """
    def _event_generator():
        for event in orchestrator.run_stream(payload):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/internal/edit-file", response_model=EditFileResponse)
def internal_edit_file(payload: EditFileRequest) -> EditFileResponse:
    return orchestrator.edit_file(payload)


@app.get("/internal/projects/{generation_id}/files", response_model=ProjectFilesResponse)
def internal_get_project_files(generation_id: str) -> ProjectFilesResponse:
    """Read all source files directly from disk — source of truth for the CODE tab."""
    import re
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    src_dir = os.path.join(projects_dir, safe_id, "src")
    files: list[CodeFile] = []
    if os.path.isdir(src_dir):
        for root, _, filenames in os.walk(src_dir):
            for fname in sorted(filenames):
                full = os.path.join(root, fname)
                rel = os.path.relpath(full, os.path.join(projects_dir, safe_id)).replace("\\", "/")
                try:
                    with open(full, "r", encoding="utf-8") as fh:
                        files.append(CodeFile(path=rel, content=fh.read()))
                except Exception:
                    pass
    return ProjectFilesResponse(files=files)


@app.post("/internal/projects/{generation_id}/restore", response_model=RestoreResponse)
def internal_restore_project(generation_id: str, payload: RestoreRequest) -> RestoreResponse:
    """Write files to disk and rebuild — used by rollback."""
    import re, subprocess
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    project_path = os.path.join(projects_dir, safe_id)
    for cf in payload.files:
        full = os.path.join(project_path, cf.path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(cf.content)
    vite_bin = "/app/vite-template/node_modules/.bin/vite"
    result = subprocess.run(
        [vite_bin, "build"], cwd=project_path, capture_output=True, text=True, timeout=120
    )
    success = result.returncode == 0
    return RestoreResponse(buildSuccess=success, buildOutput=(result.stdout + result.stderr)[-2000:])


@app.post("/internal/projects/{generation_id}/duplicate", response_model=DuplicateResponse)
def internal_duplicate_project(generation_id: str) -> DuplicateResponse:
    """Duplicate an existing project with a new ID."""
    import re
    import subprocess
    import shutil
    import uuid
    
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    source_path = os.path.join(projects_dir, safe_id)
    
    if not os.path.isdir(source_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Project {generation_id} not found")
    
    # Generate new ID (using UUID since ulid may not be installed)
    new_id = uuid.uuid4().hex[:26].upper()
    new_path = os.path.join(projects_dir, new_id)
    
    # Copy entire project directory
    shutil.copytree(source_path, new_path)
    
    # Rebuild the duplicated project
    vite_bin = "/app/vite-template/node_modules/.bin/vite"
    result = subprocess.run(
        [vite_bin, "build"], cwd=new_path, capture_output=True, text=True, timeout=120
    )
    success = result.returncode == 0
    
    return DuplicateResponse(
        newGenerationId=new_id,
        buildSuccess=success,
        buildOutput=(result.stdout + result.stderr)[-2000:]
    )

