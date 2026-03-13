"""LLM provider abstraction — swap between cloud APIs and local Ollama.

Priority chain (auto-detected from env vars):
  1. GEMINI_API_KEY  → Google Gemini (free tier: 15 RPM, 1M tokens/day)
  2. OPENAI_API_KEY  → OpenAI / Groq / Together / any OpenAI-compatible API
  3. (no key)        → Local Ollama fallback
"""
from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class LlmProvider(ABC):
    """Common interface for an LLM backend (planner or coder role)."""

    @abstractmethod
    def chat(self, system: str, user: str, **opts: Any) -> str:
        """Return raw text completion."""

    def chat_json(self, system: str, user: str, schema: dict | None = None, **opts: Any) -> dict:
        """Return a parsed JSON dict. Default impl: call chat() then parse."""
        raw = self.chat(system, user, **opts)
        return _extract_json(raw)


# ── Google Gemini provider ──────────────────────────────────────────────


class GeminiProvider(LlmProvider):
    """Google Gemini REST API with streaming.

    Free tier: 15 RPM, 1 500 RPD, 1 000 000 tokens/day on gemini-2.0-flash.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.1,
        timeout_s: float = 120,
    ) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout_s = timeout_s

    def chat(self, system: str, user: str, **opts: Any) -> str:
        temperature = opts.get("temperature", self.temperature)
        max_tokens = opts.get("max_tokens", self.max_tokens)
        model = opts.get("model", self.model)

        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "systemInstruction": {"parts": [{"text": system}]},
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        if opts.get("json_mode"):
            payload["generationConfig"]["responseMimeType"] = "application/json"

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
            f":streamGenerateContent?alt=sse&key={self.api_key}"
        )
        timeout = httpx.Timeout(timeout=self.timeout_s, connect=10.0, read=120.0, write=30.0, pool=30.0)

        collected: list[str] = []
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        candidates = chunk.get("candidates") or []
                        if candidates:
                            parts = (candidates[0].get("content") or {}).get("parts") or []
                            for part in parts:
                                text = part.get("text") or ""
                                if text:
                                    collected.append(text)
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue

        return "".join(collected)

    def chat_json(self, system: str, user: str, schema: dict | None = None, **opts: Any) -> dict:
        opts["json_mode"] = True
        raw = self.chat(system, user, **opts)
        return _extract_json(raw)


# ── OpenAI-compatible provider ──────────────────────────────────────────


class OpenAiProvider(LlmProvider):
    """Works with OpenAI, Groq, Together, OpenRouter, any OpenAI-compat API."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
        timeout_s: float = 120,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = (base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout_s = timeout_s

    def chat(self, system: str, user: str, **opts: Any) -> str:
        temperature = opts.get("temperature", self.temperature)
        max_tokens = opts.get("max_tokens", self.max_tokens)
        model = opts.get("model", self.model)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        if opts.get("json_mode"):
            payload["response_format"] = {"type": "json_object"}

        url = f"{self.base_url}/chat/completions"
        timeout = httpx.Timeout(timeout=self.timeout_s, connect=10.0, read=120.0, write=30.0, pool=30.0)

        collected: list[str] = []
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, json=payload, headers=headers) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = (chunk.get("choices") or [{}])[0].get("delta") or {}
                        token = delta.get("content") or ""
                        if token:
                            collected.append(token)
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue

        return "".join(collected)

    def chat_json(self, system: str, user: str, schema: dict | None = None, **opts: Any) -> dict:
        opts["json_mode"] = True
        raw = self.chat(system, user, **opts)
        return _extract_json(raw)


# ── Anthropic Claude provider ───────────────────────────────────────────


