"""
Simplified API for Docker — accepts audio from browser, transcribes via ElevenLabs,
runs AI analysis via Ollama (Qwen), returns requirements and analysis.
No sounddevice/microphone needed.
"""
from __future__ import annotations

import os
import json
import logging
import re
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen2.5:3b")
PIPELINE_API_URL = os.getenv("PIPELINE_API_URL", "")

REPORTS_DIR = Path(os.getenv("PIPELINE_OUTPUTS", "pipeline_outputs")) / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def transcribe_with_groq(audio_bytes: bytes, language: str = "en") -> dict:
    """Transcribe audio using Groq Whisper API (free, no IP restrictions)."""
    import requests as req
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    files = {"file": ("recording.webm", audio_bytes, "audio/webm")}
    data = {
        "model": "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "language": language if language != "tn" else "ar",
    }
    resp = req.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers=headers,
        files=files,
        data=data,
        timeout=60,
    )
    resp.raise_for_status()
    result = resp.json()
    text = result.get("text", "")
    # Groq verbose_json returns segments with speaker info
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "speaker": f"Speaker {seg.get('id', 0) + 1}",
            "text": seg.get("text", "").strip(),
        })
    return {"text": text, "words": [], "segments_groq": segments}


def transcribe_with_elevenlabs(audio_bytes: bytes, language: str = "en") -> dict:
    """Transcribe audio using ElevenLabs Scribe (with diarization)."""
    import requests as req
    headers = {"xi-api-key": ELEVENLABS_API_KEY}
    files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
    data = {
        "model_id": "scribe_v1",
        "language_code": language if language != "tn" else "ar",
        "diarize": "true",
        "timestamps_granularity": "none",
    }
    resp = req.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers=headers,
        files=files,
        data=data,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def transcribe_audio(audio_bytes: bytes, language: str = "en") -> dict:
    """Try ElevenLabs first (diarization), fall back to Groq Whisper."""
    if ELEVENLABS_API_KEY:
        try:
            return transcribe_with_elevenlabs(audio_bytes, language)
        except Exception as e:
            logger.warning("ElevenLabs failed (%s), falling back to Groq Whisper", e)
    if GROQ_API_KEY:
        return transcribe_with_groq(audio_bytes, language)
    raise RuntimeError("No transcription API key configured (set ELEVENLABS_API_KEY or GROQ_API_KEY)")


def _ollama_chat(prompt: str, system: str) -> str:
    """Call LLM: try Groq first (fast, free), fall back to Ollama."""
    import requests as req

    # Try Groq LLaMA (fast, reliable)
    if GROQ_API_KEY:
        try:
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 1500,
            }
            resp = req.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json=payload,
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning("Groq LLM failed (%s), trying Ollama", e)

    # Fallback: Ollama local
    payload = {
        "model": QWEN_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": 1500},
    }
    resp = req.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=180)
    resp.raise_for_status()
    return resp.json().get("message", {}).get("content", "")


def _parse_json_from_llm(text: str) -> dict:
    """Extract JSON object from LLM response."""
    # Try direct parse
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    # Try extracting from markdown code block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass
    # Try finding first { ... } block
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


def _extract_requirements(text: str) -> dict:
    """Use Qwen to extract functional and non-functional requirements."""
    system = (
        "You are a senior software consultant. Extract structured requirements from meeting transcripts. "
        "Always respond with valid JSON only, no explanation."
    )
    prompt = f"""Analyze this meeting transcript and extract requirements as JSON:

TRANSCRIPT:
{text[:4000]}

Respond ONLY with this JSON structure (no extra text):
{{
  "functional_requirements": [
    {{"description": "...", "priority": "high|medium|low"}},
    ...
  ],
  "non_functional_requirements": [
    {{"description": "..."}},
    ...
  ]
}}"""
    try:
        raw = _ollama_chat(prompt, system)
        return _parse_json_from_llm(raw)
    except Exception as e:
        logger.warning("Requirements extraction failed: %s", e)
        return {}


def _extract_summary(text: str) -> dict:
    """Use Qwen to generate a meeting summary."""
    system = "You are a professional meeting analyst. Summarize meetings concisely. Always respond with valid JSON only."
    prompt = f"""Summarize this meeting transcript as JSON:

TRANSCRIPT:
{text[:3000]}

Respond ONLY with this JSON structure:
{{
  "overview": "2-3 sentence summary of the meeting",
  "participants": ["role or name of participant 1", ...],
  "decisions": ["key decision 1", ...],
  "key_topics": ["topic 1", ...]
}}"""
    try:
        raw = _ollama_chat(prompt, system)
        return _parse_json_from_llm(raw)
    except Exception as e:
        logger.warning("Summary extraction failed: %s", e)
        return {}


