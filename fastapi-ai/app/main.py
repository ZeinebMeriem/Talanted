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

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:8081,http://ai-ui-spring-bff:8080"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    allow_credentials=True,
)

orchestrator = Orchestrator()

# ── Internal endpoint protection ─────────────────────────────────────────────
_INTERNAL_SECRET = os.getenv("INTERNAL_API_SECRET", "")
_ALLOWED_INTERNAL_HOSTS = {"ai-ui-spring-bff", "spring-bff", "localhost", "127.0.0.1"}

@app.middleware("http")
async def protect_internal_endpoints(request: Request, call_next):
    """Block /internal/* requests from external networks only."""
    if request.url.path.startswith("/internal/"):
        client_host = (request.client.host if request.client else "") or ""
        provided_secret = request.headers.get("X-Internal-Secret", "")
        # Allow Docker internal network (172.x.x.x, 10.x.x.x, 192.168.x.x)
        is_private_network = (
            client_host.startswith("172.") or
            client_host.startswith("10.") or
            client_host.startswith("192.168.") or
            client_host in _ALLOWED_INTERNAL_HOSTS
        )
        secret_ok = bool(_INTERNAL_SECRET) and provided_secret == _INTERNAL_SECRET
        if not is_private_network and not secret_ok:
            return JSONResponse(status_code=403, content={"detail": "Internal endpoint — access denied"})
    return await call_next(request)

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