class AnthropicProvider(LlmProvider):
    """Native Anthropic Claude API (claude-sonnet-4-6, claude-haiku-4-5, etc.).

    Pricing (as of 2025):
      claude-sonnet-4-6:        $3 / $15  per MTok  (Lovable's model)
      claude-haiku-4-5-20251001: $0.80 / $4 per MTok  (cheapest Claude)
    Free trial: ~$5 credits on new accounts.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int = 8192,
        temperature: float = 0.1,
        timeout_s: float = 120,
    ) -> None:
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.model = model or os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout_s = timeout_s

    def chat(self, system: str, user: str, **opts: Any) -> str:
        temperature = opts.get("temperature", self.temperature)
        max_tokens = opts.get("max_tokens", self.max_tokens)
        model = opts.get("model", self.model)

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "stream": True,
        }

        url = "https://api.anthropic.com/v1/messages"
        timeout = httpx.Timeout(timeout=self.timeout_s, connect=10.0, read=120.0, write=30.0, pool=30.0)

        collected: list[str] = []
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, json=payload, headers=headers) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str in ("[DONE]", ""):
                        continue
                    try:
                        chunk = json.loads(data_str)
                        if chunk.get("type") == "content_block_delta":
                            text = (chunk.get("delta") or {}).get("text") or ""
                            if text:
                                collected.append(text)
                    except (json.JSONDecodeError, KeyError):
                        continue

        return "".join(collected)


# ── Ollama provider ─────────────────────────────────────────────────────


class OllamaProvider(LlmProvider):
    """Local Ollama with streaming to avoid read timeouts on slow CPU inference."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        num_predict: int = 1500,
        temperature: float = 0.1,
        timeout_s: float = 600,
        connect_timeout_s: float = 5,
    ) -> None:
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")).rstrip("/")
        self.model = model or "qwen2.5:3b"
        self.num_predict = num_predict
        self.temperature = temperature
        self.timeout_s = timeout_s
        self.connect_timeout_s = connect_timeout_s

    def chat(self, system: str, user: str, **opts: Any) -> str:
        temperature = opts.get("temperature", self.temperature)
        num_predict = opts.get("num_predict", self.num_predict)
        model = opts.get("model", self.model)

        options: dict[str, Any] = {"temperature": temperature}
        if num_predict > 0:
            options["num_predict"] = num_predict

        payload: dict[str, Any] = {
            "model": model,
            "stream": True,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "options": options,
        }

        # If caller wants JSON enforcement (Ollama format param)
        if opts.get("json_schema"):
            payload["format"] = opts["json_schema"]
        elif opts.get("json_mode"):
            payload["format"] = "json"

        url = f"{self.base_url}/api/chat"
        timeout = httpx.Timeout(
            timeout=self.timeout_s,
            connect=self.connect_timeout_s,
            read=120.0,
            write=self.timeout_s,
            pool=self.timeout_s,
        )

        collected: list[str] = []
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    token = ((chunk.get("message") or {}).get("content")) or ""
                    if token:
                        collected.append(token)
                    if chunk.get("done"):
                        break

        return "".join(collected)

    def chat_json(self, system: str, user: str, schema: dict | None = None, **opts: Any) -> dict:
        if schema:
            opts["json_schema"] = schema
        else:
            opts["json_mode"] = True
        raw = self.chat(system, user, **opts)
        return _extract_json(raw)


# ── Factory — explicit per-role provider selection ──────────────────────
#
# New env vars (optional, override the auto-detection):
#   PLANNER_PROVIDER=groq|gemini|openai|ollama
#   CODER_PROVIDER=groq|gemini|openai|ollama
#
# Each provider still reads its own credentials from the existing env vars.
# If PLANNER_PROVIDER / CODER_PROVIDER is not set we fall back to the old
# priority chain: GEMINI → OPENAI → Ollama.


