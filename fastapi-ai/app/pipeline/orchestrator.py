from __future__ import annotations

import logging
import os
import queue
import re
import shutil
import subprocess
import threading
import time
from typing import Any, Callable, Generator, Literal

from ..schemas import AiReport, CodeBundle, CodeFile, GenerateRequest, GenerateResponse, UIEvaluation, EditFileRequest, EditFileResponse
from .llm_provider import create_planner_provider, create_coder_provider, create_vision_provider, create_coder_provider_with_model
from .models import SourceItem, SourcePack
from .agents import (
    OcrAgent,
    DocExtractAgent,
    DiagramAgent,
    RagAgent,
    TextPrepAgent,
    PlannerAgent,
    DesignSystemAgent,
    LlmCodegenAgent,
    ImageAgent,
    UIEvaluatorAgent,
)
from .agents.planner_agent import PROJECT_PROFILES, DEFAULT_PROFILE, _detect_project_type
from .agents.entity_extractor_agent import EntityExtractorAgent

logger = logging.getLogger(__name__)


def _redact_error(e: object) -> str:
    s = str(e) if e is not None else ""
    # Redact Gemini API keys from any propagated httpx error strings.
    return re.sub(r"(key=)[^&\s]+", r"\1REDACTED", s)


class Orchestrator:
    """Agent 0 — orchestrateur (deterministe)."""

    def __init__(self) -> None:
        planner_provider = create_planner_provider()
        coder_provider = create_coder_provider()
        self.ocr = OcrAgent(create_vision_provider())
        self.doc = DocExtractAgent()
        self.diagram = DiagramAgent()
        self.rag = RagAgent()
        self.prep = TextPrepAgent()
        self.planner = PlannerAgent(planner_provider)
        self.design_system = DesignSystemAgent(planner_provider)
        self.llm_codegen = LlmCodegenAgent(coder_provider)
        self.image_agent = ImageAgent()
        self.ui_evaluator = UIEvaluatorAgent(planner_provider)
        self.entity_extractor = EntityExtractorAgent(planner_provider)

    def run(self, req: GenerateRequest, _progress_cb: Callable[[dict], None] | None = None) -> GenerateResponse:
        """Run the full generation pipeline.

        Args:
            req: The generation request.
            _progress_cb: Optional callback called at each pipeline stage with a
                          progress event dict: {"type":"progress","stage":str,"progress":int,"message":str,...}
        """
        def _emit(stage: str, pct: int, msg: str, **extra: Any) -> None:
            if _progress_cb:
                try:
                    _progress_cb({"type": "progress", "stage": stage, "progress": pct, "message": msg, **extra})
                except Exception:  # noqa: BLE001
                    pass

        t0 = time.perf_counter()
        durations: dict[str, Any] = {}
        retries = 0
        build_retries = 0
        llm_provider = "none"
        llm_error: str | None = None
        extract_warning: str | None = None
        pipeline: list[str] = ["orchestrator", "ocr", "extract", "rag", "domain", "prep"]
        ui_eval_result: dict[str, Any] | None = None
        
        # Create codegen agent — always use the configured coder provider (groq/gemini/etc)
        try:
            coder_provider = create_coder_provider_with_model(req.model) if req.model else create_coder_provider()
            codegen_agent = LlmCodegenAgent(coder_provider)
        except Exception as e:
            logger.warning(f"Failed to create coder provider: {e}, using default")
            codegen_agent = self.llm_codegen

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

        _emit("entities", 5, "Analyzing requirements…")

        # ── Step 1: Universal entity extraction (replaces hardcoded domain rules) ──
        # Extract entities, features, style from ANY prompt — no predefined domains
        document_text = " ".join(
            i.content for i in pack.items if i.kind in ("file_text", "context")
        )
        extracted = self.entity_extractor.extract(
            prompt=req.prompt or "",
            document_text=document_text,
        )
        if extracted:
            context_block = EntityExtractorAgent.build_context_block(extracted)
            pack.items.append(SourceItem(
                kind="context",
                content=context_block,
                meta={"source": "entity_extractor", "extracted": extracted},
            ))
            logger.info(
                "Orchestrator: entity extraction done — app='%s', entities=%s",
                extracted.get("app_name", "?"),
                extracted.get("entities", [])[:3],
            )

        t1 = time.perf_counter()
        _emit("extract", 10, "Extracting documents…")
        pack = self.doc.run(pack)      # text / PDF / docx / pptx / .mmd / .excalidraw
        pack = self.ocr.run(pack)      # vision: images + empty (scanned) PDFs
        pack = self.diagram.run(pack)  # interpret Mermaid / Excalidraw → prose for planner

        # ── Step 2: RAG — replace full documents with relevant chunks ──────────
        if req.fileRefs:
            _emit("rag", 16, "Building knowledge base from documents…")
            pack = self.rag.run(pack, query=req.prompt or "")

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
        _emit("prep", 22, "Consolidating context…")
        pack = self.prep.run(pack)
        durations["prep_ms"] = int((time.perf_counter() - t_prep) * 1000)

        # --- Three-agent pipeline: planner → design system → coder ---
        planner_type = type(self.planner.provider).__name__
        coder_type = type(self.llm_codegen.provider).__name__
        t_plan = time.perf_counter()
        _emit("planning", 28, "AI planning project structure…")
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
                        logger.warning("Planner rate-limited, retrying in %ds (attempt %d/3): %s", wait, attempt + 1, _redact_error(pe))
                        time.sleep(wait)
                    else:
                        logger.error("Planner failed: %s", _redact_error(pe))
                        raise
            llm_provider = f"{planner_type}:{self.planner.model}+{coder_type}:{self.llm_codegen.model}"
            pipeline.append(f"plan:{planner_type}:{self.planner.model}")
        except Exception as e:  # noqa: BLE001
            llm_error = f"Planner: {type(e).__name__}: {_redact_error(e)}"
            logger.exception("Planner failed")
            llm_provider = f"{planner_type}:{self.planner.model}+{coder_type}:{self.llm_codegen.model}"
            pipeline.append(f"plan:{planner_type}:failed")
            # Detect project type from prompt to use the right required files
            context = "\n\n".join(i.content for i in pack.items if i.kind in ("prompt", "context"))
            _ptype, _profile = _detect_project_type(context)
            _output_target = os.environ.get("AI_OUTPUT_TARGET", "react").lower().strip()
            _fallback_file = "App.tsx" if _output_target == "react" else "index.html"
            plan = {
                "summary": req.prompt[:60] if req.prompt else "Web Project",
                "language": "en",
                "requirements": [],
                "_meta": {"project_type": _ptype},
                "files": [{"path": _fallback_file, "description": "Main app"}],
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
                "domain": req.domain or "",
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
        _emit("design", 38, "Creating design system…")
        design_tokens = None
        try:
            context_for_design = "\n\n".join(
                i.content for i in pack.items if i.kind == "context"
            ).strip()
            for attempt in range(4):
                try:
                    design_tokens = self.design_system.generate(plan, context_for_design, theme_preset=getattr(req, 'themePreset', None))
                    break
                except Exception as de:
                    if "429" in str(de) and attempt < 3:
                        wait = 10 * (2 ** attempt)  # exponential backoff: 10s, 20s, 40s
                        logger.warning("DesignSystem rate-limited, retrying in %ds (attempt %d/4): %s", wait, attempt + 1, _redact_error(de))
                        time.sleep(wait)
                    else:
                        logger.error("DesignSystemAgent failed: %s", _redact_error(de))
                        raise
            pipeline.append("design_system")
            logger.info("DesignSystemAgent: generated %d token categories", len(design_tokens) if design_tokens else 0)
        except Exception:  # noqa: BLE001
            logger.exception("DesignSystemAgent failed, using fallback design tokens")
            pipeline.append("design_system:failed")
            # Fallback: minimal design tokens so codegen always has colors/fonts
            design_tokens = {
                "colors": {"primary": "#6366f1", "background": "#0f172a", "surface": "#1e293b", "text": "#f1f5f9"},
                "fonts": {"heading": "Inter", "body": "Inter"},
                "radii": {"card": "12px", "button": "8px"},
            }
        durations["design_ms"] = int((time.perf_counter() - t_design) * 1000)

        # Code generation
        t_codegen = time.perf_counter()
        n_files = len(plan.get("files", []))
        _emit("codegen_start", 44, f"Starting code generation ({n_files} file{'s' if n_files != 1 else ''})…", totalFiles=n_files)

        def _file_progress_cb(idx: int, total: int, path: str) -> None:
            pct = 44 + int((idx / max(total, 1)) * 38)  # 44 % → 82 %
            _emit("codegen_file", pct, f"Generating {path} ({idx}/{total})…", fileIndex=idx, totalFiles=total, filePath=path)

        try:
            code = codegen_agent.generate(req, pack, plan, design_tokens, file_progress_cb=_file_progress_cb)
            pipeline.append(f"codegen:{coder_type}:{codegen_agent.model}")
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
        _emit("images", 84, "Fetching real images…")
        try:
            code = self.image_agent.run(code, plan, design_tokens)
            pipeline.append("images")
        except Exception:  # noqa: BLE001
            logger.exception("ImageAgent failed, continuing with placeholders")
            pipeline.append("images:failed")
        durations["images_ms"] = int((time.perf_counter() - t_images) * 1000)

        # Save project files to disk and build with Vite (with self-healing)
        _emit("build", 88, "Building project…")
        projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", req.generationId)
        project_path = os.path.join(projects_dir, safe_id)
        output_target = os.environ.get("AI_OUTPUT_TARGET", "react")
        build_success = False
        t_build = time.perf_counter()
        try:
            if output_target == "react":
                build_success, build_retries = self._build_with_self_healing(project_path, code)
                pipeline.append(f"build:{'ok' if build_success else 'failed'}:retries={build_retries}")
            else:
                os.makedirs(project_path, exist_ok=True)
                for cf in code.files:
                    safe_name = os.path.basename(cf.path)
                    file_path = os.path.join(project_path, safe_name)
                    with open(file_path, "w", encoding="utf-8") as fh:
                        fh.write(cf.content)
                build_success = True
            logger.info("Saved %d files to %s (success=%s)", len(code.files), project_path, build_success)
            # Write prompt metadata so repair/docs endpoints can reference the original prompt
            import json as _json
            meta = {"prompt": req.prompt or "", "generationId": req.generationId}
            try:
                with open(os.path.join(project_path, ".meta.json"), "w", encoding="utf-8") as mf:
                    _json.dump(meta, mf)
            except Exception:
                pass
        except Exception:  # noqa: BLE001
            logger.exception("Failed to save project files to %s", project_path)
        durations["build_ms"] = int((time.perf_counter() - t_build) * 1000)

        # UIEvaluator — automatic quality assessment
        _emit("eval", 95, "Evaluating UI quality…")
        t_eval = time.perf_counter()
        try:
            tsx_files = [cf for cf in code.files if cf.path.endswith(".tsx")]
            # Prefer App.tsx for evaluation; fall back to first TSX file
            app_file = next((cf for cf in tsx_files if cf.path in ("src/App.tsx", "App.tsx")), None)
            main_code = app_file.content if app_file else (tsx_files[0].content if tsx_files else "")
            ui_eval_result = self.ui_evaluator.evaluate(
                prompt=req.prompt or "",
                code=main_code,
                build_success=build_success,
            )
            pipeline.append(f"eval:score={ui_eval_result['global_score']}")
            logger.info("UIEvaluator: global score = %d", ui_eval_result["global_score"])
        except Exception:  # noqa: BLE001
            logger.exception("UIEvaluatorAgent failed — skipping quality assessment")
            ui_eval_result = None
        durations["eval_ms"] = int((time.perf_counter() - t_eval) * 1000)

        durations["total_ms"] = int((time.perf_counter() - t0) * 1000)

        sources_used = (
            ["prompt"]
            + (["files", "rag"] if req.fileRefs else [])
            + ([f"domain:{req.domain}"] if req.domain else [])
        )

        issues: list[dict[str, Any]] = []
        if extract_warning:
            issues.append({"type": "extract", "message": extract_warning})
        if llm_error:
            issues.append({"type": "llm", "message": llm_error.strip()})
        if not build_success:
            issues.append({"type": "build", "message": f"Vite build failed after {build_retries} repair attempt(s)"})

        # Compute final score: use UIEvaluator global score if available, else heuristic
        if ui_eval_result:
            final_score = ui_eval_result["global_score"]
            ui_eval_schema = UIEvaluation(
                global_score=ui_eval_result["global_score"],
                semantic_fidelity=ui_eval_result["dimensions"]["semantic_fidelity"],
                code_quality=ui_eval_result["dimensions"]["code_quality"],
                completeness=ui_eval_result["dimensions"]["completeness"],
                accessibility=ui_eval_result["dimensions"]["accessibility"],
                visual_richness=ui_eval_result["dimensions"]["visual_richness"],
                reasoning=ui_eval_result.get("reasoning", {}),
            )
        else:
            final_score = 80 if not llm_error else 60
            ui_eval_schema = None

        report = AiReport(
            score=final_score,
            issues=issues,
            sources_used=sources_used,
            llm_provider=llm_provider if req.mode != "codegen_only" else "none",
            pipeline=pipeline,
            durations=durations,
            retries_count=retries,
            build_retries=build_retries,
            ui_evaluation=ui_eval_schema,
        )

        return GenerateResponse(generationId=req.generationId, uiSpec=ui_spec, codeBundle=code, aiReport=report)

    def run_stream(self, req: GenerateRequest) -> Generator[dict, None, None]:
        """Run the pipeline and yield SSE-ready progress events.

        Each yielded dict is either:
          {"type": "progress", "stage": str, "progress": int, "message": str, ...extra}
          {"type": "complete",  "progress": 100, "result": {...GenerateResponse...}}
          {"type": "error",     "message": str}
        """
        q: queue.Queue[dict] = queue.Queue()

        def _cb(event: dict) -> None:
            q.put(event)

        def _worker() -> None:
            try:
                result = self.run(req, _progress_cb=_cb)
                q.put({"type": "complete", "progress": 100, "result": result.model_dump(mode="json")})
            except Exception as exc:  # noqa: BLE001
                logger.exception("run_stream worker failed")
                q.put({"type": "error", "message": f"{type(exc).__name__}: {exc}"})

        t = threading.Thread(target=_worker, daemon=True)
        t.start()

        while True:
            event = q.get()
            yield event
            if event.get("type") in ("complete", "error"):
                break

        t.join(timeout=30)

    def _list_src_files(self, src_dir: str) -> list[str]:
        """Return all .tsx/.ts/.css files under src/, relative to src_dir."""
        result = []
        for root, _, files in os.walk(src_dir):
            for f in sorted(files):
                if f.endswith((".tsx", ".ts", ".css")) and f != "vite-env.d.ts":
                    rel = os.path.relpath(os.path.join(root, f), src_dir).replace("\\", "/")
                    result.append(rel)
        return result

    def _detect_new_page_intent(self, instruction: str, src_dir: str) -> tuple[str, str] | None:
        """Detect if the instruction is asking to add a NEW page that doesn't exist yet.

        Returns (PageComponentName, relative_file_path) e.g. ('StatistiquesPage', 'pages/StatistiquesPage.tsx')
        or None if it's an edit to an existing file.
        """
        instruction_lower = instruction.lower()

        # Must contain an "add/create" keyword
        add_keywords = ["ajoute", "ajouter", "add", "crée", "créer", "create", "nouvelle", "nouveau", "new", "faire", "make", "génère", "genere", "generate"]
        if not any(k in instruction_lower for k in add_keywords):
            return None

        # Must mention page/section/tab/view
        page_keywords = ["page", "section", "onglet", "tab", "vue", "view", "module", "écran", "ecran"]
        if not any(k in instruction_lower for k in page_keywords):
            return None

        # Collect existing page file names (without extension)
        pages_dir = os.path.join(src_dir, "pages")
        existing_basenames: list[str] = []
        if os.path.exists(pages_dir):
            existing_basenames = [
                os.path.splitext(f)[0].lower()
                for f in os.listdir(pages_dir)
                if f.endswith((".tsx", ".ts"))
            ]

        # Ask planner LLM for the PascalCase component name
        system_msg = "You are a React project assistant. Answer with ONLY a PascalCase component name or the word 'none'."
        user_msg = (
            f"User instruction: \"{instruction}\"\n"
            f"Existing page files (lowercase, no extension): {existing_basenames}\n\n"
            "Is the user asking to CREATE A NEW PAGE that does not already exist?\n"
            "If YES, reply with just the PascalCase component name ending in 'Page' (e.g. 'StatistiquesPage').\n"
            "If NO or uncertain, reply with 'none'."
        )
        try:
            answer = self.planner.provider.chat(system_msg, user_msg).strip().strip("`\"' \n")
            if not answer or answer.lower() == "none" or not answer[0].isupper():
                return None
            # Ensure ends with Page
            if not answer.endswith("Page"):
                answer += "Page"
            file_path = f"pages/{answer}.tsx"
            # Double-check it doesn't already exist
            if os.path.exists(os.path.join(src_dir, file_path)):
                logger.info("_detect_new_page_intent: %s already exists, treating as edit", file_path)
                return None
            logger.info("_detect_new_page_intent: detected new page request → %s", file_path)
            return (answer, file_path)
        except Exception as exc:
            logger.warning("_detect_new_page_intent: LLM failed (%s), skipping new-page flow", exc)
            return None

    def _create_new_page(
        self,
        req: "EditFileRequest",
        src_dir: str,
        project_path: str,
        page_name: str,
        page_rel_path: str,
    ) -> "EditFileResponse":
        """Generate a new page file and update App.tsx to import + route it."""
        # Read App.tsx for context
        app_tsx_path = os.path.join(src_dir, "App.tsx")
        with open(app_tsx_path, "r", encoding="utf-8") as fh:
            app_code = fh.read()

        coder_system = (
            "You are an expert React/TypeScript/Tailwind CSS developer. "
            "You write clean, COMPLETE components with NO truncation. "
            "CRITICAL: Every JSX tag must have a proper closing tag. Every brace and parenthesis must be closed. "
            "NEVER stop mid-code. Always finish the entire component. "
            "No markdown fences, no explanation — raw TSX code only."
        )

        # Step 1: Generate the new page component
        page_prompt = (
            f"Create a new React page component called `{page_name}`.\n\n"
            f"USER INSTRUCTION: {req.instruction}\n\n"
            f"CONTEXT — App.tsx (use same Tailwind color scheme, same UI patterns):\n"
            f"```\n{app_code[:3000]}\n```\n\n"
            "CRITICAL RULES:\n"
            f"1. The component must be named `{page_name}` and exported as default.\n"
            "2. Use Tailwind CSS for styling. Match the color scheme of the app shown in App.tsx.\n"
            "3. Include realistic placeholder content (KPIs, charts, tables, forms — whatever fits the page).\n"
            "4. Import from 'recharts' for any charts, 'lucide-react' for icons.\n"
            "5. COMPLETE THE ENTIRE COMPONENT - do not truncate or cut off.\n"
            "6. Every <div> needs </div>, every <p> needs </p>, every {{ needs }}.\n"
            "7. Return ONLY raw TypeScript/TSX code. No markdown, no explanations."
        )
        new_page_code = self.llm_codegen.provider.chat(coder_system, page_prompt)

        # Clean up
        new_page_code = re.sub(r"^```(?:tsx?|jsx?|typescript|javascript)?\n?", "", new_page_code.strip())
        new_page_code = re.sub(r"\n?```$", "", new_page_code.strip())
        new_page_code = self.llm_codegen._repair_truncated_jsx(new_page_code)
        new_page_code = self._sanitize_tsx(new_page_code)
        new_page_code = self._add_missing_imports(new_page_code)
        new_page_code = self._fix_lucide_imports(new_page_code)
        new_page_code = self._ensure_default_export(new_page_code, page_rel_path)

        # Write the new page file
        page_full_path = os.path.join(src_dir, page_rel_path)
        os.makedirs(os.path.dirname(page_full_path), exist_ok=True)
        with open(page_full_path, "w", encoding="utf-8") as fh:
            fh.write(new_page_code)
        logger.info("_create_new_page: wrote %s", page_full_path)

        # Step 2: Update App.tsx — add import + nav item + route
        import_path = "./" + page_rel_path.replace(".tsx", "")
        app_update_prompt = (
            f"File to edit: `App.tsx`\n\n"
            f"USER INSTRUCTION: Add `{page_name}` to the sidebar navigation and routing.\n\n"
            f"CURRENT App.tsx:\n```\n{app_code}\n```\n\n"
            "CRITICAL RULES:\n"
            f"1. Add: `import {page_name} from '{import_path}';`\n"
            f"2. Add a nav item for {page_name} in the sidebar (use the same pattern as existing nav items).\n"
            f"3. Add a route/conditional render for {page_name} (same pattern as existing pages).\n"
            "4. Do NOT redefine any existing components. Do NOT change any other logic or styles.\n"
            "5. KEEP the function App() component and `export default App;` at the end.\n"
            "6. Return the COMPLETE App.tsx - do not truncate. Every tag must be closed.\n"
            "7. No markdown, no explanation - raw code only."
        )
        new_app_code = self.llm_codegen.provider.chat(coder_system, app_update_prompt)

        # Clean up App.tsx
        new_app_code = re.sub(r"^```(?:tsx?|jsx?|typescript|javascript)?\n?", "", new_app_code.strip())
        new_app_code = re.sub(r"\n?```$", "", new_app_code.strip())
        new_app_code = self.llm_codegen._repair_truncated_jsx(new_app_code)
        new_app_code = self._sanitize_tsx(new_app_code)
        new_app_code = self._add_missing_imports(new_app_code)
        new_app_code = self._fix_lucide_imports(new_app_code)
        new_app_code = self._ensure_default_export(new_app_code, "App.tsx")

        with open(app_tsx_path, "w", encoding="utf-8") as fh:
            fh.write(new_app_code)
        logger.info("_create_new_page: updated App.tsx with %s route", page_name)

        # Build with retry loop
        build_success, build_output = self._build_with_retry(project_path, app_tsx_path, "App.tsx", max_retries=2)

        return EditFileResponse(
            filePath=page_rel_path,
            content=new_page_code,
            buildSuccess=build_success,
            buildOutput=build_output,
        )

    def _resolve_file_by_name(self, src_dir: str, name: str) -> str | None:
        """Find a file in src_dir matching name (ignoring extension and path prefix)."""
        name_lower = name.lower().lstrip("src/").strip()
        # Strip extension if present
        if "." in name_lower:
            name_lower = name_lower.rsplit(".", 1)[0]
        for root, _, files in os.walk(src_dir):
            for f in files:
                f_no_ext = f.rsplit(".", 1)[0].lower()
                if f_no_ext == name_lower:
                    full = os.path.join(root, f)
                    return os.path.relpath(full, src_dir).replace("\\", "/")
        return None

    def _pick_file_to_edit(self, src_dir: str, instruction: str) -> str:
        """Ask the planner LLM which file to edit for the given instruction."""
        files = self._list_src_files(src_dir)
        instruction_lower = instruction.lower()

        # FAST PATH: Check if instruction mentions a component defined in App.tsx,
        # OR if key UI text from the instruction appears in App.tsx's content.
        # This prevents the LLM from picking orphaned files (pages/ files that exist
        # but are never imported) when the real UI content lives in App.tsx.
        app_tsx_path = os.path.join(src_dir, "App.tsx")
        if os.path.exists(app_tsx_path) and "App.tsx" in files:
            try:
                with open(app_tsx_path, "r", encoding="utf-8") as fh:
                    app_content = fh.read()
                app_content_lower = app_content.lower()
                # Check component names first
                app_components = re.findall(r"(?:function|const)\s+([A-Z][a-zA-Z0-9]*)", app_content)
                for comp in app_components:
                    if comp.lower() in instruction_lower:
                        logger.info("edit_file: instruction mentions '%s' in App.tsx → using App.tsx", comp)
                        return "App.tsx"
                # Check if meaningful instruction keywords appear in App.tsx content
                # (e.g. "subscriptions" → App.tsx has the subscriptions table, not an orphaned page file)
                stop_words = {"the", "a", "an", "to", "in", "of", "and", "or", "add", "make",
                              "change", "update", "remove", "delete", "edit", "set", "get",
                              "with", "for", "from", "all", "my", "list", "page", "section",
                              "this", "that", "show", "hide", "display", "column", "row",
                              "item", "button", "text", "color", "size", "style"}
                keywords = [w for w in re.findall(r"[a-z]+", instruction_lower)
                            if w not in stop_words and len(w) > 3]
                if keywords:
                    matching = sum(1 for kw in keywords if kw in app_content_lower)
                    if matching >= max(1, len(keywords) // 2):
                        logger.info("edit_file: %d/%d keywords found in App.tsx → using App.tsx", matching, len(keywords))
                        return "App.tsx"
            except Exception:
                pass

        # Build file list with content previews (function/component definitions)
        file_previews = []
        for f in files:
            full_path = os.path.join(src_dir, f)
            try:
                with open(full_path, "r", encoding="utf-8") as fh:
                    content = fh.read()
                # Extract function/component names defined in this file
                func_matches = re.findall(r"(?:function|const)\s+([A-Z][a-zA-Z0-9]*)", content)
                funcs = ", ".join(dict.fromkeys(func_matches)[:5]) if func_matches else "(no components)"
                file_previews.append(f"- {f}: defines [{funcs}]")
            except Exception:
                file_previews.append(f"- {f}")
        file_list = "\n".join(file_previews)

        system_msg = "You are a React project assistant. Answer with ONLY a single file path, nothing else."
        user_msg = (
            f"The project has these source files (with the components defined in each):\n{file_list}\n\n"
            f"User instruction: \"{instruction}\"\n\n"
            "IMPORTANT: If App.tsx defines a component (like Sidebar), edit App.tsx, NOT a separate file.\n"
            "Which single file should be edited to fulfill this instruction? "
            "Reply with just the file path (e.g. App.tsx or components/Sidebar.tsx)."
        )
        try:
            answer = self.planner.provider.chat(system_msg, user_msg).strip()
            # Clean up: remove src/ prefix, quotes, backticks
            answer = answer.strip("`\"' \n")
            if answer.startswith("src/"):
                answer = answer[len("src/"):]
            # Validate the answer is actually one of the files
            if answer in files:
                logger.info("edit_file: LLM picked file %s", answer)
                return answer
            # Fuzzy match: find a file whose basename matches
            basename = os.path.basename(answer)
            for f in files:
                if os.path.basename(f) == basename:
                    logger.info("edit_file: fuzzy matched %s → %s", answer, f)
                    return f
        except Exception as exc:
            logger.warning("edit_file: file-pick LLM failed (%s), defaulting to App.tsx", exc)
        # Default fallback
        return "App.tsx" if "App.tsx" in files else (files[0] if files else "App.tsx")

    def edit_file(self, req: EditFileRequest) -> EditFileResponse:
        """Edit a file in an existing project based on a chat instruction.

        If filePath is empty the planner LLM auto-detects which file to edit.
        """
        # Create codegen agent — always use the configured coder provider (groq/gemini/etc)
        try:
            coder_provider = create_coder_provider_with_model(req.model) if req.model else create_coder_provider()
            codegen_agent = LlmCodegenAgent(coder_provider)
        except Exception as e:
            logger.warning(f"edit_file: Failed to create coder provider: {e}, using default")
            codegen_agent = self.llm_codegen
        
        projects_dir = os.environ.get("PROJECTS_DIR", "/app/projects")
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", req.generationId)
        project_path = os.path.join(projects_dir, safe_id)
        src_dir = os.path.join(project_path, "src")

        # Auto-detect file if none specified
        provided = (req.filePath or "").strip().lstrip("/")
        if provided.startswith("src/"):
            provided = provided[len("src/"):]

        # Check if the user wants to CREATE a new page (no explicit file given)
        if not provided:
            new_page = self._detect_new_page_intent(req.instruction, src_dir)
            if new_page:
                page_name, page_rel_path = new_page
                return self._create_new_page(req, src_dir, project_path, page_name, page_rel_path)
            rel_path = self._pick_file_to_edit(src_dir, req.instruction)
            logger.info("edit_file: auto-selected file %s", rel_path)
        else:
            rel_path = provided

        full_path = os.path.join(src_dir, rel_path)

        if not os.path.exists(full_path):
            # Try to find by component name scan (handles "AvatarImage" → "components/AvatarImage.tsx")
            resolved = self._resolve_file_by_name(src_dir, rel_path)
            if resolved:
                rel_path = resolved
                full_path = os.path.join(src_dir, rel_path)
                logger.info("edit_file: resolved '%s' -> '%s'", req.filePath, rel_path)
            else:
                # If instruction contains code blocks, create the file instead of failing
                import re as _re
                code_in_instruction = _re.search(r"```[\w]*\n([\s\S]+?)```", req.instruction)
                if code_in_instruction:
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    new_code = code_in_instruction.group(1).strip()
                    with open(full_path, "w", encoding="utf-8") as fh:
                        fh.write(new_code)
                    logger.info("edit_file: created new file %s", rel_path)
                    return EditFileResponse(
                        generationId=req.generationId,
                        filePath=rel_path,
                        updatedCode=new_code,
                        success=True,
                    )
                raise FileNotFoundError(f"File not found: {rel_path} (looked in {full_path})")

        with open(full_path, "r", encoding="utf-8") as fh:
            current_code = fh.read()

        # Mock mode — skip LLM entirely (set EDIT_FILE_MOCK=true in env to test pipeline without quota)
        mock_mode = os.environ.get("EDIT_FILE_MOCK", "").lower() in ("1", "true", "yes")
        if mock_mode:
            logger.info("edit_file: MOCK MODE — returning file unchanged (no LLM call)")
            new_code = f"// [MOCK EDIT] instruction: {req.instruction}\n" + current_code
        else:
            # Always send the full file — partial extraction caused constant misalignment bugs.
            # The coder fallback chain includes Claude Sonnet (200K context) which handles large files.
            code_for_llm = current_code
            extract_start = extract_end = None

            logger.info("edit_file: sending code (%d chars) to LLM (fallback chain handles large files)", len(code_for_llm))

            # Build edit prompt with explicit completeness instructions
            is_partial = code_for_llm != current_code
            edit_prompt = (
                f"File to edit: `{rel_path}`\n\n"
                f"USER INSTRUCTION: {req.instruction}\n\n"
                f"{'RELEVANT SECTION OF THE ' if is_partial else ''}CURRENT FILE:\n```\n{code_for_llm}\n```\n\n"
                "CRITICAL RULES:\n"
                "1. Return the COMPLETE file - do NOT truncate or cut off mid-code.\n"
                "2. Every opening tag MUST have a matching closing tag (</div>, </p>, </span>, etc.).\n"
                "3. Every opening brace {{ must have a closing brace }}.\n"
                "4. Every opening parenthesis ( must have a closing ).\n"
                "5. Make ONLY the minimal change required by the instruction.\n"
                "6. If this is App.tsx, ensure there is a function App() and `export default App;`\n"
                "7. Do NOT change anything else — keep all other values, imports, logic exactly as-is.\n"
                "8. No markdown fences, no explanation — raw file content only.\n"
                "9. IMPORTANT: Complete all JSX elements fully. Never end with incomplete tags like `<p className='...'/>` or `>/>`. "
                "Every element needs proper content and closing tags.\n"
            )

            # Call the coder LLM — retry once on transient network errors
            system_msg = (
                "You are a precise code editor that generates COMPLETE, VALID code. "
                "NEVER truncate output - always finish all components, tags, and braces. "
                "Every JSX element must be properly closed. "
                "If editing App.tsx, ALWAYS include the App function and export default App. "
                "Return the complete file. No markdown, no explanation."
            )
            new_code = None
            for attempt in range(2):
                try:
                    new_code = codegen_agent.provider.chat(system_msg, edit_prompt)
                    break
                except Exception as exc:
                    err_str = str(exc)
                    is_transient = any(k in err_str for k in (
                        "peer closed", "incomplete chunked", "RemoteProtocol",
                        "timeout", "timed out", "connection reset", "429", "503",
                    ))
                    if is_transient and attempt == 0:
                        logger.warning("edit_file: transient error on attempt 1, retrying — %s", err_str[:80])
                        continue
                    logger.error("edit_file: LLM call failed — %s", exc)
                    raise
            if not new_code:
                raise RuntimeError("edit_file: LLM returned empty response")

            # Strip markdown fences from the LLM output BEFORE patch-back.
            # If we strip AFTER, the fence ends up embedded inside the full file.
            new_code = re.sub(r"^```(?:tsx?|jsx?|typescript|javascript)?\n?", "", new_code.strip())
            new_code = re.sub(r"\n?```$", "", new_code.strip())

            # LENGTH SAFEGUARD: reject if LLM rewrote the entire file (>1.5x original length)
            # If we sent a partial section, patch it back into the full file
            if extract_start is not None and extract_end is not None and new_code != code_for_llm:
                lines = current_code.split("\n")
                patched_lines = lines[:extract_start] + new_code.split("\n") + lines[extract_end:]
                new_code = "\n".join(patched_lines)
                logger.info("edit_file: patched section back into full file")

            orig_len = len(current_code)
            new_len = len(new_code)
            if orig_len > 500 and new_len > orig_len * 1.5:
                logger.warning(
                    "edit_file: LLM output is %.1fx larger than original (%d → %d chars), "
                    "likely a full rewrite — rejecting and keeping original file",
                    new_len / orig_len, orig_len, new_len
                )
                raise ValueError(
                    f"LLM rewrote the entire file instead of making a minimal edit "
                    f"({orig_len} → {new_len} chars). Try a more specific instruction."
                )

        # Strip accidental markdown fences that some LLMs add
        new_code = re.sub(r"^```(?:tsx?|jsx?|typescript|javascript)?\n?", "", new_code.strip())
        new_code = re.sub(r"\n?```$", "", new_code.strip())

        # Apply same sanitization pipeline as code generation
        if rel_path.endswith((".tsx", ".ts")):
            new_code = self.llm_codegen._repair_truncated_jsx(new_code)
            new_code = self._sanitize_tsx(new_code)
            new_code = self._add_missing_imports(new_code)
            new_code = self._fix_lucide_imports(new_code)
            new_code = self._ensure_default_export(new_code, rel_path)

        # Write back
        with open(full_path, "w", encoding="utf-8") as fh:
            fh.write(new_code)
        logger.info("edit_file: wrote updated %s", full_path)

        # Rebuild Vite with retry loop
        build_success, build_output = self._build_with_retry(project_path, full_path, rel_path, max_retries=2)

        return EditFileResponse(
            filePath=rel_path,
            content=new_code if build_success else open(full_path, 'r', encoding='utf-8').read(),
            buildSuccess=build_success,
            buildOutput=build_output,
        )

    def _build_with_retry(self, project_path: str, full_path: str, rel_path: str, max_retries: int = 2) -> tuple:
        """Build project with automatic error fixing and retry."""
        template_dir = "/app/vite-template"
        vite_bin = os.path.join(template_dir, "node_modules", ".bin", "vite")
        
        for attempt in range(max_retries + 1):
            try:
                result = subprocess.run(
                    [vite_bin, "build"],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                build_success = result.returncode == 0
                build_output = (result.stdout + result.stderr)[-2000:]
            except subprocess.TimeoutExpired:
                return False, "Build timed out after 120 seconds"
            except Exception as exc:
                return False, str(exc)
            
            if build_success:
                logger.info("edit_file: build succeeded on attempt %d", attempt + 1)
                self._strip_crossorigin(os.path.join(project_path, "dist", "index.html"))
                return True, build_output
            
            # If build failed and we have retries left, try to auto-fix
            if attempt < max_retries:
                logger.warning("edit_file: build failed on attempt %d, trying auto-fix", attempt + 1)
                fixed = self._auto_fix_build_error(full_path, build_output)
                if not fixed:
                    logger.warning("edit_file: could not auto-fix, stopping retries")
                    break
        
        logger.warning("edit_file: build failed after %d attempts:\n%s", max_retries + 1, build_output)
        return False, build_output

    def _auto_fix_build_error(self, file_path: str, build_output: str) -> bool:
        """Attempt to automatically fix common build errors."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content
            
            # Fix 1: >/> pattern - truncated self-closing tag
            content = re.sub(r'>\s*/>', r' />', content)
            
            # Fix 2: Extra /> after closing tag like </h1>/>
            content = re.sub(r'</(\w+)>\s*/>', r'</\1>', content)
            
            # Fix 3: Remove any '>Content</p>' patterns that were incorrectly added
            content = re.sub(r"(['\"])\s*>Content</p>", r'\1 />', content)
            
            # Fix 3.5: Invalid JSX like "<10min" - escape the less-than
            content = re.sub(r'([>}])\s*<(\d)', r'\1&lt;\2', content)
            
            # Fix 4: Missing closing tags - count and close
            for tag in ['div', 'p', 'span', 'section', 'main', 'aside', 'header', 'footer']:
                open_count = len(re.findall(rf'<{tag}\b[^>]*(?<!/)>', content))
                close_count = len(re.findall(rf'</{tag}>', content))
                diff = open_count - close_count
                if diff > 0:
                    # Find where to insert - before the last ) } or export
                    insert_pos = content.rfind('\n  )')
                    if insert_pos == -1:
                        insert_pos = content.rfind('\nexport')
                    if insert_pos == -1:
                        insert_pos = len(content)
                    
                    closing_tags = f'\n{"    " * 2}</{tag}>' * min(diff, 10)
                    content = content[:insert_pos] + closing_tags + content[insert_pos:]
                    logger.info("_auto_fix: added %d closing </%s> tags", min(diff, 10), tag)
            
            # Fix 4: Missing App component in App.tsx
            if file_path.endswith('App.tsx') and 'function App(' not in content:
                logger.info("_auto_fix: App.tsx missing App function, adding it")
                # Find the last function definition
                content = self._ensure_app_component(content)
            
            # Fix 5: Wrong export in App.tsx
            if file_path.endswith('App.tsx'):
                wrong_export = re.search(r"export\s+default\s+(?!App\b)(\w+)", content)
                if wrong_export:
                    logger.info("_auto_fix: fixing wrong export %s -> App", wrong_export.group(1))
                    content = re.sub(r"export\s+default\s+\w+\s*;?\s*$", "export default App;", content, flags=re.MULTILINE)
            
            # Fix 6: Unclosed braces/parens
            open_braces = content.count('{') - content.count('}')
            open_parens = content.count('(') - content.count(')')
            if open_braces > 0 or open_parens > 0:
                suffix = ""
                for _ in range(min(open_parens, 5)):
                    suffix += "\n  )"
                for _ in range(min(open_braces, 5)):
                    suffix += "\n}"
                # Insert before export default
                export_pos = content.rfind('\nexport default')
                if export_pos != -1:
                    content = content[:export_pos] + suffix + content[export_pos:]
                else:
                    content += suffix
                logger.info("_auto_fix: closed %d braces, %d parens", open_braces, open_parens)
            
            if content != original:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                logger.info("_auto_fix: applied fixes to %s", file_path)
                return True
            
            return False
        except Exception as e:
            logger.error("_auto_fix: failed with error: %s", e)
            return False

    def _ensure_app_component(self, content: str) -> str:
        """Ensure App.tsx has a proper App component."""
        if 'function App(' in content:
            return content
        
        # Find all defined components
        components = re.findall(r'function\s+(\w+)\s*\(', content)
        
        # Build routing based on what's available
        routes = []
        if 'DashboardPage' in components or 'Dashboard' in content:
            routes.append("case 'dashboard': return <DashboardPage />;")
        if 'ProjectsListPage' in components:
            routes.append("case 'projects': return <ProjectsListPage />;")
        if 'SettingsPage' in components:
            routes.append("case 'settings': return <SettingsPage />;")
        if 'AnalyticsPage' in components:
            routes.append("case 'analytics': return <AnalyticsPage />;")
        
        default_page = 'DashboardPage' if 'DashboardPage' in components else (components[0] if components else 'div')
        
        app_code = f'''
function App() {{
  const [activePage, setActivePage] = React.useState('dashboard');
  
  const renderPage = () => {{
    switch (activePage) {{
      {chr(10).join('      ' + r for r in routes) if routes else "case 'dashboard': return <div>Welcome</div>;"}
      default: return <{default_page} />;
    }}
  }};
  
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <Sidebar activePage={{activePage}} setActivePage={{setActivePage}} />
      <div className='flex-1 flex flex-col'>
        {{typeof Navbar !== 'undefined' && <Navbar activePage={{activePage}} />}}
        <main className='flex-1 p-6'>
          {{renderPage()}}
        </main>
      </div>
    </div>
  );
}}

export default App;
'''
        # Remove any existing wrong export
        content = re.sub(r"\nexport\s+default\s+\w+\s*;?\s*$", "", content, flags=re.MULTILINE)
        return content.rstrip() + "\n" + app_code

    def _strip_crossorigin(self, html_path: str) -> None:
        """Remove crossorigin attribute from script/link tags in the built index.html.

        Vite injects crossorigin on every build. When the iframe and parent are
        served from different origins the browser sends a CORS-mode request for
        each asset; if the CORS headers are absent the fetch fails silently and
        the app never boots. Stripping the attribute makes the browser use a
        no-cors simple request instead, which always succeeds.
        """
        try:
            with open(html_path, "r", encoding="utf-8") as fh:
                html = fh.read()
            stripped = re.sub(r'\s+crossorigin(?:="[^"]*")?', "", html)
            if stripped != html:
                with open(html_path, "w", encoding="utf-8") as fh:
                    fh.write(stripped)
                logger.info("_strip_crossorigin: removed crossorigin from %s", html_path)
        except FileNotFoundError:
            logger.warning("_strip_crossorigin: %s not found, skipping", html_path)
        except Exception as exc:
            logger.warning("_strip_crossorigin: failed for %s: %s", html_path, exc)

    # Imports that the LLM may hallucinate but aren't installed in vite-template
    _BAD_IMPORTS = re.compile(
        r"^import\s+.*?\s+from\s+['\"]"
        r"(chart\.js|react-chartjs-2|@nivo/[^\s'\"]+|victory|highcharts|"
        r"apexcharts|react-apexcharts|d3|@visx/[^\s'\"]+|"
        r"@mui/[^\s'\"]+|@chakra-ui/[^\s'\"]+|@mantine/[^\s'\"]+|"
        r"antd|@ant-design/[^\s'\"]+|framer-motion|react-spring)"
        r"['\"].*$",
        re.MULTILINE,
    )

    # Map of wrong/non-existent lucide icon names → correct names in lucide-react
    # Covers HeroIcons names, suffixed Icon variants, and other common hallucinations
    _ICON_ALIASES: dict[str, str] = {
        # HeroIcons → lucide equivalents
        "CurrencyDollar": "DollarSign",
        "CurrencyEuro": "Euro",
        "CurrencyPound": "PoundSterling",
        "CurrencyYen": "JapaneseYen",
        "Photograph": "Image",
        "ViewGrid": "LayoutGrid",
        "ViewList": "List",
        "DotsVertical": "MoreVertical",
        "DotsHorizontal": "MoreHorizontal",
        "DocumentText": "FileText",
        "DocumentAdd": "FilePlus",
        "DocumentReport": "FileBarChart",
        "DocumentSearch": "FileSearch",
        "DocumentDuplicate": "Copy",
        "DocumentDownload": "FileDown",
        "ClipboardList": "ClipboardList",
        "ClipboardCheck": "ClipboardCheck",
        "ClipboardCopy": "Copy",
        "SwitchHorizontal": "ArrowLeftRight",
        "SwitchVertical": "ArrowUpDown",
        "ColorSwatch": "Palette",
        "ChipIcon": "Cpu",
        "DesktopComputer": "Monitor",
        "DeviceMobile": "Smartphone",
        "DeviceTablet": "Tablet",
        "ReceiptTax": "Receipt",
        "ReceiptRefund": "Receipt",
        "ShoppingBag": "ShoppingBag",
        "Collection": "LayoutGrid",
        "Template": "LayoutTemplate",
        "LocationMarker": "MapPin",
        "PaperAirplane": "Send",
        "PaperClip": "Paperclip",
        "Speakerphone": "Megaphone",
        "SupportIcon": "LifeBuoy",
        "Support": "LifeBuoy",
        "BadgeCheck": "BadgeCheck",
        "LightBulb": "Lightbulb",
        "QuestionMarkCircle": "HelpCircle",
        "InformationCircle": "Info",
        "ExclamationCircle": "AlertCircle",
        "ExclamationTriangle": "AlertTriangle",
        "Exclamation": "AlertTriangle",
        "MinusCircle": "MinusCircle",
        "PlusCircle": "PlusCircle",
        "UserCircle": "UserCircle",
        "UserGroup": "Users",
        "UserAdd": "UserPlus",
        "UserRemove": "UserMinus",
        "OfficeBuildingIcon": "Building2",
        "OfficeBuilding": "Building2",
        "AcademicCap": "GraduationCap",
        "Beaker": "FlaskConical",
        "CubeTransparent": "Box",
        "Cube": "Box",
        "Globe": "Globe",
        "GlobeAlt": "Globe2",
        "StatusOnline": "Wifi",
        "StatusOffline": "WifiOff",
        "EmojiHappy": "Smile",
        "EmojiSad": "Frown",
        "Cursor": "MousePointer2",
        "CursorClick": "MousePointerClick",
        "Hand": "Hand",
        "ThumbUp": "ThumbsUp",
        "ThumbDown": "ThumbsDown",
        "ArrowNarrowRight": "ArrowRight",
        "ArrowNarrowLeft": "ArrowLeft",
        "ArrowNarrowUp": "ArrowUp",
        "ArrowNarrowDown": "ArrowDown",
        "ArrowSmRight": "ArrowRight",
        "ArrowSmLeft": "ArrowLeft",
        "ArrowCircleRight": "ArrowRightCircle",
        "ArrowCircleLeft": "ArrowLeftCircle",
        "ArrowCircleUp": "ArrowUpCircle",
        "ArrowCircleDown": "ArrowDownCircle",
        "Logout": "LogOut",
        "Login": "LogIn",
        # Wrong names with Chart prefix
        "ChartBar": "BarChart2",
        "ChartLine": "TrendingUp",
        "ChartPie": "PieChart",
        "ChartSquareBar": "BarChart2",
        # Suffixed variants (FooIcon → Foo)
        "Cog": "Settings2",
        "CogIcon": "Settings2",
        "MenuIcon": "Menu",
        "XIcon": "X",
        "SearchIcon": "Search",
        "CheckIcon": "Check",
        "PlusIcon": "Plus",
        "TrashIcon": "Trash2",
        "EditIcon": "Pencil",
        "PencilIcon": "Pencil",
        "EyeIcon": "Eye",
        "MailIcon": "Mail",
        "PhoneIcon": "Phone",
        "UserIcon": "User",
        "UsersIcon": "Users",
        "BellIcon": "Bell",
        "CalendarIcon": "Calendar",
        "ClockIcon": "Clock",
        "HomeIcon": "Home",
        "GlobeIcon": "Globe",
        "GlobalIcon": "Globe",
        "StarIcon": "Star",
        "HeartIcon": "Heart",
        "LockIcon": "Lock",
        "UnlockIcon": "Unlock",
        "KeyIcon": "Key",
        "LogoutIcon": "LogOut",
        "LoginIcon": "LogIn",
        "ArrowRightIcon": "ArrowRight",
        "ArrowLeftIcon": "ArrowLeft",
        "ChevronRightIcon": "ChevronRight",
        "ChevronLeftIcon": "ChevronLeft",
        "ChevronUpIcon": "ChevronUp",
        "ChevronDownIcon": "ChevronDown",
        "FilterIcon": "Filter",
        "SortIcon": "ArrowUpDown",
        "DownloadIcon": "Download",
        "UploadIcon": "Upload",
        "RefreshIcon": "RefreshCw",
        "GridIcon": "LayoutGrid",
        "ListIcon": "List",
        "DatabaseIcon": "Database",
        "ServerIcon": "Server",
        "CodeIcon": "Code2",
        "TerminalIcon": "Terminal",
        "ZapIcon": "Zap",
        "ShieldIcon": "Shield",
        "CreditCardIcon": "CreditCard",
        "DollarSignIcon": "DollarSign",
        "TrendingUpIcon": "TrendingUp",
        "TrendingDownIcon": "TrendingDown",
        "BarChartIcon": "BarChart2",
        "ActivityIcon": "Activity",
        "FlagIcon": "Flag",
        "BookmarkIcon": "Bookmark",
        "TagIcon": "Tag",
        "FileTextIcon": "FileText",
        "FileIcon": "File",
        "FolderIcon": "Folder",
        "ImageIcon": "Image",
        "ExternalLinkIcon": "ExternalLink",
        "LinkIcon": "Link",
        "InfoIcon": "Info",
        "AlertCircleIcon": "AlertCircle",
        "AlertTriangleIcon": "AlertTriangle",
        "CheckCircleIcon": "CheckCircle",
        "XCircleIcon": "XCircle",
        "MessageSquareIcon": "MessageSquare",
        "SunIcon": "Sun",
        "MoonIcon": "Moon",
        "CloudIcon": "Cloud",
        "MapPinIcon": "MapPin",
        "ThumbsUpIcon": "ThumbsUp",
        "LayersIcon": "Layers",
        "PackageIcon": "Package",
    }

    @staticmethod
    def _ensure_default_export(content: str, filename: str) -> str:
        """Ensure TSX component files have `export default ComponentName`.

        If the file already has any `export default`, leave it alone.
        Otherwise find the top-level function/const that matches the filename
        and append `export default <Name>`.
        
        Special case: App.tsx must export App, not Sidebar or other components.
        """
        basename = os.path.basename(filename)
        
        # Special handling for App.tsx - must export App
        if basename == "App.tsx":
            # Check if it exports something other than App
            wrong_export = re.search(r"export\s+default\s+(?!App\b)(\w+)", content)
            if wrong_export:
                wrong_name = wrong_export.group(1)
                logger.warning("_ensure_default_export: App.tsx exports %s instead of App, fixing", wrong_name)
                # Remove the wrong export
                content = re.sub(r"export\s+default\s+" + wrong_name + r"\s*;?\s*$", "", content, flags=re.MULTILINE)
            
            # Check if App function exists
            if not re.search(r"function\s+App\s*\(", content):
                # App function is missing - add a basic one
                logger.warning("_ensure_default_export: App.tsx missing App function, adding basic App")
                app_component = '''
function App() {
  const [activePage, setActivePage] = React.useState('dashboard');
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className='flex-1'>
        <main className='p-6'>
          <h1 className='text-2xl font-bold'>Welcome</h1>
        </main>
      </div>
    </div>
  );
}

export default App;
'''
                content = content.rstrip() + "\n" + app_component
                return content
            
            # App function exists, ensure it's exported
            if "export default App" not in content:
                content = content.rstrip() + "\n\nexport default App;\n"
            return content
        
        if "export default" in content:
            return content

        # Derive expected component name from filename (e.g. Navbar.tsx → Navbar)
        component_name = re.sub(r"\.tsx?$", "", basename)

        # Look for: function ComponentName or const ComponentName =
        func_match = re.search(
            rf"(?:function|const)\s+({re.escape(component_name)})\b",
            content,
        )
        if func_match:
            name = func_match.group(1)
        else:
            # Fallback: any top-level PascalCase function
            fb = re.search(r"(?:function|const)\s+([A-Z][a-zA-Z0-9]+)\b", content)
            if not fb:
                return content
            name = fb.group(1)

        logger.info("_ensure_default_export: adding `export default %s` to %s", name, filename)
        return content.rstrip() + f"\n\nexport default {name}\n"

    @staticmethod
    def _sanitize_tsx(content: str) -> str:
        """Strip imports for packages not present in vite-template."""
        return Orchestrator._BAD_IMPORTS.sub("// [removed unsupported import]", content)

    @staticmethod
    def _add_missing_imports(content: str) -> str:
        """Inject missing React / recharts / lucide-react imports when LLM forgets them."""
        if not content.strip():
            return content

        lines_to_prepend: list[str] = []

        # ── React / useState / useEffect ─────────────────────────────────────
        has_react_import = bool(re.search(r"from\s+['\"]react['\"]", content))
        if not has_react_import:
            hooks_used = set(re.findall(r"\b(useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer)\b", content))
            if hooks_used:
                hooks_str = ", ".join(sorted(hooks_used))
                lines_to_prepend.append(f"import React, {{ {hooks_str} }} from 'react';")
            else:
                lines_to_prepend.append("import React from 'react';")

        # ── recharts ─────────────────────────────────────────────────────────
        _RECHARTS = {
            "AreaChart", "Area", "BarChart", "Bar", "LineChart", "Line",
            "PieChart", "Pie", "Cell", "XAxis", "YAxis", "CartesianGrid",
            "Tooltip", "Legend", "ResponsiveContainer", "RadarChart", "Radar",
            "PolarGrid", "PolarAngleAxis", "ScatterChart", "Scatter",
            "ComposedChart", "ReferenceLine", "Brush",
        }
        has_recharts = bool(re.search(r"from\s+['\"]recharts['\"]", content))
        if not has_recharts:
            used = {n for n in _RECHARTS if re.search(rf"\b{n}\b", content)}
            if used:
                lines_to_prepend.append(f"import {{ {', '.join(sorted(used))} }} from 'recharts';")

        # ── lucide-react ──────────────────────────────────────────────────────
        has_lucide = bool(re.search(r"from\s+['\"]lucide-react['\"]", content))
        if not has_lucide:
            defined = set(re.findall(r"(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)", content))
            jsx_used = set(re.findall(r"<([A-Z][a-zA-Z0-9]+)[\s/>]", content))
            _NOT_ICONS = {
                "ResponsiveContainer","AreaChart","Area","BarChart","Bar","LineChart","Line",
                "PieChart","Pie","Cell","XAxis","YAxis","CartesianGrid","Tooltip","Legend",
                "RadarChart","Radar","PolarGrid","PolarAngleAxis","ScatterChart","Scatter",
                "ComposedChart","React","Fragment","Suspense","StrictMode",
                # shadcn
                "Button","Card","CardContent","CardHeader","CardTitle","CardDescription",
                "CardFooter","Badge","Avatar","AvatarFallback","AvatarImage","Input",
                "Tabs","TabsContent","TabsList","TabsTrigger","Dialog","DialogContent",
                "DialogHeader","DialogTitle","DialogTrigger","Progress","Separator",
                "Switch","Checkbox","ScrollArea","DropdownMenu","DropdownMenuContent",
                "DropdownMenuItem","DropdownMenuTrigger","Skeleton","Sheet","SheetContent",
                "Accordion","AccordionContent","AccordionItem","AccordionTrigger","Slider",
            }
            candidates = jsx_used - defined - _NOT_ICONS
            if candidates:
                lines_to_prepend.append(f"import {{ {', '.join(sorted(candidates))} }} from 'lucide-react';")

        if lines_to_prepend:
            logger.info("_add_missing_imports: injecting: %s", lines_to_prepend)
            return "\n".join(lines_to_prepend) + "\n" + content

        return content

    @staticmethod
    def _fix_lucide_imports(content: str) -> str:
        """Fix missing/wrong lucide-react icon imports.

        1. Replace known wrong icon names (e.g. ChartBar → BarChart2).
        2. Remove local component names (pages/components) from lucide-react import.
        3. Auto-add to the lucide-react import any PascalCase JSX component
           that is used but not defined in the file and not yet imported.
        """
        logger.info("_fix_lucide_imports: CALLED with %d chars", len(content))

        # Step 1 — apply alias map (wrong name → correct lucide name)
        for wrong, correct in Orchestrator._ICON_ALIASES.items():
            if re.search(rf"\b{wrong}\b", content):
                content = re.sub(rf"\b{wrong}\b", correct, content)
                logger.debug("_fix_lucide_imports: replaced %s → %s", wrong, correct)

        # Step 2 — find the lucide-react import line
        lucide_re = re.compile(
            r"import\s*\{([^}]+)\}\s*from\s*['\"]lucide-react['\"]"
        )
        m = lucide_re.search(content)
        if not m:
            return content

        imported = {n.strip() for n in m.group(1).split(",") if n.strip()}

        # Step 2a — shadcn/ui components that must NEVER be in the lucide-react import
        # Maps component name → correct shadcn/ui import path
        _SHADCN_COMPONENTS: dict[str, str] = {
            "Button": "@/components/ui/button",
            "Card": "@/components/ui/card",
            "CardContent": "@/components/ui/card",
            "CardDescription": "@/components/ui/card",
            "CardFooter": "@/components/ui/card",
            "CardHeader": "@/components/ui/card",
            "CardTitle": "@/components/ui/card",
            "Badge": "@/components/ui/badge",
            "Avatar": "@/components/ui/avatar",
            "AvatarFallback": "@/components/ui/avatar",
            "AvatarImage": "@/components/ui/avatar",
            "Input": "@/components/ui/input",
            "Label": "@/components/ui/label",
            "Textarea": "@/components/ui/textarea",
            "Select": "@/components/ui/select",
            "SelectContent": "@/components/ui/select",
            "SelectItem": "@/components/ui/select",
            "SelectTrigger": "@/components/ui/select",
            "SelectValue": "@/components/ui/select",
            "Table": "@/components/ui/table",
            "TableBody": "@/components/ui/table",
            "TableCell": "@/components/ui/table",
            "TableHead": "@/components/ui/table",
            "TableHeader": "@/components/ui/table",
            "TableRow": "@/components/ui/table",
            "Tabs": "@/components/ui/tabs",
            "TabsContent": "@/components/ui/tabs",
            "TabsList": "@/components/ui/tabs",
            "TabsTrigger": "@/components/ui/tabs",
            "Dialog": "@/components/ui/dialog",
            "DialogContent": "@/components/ui/dialog",
            "DialogHeader": "@/components/ui/dialog",
            "DialogTitle": "@/components/ui/dialog",
            "DialogTrigger": "@/components/ui/dialog",
            "Progress": "@/components/ui/progress",
            "Separator": "@/components/ui/separator",
            "Switch": "@/components/ui/switch",
            "Checkbox": "@/components/ui/checkbox",
            "ScrollArea": "@/components/ui/scroll-area",
            "DropdownMenu": "@/components/ui/dropdown-menu",
            "DropdownMenuContent": "@/components/ui/dropdown-menu",
            "DropdownMenuItem": "@/components/ui/dropdown-menu",
            "DropdownMenuTrigger": "@/components/ui/dropdown-menu",
            "DropdownMenuLabel": "@/components/ui/dropdown-menu",
            "DropdownMenuSeparator": "@/components/ui/dropdown-menu",
            "Tooltip": "@/components/ui/tooltip",
            "TooltipContent": "@/components/ui/tooltip",
            "TooltipProvider": "@/components/ui/tooltip",
            "TooltipTrigger": "@/components/ui/tooltip",
            "Sheet": "@/components/ui/sheet",
            "SheetContent": "@/components/ui/sheet",
            "SheetHeader": "@/components/ui/sheet",
            "SheetTitle": "@/components/ui/sheet",
            "SheetTrigger": "@/components/ui/sheet",
            "Accordion": "@/components/ui/accordion",
            "AccordionContent": "@/components/ui/accordion",
            "AccordionItem": "@/components/ui/accordion",
            "AccordionTrigger": "@/components/ui/accordion",
            "Skeleton": "@/components/ui/skeleton",
            "Slider": "@/components/ui/slider",
            "RadioGroup": "@/components/ui/radio-group",
            "RadioGroupItem": "@/components/ui/radio-group",
            "AlertDialog": "@/components/ui/alert-dialog",
            "AlertDialogContent": "@/components/ui/alert-dialog",
            "AlertDialogHeader": "@/components/ui/alert-dialog",
            "AlertDialogTitle": "@/components/ui/alert-dialog",
            "AlertDialogTrigger": "@/components/ui/alert-dialog",
        }

        shadcn_in_lucide = imported & set(_SHADCN_COMPONENTS.keys())
        if shadcn_in_lucide:
            logger.info("_fix_lucide_imports: moving shadcn components out of lucide-react: %s", sorted(shadcn_in_lucide))
            imported -= shadcn_in_lucide
            # Group by path and add missing shadcn imports
            by_path: dict[str, list[str]] = {}
            for comp in shadcn_in_lucide:
                path = _SHADCN_COMPONENTS[comp]
                by_path.setdefault(path, []).append(comp)
            # For each path, add import if not already present
            for path, comps in by_path.items():
                existing_re = re.compile(
                    r"import\s*\{([^}]+)\}\s*from\s*['\"]" + re.escape(path) + r"['\"]"
                )
                existing_m = existing_re.search(content)
                if existing_m:
                    # Merge with existing import
                    existing_names = {n.strip() for n in existing_m.group(1).split(",") if n.strip()}
                    merged = sorted(existing_names | set(comps))
                    content = existing_re.sub(
                        "import { " + ", ".join(merged) + " } from '" + path + "'", content
                    )
                else:
                    # Add new import after the lucide-react line
                    new_import_line = "import { " + ", ".join(sorted(comps)) + " } from '" + path + "'"
                    content = lucide_re.sub(
                        m.group(0) + "\n" + new_import_line, content, count=1
                    )
            # Update lucide import (remove shadcn names)
            if not imported:
                content = lucide_re.sub("", content)
                return content
            new_lucide = "import { " + ", ".join(sorted(imported)) + " } from 'lucide-react'"
            content = lucide_re.sub(new_lucide, content)
            m = lucide_re.search(content)
            if not m:
                return content
            imported = {n.strip() for n in m.group(1).split(",") if n.strip()}

        # Names imported as DEFAULT from local paths (./pages/ or ./components/)
        # These must NEVER appear inside the lucide-react named import
        local_default_imports = set(re.findall(
            r"import\s+([A-Z][a-zA-Z0-9]*)\s+from\s*['\"]\.\/(?:pages|components)\/[^'\"]+['\"]",
            content,
        ))
        if local_default_imports:
            bad = imported & local_default_imports
            if bad:
                logger.info("_fix_lucide_imports: removing local components from lucide import: %s", bad)
                imported -= bad
                if not imported:
                    # Remove the entire lucide-react import line if nothing left
                    content = lucide_re.sub("", content)
                    return content
                new_import = "import { " + ", ".join(sorted(imported)) + " } from 'lucide-react'"
                content = lucide_re.sub(new_import, content)
                m = lucide_re.search(content)
                if not m:
                    return content

        # Names defined in the file (function/const/class declarations)
        defined = set(re.findall(r"(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)", content))

        # All PascalCase names used in JSX position: <Name or <Name> or <Name/>
        jsx_used = set(re.findall(r"<([A-Z][a-zA-Z0-9]+)[\s/>]", content))

        # recharts / other known non-lucide PascalCase components to ignore
        _not_icons = {
            "ResponsiveContainer", "AreaChart", "Area", "BarChart", "Bar",
            "LineChart", "Line", "PieChart", "Pie", "Cell", "XAxis", "YAxis",
            "CartesianGrid", "Tooltip", "Legend", "RadarChart", "Radar",
            "PolarGrid", "PolarAngleAxis", "PolarRadiusAxis", "ScatterChart",
            "Scatter", "ComposedChart", "ReferenceLine", "ReferenceArea",
        }
        # Also exclude all shadcn UI components (they come from @/components/ui/*)
        _not_icons.update(_SHADCN_COMPONENTS.keys())
        missing = jsx_used - defined - imported - _not_icons - local_default_imports

        if missing:
            all_imports = sorted(imported | missing)
            new_import = "import { " + ", ".join(all_imports) + " } from 'lucide-react'"
            content = lucide_re.sub(new_import, content)
            logger.info("_fix_lucide_imports: added missing icons %s", sorted(missing))

        return content

    def _build_vite_project(self, project_path: str, code: "CodeBundle") -> tuple[bool, str]:
        """Copy the pre-built Vite template, write generated TSX files, and run vite build.

        Returns:
            (success, combined_output) where success is True when vite exits with code 0.
        """
        import html as _html

        template_dir = "/app/vite-template"

        # Copy template skeleton (node_modules and dist excluded)
        if os.path.exists(project_path):
            shutil.rmtree(project_path)
        shutil.copytree(
            template_dir,
            project_path,
            ignore=shutil.ignore_patterns("node_modules", "dist"),
        )

        # Symlink node_modules from the pre-installed template
        node_modules_link = os.path.join(project_path, "node_modules")
        node_modules_src  = os.path.join(template_dir, "node_modules")
        if os.path.exists(node_modules_src) and not os.path.lexists(node_modules_link):
            os.symlink(node_modules_src, node_modules_link)

        # Write generated files (apply sanitisation before writing)
        src_dir = os.path.join(project_path, "src")
        os.makedirs(src_dir, exist_ok=True)
        for cf in code.files:
            content = cf.content
            # Determine destination — preserve src/components/, src/pages/, and public/ structure
            if cf.path.startswith("src/"):
                rel = cf.path[len("src/"):]          # strip "src/" prefix
                dest = os.path.join(src_dir, rel)
            elif cf.path.startswith("public/"):
                rel = cf.path[len("public/"):]       # strip "public/" prefix
                dest = os.path.join(project_path, "public", rel)
            elif cf.path.endswith((".tsx", ".ts")) and "main.tsx" not in cf.path:
                dest = os.path.join(src_dir, os.path.basename(cf.path))
            else:
                dest = os.path.join(project_path, os.path.basename(cf.path))
            # Create parent directory if needed (e.g. src/components/, src/pages/, public/)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if cf.path.endswith((".tsx", ".ts")) and "main.tsx" not in cf.path:
                content = self._sanitize_tsx(content)
                content = self._add_missing_imports(content)
                content = self._fix_lucide_imports(content)
                content = self._ensure_default_export(content, cf.path)
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(content)
        logger.info("Wrote %d file(s) to %s/src/", len(code.files), project_path)

        # Execute vite build
        vite_bin = os.path.join(node_modules_src, ".bin", "vite")
        try:
            result = subprocess.run(
                [vite_bin, "build"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            logger.error("Vite build timed out for %s", project_path)
            return False, "Build timed out after 120 seconds"

        combined = (result.stdout + result.stderr)

        if result.returncode == 0:
            logger.info("Vite build succeeded for %s", project_path)
            self._strip_crossorigin(os.path.join(project_path, "dist", "index.html"))
            return True, combined

        stderr_short = combined[-2000:]
        logger.error("Vite build failed:\n%s", stderr_short)

        # Write an error page so the iframe shows the error instead of a 404
        dist_dir = os.path.join(project_path, "dist")
        os.makedirs(dist_dir, exist_ok=True)
        error_page = (
            "<!doctype html><html><head><meta charset='UTF-8'>"
            "<title>Build Error</title>"
            "<style>body{background:#0f172a;color:#f1f5f9;font-family:monospace;"
            "padding:2rem}pre{background:#1e293b;padding:1rem;border-radius:8px;"
            "overflow:auto;white-space:pre-wrap;color:#f87171}</style></head><body>"
            "<h2 style='color:#818cf8'>Build Failed</h2>"
            f"<pre>{_html.escape(stderr_short)}</pre>"
            "</body></html>"
        )
        with open(os.path.join(dist_dir, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(error_page)

        return False, stderr_short

    def _build_with_self_healing(
        self,
        project_path: str,
        code: "CodeBundle",
        max_retries: int = 2,
    ) -> tuple[bool, int]:
        """Build the Vite project with automatic code repair on failure.

        On each failed build, parses the Vite error output and asks the coder LLM
        to repair only the broken section of App.tsx. Retries up to max_retries times.

        Returns:
            (success, repair_attempts_count)
        """
        current_code = code

        for attempt in range(max_retries + 1):
            success, output = self._build_vite_project(project_path, current_code)

            if success:
                if attempt > 0:
                    logger.info("Self-healing: build succeeded after %d repair(s)", attempt)
                return True, attempt

            if attempt >= max_retries:
                logger.warning("Self-healing: all %d repair attempts exhausted", max_retries)
                return False, attempt

            # Parse the error and attempt repair
            error_summary = self._parse_vite_error(output)
            logger.info(
                "Self-healing: attempt %d/%d — error type=%s line=%s",
                attempt + 1, max_retries,
                error_summary.get("type", "unknown"),
                error_summary.get("line", "?"),
            )

            # Determine which file to repair (the one mentioned in the error, not always App.tsx)
            broken_file = error_summary.get("broken_file") or "src/App.tsx"
            repaired_content = self._repair_tsx_code(
                code=current_code,
                error=error_summary,
                broken_file=broken_file,
                attempt=attempt,
            )

            if repaired_content is None:
                logger.warning("Self-healing: repair agent returned no output — aborting")
                return False, attempt + 1

            # Replace the broken file with repaired version
            repaired_basename = os.path.basename(broken_file)
            new_files = []
            replaced = False
            for cf in current_code.files:
                if os.path.basename(cf.path) == repaired_basename:
                    new_files.append(CodeFile(path=cf.path, content=repaired_content))
                    replaced = True
                else:
                    new_files.append(cf)
            if not replaced:
                # file not found by basename — fall back to App.tsx
                for cf in current_code.files:
                    if os.path.basename(cf.path) == "App.tsx":
                        new_files = [CodeFile(path=cf.path, content=repaired_content) if os.path.basename(cf.path) == "App.tsx" else cf for cf in current_code.files]
                        break
            current_code = CodeBundle(files=new_files)

        return False, max_retries

    @staticmethod
    def _parse_vite_error(output: str) -> dict[str, Any]:
        """Extract structured information from Vite's error output.

        Returns a dict with keys: type, message, line, column, broken_file, missing_module.
        """
        info: dict[str, Any] = {
            "type": "unknown",
            "message": output[-800:],
            "line": None,
            "column": None,
            "broken_file": None,
            "missing_module": None,
        }

        # ENOENT / load-fallback: missing local file (e.g. @/components/ui/breadcrumb)
        # Pattern: [vite:load-fallback] Could not load .../src/components/ui/X (imported by src/components/Navbar.tsx)
        enoent_match = re.search(
            r"Could not load [^\s(]*?/src/([^\s(]+?)\s+\(imported by ([^\s)]+)\)",
            output,
        )
        if enoent_match or "ENOENT" in output:
            if enoent_match:
                missing_path  = enoent_match.group(1).rstrip(":")
                importing_file = enoent_match.group(2).strip()
                info["missing_module"] = "src/" + missing_path
                info["broken_file"]    = importing_file if importing_file.startswith("src/") else "src/" + importing_file
            else:
                # Fallback: try to find any "imported by X.tsx" pattern
                imp_match = re.search(r"imported by ([^\s)]+\.tsx)", output)
                if imp_match:
                    importing_file = imp_match.group(1).strip()
                    info["broken_file"] = importing_file if importing_file.startswith("src/") else "src/" + importing_file
            info["type"]    = "missing_local_module"
            info["message"] = output[-800:]
            return info

        # JSX syntax error — most common LLM mistake
        jsx_match = re.search(
            r'Expected\s+"[^"]+"\s+but\s+found\s+"[^"]+".*?(?:at\s+)?(?:App\.tsx)?:(\d+):(\d+)',
            output,
        )
        if jsx_match:
            info["type"]   = "jsx_syntax"
            info["line"]   = jsx_match.group(1)
            info["column"] = jsx_match.group(2)
            # Try to identify broken file from "at src/X.tsx"
            at_match = re.search(r"at (src/[^\s:]+\.tsx)", output)
            if at_match:
                info["broken_file"] = at_match.group(1)
            return info

        # Missing export from lucide-react
        if "is not exported from" in output and "lucide-react" in output:
            missing = re.search(r'"([^"]+)" is not exported from', output)
            info["type"]    = "missing_icon"
            info["message"] = missing.group(0) if missing else output[-400:]
            # Extract the file that does the bad import
            imp_match = re.search(r'imported by "?(src/[^\s"]+\.tsx)"?', output)
            if imp_match:
                info["broken_file"] = imp_match.group(1)
            return info

        # TypeScript type error
        if "Type error" in output or "TS" in output:
            info["type"] = "typescript"
            return info

        # Module not found
        if "Cannot find module" in output or "Module not found" in output:
            info["type"] = "missing_module"
            imp_match = re.search(r'imported by "?(src/[^\s"]+\.tsx)"?', output)
            if imp_match:
                info["broken_file"] = imp_match.group(1)
            return info

        # Generic syntax error
        if "SyntaxError" in output:
            info["type"] = "syntax"
            return info

        return info

    def _repair_tsx_code(
        self,
        code: "CodeBundle",
        error: dict[str, Any],
        attempt: int,
        broken_file: str = "src/App.tsx",
    ) -> str | None:
        """Ask the coder LLM to repair the broken TSX file.

        Sends a concise repair prompt focused on the specific error type.
        Returns the repaired code string, or None if the LLM call fails.
        """
        broken_basename = os.path.basename(broken_file)
        # Find the broken file by basename match
        tsx_files = [cf for cf in code.files if os.path.basename(cf.path) == broken_basename]
        if not tsx_files:
            # Fallback to App.tsx
            tsx_files = [cf for cf in code.files if os.path.basename(cf.path) == "App.tsx"]
        if not tsx_files:
            return None

        broken_code = tsx_files[0].content
        error_type  = error.get("type", "unknown")
        error_msg   = str(error.get("message", ""))[:600]

        # Build a targeted repair instruction based on error type
        if error_type == "missing_local_module":
            missing_mod = error.get("missing_module") or "unknown"
            instruction = (
                f"This file imports a local module that does not exist: '{missing_mod}'.\n"
                "Remove or replace every import of that missing path. "
                "If it was a UI component (breadcrumb, accordion, etc.), either inline a simple replacement "
                "or remove the usage entirely. Do NOT add new files — fix this file only."
            )
        elif error_type == "jsx_syntax":
            instruction = (
                f"The JSX has a syntax error at line {error.get('line', '?')}: {error_msg}\n"
                "Fix ONLY the broken JSX — do not rewrite the whole component. "
                "Common fixes: close unclosed tags, fix mismatched parentheses/braces, "
                "ensure every JSX expression is wrapped in a single parent element."
            )
        elif error_type == "missing_icon":
            instruction = (
                f"A lucide-react import is wrong: {error_msg}\n"
                "lucide-react exports ICONS ONLY. "
                "If the bad import is a UI component (Button, Card, Badge, Avatar, Input, Label, "
                "Table, Tabs, Dialog, Progress, Checkbox, Switch, Select, Separator, ScrollArea), "
                "move it to the correct shadcn/ui path: e.g. "
                "import { Button } from '@/components/ui/button', "
                "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card', "
                "import { Badge } from '@/components/ui/badge', "
                "import { Avatar, AvatarFallback } from '@/components/ui/avatar'. "
                "If it is a non-existent icon, replace it with a valid lucide-react icon "
                "(e.g. Wrench instead of Tool, BarChart2, TrendingUp, Settings, Users). "
                "Fix ALL bad imports in one pass."
            )
        elif error_type == "typescript":
            instruction = (
                f"TypeScript compilation error: {error_msg}\n"
                "Fix the type error. Common fixes: add missing type annotations, "
                "correct prop types, remove invalid type casts."
            )
        else:
            instruction = (
                f"Build error: {error_msg}\n"
                "Fix the issue so the file compiles cleanly with Vite + React + TypeScript."
            )

        system = (
            f"You are an expert React/TypeScript developer. You receive a broken {broken_basename} "
            "and a specific build error. Your task: return the COMPLETE fixed file "
            "with the minimal changes needed to resolve the error. "
            "Return ONLY the raw TypeScript/TSX code — no markdown, no explanation."
        )
        user = (
            f"ERROR (attempt {attempt + 1}):\n{instruction}\n\n"
            f"BROKEN {broken_basename}:\n{broken_code[:6000]}"
        )

        try:
            repaired = self.llm_codegen.provider.chat(
                system, user, max_tokens=8192, temperature=0.05,
            )
            # Strip markdown fences if the LLM added them
            repaired = re.sub(r"^```(?:tsx?|jsx?|typescript)?\s*", "", repaired.strip())
            repaired = re.sub(r"\s*```$", "", repaired.strip())
            logger.info("Self-healing: repaired code length=%d chars", len(repaired))
            return repaired if repaired.strip() else None
        except Exception as exc:
            logger.warning("Self-healing: repair LLM call failed (%s)", exc)
            return None