def _detect_ambiguities(text: str) -> dict:
    """Use Qwen to detect ambiguities in the transcript."""
    system = "You are a requirements analyst. Identify unclear or ambiguous statements. Always respond with valid JSON only."
    prompt = f"""Identify ambiguities and generate clarification questions from this transcript:

TRANSCRIPT:
{text[:3000]}

Respond ONLY with this JSON structure:
{{
  "ambiguities": [
    {{"description": "unclear statement", "severity": "high|medium|low"}},
    ...
  ],
  "clarification_questions": [
    {{"question": "What do you mean by...?"}},
    ...
  ],
  "completeness_score": 75
}}"""
    try:
        raw = _ollama_chat(prompt, system)
        return _parse_json_from_llm(raw)
    except Exception as e:
        logger.warning("Ambiguity detection failed: %s", e)
        return {}


def _extract_architecture(text: str, requirements: dict) -> dict:
    """Use LLM to propose a system architecture based on requirements."""
    system = "You are a software architect. Propose a system architecture based on requirements. Always respond with valid JSON only."
    fr_texts = [r.get("description", r.get("text", str(r))) if isinstance(r, dict) else str(r)
                for r in requirements.get("functional_requirements", [])[:6]]
    prompt = f"""Based on this project description and requirements, propose a system architecture:

PROJECT: {text[:1500]}

FUNCTIONAL REQUIREMENTS:
{chr(10).join(f'- {r}' for r in fr_texts)}

Respond ONLY with this JSON structure:
{{
  "architecture_style": "e.g. SPA + REST API / Microservices / Monolith",
  "system_layers": ["Frontend (React + Tailwind)", "Backend (Spring Boot)", "Database (MongoDB)", "Auth (Keycloak)"],
  "api_endpoints": ["GET /api/projects", "POST /api/tasks", "GET /api/users"],
  "database_schema": ["User", "Project", "Task", "Notification"],
  "technology_stack": {{
    "Frontend": "React 18 + Tailwind CSS",
    "Backend": "Spring Boot 3",
    "Database": "MongoDB",
    "Auth": "JWT / OAuth2"
  }}
}}"""
    try:
        raw = _ollama_chat(prompt, system)
        return _parse_json_from_llm(raw)
    except Exception as e:
        logger.warning("Architecture extraction failed: %s", e)
        return {}


def _try_pipeline_service(text: str) -> dict | None:
    """Try calling the pipeline service if available."""
    if not PIPELINE_API_URL:
        return None
    import requests as req
    try:
        resp = req.post(
            f"{PIPELINE_API_URL}/pipeline/run",
            json={"text": text, "tasks": ["requirements", "summary", "ambiguity_detection", "clarification_questions"]},
            timeout=300,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.debug("Pipeline service unavailable: %s", e)
        return None


def run_pipeline(text: str) -> dict:
    """Run analysis: first try pipeline service, fallback to direct Ollama calls."""
    # Try pipeline service first (if configured and running)
    pipeline_result = _try_pipeline_service(text)
    if pipeline_result:
        outputs = pipeline_result.get("outputs", {})
        def get_analysis(key):
            return outputs.get(key, {}).get("analysis", {})
        req_data = get_analysis("requirements")
        sum_data = get_analysis("summary")
        amb_data = get_analysis("ambiguity_detection")
        cq_data = get_analysis("clarification_questions")
    else:
        # Direct LLM analysis (Groq → Ollama fallback)
        logger.info("Using direct LLM analysis")
        req_data = _extract_requirements(text)
        sum_data = _extract_summary(text)
        amb_analysis = _detect_ambiguities(text)
        amb_data = amb_analysis
        cq_data = {"questions": amb_analysis.get("clarification_questions", [])}
        arch_data = _extract_architecture(text, req_data)

    # Normalize requirements to flat list
    all_reqs = []
    fr_list = req_data.get("functional_requirements", [])
    nfr_list = req_data.get("non_functional_requirements", [])
    for r in fr_list:
        if isinstance(r, dict):
            all_reqs.append({"text": r.get("description", r.get("text", str(r))), "type": "functional", "priority": r.get("priority", "medium")})
        else:
            all_reqs.append({"text": str(r), "type": "functional", "priority": "medium"})
    for r in nfr_list:
        if isinstance(r, dict):
            all_reqs.append({"text": r.get("description", r.get("text", str(r))), "type": "non-functional", "priority": "low"})
        else:
            all_reqs.append({"text": str(r), "type": "non-functional", "priority": "low"})

    return {
        "requirements": all_reqs,
        "functional_requirements": fr_list,
        "non_functional_requirements": nfr_list,
        "summary": sum_data,
        "ambiguities": amb_data.get("ambiguities", []),
        "warnings": amb_data.get("warnings", []),
        "completeness_score": amb_data.get("completeness_score"),
        "clarification_questions": cq_data.get("questions", []),
        "key_insights": [],
        "risk_areas": [],
        "system_architecture": arch_data if not pipeline_result else {},
        "steps_completed": ["requirements", "summary", "ambiguity_detection", "clarification_questions", "system_architecture"],
        "errors": [],
    }


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "elevenlabs": bool(ELEVENLABS_API_KEY),
        "ollama": OLLAMA_BASE_URL,
        "model": QWEN_MODEL,
        "pipeline_url": PIPELINE_API_URL or "disabled",
    })