def _build_groq_provider(*, role: str, max_tokens: int, temperature: float) -> OpenAiProvider:
    """Build Groq-specific OpenAI-compatible provider."""
    api_key = os.getenv("GROQ_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(f"GROQ_API_KEY (or OPENAI_API_KEY) required for {role} provider=groq")
    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    if role == "planner":
        model = os.getenv("GROQ_PLANNER_MODEL") or os.getenv("GROQ_MODEL") or os.getenv("OPENAI_PLANNER_MODEL") or "llama-3.1-8b-instant"
    else:
        model = os.getenv("GROQ_CODER_MODEL") or os.getenv("GROQ_MODEL") or os.getenv("OPENAI_CODER_MODEL") or "llama-3.1-8b-instant"
    logger.info("%s provider: Groq (%s @ %s)", role.capitalize(), model, base_url)
    return OpenAiProvider(api_key=api_key, base_url=base_url, model=model, max_tokens=max_tokens, temperature=temperature)


def _build_gemini_provider(*, role: str, max_tokens: int, temperature: float) -> GeminiProvider:
    """Build Gemini provider."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(f"GEMINI_API_KEY required for {role} provider=gemini")
    if role == "planner":
        model = os.getenv("GEMINI_PLANNER_MODEL") or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    else:
        model = os.getenv("GEMINI_CODER_MODEL") or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    logger.info("%s provider: Gemini (%s)", role.capitalize(), model)
    return GeminiProvider(model=model, max_tokens=max_tokens, temperature=temperature)


def _build_openai_provider(*, role: str, max_tokens: int, temperature: float) -> OpenAiProvider:
    """Build generic OpenAI-compatible provider."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(f"OPENAI_API_KEY required for {role} provider=openai")
    if role == "planner":
        model = os.getenv("OPENAI_PLANNER_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    else:
        model = os.getenv("OPENAI_CODER_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    logger.info("%s provider: OpenAI-compatible (%s @ %s)", role.capitalize(), model, base_url)
    return OpenAiProvider(model=model, max_tokens=max_tokens, temperature=temperature)


def _build_ollama_provider(*, role: str, max_tokens: int, temperature: float) -> OllamaProvider:
    """Build Ollama provider."""
    if role == "planner":
        model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    else:
        model = os.getenv("OLLAMA_CODER_MODEL", "qwen2.5-coder:latest")
    logger.info("%s provider: Ollama (%s)", role.capitalize(), model)
    return OllamaProvider(
        model=model,
        num_predict=max_tokens,
        temperature=temperature,
        timeout_s=float(os.getenv("OLLAMA_TIMEOUT_S", "600")),
        connect_timeout_s=float(os.getenv("OLLAMA_CONNECT_TIMEOUT_S", "5")),
    )


def _build_anthropic_provider(*, role: str, max_tokens: int, temperature: float) -> AnthropicProvider:
    """Build Anthropic Claude provider."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError(f"ANTHROPIC_API_KEY required for {role} provider=anthropic")
    if role == "planner":
        model = os.getenv("ANTHROPIC_PLANNER_MODEL") or os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    else:
        model = os.getenv("ANTHROPIC_CODER_MODEL") or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    logger.info("%s provider: Anthropic (%s)", role.capitalize(), model)
    return AnthropicProvider(api_key=api_key, model=model, max_tokens=max_tokens, temperature=temperature)


def _build_openrouter_provider(*, role: str, max_tokens: int, temperature: float) -> OpenAiProvider:
    """Build OpenRouter provider — OpenAI-compatible, many free models available."""
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError(f"OPENROUTER_API_KEY required for {role} provider=openrouter")
    if role == "planner":
        model = os.getenv("OPENROUTER_PLANNER_MODEL") or os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    else:
        model = os.getenv("OPENROUTER_CODER_MODEL") or os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-pro-exp:free")
    logger.info("%s provider: OpenRouter (%s)", role.capitalize(), model)
    return OpenAiProvider(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )


_PROVIDER_BUILDERS = {
    "groq": _build_groq_provider,
    "gemini": _build_gemini_provider,
    "openai": _build_openai_provider,
    "ollama": _build_ollama_provider,
    "anthropic": _build_anthropic_provider,
    "openrouter": _build_openrouter_provider,
}


def _auto_detect_provider(*, role: str, max_tokens: int, temperature: float) -> LlmProvider:
    """Legacy auto-detection: GEMINI → OPENAI → Ollama."""
    if os.getenv("GEMINI_API_KEY", "").strip():
        return _build_gemini_provider(role=role, max_tokens=max_tokens, temperature=temperature)
    if os.getenv("OPENAI_API_KEY", "").strip():
        # Check if it looks like a Groq key
        base = os.getenv("OPENAI_BASE_URL", "")
        if "groq.com" in base:
            return _build_groq_provider(role=role, max_tokens=max_tokens, temperature=temperature)
        return _build_openai_provider(role=role, max_tokens=max_tokens, temperature=temperature)
    return _build_ollama_provider(role=role, max_tokens=max_tokens, temperature=temperature)


def create_planner_provider() -> LlmProvider:
    """Create the provider for the planner (plan JSON generation)."""
    explicit = os.getenv("PLANNER_PROVIDER", "").strip().lower()
    max_tokens = int(os.getenv("PLANNER_MAX_TOKENS", "1200"))
    if explicit and explicit in _PROVIDER_BUILDERS:
        return _PROVIDER_BUILDERS[explicit](role="planner", max_tokens=max_tokens, temperature=0)
    return _auto_detect_provider(role="planner", max_tokens=max_tokens, temperature=0)


def create_coder_provider() -> LlmProvider:
    """Create the provider for the coder (per-file code generation)."""
    explicit = os.getenv("CODER_PROVIDER", "").strip().lower()
    max_tokens = int(os.getenv("CODER_MAX_TOKENS", "8192"))
    if explicit and explicit in _PROVIDER_BUILDERS:
        return _PROVIDER_BUILDERS[explicit](role="coder", max_tokens=max_tokens, temperature=0.1)
    return _auto_detect_provider(role="coder", max_tokens=max_tokens, temperature=0.1)


# ── Helpers ─────────────────────────────────────────────────────────────


def _extract_json(text: str) -> dict[str, Any]:
    """Parse JSON from raw LLM text — handles markdown fences and extra text."""
    s = (text or "").strip()
    if not s:
        raise ValueError("Empty response")
    # Try direct parse first
    try:
        parsed = json.loads(s)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Balanced-brace extraction
    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")

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
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        raise ValueError("Unterminated JSON object")
    return json.loads(s[start : end + 1])
