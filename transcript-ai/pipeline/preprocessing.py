"""Text preprocessing — chunking, cleaning, speaker-segment extraction."""
from __future__ import annotations

import re
import os
import glob
from typing import List, Dict, Optional

from pipeline.pipeline_config import PipelineConfig


# ── Cleaning ──────────────────────────────────────────────────────────────────

_HALLUCINATION_RE = re.compile(
    r"^\s*("
    r"Thank you\.?|Thanks for watching\.?|Please subscribe\.?|"
    r"Bye\.?|you|\.{2,}|,+|Sous-titres|Subtitles|MBC|Amara\.org"
    r")\s*$",
    re.IGNORECASE,
)


def clean_text(text: str) -> str:
    """Remove hallucination artefacts and normalise whitespace."""
    if not text:
        return ""
    if _HALLUCINATION_RE.match(text):
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ── Chunking ──────────────────────────────────────────────────────────────────


def chunk_text(
    text: str,
    chunk_size: int = PipelineConfig.CHUNK_SIZE,
    overlap: int = PipelineConfig.CHUNK_OVERLAP,
) -> List[str]:
    """Split *text* into overlapping word-level chunks.

    Returns a list of chunks — each up to *chunk_size* characters,
    with *overlap* characters shared between consecutive chunks.
    Splits on sentence boundaries when possible for better semantic coherence.
    """
    if not text:
        return []

    # Try sentence-level splitting first
    sentences = re.split(r'(?<=[.!?。؟])\s+', text)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(current) + len(sentence) + 1 <= chunk_size:
            current = f"{current} {sentence}".strip() if current else sentence
        else:
            if current:
                chunks.append(current)
            # If single sentence > chunk_size, force-split by words
            if len(sentence) > chunk_size:
                words = sentence.split()
                buf = ""
                for w in words:
                    if len(buf) + len(w) + 1 > chunk_size:
                        if buf:
                            chunks.append(buf)
                        buf = w
                    else:
                        buf = f"{buf} {w}".strip() if buf else w
                current = buf
            else:
                current = sentence

    if current:
        chunks.append(current)

    # Add overlap between chunks for context continuity
    if overlap > 0 and len(chunks) > 1:
        overlapped: List[str] = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:]
            overlapped.append(f"{prev_tail} {chunks[i]}".strip())
        return overlapped

    return chunks


# ── Metadata helpers ──────────────────────────────────────────────────────────


def detect_languages(text: str) -> List[str]:
    """Quick heuristic language detection from character ranges."""
    langs: List[str] = []
    if re.search(r"[a-zA-Z]{2,}", text):
        langs.append("en")
    if re.search(r"[\u0600-\u06FF]{2,}", text):
        langs.append("ar")
    if re.search(r"[àâäéèêëïîôùûüÿçœæ]", text, re.IGNORECASE):
        langs.append("fr")
    return langs or ["unknown"]


def extract_speaker_segments(text: str) -> List[Dict[str, str]]:
    """Parse ``[Speaker N]: text`` formatted transcriptions."""
    pattern = re.compile(r"\[Speaker\s*(\d+)\]\s*:\s*(.+?)(?=\[Speaker|\Z)", re.DOTALL)
    matches = pattern.findall(text)
    if matches:
        return [{"speaker": f"speaker_{m[0]}", "text": m[1].strip()} for m in matches]
    return [{"speaker": "speaker_0", "text": text.strip()}]


# ── Transcript loaders ────────────────────────────────────────────────────────


def load_transcript(path: str) -> Dict:
    """Load a single transcript file and return metadata dict."""
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Strip BOM if present
    if raw.startswith("\ufeff"):
        raw = raw[1:]

    # Try to separate header from body
    parts = raw.split("=" * 70)
    body = parts[-1].strip() if len(parts) > 1 else raw.strip()

    # Attempt to pull body after "TRANSCRIPTION" label
    tx_match = re.search(r"TRANSCRIPTION.*?-{10,}\s*(.+)", body, re.DOTALL)
    if tx_match:
        body = tx_match.group(1).strip()

    body = clean_text(body)
    langs = detect_languages(body)

    return {
        "source": os.path.basename(path),
        "path": path,
        "text": body,
        "languages": langs,
        "char_count": len(body),
        "word_count": len(body.split()),
    }


def load_all_transcripts(directory: Optional[str] = None) -> List[Dict]:
    """Load every transcript from the outputs directory."""
    directory = directory or PipelineConfig.TRANSCRIPTS_DIR
    files = sorted(glob.glob(os.path.join(directory, "transcription*.txt")))
    transcripts: List[Dict] = []
    for f in files:
        try:
            t = load_transcript(f)
            if t["text"]:
                transcripts.append(t)
        except Exception as e:
            print(f"⚠️  Skipped {f}: {e}")
    return transcripts