@app.post("/internal/projects/{generation_id}/apply-snippet")
def internal_apply_snippet(generation_id: str, body: dict) -> dict:
    """Apply an accessibility fix by direct snippet replacement — no LLM needed."""
    import re as _re, subprocess, os as _os, difflib
    projects_dir = _os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = _re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    project_path = _os.path.join(projects_dir, safe_id)

    file_path: str = (body.get("filePath") or "").strip()
    current_code: str = (body.get("currentCode") or "").strip()
    auto_fix_code: str = (body.get("autoFixCode") or "").strip()

    logger.info(f"[apply-snippet] filePath={file_path!r} has_current={bool(current_code)} has_fix={bool(auto_fix_code)}")

    if not file_path or not auto_fix_code:
        return {"success": False, "message": "filePath and autoFixCode are required"}

    # Resolve path — handle both "src/components/foo.tsx" and "components/foo.tsx"
    rel = file_path.lstrip("/")
    if rel.startswith("src/"):
        rel = rel[len("src/"):]

    full_path = _os.path.join(project_path, "src", rel)
    if not _os.path.exists(full_path):
        # Walk src/ looking for a filename match (case-insensitive)
        basename = _os.path.basename(rel).lower()
        for root, _, files in _os.walk(_os.path.join(project_path, "src")):
            for f in files:
                if f.lower() == basename:
                    full_path = _os.path.join(root, f)
                    break

    if not _os.path.exists(full_path):
        return {"success": False, "message": f"File not found: {file_path}"}

    with open(full_path, "r", encoding="utf-8") as fh:
        original_content = fh.read()

    def _norm(s: str) -> str:
        return _re.sub(r'\s+', ' ', s).strip()

    new_content = None
    strategy_used = None
    c_lines = original_content.splitlines()

    # Strategy 1: exact string match
    if current_code and current_code in original_content:
        new_content = original_content.replace(current_code, auto_fix_code, 1)
        strategy_used = "exact"

    # Strategy 2: whitespace-normalised line-by-line match
    if new_content is None and current_code:
        q_lines = current_code.splitlines()
        q_norm  = [_norm(l) for l in q_lines if _norm(l)]
        if q_norm:
            for i in range(len(c_lines) - len(q_norm) + 1):
                window = [_norm(c_lines[i + j]) for j in range(len(q_norm))]
                if window == q_norm:
                    new_lines = c_lines[:i] + auto_fix_code.splitlines() + c_lines[i + len(q_norm):]
                    new_content = "\n".join(new_lines)
                    strategy_used = "ws-normalised"
                    break

    # Strategy 3: element-name match — LLM often omits extra props (className, ref…)
    # Extract the JSX element name from currentCode, find the unique line containing it.
    if new_content is None and current_code:
        elem_m = _re.search(r'<([\w.]+)', current_code)
        if elem_m:
            elem_name = elem_m.group(1)
            matching = [(i, l) for i, l in enumerate(c_lines) if elem_name in l and '<' in l]
            if len(matching) == 1:
                i = matching[0][0]
                fix_lines = auto_fix_code.splitlines()
                new_lines = c_lines[:i] + fix_lines + c_lines[i + 1:]
                new_content = "\n".join(new_lines)
                strategy_used = f"element-name({elem_name})"
            elif len(matching) > 1:
                # Multiple occurrences — pick the one whose normalised text best matches currentCode
                best_ratio, best_i = 0.0, -1
                for i, line in matching:
                    ratio = difflib.SequenceMatcher(None, _norm(current_code), _norm(line)).ratio()
                    if ratio > best_ratio:
                        best_ratio, best_i = ratio, i
                if best_ratio >= 0.4 and best_i >= 0:
                    fix_lines = auto_fix_code.splitlines()
                    new_lines = c_lines[:best_i] + fix_lines + c_lines[best_i + 1:]
                    new_content = "\n".join(new_lines)
                    strategy_used = f"element-best({elem_name},{best_ratio:.2f})"

    # Strategy 4: Attribute injection — surgically add a11y attrs to an existing opening tag.
    # This avoids the "replace one line of a multi-line element" corruption from strategies 1-3.
    if new_content is None:
        _a11y_attr_re = _re.compile(
            r'(?:aria-[\w-]+=(?:"[^"]*"|\'[^\']*\'|\{[^}]*\})|'
            r'\balt=(?:"[^"]*"|\'[^\']*\'|\{[^}]*\})|'
            r'\btabIndex=(?:"[^"]*"|\'[^\']*\'|\{[^}]*\})|'
            r'\brole=(?:"[^"]*"|\'[^\']*\'|\{[^}]*\}))'
        )
        new_a11y = _a11y_attr_re.findall(auto_fix_code)
        elem_src_a = current_code or auto_fix_code
        elem_m_a = _re.search(r'<([\w.]+)', elem_src_a)

        if new_a11y and elem_m_a:
            elem_name_a = elem_m_a.group(1)

            def _find_tag_end(content: str, tag_start: int) -> int:
                depth = 0
                for j in range(tag_start, min(tag_start + 1000, len(content))):
                    ch = content[j]
                    if ch == '{': depth += 1
                    elif ch == '}' and depth > 0: depth -= 1
                    elif ch == '>' and depth == 0: return j
                return -1

            positions = [m.start() for m in _re.finditer(
                r'<' + _re.escape(elem_name_a) + r'(?=[\s\n\t/>])', original_content
            )]
            target_pos = None
            if len(positions) == 1:
                target_pos = positions[0]
            elif len(positions) > 1 and current_code:
                best_ratio_a, target_pos = 0.0, None
                for p in positions:
                    ctx = original_content[max(0, p - 20):p + 300]
                    ratio = difflib.SequenceMatcher(None, _norm(current_code), _norm(ctx)).ratio()
                    if ratio > best_ratio_a:
                        best_ratio_a, target_pos = ratio, p

            if target_pos is not None:
                tag_end = _find_tag_end(original_content, target_pos)
                if tag_end >= 0:
                    opening = original_content[target_pos:tag_end]
                    to_add = [a for a in new_a11y if a.split('=')[0].strip() not in opening]
                    if to_add:
                        attrs_str = ' ' + ' '.join(to_add)
                        if original_content[tag_end - 1] == '/':
                            slash_pos = original_content.rindex('/', target_pos, tag_end)
                            new_content = original_content[:slash_pos] + attrs_str + ' /' + original_content[tag_end:]
                        else:
                            new_content = original_content[:tag_end] + attrs_str + original_content[tag_end:]
                        strategy_used = f"attr-inject({elem_name_a})"

    # Strategy 5: difflib fuzzy match over sliding windows (lowered threshold)
    if new_content is None and current_code:
        q_lines = [l for l in current_code.splitlines() if _norm(l)]
        window_size = max(1, len(q_lines))
        best_ratio, best_i = 0.0, -1
        for i in range(max(1, len(c_lines) - window_size + 1)):
            window = "\n".join(c_lines[i:i + window_size])
            ratio = difflib.SequenceMatcher(None, _norm(current_code), _norm(window)).ratio()
            if ratio > best_ratio:
                best_ratio, best_i = ratio, i
        if best_ratio >= 0.45 and best_i >= 0:
            end_i = best_i + window_size
            new_lines = c_lines[:best_i] + auto_fix_code.splitlines() + c_lines[end_i:]
            new_content = "\n".join(new_lines)
            strategy_used = f"fuzzy({best_ratio:.2f})"

    logger.info(f"[apply-snippet] strategy={strategy_used!r} matched={new_content is not None}")

    if new_content is None:
        return {
            "success": False,
            "message": (
                "Could not locate the exact code to replace in this file. "
                "The LLM's code snippet may differ from the actual file. "
                "You can apply this fix manually: open the file and make the change shown in 'Auto-Fix Code'."
            )
        }

    # Sanity check: don't write if nothing actually changed
    if new_content == original_content:
        return {"success": False, "message": "No change was made — the fix may already be applied."}

    # Auto-fix: convert alt= to aria-label= on non-img elements (LLM often gets this wrong for SVG icons)
    # If the fixed line has `alt=` but NOT on an <img element, replace with aria-label=
    def _fix_alt_on_icons(code: str) -> str:
        fixed_lines = []
        for line in code.splitlines():
            stripped = line.strip()
            if 'alt=' in stripped and not stripped.startswith('<img') and '<img' not in stripped:
                line = _re.sub(r'\balt=', 'aria-label=', line)
            fixed_lines.append(line)
        return "\n".join(fixed_lines)

    new_content = _fix_alt_on_icons(new_content)

    with open(full_path, "w", encoding="utf-8") as fh:
        fh.write(new_content)

    # Rebuild — revert on failure
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=project_path,
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            with open(full_path, "w", encoding="utf-8") as fh:
                fh.write(original_content)
            # Extract only the meaningful error line (skip node internals / stack frames)
            err_lines = [l for l in result.stderr.splitlines()
                         if l.strip() and not l.strip().startswith("at ") and "node_modules" not in l]
            short_err = " | ".join(err_lines[:3]) if err_lines else result.stderr[-200:]
            return {"success": False, "message": f"The auto-generated fix introduced a syntax error — file was safely reverted. You can apply this fix manually. (Build error: {short_err})"}
    except Exception as e:
        with open(full_path, "w", encoding="utf-8") as fh:
            fh.write(original_content)
        return {"success": False, "message": f"Build error — fix reverted: {e}"}

    return {"success": True, "message": f"Fix applied to {file_path} (strategy: {strategy_used})"}


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


