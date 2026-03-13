from __future__ import annotations

import logging
import os
import re
import time
from typing import Any, Literal

from ..schemas import AiReport, CodeBundle, CodeFile, GenerateRequest, GenerateResponse
from .llm_provider import create_planner_provider, create_coder_provider
from .models import SourceItem, SourcePack
from .agents import (
    OcrAgent,
    DocExtractAgent,
    TextPrepAgent,
    PlannerAgent,
    DesignSystemAgent,
    LlmCodegenAgent,
    ImageAgent,
    ValidatorAgent,
)
from .agents.planner_agent import PROJECT_PROFILES, DEFAULT_PROFILE, _detect_project_type

logger = logging.getLogger(__name__)


class Orchestrator:
    """Agent 0 — orchestrateur (deterministe)."""

    def __init__(self) -> None:
        self.ocr = OcrAgent()
        self.doc = DocExtractAgent()
        self.prep = TextPrepAgent()
        planner_provider = create_planner_provider()
        coder_provider = create_coder_provider()
        self.planner = PlannerAgent(planner_provider)
        self.design_system = DesignSystemAgent(planner_provider)
        self.llm_codegen = LlmCodegenAgent(coder_provider)
        self.image_agent = ImageAgent()

    def run(self, req: GenerateRequest) -> GenerateResponse:
        t0 = time.perf_counter()
        durations: dict[str, Any] = {}
        retries = 0
        llm_provider = "none"
        llm_error: str | None = None
        extract_warning: str | None = None
        pipeline: list[str] = ["orchestrator", "ocr", "extract", "prep"]

        pack = SourcePack(items=[SourceItem(kind="prompt", content=req.prompt or "", meta={})])
        for fr in req.fileRefs or []:
            pack.items.append(
                SourceItem(
                    kind="file_ref",
                    content=fr.originalName or fr.minioPath or "(file)",
                    meta={
                        "minioPath": fr.minioPath,
                        "mimeType": fr.mimeType,
                        "sha256": fr.sha256,
                        "sizeBytes": fr.sizeBytes,
                    },
                )
            )

        t1 = time.perf_counter()
        pack = self.ocr.run(pack)
        pack = self.doc.run(pack)
        durations["extract_ms"] = int((time.perf_counter() - t1) * 1000)

        # Extraction warnings
        if req.fileRefs:
            extracted_items = [i for i in pack.items if i.kind == "file_text"]
            extracted_non_empty = [i for i in extracted_items if i.content.strip()]
            if not extracted_non_empty:
                extract_warning = extract_warning or "No text extracted from uploaded files"
            empty_pdfs = [
                i
                for i in extracted_items
                if (str(i.meta.get("mimeType") or "").lower() == "application/pdf")
                and int(i.meta.get("extractedChars") or 0) == 0
            ]
            if empty_pdfs:
                names = [str(i.meta.get("originalName") or i.meta.get("minioPath") or "(pdf)") for i in empty_pdfs]
                extract_warning = extract_warning or (
                    "PDF text extraction returned 0 characters (scanned PDF?) - " + ", ".join(names[:3])
                    + ("" if len(names) <= 3 else f" (+{len(names)-3} more)")
                )

        t_prep = time.perf_counter()
        pack = self.prep.run(pack)
        durations["prep_ms"] = int((time.perf_counter() - t_prep) * 1000)

        # --- Three-agent pipeline: planner → design system → coder ---
        planner_type = type(self.planner.provider).__name__
        coder_type = type(self.llm_codegen.provider).__name__
        t_plan = time.perf_counter()
        try:
            # Retry planner on rate-limit (429) with 60s waits
            plan = None
            for attempt in range(4):
                try:
                    plan = self.planner.plan(req, pack)
                    break
                except Exception as pe:
                    if "429" in str(pe) and attempt < 3:
                        wait = 10 * (2 ** attempt)  # exponential backoff: 10s, 20s, 40s
                        logger.warning("Planner rate-limited, retrying in %ds (attempt %d/3): %s", wait, attempt + 1, pe)
                        time.sleep(wait)
                    else:
                        logger.error("Planner failed: %s", pe)
                        raise
            llm_provider = f"{planner_type}:{self.planner.model}+{coder_type}:{self.llm_codegen.model}"
            pipeline.append(f"plan:{planner_type}:{self.planner.model}")
        except Exception as e:  # noqa: BLE001
            llm_error = f"Planner: {type(e).__name__}: {e}"
            logger.exception("Planner failed")
            llm_provider = f"{planner_type}:{self.planner.model}+{coder_type}:{self.llm_codegen.model}"
            pipeline.append(f"plan:{planner_type}:failed")
            # Detect project type from prompt to use the right required files
            context = "\n\n".join(i.content for i in pack.items if i.kind in ("prompt", "context"))
            _ptype, _profile = _detect_project_type(context)
            _req_files = _profile.get("required_files", ["index.html", "styles.css", "script.js"])
            plan = {
                "summary": req.prompt[:60] if req.prompt else "Web Project",
                "language": "en",
                "requirements": [],
                "_meta": {"project_type": _ptype},
                "files": [{"path": p, "description": p} for p in _req_files],
            }
        durations["plan_ms"] = int((time.perf_counter() - t_plan) * 1000)

        # Build uiSpec from plan
        plan_files = plan.get("files", [])
        file_list_text = ", ".join(f.get("path", "?") for f in plan_files)
        ui_spec = {
            "meta": {
                "generationId": req.generationId,
                "language": plan.get("language", "en"),
                "summary": str(plan.get("summary", ""))[:200],
                "requirements": [str(r)[:80] for r in plan.get("requirements", [])][:10],
                "plan": plan_files,
            },
            "page": {
                "title": str(plan.get("summary", "AI Generated Project"))[:100],
                "components": [
                    {"type": "h1", "text": str(plan.get("summary", "Generated Project"))[:100]},
                    {"type": "p", "text": f"Planned files: {file_list_text}"},
                    *[
                        {"type": "p", "text": str(r)[:80]}
                        for r in plan.get("requirements", [])[:5]
                    ],
                ],
            },
        }

        # Design System (with rate-limit retry)
        t_design = time.perf_counter()
        design_tokens = None
        try:
            context_for_design = "\n\n".join(
                i.content for i in pack.items if i.kind == "context"
            ).strip()
            for attempt in range(4):
                try:
                    design_tokens = self.design_system.generate(plan, context_for_design)
                    break
                except Exception as de:
                    if "429" in str(de) and attempt < 3:
                        wait = 10 * (2 ** attempt)  # exponential backoff: 10s, 20s, 40s
                        logger.warning("DesignSystem rate-limited, retrying in %ds (attempt %d/4): %s", wait, attempt + 1, de)
                        time.sleep(wait)
                    else:
                        logger.error("DesignSystemAgent failed: %s", de)
                        raise
            pipeline.append("design_system")
            logger.info("DesignSystemAgent: generated %d token categories", len(design_tokens) if design_tokens else 0)
        except Exception:  # noqa: BLE001
            logger.exception("DesignSystemAgent failed, continuing without design tokens")
            pipeline.append("design_system:failed")
        durations["design_ms"] = int((time.perf_counter() - t_design) * 1000)

        # Code generation
        t_codegen = time.perf_counter()
        try:
            code = self.llm_codegen.generate(req, pack, plan, design_tokens)
            pipeline.append(f"codegen:{coder_type}:{self.llm_codegen.model}")
        except Exception as e:  # noqa: BLE001
            codegen_err = f"Codegen: {type(e).__name__}: {e}"
            llm_error = ((llm_error + "; ") if llm_error else "") + codegen_err
            logger.exception("LLM codegen failed completely")
            pipeline.append(f"codegen:{coder_type}:failed")
            error_html = (
                "<!doctype html><html lang='en'><head><meta charset='UTF-8'>"
                "<meta name='viewport' content='width=device-width,initial-scale=1.0'>"
                "<title>Generation Failed</title></head>"
                "<body style='font-family:system-ui,sans-serif;padding:2rem;"
                "background:#0f172a;color:#f1f5f9'>"
                "<h1>Code Generation Failed</h1>"
                f"<p>{codegen_err}</p>"
                "<p>Check server logs for details.</p>"
                "</body></html>"
            )
            code = CodeBundle(files=[
                CodeFile(path="index.html", content=error_html),
                CodeFile(path="styles.css", content="/* generation failed */"),
            ])
        durations["codegen_ms"] = int((time.perf_counter() - t_codegen) * 1000)

        # Image injection — replace placeholders with real photos
        t_images = time.perf_counter()
        try:
            code = self.image_agent.run(code, plan, design_tokens)
            pipeline.append("images")
        except Exception:  # noqa: BLE001
            logger.exception("ImageAgent failed, continuing with placeholders")
            pipeline.append("images:failed")
        durations["images_ms"] = int((time.perf_counter() - t_images) * 1000)

        durations["total_ms"] = int((time.perf_counter() - t0) * 1000)

        # Save project files to disk
        projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", req.generationId)
        project_path = os.path.join(projects_dir, safe_id)
        try:
            os.makedirs(project_path, exist_ok=True)
            for cf in code.files:
                safe_name = os.path.basename(cf.path)
                file_path = os.path.join(project_path, safe_name)
                with open(file_path, "w", encoding="utf-8") as fh:
                    fh.write(cf.content)
            logger.info("Saved %d files to %s", len(code.files), project_path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to save project files to %s", project_path)

        sources_used = ["prompt"] + (["files"] if req.fileRefs else [])

        issues: list[dict[str, Any]] = []
        if extract_warning:
            issues.append({"type": "extract", "message": extract_warning})
        if llm_error:
            issues.append({"type": "llm", "message": llm_error.strip()})

        report = AiReport(
            score=80 if not llm_error else 60,
            issues=issues,
            sources_used=sources_used,
            llm_provider=llm_provider if req.mode != "codegen_only" else "none",
            pipeline=pipeline,
            durations=durations,
            retries_count=retries,
        )

        return GenerateResponse(uiSpec=ui_spec, codeBundle=code, aiReport=report)
