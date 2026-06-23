"""UI Evaluator Agent — LLM-as-judge quality assessment of generated interfaces.

All five dimensions are evaluated in a single LLM call for accuracy and consistency.
Static heuristics are kept as a fallback if the LLM call fails.

Dimensions (weighted average → global score):
  1. Semantic fidelity  35% — does the UI match what the prompt requested?
  2. Code quality       25% — React/TS structure, hooks, patterns, no bad practices
  3. Completeness       20% — are all features/sections from the prompt actually built?
  4. Accessibility      10% — ARIA, semantic HTML, labels, alt texts, contrast awareness
  5. Visual richness    10% — layout complexity, components, color variety, data density
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_WEIGHTS: dict[str, float] = {
    "semantic_fidelity": 0.35,
    "code_quality":      0.25,
    "completeness":      0.20,
    "accessibility":     0.10,
    "visual_richness":   0.10,
}

_DIMENSIONS = list(_WEIGHTS.keys())

_SYSTEM_PROMPT = """\
You are an expert React/TypeScript UI code reviewer acting as an impartial judge.
Given a user prompt and generated React/TSX source code, score the UI on exactly
five dimensions. Be strict and realistic — a score of 90+ means the work is \
genuinely excellent in that dimension.

SCORING GUIDE (apply to every dimension):
  90-100  Excellent — meets or exceeds professional standards
  75-89   Good      — solid work with minor gaps
  60-74   Acceptable — functional but notable deficiencies
  40-59   Weak      — significant gaps or poor practices
  0-39    Poor      — fundamental problems or almost no coverage

Return ONLY a valid JSON object with this exact structure (no markdown, no extra keys):
{
  "semantic_fidelity": <integer 0-100>,
  "code_quality":      <integer 0-100>,
  "completeness":      <integer 0-100>,
  "accessibility":     <integer 0-100>,
  "visual_richness":   <integer 0-100>,
  "reasoning": {
    "semantic_fidelity": "<one sentence explaining the score>",
    "code_quality":      "<one sentence explaining the score>",
    "completeness":      "<one sentence explaining the score>",
    "accessibility":     "<one sentence explaining the score>",
    "visual_richness":   "<one sentence explaining the score>"
  }
}

DIMENSION CRITERIA:

semantic_fidelity
  Measures whether the generated UI faithfully implements the user's intent.
  Check: are the requested domain, features, and data shown? Does the UI "feel"
  like what was asked for? Penalise generic templates that ignore the prompt.

code_quality
  Measures React/TypeScript code craftsmanship.
  Reward: proper component decomposition, hooks used correctly (useState/useEffect),
  TypeScript types where expected, Tailwind over inline styles, named exports,
  no console.log or TODO comments in production code, no dangerouslySetInnerHTML.
  Penalise: a single 500-line component, inline styles everywhere, missing imports.

completeness
  Measures whether every feature or section explicitly mentioned in the prompt is
  implemented. Read the prompt carefully — if the user asked for "login page,
  dashboard, and settings" check all three exist. Partial implementation of a
  feature counts as partial credit. Do NOT reward features the user did NOT ask for.

accessibility
  Measures WCAG compliance and inclusive design.
  Check: <img> tags have alt, <input> has <label> or aria-label, interactive
  elements are keyboard-reachable (button/a not div+onClick), semantic landmarks
  (<nav> <header> <main> <footer>), ARIA roles where appropriate.

visual_richness
  Measures aesthetic and informational density.
  Check: variety of UI components (cards, tables, charts, forms, modals),
  multiple sections, icon usage, consistent color palette, visual hierarchy.
  A single centred form scores low; a multi-section dashboard with charts scores high.
