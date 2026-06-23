"""EntityExtractorAgent — universal context extraction from any prompt or document.

Replaces domain_prompts.py hardcoded domain rules with a LLM-driven extraction
that works for ANY domain without predefined categories.

Instead of: "immobilier" → hardcoded navy/gold rules
We do:      prompt → LLM extracts entities, features, style hints → inject as context
"""
from __future__ import annotations

import json
import logging
from typing import Any

from ..llm_provider import LlmProvider

logger = logging.getLogger(__name__)


_SYSTEM_PROMPT = """\
You are an expert UI analyst. Analyze the user's project description and extract structured information.
Return ONLY a valid JSON object with NO markdown fences, NO comments, NO prose.

Extract:
1. app_name: the application name (infer if not explicit)
2. entities: main data objects (e.g. Property, Patient, Order, Employee...)
3. features: key features/pages the app needs
4. style_hint: inferred visual style from context (e.g. "luxury real estate", "clinical medical", "playful e-learning")
5. color_hint: inferred color direction (e.g. "warm amber gold", "professional navy blue", "energetic orange red")
6. data_fields: specific fields/attributes mentioned (e.g. "price, surface, rooms" for real estate)
7. layout_type: "dashboard" | "catalog" | "landing" | "portfolio" | "app" | "ecommerce"
8. key_actions: main user actions (e.g. "book appointment", "add to cart", "generate report")

JSON schema:
{
  "app_name": string,
  "entities": [string],
  "features": [string],
  "style_hint": string,
  "color_hint": string,
  "data_fields": [string],
  "layout_type": string,
  "key_actions": [string]
}
"""


class EntityExtractorAgent:
    """Extracts structured context from ANY user prompt.

    Works for any domain without predefined categories.
    The LLM infers everything from the prompt itself.
    """

    def __init__(self, provider: LlmProvider) -> None:
        self.provider = provider

    def extract(self, prompt: str, document_text: str = "") -> dict[str, Any]:
        """Extract entities and context from user prompt + optional document text.

        Returns a structured dict used to enrich downstream agent prompts.
        """
        if not prompt and not document_text:
            return {}

        combined = prompt.strip()
        if document_text:
            # Inject document excerpt (first 2000 chars) as additional context
            doc_excerpt = document_text[:2000].strip()
            combined = (
                f"User prompt: {prompt}\n\n"
                f"Additional document context:\n{doc_excerpt}"
            )

        try:
            result = self.provider.chat_json(_SYSTEM_PROMPT, combined)
            logger.info(
                "EntityExtractor: app='%s', layout='%s', entities=%s",
                result.get("app_name", "?"),
                result.get("layout_type", "?"),
                result.get("entities", [])[:4],
            )
            return result
        except Exception:
            logger.exception("EntityExtractor: extraction failed, returning empty context")
            return {}

    @staticmethod
    def build_context_block(extracted: dict[str, Any]) -> str:
        """Convert extracted entities into a prompt context block for downstream agents.

        This replaces get_domain_prompt_addition() from domain_prompts.py.
        Works for ANY domain — no hardcoded rules.
        """
        if not extracted:
            return ""

        app_name    = extracted.get("app_name", "")
        entities    = extracted.get("entities", [])
        features    = extracted.get("features", [])
        style_hint  = extracted.get("style_hint", "")
        color_hint  = extracted.get("color_hint", "")
        data_fields = extracted.get("data_fields", [])
        key_actions = extracted.get("key_actions", [])

        lines = [
            "═══════════════════════════════════════════════════════",
            "PROJECT CONTEXT — extracted from user requirements",
            "═══════════════════════════════════════════════════════",
        ]

        if app_name:
            lines.append(f"App name      : {app_name}")
        if entities:
            lines.append(f"Core entities : {', '.join(entities)}")
        if data_fields:
            lines.append(f"Data fields   : {', '.join(data_fields)}")
        if features:
            lines.append(f"Key features  : {', '.join(features)}")
        if key_actions:
            lines.append(f"User actions  : {', '.join(key_actions)}")
        if style_hint:
            lines.append(f"Visual style  : {style_hint}")
        if color_hint:
            lines.append(f"Color hint    : {color_hint}")

        lines += [
            "═══════════════════════════════════════════════════════",
            "Use these entities and style hints to generate a domain-appropriate UI.",
            "The LLM decides all UI patterns — no hardcoded domain rules.",
        ]

        return "\n".join(lines)