@app.post("/internal/projects/{generation_id}/deploy/netlify")
def internal_deploy_netlify(generation_id: str, body: dict) -> dict:
    """Deploy the built dist/ folder to Netlify and return the public URL."""
    import re as _re, io, zipfile, requests as _req
    token = (body.get("token") or "").strip()
    if not token:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Netlify personal access token is required")

    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = _re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    dist_path = os.path.join(projects_dir, safe_id, "dist")
    if not os.path.isdir(dist_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No built dist/ folder found — generate the project first")

    # Zip the dist/ contents (index.html at zip root, not nested in dist/)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(dist_path):
            for fname in files:
                full = os.path.join(root, fname)
                arcname = os.path.relpath(full, dist_path).replace("\\", "/")
                zf.write(full, arcname)
    buf.seek(0)

    try:
        resp = _req.post(
            "https://api.netlify.com/api/v1/sites",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/zip"},
            data=buf.read(),
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        url = data.get("ssl_url") or data.get("url") or ""
        return {
            "url": url,
            "siteId": data.get("id", ""),
            "siteName": data.get("name", ""),
        }
    except _req.HTTPError as e:
        detail = ""
        try:
            detail = e.response.json().get("message", "")
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Netlify API error: {detail or str(e)}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Deploy failed: {exc}")


@app.post("/internal/projects/{generation_id}/accessibility")
def internal_accessibility_report(generation_id: str) -> dict:
    """Generate a detailed WCAG 2.1 AA accessibility audit for a project.
    Analyzes JSX/TSX source files and returns categorized issues with fix suggestions.
    """
    import re as _re, json as _json
    projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
    safe_id = _re.sub(r"[^a-zA-Z0-9_-]", "_", generation_id)
    project_path = os.path.join(projects_dir, safe_id)
    if not os.path.isdir(project_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Project {generation_id} not found")

    # Read all JSX/TSX source files
    src_dir = os.path.join(project_path, "src")
    src_files: dict[str, str] = {}
    if os.path.isdir(src_dir):
        for root, _, fnames in os.walk(src_dir):
            for fname in sorted(fnames):
                if fname.endswith((".tsx", ".ts", ".jsx", ".js")):
                    full = os.path.join(root, fname)
                    rel = os.path.relpath(full, project_path).replace("\\", "/")
                    try:
                        with open(full, "r", encoding="utf-8") as fh:
                            src_files[rel] = fh.read()
                    except Exception:
                        pass

    if not src_files:
        return {"generated": False, "error": "No source files found", "issues": [], "score": 0}

    # Build a source snapshot for the LLM.
    # Prioritise .tsx component files; skip type-only / config files.
    component_files = {p: c for p, c in src_files.items()
                       if p.endswith(".tsx") or p.endswith(".jsx")}
    if not component_files:
        component_files = src_files  # fallback if no tsx

    code_snapshot = ""
    for path, content in list(component_files.items())[:8]:
        code_snapshot += f"\n\n// === {path} ===\n{content[:2500]}"
    code_snapshot = code_snapshot[:12000]

    SYSTEM = """You are a WCAG 2.1 AA accessibility expert. Analyze the EXACT React JSX/TSX code provided and return a JSON accessibility audit.

CRITICAL RULES:
- Only report issues for code you can LITERALLY SEE in the provided source. Do NOT invent issues.
- currentCode must be an EXACT copy of lines from the source above (copy-paste, do not paraphrase).
- autoFixCode must be valid TypeScript/JSX — it replaces currentCode directly in the file.
- NEVER add `alt` prop to SVG icon components (Lucide icons like <Search>, <Zap>, <Home>, etc.) — they don't accept `alt`. Instead add `aria-label` to the parent button/link, or add `aria-hidden="true"` if decorative.
- For <img> elements: use alt="" for decorative, alt="description" for meaningful.
- autoFixCode must be a minimal change — only modify the problematic attribute, do not rewrite the whole component.

Return ONLY valid JSON:
{
  "score": <0-100 integer>,
  "wcagLevel": "AA",
  "summary": "<one sentence summary specific to THIS project's code>",
  "issues": [
    {
      "id": "<unique id like 'img-alt-1'>",
      "severity": "<critical|serious|moderate|minor>",
      "wcag": "<criterion e.g. 1.1.1>",
      "title": "<short title>",
      "description": "<what is wrong>",
      "element": "<component name>",
      "filePath": "<exact relative path from source e.g. 'src/components/Navbar.tsx'>",
      "lineNumber": <line number integer or null>,
      "currentCode": "<EXACT lines copied from source code>",
      "fix": "<explanation of the fix>",
      "autoFixCode": "<valid TSX — only the fixed lines, minimal change>"
    }
  ],
  "passed": ["<checks that passed>"],
  "recommendations": ["<recommendations>"]
}"""

    USER = f"""Analyze this React code for WCAG 2.1 AA accessibility issues. For each issue, identify the FILE PATH and provide CORRECTED CODE SNIPPET ready to apply.

Files analyzed:
{chr(10).join(f"- {path}" for path in list(src_files.keys())[:10])}

Source code:
{code_snapshot}"""

    try:
        from .pipeline.llm_provider import create_planner_provider
        provider = create_planner_provider()
        raw = provider.chat(SYSTEM, USER)
        # Extract JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            result = _json.loads(json_match.group())
        else:
            result = _json.loads(raw)
        result["generated"] = True
        result["filesAnalyzed"] = len(src_files)
        result["codeSnapshot"] = code_snapshot  # Include the code snapshot in response

        # Post-process every issue
        if "issues" in result and isinstance(result["issues"], list):
            # Build lookup: lowercase filename-without-ext → actual relative path
            file_lookup: dict[str, str] = {}
            for rel_path in src_files:
                basename = rel_path.split("/")[-1]
                name_no_ext = basename.rsplit(".", 1)[0].lower()
                file_lookup[name_no_ext] = rel_path

            for issue in result["issues"]:
                # 1. Resolve filePath — LLM sometimes returns a component name
                fp = (issue.get("filePath") or "").strip()
                if not fp or ("/" not in fp and "." not in fp):
                    candidate = fp.lower() if fp else (issue.get("element") or "").lower()
                    if candidate in file_lookup:
                        issue["filePath"] = file_lookup[candidate]
                    elif src_files:
                        issue["filePath"] = next(iter(src_files))

                # 2. Replace LLM-guessed currentCode with REAL code from the file.
                #    The LLM only saw truncated source — its currentCode is often fabricated.
                #    Use lineNumber (if provided) to extract the actual code.
                real_fp = (issue.get("filePath") or "").strip()
                line_no = issue.get("lineNumber")
                if real_fp and real_fp in src_files and line_no and isinstance(line_no, (int, float)):
                    file_lines = src_files[real_fp].splitlines()
                    ln = int(line_no) - 1  # convert to 0-indexed
                    if 0 <= ln < len(file_lines):
                        # Grab ±2 lines of context around the reported line
                        start = max(0, ln - 1)
                        end   = min(len(file_lines), ln + 3)
                        real_snippet = "\n".join(file_lines[start:end])
                        issue["currentCode"] = real_snippet
                        logger.info(f"[audit] replaced currentCode for issue {issue.get('id')} from real file line {line_no}")

                # 3. Ensure autoFixCode has a value
                if not issue.get("autoFixCode") and issue.get("fix"):
                    issue["autoFixCode"] = issue.get("fix", "")

        return result
    except Exception as exc:
        logger.error("accessibility report failed for %s: %s", generation_id, exc)
        return {
            "generated": False,
            "error": str(exc),
            "score": 0,
            "issues": [],
            "passed": [],
            "recommendations": [],
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