"""


def _build_user_message(prompt: str, code: str) -> str:
    # Truncate generously — send up to 6000 chars of code so the judge sees
    # enough structure without hitting token limits.
    code_sample = code[:6000] + ("\n\n[... truncated ...]" if len(code) > 6000 else "")
    prompt_sample = prompt[:600] + ("[... truncated]" if len(prompt) > 600 else "")
    return (
        f"USER PROMPT:\n{prompt_sample}\n\n"
        f"GENERATED CODE ({len(code)} chars total, showing first 6000):\n"
        f"```tsx\n{code_sample}\n```\n\n"
        "Evaluate and return the JSON scores as instructed."
    )


# ── Stopwords for the static completeness fallback ────────────────────────────
_STOPWORDS: frozenset[str] = frozenset({
    "a", "an", "the", "and", "or", "for", "with", "to", "of", "in", "on",
    "is", "are", "it", "this", "that", "create", "make", "build", "generate",
    "design", "show", "add", "include", "use", "using", "like", "very", "also",
    "have", "has", "can", "will", "should", "would", "please", "me", "my",
    "our", "your", "their", "une", "un", "le", "la", "les", "et", "avec",
    "pour", "dans", "sur", "de", "du", "des", "qui", "que", "est", "sont",
    "ce", "se", "je", "tu", "il", "nous", "vous", "page", "section",
})
_RECHARTS: tuple[str, ...] = (
    "AreaChart", "BarChart", "LineChart", "PieChart",
    "RadarChart", "ComposedChart", "ScatterChart",
)


class UIEvaluatorAgent:
    """Evaluates a generated React/TSX interface using a single LLM-as-judge call.

    Falls back to static heuristics per dimension if the LLM is unavailable or
    returns an invalid response.
    """

    def __init__(self, provider: Any) -> None:
        self.provider = provider

    # ── Public API ─────────────────────────────────────────────────────────

    def evaluate(self, prompt: str, code: str, build_success: bool = True) -> dict[str, Any]:
        """Evaluate and return dimension scores + global score.

        Returns:
            {
              "global_score":  int,
              "dimensions":    {dim: int, ...},
              "reasoning":     {dim: str, ...},   # LLM explanations (may be empty)
              "build_success": bool,
            }
        """
        if not build_success or not code.strip():
            scores = {d: 0 for d in _DIMENSIONS}
            return {
                "global_score": 0,
                "dimensions": scores,
                "reasoning": {d: "Build failed — code could not be evaluated." for d in _DIMENSIONS},
                "build_success": build_success,
            }

        scores, reasoning = self._score_all_llm(prompt, code)

        global_score = round(sum(scores[k] * _WEIGHTS[k] for k in _WEIGHTS))

        logger.info(
            "UIEvaluator (LLM): global=%d | fidelity=%d quality=%d "
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
            "reasoning":     reasoning,
            "build_success": build_success,
        }

    # ── LLM judge (all 5 dimensions in one call) ───────────────────────────

    def _score_all_llm(
        self, prompt: str, code: str
    ) -> tuple[dict[str, int], dict[str, str]]:
        """Single LLM call that scores all five dimensions at once.

        Returns (scores_dict, reasoning_dict).
        Falls back to static heuristics on any error.
        """
        try:
            user_msg = _build_user_message(prompt, code)
            raw = self.provider.chat_json(
                _SYSTEM_PROMPT,
                user_msg,
                max_tokens=512,
                temperature=0,
            )

            scores: dict[str, int] = {}
            for dim in _DIMENSIONS:
                val = raw.get(dim)
                if isinstance(val, (int, float)):
                    scores[dim] = max(0, min(100, int(val)))
                else:
                    # Dimension missing from response — fill with static fallback
                    logger.warning("UIEvaluator: missing dimension %s in LLM response", dim)
                    scores[dim] = self._static_fallback(dim, prompt, code)

            reasoning: dict[str, str] = {}
            if isinstance(raw.get("reasoning"), dict):
                for dim in _DIMENSIONS:
                    reasoning[dim] = str(raw["reasoning"].get(dim, ""))

            return scores, reasoning

        except Exception as exc:
            logger.warning(
                "UIEvaluator: LLM call failed (%s) — falling back to static heuristics", exc
            )
            scores = {d: self._static_fallback(d, prompt, code) for d in _DIMENSIONS}
            return scores, {}

    # ── Static fallback (used only when LLM call fails) ───────────────────

    def _static_fallback(self, dimension: str, prompt: str, code: str) -> int:
        if dimension == "semantic_fidelity":
            return 50  # Cannot judge without LLM
        if dimension == "code_quality":
            return self._static_code_quality(code)
        if dimension == "completeness":
            return self._static_completeness(prompt, code)
        if dimension == "accessibility":
            return self._static_accessibility(code)
        if dimension == "visual_richness":
            return self._static_visual_richness(code)
        return 50

    def _static_code_quality(self, code: str) -> int:
        if not code.strip():
            return 0
        score = 0
        if len(code) > 500:   score += 15
        if len(code) > 2000:  score += 10
        cn = len(re.findall(r"className=", code))
        si = len(re.findall(r"style=\{", code))
        if cn > 0 and (si == 0 or cn > si * 2):
            score += 15
        cc = len(re.findall(r"function\s+[A-Z][a-zA-Z]+\s*\(", code))
        if cc >= 2: score += 10
        if cc >= 4: score += 10
        if "import React" in code or "from 'react'" in code: score += 10
        if "lucide-react" in code: score += 5
        if "recharts"     in code: score += 5
        if "export default" in code: score += 5
        if "lorem ipsum"  not in code.lower(): score += 5
        if "useState"     in code: score += 5
        if "dangerouslySetInnerHTML" not in code and "eval(" not in code: score += 5
        return min(100, score)

    def _static_completeness(self, prompt: str, code: str) -> int:
        if not prompt.strip() or not code.strip():
            return 0
        raw = re.findall(r"\b[a-zA-ZÀ-ɏ]{4,}\b", prompt.lower())
        seen: set[str] = set()
        keywords: list[str] = []
        for w in raw:
            if w not in _STOPWORDS and w not in seen:
                seen.add(w); keywords.append(w)
            if len(keywords) == 20:
                break
        if not keywords:
            return 50
        cl = code.lower()
        found = sum(1 for kw in keywords if kw in cl)
        r = found / len(keywords)
        return 95 if r >= 0.80 else 80 if r >= 0.60 else 65 if r >= 0.40 else 45 if r >= 0.20 else 20

    def _static_accessibility(self, code: str) -> int:
        if not code.strip():
            return 0
        score = 30
        imgs = len(re.findall(r"<img\b", code))
        imgs_alt = len(re.findall(r"<img\b[^>]*\balt=", code))
        if imgs == 0 or imgs_alt >= imgs * 0.8: score += 15
        inputs = len(re.findall(r"<input\b", code))
        labels = len(re.findall(r"<label\b", code))
        if inputs == 0 or labels >= inputs * 0.5: score += 15
        sem = sum(1 for t in ("<nav", "<header", "<main", "<section", "<article", "<footer") if t in code)
        score += 20 if sem >= 3 else 10 if sem >= 1 else 0
        if "aria-label" in code or "aria-hidden" in code or 'role="' in code: score += 10
        if "onclick=" not in code.lower() and "onchange=" not in code.lower(): score += 10
        return min(100, score)

    def _static_visual_richness(self, code: str) -> int:
        if not code.strip():
            return 0
        score = 0
        charts = sum(1 for c in _RECHARTS if c in code)
        score += 25 if charts >= 3 else 18 if charts >= 2 else 10 if charts >= 1 else 0
        icons = len(re.findall(r"<[A-Z][a-zA-Z]+(Icon)?\s", code))
        score += 20 if icons >= 8 else 13 if icons >= 4 else 6 if icons >= 1 else 0
        nav = len(re.findall(r"setActivePage|activePage", code))
        score += 20 if nav >= 4 else 12 if nav >= 2 else 0
        if "<table" in code or "<tr>" in code: score += 10
        if len(re.findall(r"<li\b", code)) >= 3: score += 5
        colors = set(re.findall(
            r"(?:bg|text|border)-(?:slate|gray|red|orange|amber|yellow|green|"
            r"teal|blue|indigo|purple|pink|rose)-\d{3}", code))
        score += 15 if len(colors) >= 8 else 8 if len(colors) >= 4 else 0
        if re.search(r"\$[\d,]+", code) and charts >= 1: score += 5
        if re.search(r"\d+\.?\d*\s*%", code): score += 5
        return min(100, score)