@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    """
    Receive audio file from browser, transcribe with Groq/ElevenLabs.
    Body: multipart/form-data  { audio: <blob>, language: "en"|"fr"|"ar" }
    """
    if not ELEVENLABS_API_KEY and not GROQ_API_KEY:
        return jsonify({"error": "No transcription API key configured"}), 503

    audio_file = request.files.get("audio")
    language = request.form.get("language", "en")

    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    audio_bytes = audio_file.read()
    logger.info("Received audio: %d bytes, language=%s", len(audio_bytes), language)

    try:
        result = transcribe_audio(audio_bytes, language)
        text = result.get("text", "")
        words = result.get("words", [])

        # Use pre-built segments from Groq if available
        if result.get("segments_groq"):
            return jsonify({"transcript": text, "segments": result["segments_groq"], "language": language})

        # Build segments from ElevenLabs word-level diarization
        segments = []
        current_speaker = None
        current_text = []
        for w in words:
            speaker = w.get("speaker_id", "Speaker 1")
            if speaker != current_speaker:
                if current_speaker is not None:
                    segments.append({"speaker": current_speaker, "text": " ".join(current_text)})
                current_speaker = speaker
                current_text = [w.get("text", "")]
            else:
                current_text.append(w.get("text", ""))
        if current_speaker and current_text:
            segments.append({"speaker": current_speaker, "text": " ".join(current_text)})

        return jsonify({"transcript": text, "segments": segments, "language": language})

    except Exception as e:
        logger.error("Transcription failed: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Run AI pipeline on transcript text.
    Body: { text: string }
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    result = run_pipeline(text)
    return jsonify(result)


def _generate_spec_pdf(pipeline_results: dict) -> Path:
    """Build a Cahier des Charges PDF from pipeline results using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, PageBreak, KeepTogether,
    )

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = REPORTS_DIR / f"project_specification_{ts}.pdf"

    W, H = A4
    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=22 * mm,
    )

    # ── Colours ──────────────────────────────────────────────────────────────
    PRIMARY   = colors.HexColor("#7c3aed")   # violet-700
    LIGHT_BG  = colors.HexColor("#f5f3ff")   # violet-50
    HEADER_BG = colors.HexColor("#4c1d95")   # violet-900
    TEXT      = colors.HexColor("#1e1b4b")
    MID       = colors.HexColor("#6d28d9")
    BORDER    = colors.HexColor("#ddd6fe")
    HIGH_CLR  = colors.HexColor("#dc2626")
    MED_CLR   = colors.HexColor("#d97706")
    LOW_CLR   = colors.HexColor("#16a34a")
    WHITE     = colors.white

    styles = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    title_style   = S("Title",   fontSize=26, textColor=WHITE,  alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
    sub_style     = S("Sub",     fontSize=11, textColor=colors.HexColor("#c4b5fd"), alignment=TA_CENTER, fontName="Helvetica")
    h1_style      = S("H1",      fontSize=14, textColor=PRIMARY, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6)
    h2_style      = S("H2",      fontSize=11, textColor=MID,     fontName="Helvetica-Bold", spaceBefore=8,  spaceAfter=4)
    body_style    = S("Body",    fontSize=9,  textColor=TEXT,    fontName="Helvetica", leading=14, alignment=TA_JUSTIFY)
    bullet_style  = S("Bullet",  fontSize=9,  textColor=TEXT,    fontName="Helvetica", leading=13, leftIndent=10, spaceAfter=2)
    caption_style = S("Caption", fontSize=7,  textColor=colors.HexColor("#7c3aed"), fontName="Helvetica-Oblique", spaceAfter=8)
    tag_style     = S("Tag",     fontSize=8,  textColor=WHITE,   fontName="Helvetica-Bold", alignment=TA_CENTER)

    def section_header(text):
        return [
            HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=4),
            Paragraph(text, h1_style),
        ]

    def priority_color(p):
        p = (p or "").lower()
        if p == "high":   return HIGH_CLR
        if p == "medium": return MED_CLR
        return LOW_CLR

    def text_of(item):
        if isinstance(item, str): return item
        for k in ("description", "text", "question", "insight", "area"):
            if item.get(k): return item[k]
        return str(item)

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    cover_data = [[Paragraph("CAHIER DES CHARGES", title_style)]]
    overview = (pipeline_results.get("summary") or {}).get("overview", "")
    if overview:
        cover_data.append([Paragraph(overview[:200], sub_style)])
    cover_data.append([Paragraph(f"Generated by ScribeAI &nbsp;•&nbsp; {datetime.now().strftime('%B %d, %Y')}", sub_style)])

    cover_table = Table(cover_data, colWidths=[W - 40 * mm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HEADER_BG),
        ("ROUNDEDCORNERS", [6]),
        ("TOPPADDING",    (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 10 * mm))

    # ── Meta table ────────────────────────────────────────────────────────────
    summary = pipeline_results.get("summary") or {}
    fr_list  = pipeline_results.get("functional_requirements") or []
    nfr_list = pipeline_results.get("non_functional_requirements") or []
    score    = pipeline_results.get("completeness_score")
    participants = summary.get("participants") or []

    meta_rows = [
        ["Date",          datetime.now().strftime("%B %d, %Y")],
        ["Version",       "1.0 — Draft"],
        ["Requirements",  f"{len(fr_list)} functional  •  {len(nfr_list)} non-functional"],
    ]
    if score is not None:
        meta_rows.append(["Completeness", f"{score}%"])
    if participants:
        meta_rows.append(["Participants", ", ".join(participants[:6])])

    meta_table = Table(
        [[Paragraph(f"<b>{r[0]}</b>", body_style), Paragraph(r[1], body_style)] for r in meta_rows],
        colWidths=[40 * mm, W - 80 * mm],
    )
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_BG),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    # ── Executive Summary ─────────────────────────────────────────────────────
    story += section_header("1.  Executive Summary")
    if overview:
        story.append(Paragraph(overview, body_style))
    decisions = summary.get("decisions") or []
    if decisions:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Key Decisions</b>", h2_style))
        for d in decisions[:8]:
            story.append(Paragraph(f"• {d}", bullet_style))
    story.append(Spacer(1, 6 * mm))

    # ── Functional Requirements ───────────────────────────────────────────────
    story += section_header("2.  Functional Requirements")
    if fr_list:
        tdata = [[
            Paragraph("<b>#</b>",           tag_style),
            Paragraph("<b>Requirement</b>", tag_style),
            Paragraph("<b>Priority</b>",    tag_style),
        ]]
        for i, r in enumerate(fr_list, 1):
            prio = (r.get("priority", "medium") if isinstance(r, dict) else "medium")
            tdata.append([
                Paragraph(f"FR{i:02d}", body_style),
                Paragraph(text_of(r), body_style),
                Paragraph(prio.upper(), ParagraphStyle("P", fontSize=8, textColor=priority_color(prio), fontName="Helvetica-Bold")),
            ])
        t = Table(tdata, colWidths=[14 * mm, W - 74 * mm, 20 * mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_BG]),
            ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No functional requirements extracted.", body_style))
    story.append(Spacer(1, 6 * mm))

    # ── Non-Functional Requirements ───────────────────────────────────────────
    story += section_header("3.  Non-Functional Requirements")
    if nfr_list:
        for i, r in enumerate(nfr_list, 1):
            story.append(Paragraph(f"NFR{i:02d} — {text_of(r)}", bullet_style))
    else:
        story.append(Paragraph("No non-functional requirements extracted.", body_style))
    story.append(Spacer(1, 6 * mm))

    # ── System Architecture ───────────────────────────────────────────────────
    arch = pipeline_results.get("system_architecture") or {}
    if arch:
        story.append(PageBreak())
        story += section_header("4.  System Architecture")
        if arch.get("architecture_style"):
            story.append(Paragraph(f"<b>Style:</b> {arch['architecture_style']}", body_style))
            story.append(Spacer(1, 4))

        layers = arch.get("system_layers") or []
        if layers:
            story.append(Paragraph("<b>System Layers</b>", h2_style))
            for l in layers:
                story.append(Paragraph(f"• {l}", bullet_style))

        stack = arch.get("technology_stack") or {}
        if stack:
            story.append(Paragraph("<b>Technology Stack</b>", h2_style))
            sdata = [[Paragraph("<b>Layer</b>", tag_style), Paragraph("<b>Technology</b>", tag_style)]]
            for layer, tech in stack.items():
                sdata.append([Paragraph(layer, body_style), Paragraph(tech, body_style)])
            st = Table(sdata, colWidths=[50 * mm, W - 90 * mm])
            st.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0), MID),
                ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ]))
            story.append(st)

        endpoints = arch.get("api_endpoints") or []
        if endpoints:
            story.append(Paragraph("<b>API Endpoints</b>", h2_style))
            for ep in endpoints[:15]:
                story.append(Paragraph(f"<font name='Courier' size='8'>{ep}</font>", bullet_style))

        entities = arch.get("database_schema") or []
        if entities:
            story.append(Paragraph("<b>Database Entities</b>", h2_style))
            story.append(Paragraph("  ".join(entities), body_style))

        story.append(Spacer(1, 6 * mm))

    # ── Ambiguities & Risks ───────────────────────────────────────────────────
    ambiguities = pipeline_results.get("ambiguities") or []
    risks       = pipeline_results.get("risk_areas") or []
    if ambiguities or risks:
        story += section_header("5.  Ambiguities & Risk Areas")
        if ambiguities:
            story.append(Paragraph("<b>Ambiguities detected</b>", h2_style))
            for a in ambiguities[:10]:
                sev = (a.get("severity", "") if isinstance(a, dict) else "")
                story.append(Paragraph(f"⚠ {text_of(a)}" + (f"  [{sev.upper()}]" if sev else ""), bullet_style))
        if risks:
            story.append(Paragraph("<b>Risk Areas</b>", h2_style))
            for r in risks[:8]:
                story.append(Paragraph(f"▲ {text_of(r)}", bullet_style))
        story.append(Spacer(1, 6 * mm))

    # ── Clarification Questions ───────────────────────────────────────────────
    questions = pipeline_results.get("clarification_questions") or []
    if questions:
        story += section_header("6.  Open Questions")
        for i, q in enumerate(questions[:12], 1):
            story.append(Paragraph(f"Q{i}. {text_of(q)}", bullet_style))
        story.append(Spacer(1, 6 * mm))

    # ── Footer callback ───────────────────────────────────────────────────────
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#7c3aed"))
        canvas.drawString(20 * mm, 12 * mm, f"Generated by ScribeAI — {datetime.now().strftime('%B %d, %Y')}")
        canvas.drawRightString(W - 20 * mm, 12 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return out_path


@app.route("/api/generate-specification", methods=["POST"])
def generate_specification():
    """Generate a Cahier des Charges PDF from pipeline analysis results."""
    data = request.get_json() or {}
    pipeline_results = data.get("pipeline_results", data)
    if not pipeline_results:
        return jsonify({"error": "No pipeline_results provided"}), 400
    try:
        pdf_path = _generate_spec_pdf(pipeline_results)
        filename = pdf_path.name
        return jsonify({
            "filename": filename,
            "download_url": f"/api/reports/{filename}",
        })
    except Exception as e:
        logger.exception("PDF generation failed")
        return jsonify({"error": str(e)}), 500


@app.route("/api/reports/<filename>")
def download_report(filename):
    """Serve a generated PDF report."""
    safe = Path(filename).name
    file_path = REPORTS_DIR / safe
    if not file_path.exists():
        return jsonify({"error": "File not found"}), 404
    return send_file(str(file_path), as_attachment=True, download_name=safe, mimetype="application/pdf")


if __name__ == "__main__":
    port = int(os.getenv("STREAMING_PORT", "5001"))
    logger.info("Starting browser API on port %d (Ollama: %s, model: %s)", port, OLLAMA_BASE_URL, QWEN_MODEL)
    app.run(host="0.0.0.0", port=port, debug=False)
