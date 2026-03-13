from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Literal

logger = logging.getLogger(__name__)


def _extract_json_object(text: str) -> dict[str, Any]:
    """Robust JSON extraction: parse as-is or fall back to balanced-brace extraction."""
    s = (text or "").strip()
    if not s:
        raise ValueError("Empty response")
    try:
        parsed = json.loads(s)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found")

    depth = 0
    in_str = False
    escaped = False
    end = -1
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            continue
        if ch == "{":
            depth += 1
            continue
        if ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        raise ValueError("Unterminated JSON object")
    candidate = s[start : end + 1]
    parsed = json.loads(candidate)
    if not isinstance(parsed, dict):
        raise ValueError("Parsed value is not a JSON object")
    return parsed


@dataclass(frozen=True)
class SourceItem:
    kind: Literal["prompt", "file_ref", "file_text", "context"]
    content: str
    meta: dict[str, Any]


@dataclass(frozen=True)
class SourcePack:
    items: list[SourceItem]
