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

from flask import Flask, request, jsonify
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


if __name__ == "__main__":
    port = int(os.getenv("STREAMING_PORT", "5001"))
    logger.info("Starting browser API on port %d (Ollama: %s, model: %s)", port, OLLAMA_BASE_URL, QWEN_MODEL)
    app.run(host="0.0.0.0", port=port, debug=False)
