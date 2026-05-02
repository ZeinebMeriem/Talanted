from __future__ import annotations

import json
import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .exceptions import UIGeneratorException
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI UI Generator - FastAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator()

# Import and register TED routes
try:
    from . import ted_assistant
    app.include_router(ted_assistant.router)
    logger.info("✅ TED chatbot routes registered")
except Exception as e:
    logger.warning("⚠️  TED chatbot unavailable: %s", e)

# Serve built React projects as static files
PROJECTS_DIR = os.environ.get("PROJECTS_DIR", "/app/projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)
app.mount("/projects", StaticFiles(directory=PROJECTS_DIR, html=True), name="projects")


@app.exception_handler(UIGeneratorException)
async def ui_generator_exception_handler(
    request: Request, exc: UIGeneratorException
) -> JSONResponse:
    """Handle custom UI Generator exceptions with structured response."""
    logger.warning(
        "UIGeneratorException on %s %s: %s [%s]",
        request.method,
        request.url.path,
        exc.message,
        exc.error_code,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all exception handler for unexpected errors."""
    tb = traceback.format_exc()
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        type(exc).__name__,
        tb,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": {"exception_type": type(exc).__name__},
        },
    )


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
    
    # Fix common JSX syntax errors in duplicated projects
    app_tsx_path = os.path.join(new_path, "src", "App.tsx")
    if os.path.exists(app_tsx_path):
        try:
            with open(app_tsx_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # More aggressive fix: remove duplicate closing patterns
            lines = content.split('\n')
            fixed_lines = []
            prev_lines = []
            
            for line in lines:
                stripped = line.strip()
                
                # Skip if this is a duplicate closing element
                skip_line = False
                
                # Check for duplicate closing parenthesis
                if stripped == '  )':
                    # Count how many recent closing parentheses we've seen
                    recent_closing_parens = sum(1 for prev in prev_lines[-3:] if prev.strip() == '  )')
                    if recent_closing_parens >= 1:
                        skip_line = True
                
                # Check for duplicate closing div
                if stripped == '    </div>':
                    # Count how many recent closing divs we've seen
                    recent_closing_divs = sum(1 for prev in prev_lines[-5:] if prev.strip() == '    </div>')
                    if recent_closing_divs >= 2:  # Allow 2, skip the 3rd+
                        skip_line = True
                
                # Check for extra closing brace after function
                if stripped == '}' and prev_lines and prev_lines[-1].strip() == '  )':
                    skip_line = True
                
                if not skip_line:
                    fixed_lines.append(line)
                    prev_lines.append(line)
            
            fixed_content = '\n'.join(fixed_lines)
            
            with open(app_tsx_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
                
        except Exception as e:
            print(f"Warning: Could not fix JSX syntax in {app_tsx_path}: {e}")
    
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


@app.post("/internal/projects/{generation_id}/repair")
def internal_repair_project(generation_id: str) -> dict:
    """LLM-driven quality repair: evaluate → build targeted fix instructions → apply → re-evaluate."""
    import re as _re
    import json as _json
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = _re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    project_path = os.path.join(projects_dir, safe_id)
    if not os.path.isdir(project_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Project {generation_id} not found")

    def _read_project_files() -> list[CodeFile]:
        _skip = {"node_modules", "dist", ".git", "__pycache__"}
        files: list[CodeFile] = []
        for _root, _dirs, _fnames in os.walk(project_path):
            _dirs[:] = [d for d in _dirs if d not in _skip]
            for _fname in sorted(_fnames):
                if _fname.startswith("."):
                    continue
                _full = os.path.join(_root, _fname)
                _rel = os.path.relpath(_full, project_path).replace("\\", "/")
                try:
                    with open(_full, "r", encoding="utf-8") as _fh:
                        files.append(CodeFile(path=_rel, content=_fh.read()))
                except Exception:
                    pass
        return files

    # Read original prompt from .meta.json
    prompt = ""
    meta_path = os.path.join(project_path, ".meta.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path) as _mf:
                prompt = _json.load(_mf).get("prompt", "")
        except Exception:
            pass

    # ── Step 1: Initial evaluation ────────────────────────────────────────────
    code_files = _read_project_files()
    tsx_files = [f for f in code_files if f.path.endswith(".tsx")]
    app_file = next((f for f in tsx_files if f.path in ("src/App.tsx", "App.tsx")), None)
    if not app_file and tsx_files:
        app_file = tsx_files[0]
    main_code = app_file.content if app_file else ""

    try:
        before = orchestrator.ui_evaluator.evaluate(prompt=prompt, code=main_code, build_success=True)
    except Exception as exc:
        logger.error("repair: initial evaluation failed (%s)", exc)
        return {"repaired": False, "globalScore": 0, "semanticFidelity": 0,
                "codeQuality": 0, "completeness": 0, "accessibility": 0, "visualRichness": 0}

    # ── Step 2: Build targeted fix instructions from weak dimensions ──────────
    # Generic fallback guidance per dimension (used when LLM reasoning is absent)
    _DIM_GUIDANCE: dict[str, str] = {
        "semantic_fidelity": (
            "Re-align the UI with the original prompt. Ensure the requested domain, all data "
            "fields, page titles, and domain-specific vocabulary are present and prominent."
        ),
        "code_quality": (
            "Improve code craftsmanship: split any component larger than 150 lines into smaller "
            "named sub-components, replace every inline `style={{}}` with Tailwind classes, "
            "remove console.log / TODO comments, add TypeScript types for all props and state, "
            "use named exports, ensure a single default export at the bottom."
        ),
        "completeness": (
            "Audit the original prompt word-by-word. Add every section, feature, field, or "
            "interaction that is mentioned but not yet implemented."
        ),
        "accessibility": (
            "Add WCAG 2.1 AA accessibility: give every <input> an associated <label> or "
            "aria-label, add alt text to all <img> tags, replace div+onClick with <button>, "
            "use semantic landmarks (<nav> <header> <main> <footer>), add aria-label to icon "
            "buttons, ensure focus-visible outlines are not removed."
        ),
        "visual_richness": (
            "Enrich the visual design: add a variety of components (stat cards, data table or "
            "chart, icon usage, badges/pills, progress bars), use a consistent multi-color "
            "Tailwind palette, establish clear typographic hierarchy (heading sizes, weights), "
            "and add at least one Recharts chart if the domain involves data."
        ),
    }

    THRESHOLD = 70
    weak = {
        dim: before["dimensions"][dim]
        for dim in ("semantic_fidelity", "code_quality", "completeness", "accessibility", "visual_richness")
        if before["dimensions"].get(dim, 100) < THRESHOLD
    }

    if not weak:
        logger.info("repair: all dimensions already ≥ %d — no LLM fix needed", THRESHOLD)
        ev = before
    else:
        # Build a single combined instruction listing every weak dimension with its
        # LLM-provided reasoning (or generic guidance as fallback).
        reasoning = before.get("reasoning", {})
        fix_parts: list[str] = []
        for dim, score in sorted(weak.items(), key=lambda x: x[1]):
            llm_reason = reasoning.get(dim, "")
            guidance = _DIM_GUIDANCE[dim]
            if llm_reason:
                fix_parts.append(
                    f"── {dim.upper().replace('_', ' ')} (score {score}/100) ──\n"
                    f"Judge feedback: {llm_reason}\n"
                    f"Required fix: {guidance}"
                )
            else:
                fix_parts.append(
                    f"── {dim.upper().replace('_', ' ')} (score {score}/100) ──\n"
                    f"Required fix: {guidance}"
                )

        combined_instruction = (
            f"Original prompt: \"{prompt[:400]}\"\n\n"
            "Apply ALL of the following quality improvements to this file. "
            "Each improvement targets a specific weak dimension identified by an LLM judge:\n\n"
            + "\n\n".join(fix_parts)
            + "\n\nIMPORTANT: Do not remove any existing working features. "
            "Keep all existing data, routes, and components. "
            "Only ADD or IMPROVE — never delete functional code."
        )

        logger.info("repair: applying LLM fix for weak dims: %s", list(weak.keys()))

        # ── Step 3: Apply the fix via edit_file ───────────────────────────────
        try:
            from ..schemas import EditFileRequest as _EditReq
            edit_req = _EditReq(
                generationId=generation_id,
                filePath=app_file.path if app_file else "App.tsx",
                instruction=combined_instruction,
            )
            orchestrator.edit_file(edit_req)
            logger.info("repair: LLM edit applied successfully")
        except Exception as exc:
            logger.error("repair: LLM edit failed (%s) — skipping", exc)

        # ── Step 4: Re-read files and re-evaluate ─────────────────────────────
        code_files = _read_project_files()
        tsx_files = [f for f in code_files if f.path.endswith(".tsx")]
        app_file_after = next(
            (f for f in tsx_files if f.path in ("src/App.tsx", "App.tsx")), None
        ) or (tsx_files[0] if tsx_files else None)
        main_code_after = app_file_after.content if app_file_after else main_code

        try:
            ev = orchestrator.ui_evaluator.evaluate(
                prompt=prompt, code=main_code_after, build_success=True
            )
        except Exception as exc:
            logger.error("repair: post-fix evaluation failed (%s) — returning pre-fix scores", exc)
            ev = before

    return {
        "repaired": True,
        "globalScore":      ev["global_score"],
        "semanticFidelity": ev["dimensions"]["semantic_fidelity"],
        "codeQuality":      ev["dimensions"]["code_quality"],
        "completeness":     ev["dimensions"]["completeness"],
        "accessibility":    ev["dimensions"]["accessibility"],
        "visualRichness":   ev["dimensions"]["visual_richness"],
        "reasoning":        ev.get("reasoning", {}),
    }


@app.post("/internal/projects/{generation_id}/docs")
def internal_generate_docs(generation_id: str) -> dict:
    """Generate README.md and JSDoc comments for an existing project."""
    import re as _re
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = _re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    project_path = os.path.join(projects_dir, safe_id)
    if not os.path.isdir(project_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Project {generation_id} not found")

    src_dir = os.path.join(project_path, "src")
    tsx_files: dict[str, str] = {}
    if os.path.isdir(src_dir):
        for root, _, fnames in os.walk(src_dir):
            for fname in sorted(fnames):
                if fname.endswith((".tsx", ".ts", ".jsx", ".js")):
                    full = os.path.join(root, fname)
                    rel = os.path.relpath(full, project_path).replace("\\", "/")
                    try:
                        with open(full, "r", encoding="utf-8") as fh:
                            tsx_files[rel] = fh.read()
                    except Exception:
                        pass

    import json as _json
    prompt = ""
    meta_path = os.path.join(project_path, ".meta.json")
    if os.path.exists(meta_path):
        with open(meta_path) as mf:
            prompt = _json.load(mf).get("prompt", "")

    component_list = "\n".join(f"- `{p}`" for p in tsx_files)
    readme_content = f"""# Generated UI Project

> Auto-generated by **Talanted** — AI-Powered UI Generator

## Overview
{prompt or 'A React + Tailwind CSS UI generated by Talanted.'}

## Tech Stack
- React 18 + TypeScript
- Tailwind CSS for styling
- Vite as build tool

## Project Structure
```
{chr(10).join(p for p in tsx_files)}
```

## Components
{component_list}

## Getting Started
```bash
npm install
npm run dev   # development server
npm run build # production build
```

---
*Generated by [Talanted](https://talanted.dev)*
"""
    with open(os.path.join(project_path, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_content)

    files_updated = 0
    try:
        from .pipeline.llm_provider import create_planner_provider
        provider = create_planner_provider()
        sys_msg = (
            "You are a senior TypeScript developer. "
            "Add concise JSDoc comments (/** ... */) above each exported function and component. "
            "Add @param and @returns tags where relevant. "
            "Do NOT change any logic or imports. Return ONLY the updated file content with no markdown fences."
        )
        for rel_path, content in list(tsx_files.items())[:4]:
            user_msg = f"File: {rel_path}\n\n```tsx\n{content[:3000]}\n```"
            try:
                documented = provider.chat(sys_msg, user_msg)
                if documented and len(documented) > 100:
                    with open(os.path.join(project_path, rel_path), "w", encoding="utf-8") as f:
                        f.write(documented.strip())
                    files_updated += 1
            except Exception:
                pass
    except Exception as exc:
        logger.warning("JSDoc generation failed: %s", exc)

    return {"readme": readme_content, "filesUpdated": files_updated, "readmePath": "README.md"}


