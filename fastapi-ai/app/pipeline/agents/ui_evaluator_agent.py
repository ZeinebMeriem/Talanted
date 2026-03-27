"""UI Evaluator Agent — automatic quality assessment of generated interfaces.

Evaluates generated React/TSX code across five independent dimensions:

  1. Semantic fidelity   — does the code implement what the prompt requested?
  2. Code quality        — structural and stylistic quality of the TSX source
  3. Completeness        — are the UI components mentioned in the prompt present?
  4. Accessibility       — ARIA attributes, alt texts, semantic HTML usage
  5. Visual richness     — charts, icons, multi-page navigation, data density

Each dimension returns a score in [0, 100].
The global score is a weighted average of the five dimensions.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Weighted contribution of each dimension to the global score
_WEIGHTS: dict[str, float] = {
    "semantic_fidelity": 0.35,
    "code_quality":      0.25,
    "completeness":      0.20,
    "accessibility":     0.10,
    "visual_richness":   0.10,
}

# Common stopwords (French + English) excluded from keyword matching
_STOPWORDS: frozenset[str] = frozenset({
    "a", "an", "the", "and", "or", "for", "with", "to", "of", "in", "on",
    "is", "are", "it", "this", "that", "create", "make", "build", "generate",
    "design", "show", "add", "include", "use", "using", "like", "very", "also",
    "have", "has", "can", "will", "should", "would", "please", "me", "my",
    "our", "your", "their", "une", "un", "le", "la", "les", "et", "avec",
    "pour", "dans", "sur", "de", "du", "des", "qui", "que", "est", "sont",
    "ce", "se", "je", "tu", "il", "nous", "vous", "page", "section",
})

# Recharts component names — used to count chart variety
_RECHARTS_COMPONENTS: tuple[str, ...] = (
    "AreaChart", "BarChart", "LineChart", "PieChart",
    "RadarChart", "ComposedChart", "ScatterChart",
)


class UIEvaluatorAgent:
    """Evaluates the quality of a generated React/TSX interface.

    Combines static code analysis (deterministic, no LLM call) with a single
    lightweight LLM-as-judge call for semantic fidelity scoring.
    """

    def __init__(self, provider: Any) -> None:
        self.provider = provider

    # ── Public API ─────────────────────────────────────────────────────────

    def evaluate(
        self,
        prompt: str,
        code: str,
        build_success: bool = True,
    ) -> dict[str, Any]:
        """Evaluate a generated interface and return dimension scores + global score.

        Args:
            prompt:        Original user prompt used to generate the interface.
            code:          Full source content of the generated App.tsx file.
            build_success: Whether the Vite build succeeded for this generation.

        Returns:
            Dictionary with keys:
              - global_score (int 0-100)
              - dimensions   (dict of 5 dimension scores)
              - build_success (bool, passed through)
        """
        scores: dict[str, int] = {
            "code_quality":    self._score_code_quality(code),
            "completeness":    self._score_completeness(prompt, code),
            "accessibility":   self._score_accessibility(code),
            "visual_richness": self._score_visual_richness(code),
        }

        # Semantic fidelity requires an LLM call — skip if build failed (code is broken)
        if build_success and code.strip():
            scores["semantic_fidelity"] = self._score_semantic_fidelity(prompt, code)
        else:
            scores["semantic_fidelity"] = 0

        global_score = round(sum(scores[k] * _WEIGHTS[k] for k in _WEIGHTS))

        logger.info(
            "UIEvaluator: global=%d | fidelity=%d quality=%d "
            "completeness=%d accessibility=%d richness=%d",
            global_score,
            scores["semantic_fidelity"],
            scores["code_quality"],
            scores["completeness"],
            scores["accessibility"],
            scores["visual_richness"],
        )

        return {
            "global_score":  global_score,
            "dimensions":    scores,
            "build_success": build_success,
        }

    # ── Dimension 1 — Semantic fidelity (LLM-as-judge) ────────────────────

    def _score_semantic_fidelity(self, prompt: str, code: str) -> int:
        """Use a lightweight LLM call to assess whether the code matches the prompt.

        The LLM receives a truncated version of both the prompt and the generated
        code, and returns a score in [0, 100] with a brief justification.
        """
        code_preview   = code[:3000]   if len(code)   > 3000 else code
        prompt_preview = prompt[:400]  if len(prompt) > 400  else prompt

        system = (
            "You are a UI quality evaluator. Assess whether the generated React "
            "component faithfully implements the user's prompt. "
            "Reply with ONLY a valid JSON object: "
            '{\"score\": <integer 0-100>, \"reason\": \"<one sentence>\"}'
        )
        user = (
            f"USER PROMPT:\n{prompt_preview}\n\n"
            f"GENERATED CODE (first 3000 chars):\n{code_preview}\n\n"
            "Score criteria:\n"
            "90-100 — All requested elements are present and correctly implemented\n"
            "70-89  — Most elements present, minor missing details\n"
            "50-69  — Some elements match but significant gaps exist\n"
            "30-49  — Few elements correspond to the prompt\n"
            "0-29   — Code is generic and barely relates to the prompt"
        )
        try:
            result = self.provider.chat_json(system, user, max_tokens=120, temperature=0)
            score  = int(result.get("score", 50))
            reason = result.get("reason", "")
            logger.debug("UIEvaluator fidelity: score=%d reason=%s", score, reason)
            return max(0, min(100, score))
        except Exception as exc:
            logger.warning("UIEvaluator: semantic fidelity LLM call failed (%s) — using neutral score", exc)
            return 50

    # ── Dimension 2 — Code quality (static analysis) ───────────────────────

    def _score_code_quality(self, code: str) -> int:
        """Assess TSX code quality using deterministic heuristics.

        No LLM call required. Checks for proper imports, Tailwind usage,
        component decomposition, and absence of bad patterns.
        """
        if not code.strip():
            return 0

        score = 0

        # File size — very short code is almost certainly incomplete
        if len(code) > 500:
            score += 15
        if len(code) > 2000:
            score += 10

        # Tailwind className dominates over inline styles
        class_name_count = len(re.findall(r"className=", code))
        inline_style_count = len(re.findall(r"style=\{", code))
        if class_name_count > 0 and (
            inline_style_count == 0 or class_name_count > inline_style_count * 2
        ):
            score += 15

        # Multiple function components — good decomposition
        component_count = len(re.findall(r"function\s+[A-Z][a-zA-Z]+\s*\(", code))
        if component_count >= 2:
            score += 10
        if component_count >= 4:
            score += 10

        # Required imports present
        if "import React" in code or "from 'react'" in code:
            score += 10
        if "lucide-react" in code:
            score += 5
        if "recharts" in code:
            score += 5

        # Proper module export
        if "export default" in code:
            score += 5

        # Real data — no Lorem Ipsum
        if "lorem ipsum" not in code.lower():
            score += 5

        # Uses React state — interactive interface
        if "useState" in code:
            score += 5

        # No dangerous patterns
        if "dangerouslySetInnerHTML" not in code and "eval(" not in code:
            score += 5

        return min(100, score)

    # ── Dimension 3 — Completeness (keyword extraction + matching) ─────────

    def _score_completeness(self, prompt: str, code: str) -> int:
        """Check whether UI elements mentioned in the prompt appear in the code.

        Extracts meaningful keywords from the prompt (excluding stopwords),
        then counts how many are found anywhere in the generated code.
        """
        if not prompt.strip() or not code.strip():
            return 0

        # Extract words of 4+ characters that are not stopwords
        raw_words = re.findall(r"\b[a-zA-Z\u00C0-\u024F]{4,}\b", prompt.lower())
        seen: set[str] = set()
        keywords: list[str] = []
        for word in raw_words:
            if word not in _STOPWORDS and word not in seen:
                seen.add(word)
                keywords.append(word)
            if len(keywords) == 20:
                break

        if not keywords:
            return 50  # Cannot evaluate without keywords

        code_lower = code.lower()
        found = sum(1 for kw in keywords if kw in code_lower)
        ratio = found / len(keywords)

        if ratio >= 0.80:
            return 95
        elif ratio >= 0.60:
            return 80
        elif ratio >= 0.40:
            return 65
        elif ratio >= 0.20:
            return 45
        else:
            return 20

    # ── Dimension 4 — Accessibility (static JSX attribute analysis) ────────

    def _score_accessibility(self, code: str) -> int:
        """Check for accessibility best practices in the generated JSX.

        Evaluates: alt texts on images, labels on inputs, ARIA attributes,
        semantic HTML usage, and absence of inline event handlers.
        """
        if not code.strip():
            return 0

        score = 30  # Base — generated UIs tend to have some basic structure

        # Images have alt attributes
        img_count = len(re.findall(r"<img\b", code))
        img_with_alt = len(re.findall(r"<img\b[^>]*\balt=", code))
        if img_count == 0 or img_with_alt >= img_count * 0.8:
            score += 15

        # Inputs are accompanied by labels
        input_count = len(re.findall(r"<input\b", code))
        label_count = len(re.findall(r"<label\b", code))
        if input_count == 0 or label_count >= input_count * 0.5:
            score += 15

        # Semantic HTML landmark elements
        semantic_tags = ("<nav", "<header", "<main", "<section", "<article", "<footer")
        semantic_found = sum(1 for t in semantic_tags if t in code)
        if semantic_found >= 3:
            score += 20
        elif semantic_found >= 1:
            score += 10

        # ARIA attributes present
        if "aria-label" in code or "aria-hidden" in code or 'role="' in code:
            score += 10

        # No raw HTML event attributes (onclick= instead of React's onClick=)
        if "onclick=" not in code.lower() and "onchange=" not in code.lower():
            score += 10

        return min(100, score)

    # ── Dimension 5 — Visual richness (component inventory) ───────────────

    def _score_visual_richness(self, code: str) -> int:
        """Measure visual complexity and information density of the interface.

        Counts charts, icons, pages, data tables, color variety, and KPI cards.
        """
        if not code.strip():
            return 0

        score = 0

        # Recharts — number of distinct chart types
        chart_count = sum(1 for c in _RECHARTS_COMPONENTS if c in code)
        if chart_count >= 3:
            score += 25
        elif chart_count >= 2:
            score += 18
        elif chart_count >= 1:
            score += 10

        # Lucide-react icons — variety of icons used
        icon_usages = len(re.findall(r"<[A-Z][a-zA-Z]+(Icon)?\s", code))
        if icon_usages >= 8:
            score += 20
        elif icon_usages >= 4:
            score += 13
        elif icon_usages >= 1:
            score += 6

        # Multi-page navigation via useState
        nav_references = len(re.findall(r"setActivePage|activePage", code))
        if nav_references >= 4:
            score += 20
        elif nav_references >= 2:
            score += 12

        # Data tables
        if "<table" in code or "<tr>" in code:
            score += 10

        # Lists with multiple items
        if len(re.findall(r"<li\b", code)) >= 3:
            score += 5

        # Tailwind color variety
        color_classes = set(
            re.findall(
                r"(?:bg|text|border)-(?:slate|gray|red|orange|amber|yellow|green|"
                r"teal|blue|indigo|purple|pink|rose)-\d{3}",
                code,
            )
        )
        if len(color_classes) >= 8:
            score += 15
        elif len(color_classes) >= 4:
            score += 8

        # KPI cards pattern (currency values + charts together)
        has_currency = bool(re.search(r"\$[\d,]+", code))
        has_percentage = bool(re.search(r"\d+\.?\d*\s*%", code))
        if has_currency and chart_count >= 1:
            score += 5
        if has_percentage:
            score += 5 if score < 95 else 0

        return min(100, score)
