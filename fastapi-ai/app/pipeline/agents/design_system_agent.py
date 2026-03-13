from __future__ import annotations

import logging
from typing import Any

from ..llm_provider import LlmProvider

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Aesthetic vocabulary the LLM can draw from (injected into the prompt so the
# model has a rich vocabulary to reason about, not just pick from a fixed list)
# ---------------------------------------------------------------------------
_STYLE_VOCABULARY = """
NAMED DIRECTIONS (use as a starting point or blend/subvert them):
  • Cyber-Minimalism      – negative space, neon hairlines, monochrome + one electric accent
  • Neomorphic Glass      – frosted depth, soft-cast shadows, translucent layers
  • Modern Swiss Editorial – strict grids, typographic hierarchy, red/black/white purity
  • Dark Industrial       – raw textures, oxidised metals, off-white on near-black
  • Organic Softness      – warm off-whites, botanical curves, earthy terracotta/sage
  • High-Contrast Brutalism – oversized type, raw HTML energy, heavy strokes
  • Art Deco Revival      – geometric ornament, gold on midnight, symmetrical grandeur
  • Retro Terminal        – phosphor green/amber on black, scanlines, monospace soul
  • Liquid Chromatic      – iridescent gradients, shifting hues, glassy morphism
  • Quiet Luxury          – bone + slate, refined serifs, restrained micro-details
  • Deconstructed Bauhaus – primary colors, floating geometric primitives, bold asymmetry
  • Ethereal Minimalism  – extremely high-key whites, blurred grain backgrounds, hairline serifs
  • Neo-Acid High-Tech    – vibrant lime/magenta/cyan, grid-line overlays, technical monospaced labels
  • New Brutalist Pop     – clashing patterns, rounded thick borders, "stickers" as UI elements

You are NOT limited to this list. Invent a better name if the project demands it.
"""

_FONT_GUIDANCE = """
TYPOGRAPHY RULES:
  - NEVER choose Inter, Roboto, Arial, or system-ui as the primary or heading font.
  - Pair a characterful DISPLAY font (e.g. Clash Display, Cabinet Grotesk, Syne,
    Playfair Display, DM Serif Display, Bebas Neue, Cormorant Garamond,
    Space Grotesk, Instrument Serif, Fraunces, Satoshi, Neue Machina …)
    with a refined BODY font (e.g. DM Sans, Plus Jakarta Sans, Lora,
    Source Serif 4, Epilogue, General Sans …).
  - The pairing must feel intentional: serif × grotesque, display × humanist, etc.
  - Specify the exact Google Fonts or CDN name so it can be imported directly.
"""

_COLOR_RULES = """
COLOR RULES:
  - Avoid safe, default blue/gray palettes unless the brief explicitly requests them.
  - Build a palette that could *only* belong to this project.
  - Ensure WCAG AA contrast (≥4.5:1) between `text` and `background`.
  - `gradient` should be an evocative multi-stop linear or radial gradient
    that reflects the style direction (not just two primaries blended).
  - `surfaceHover` should be subtly lighter/warmer than `surface` — never identical.
  - Include a `shadowGlow` that uses a colour-tinted shadow for the primary or accent.
"""


class DesignSystemAgent:
    """
    Generates a unique, high-fidelity design token system for each project.

    The agent asks the LLM to act as a Creative Director, reasoning about
    the project's emotional tone and audience before committing to a visual
    direction — then outputs a structured JSON token set that can be used
    directly as CSS custom properties.
    """

    def __init__(self, provider: LlmProvider) -> None:
        self.provider = provider

    @property
    def model(self) -> str:
        return getattr(self.provider, "model", "unknown")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self, plan: dict[str, Any], context: str = "") -> dict[str, Any]:
        """Generate a full design token set for *plan* and return it as a dict."""
        sys_msg = self._build_system_message()
        user_msg = self._build_user_message(plan, context)

        try:
            tokens = self.provider.chat_json(sys_msg, user_msg)
            if not isinstance(tokens, dict) or "colors" not in tokens:
                raise ValueError(f"Unexpected token shape: {list(tokens.keys()) if isinstance(tokens, dict) else type(tokens)}")
            logger.info("DesignSystemAgent produced style '%s' via %s", tokens.get("style", "?"), self.model)
            return tokens
        except Exception:
            logger.exception("DesignSystemAgent failed — falling back to default tokens")
            return self._default_tokens()

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_system_message() -> str:
        return (
            "You are a world-class UI/UX Creative Director with a reputation for creating "
            "UNFORGETTABLE visual identities. Every project you touch gets a completely fresh, "
            "tailor-made design fingerprint — never recycled, never generic.\n\n"
            "Your design process:\n"
            "  1. UNDERSTAND the project's soul — its audience, emotional tone, and purpose.\n"
            "  2. CHOOSE a bold, specific aesthetic direction that serves that soul.\n"
            "  3. COMMIT fully — every token (colour, type, shadow, radius) must reinforce the direction.\n"
            "  4. OUTPUT only valid JSON. No prose, no markdown fences, no commentary.\n\n"
            "You have strong opinions and defend them. You would rather produce something "
            "memorable and slightly risky than something safe and forgettable."
        )

    @staticmethod
    def _build_user_message(plan: dict[str, Any], context: str) -> str:
        summary   = plan.get("summary", "").strip()
        audience  = plan.get("audience", "").strip()
        keywords  = ", ".join(plan.get("keywords", [])) or "not specified"
        mood      = plan.get("mood", "").strip()

        brief_lines = [f"  Summary  : {summary or 'Not provided'}"]
        if audience:
            brief_lines.append(f"  Audience : {audience}")
        if mood:
            brief_lines.append(f"  Mood     : {mood}")
        brief_lines.append(f"  Keywords : {keywords}")
        if context.strip():
            brief_lines.append(f"  Context  : {context.strip()}")

        brief = "\n".join(brief_lines)

        schema = '''\
{
  "style": "Your invented style name (e.g. 'Glacial Brutalism', 'Velvet Terminal', …)",
  "styleRationale": "One sentence explaining WHY this direction fits the project.",
  "colors": {
    "primary":      "#hex  — dominant brand colour",
    "primaryLight": "#hex  — tinted lighter variant for hover/focus rings",
    "primaryDark":  "#hex  — deepened variant for pressed states",
    "secondary":    "#hex  — supporting colour, contrasting hue",
    "accent":       "#hex  — high-energy pop colour for CTAs & highlights",
    "background":   "#hex  — page background",
    "surface":      "#hex  — card / panel background",
    "surfaceHover": "#hex  — card hover state (subtly different from surface)",
    "text":         "#hex  — primary body text (WCAG AA vs background)",
    "textMuted":    "#hex  — secondary / caption text",
    "border":       "rgba or #hex — subtle divider / outline colour",
    "success":      "#hex",
    "error":        "#hex",
    "gradient":     "full CSS gradient string — evocative, multi-stop"
  },
  "typography": {
    "fontFamily":    "Body font — exact Google Fonts name, no fallback yet",
    "headingFamily": "Display/heading font — exact Google Fonts name, no fallback yet",
    "fontSizeBase":  "16px",
    "lineHeight":    "1.65",
    "headingWeight": "800",
    "letterSpacingHeading": "-0.03em"
  },
  "effects": {
    "borderRadius":  "e.g. 4px | 14px | 999px depending on the style",
    "shadow":        "subtle box-shadow for cards",
    "shadowGlow":    "colour-tinted glow shadow using primary or accent",
    "transition":    "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  "layout": {
    "maxWidth":      "1400px",
    "sidebarWidth":  "280px",
    "navbarHeight":  "72px"
  }
}'''

        return "\n\n".join([
            "## PROJECT BRIEF\n" + brief,
            "## AESTHETIC VOCABULARY\n" + _STYLE_VOCABULARY.strip(),
            "## TYPOGRAPHY GUIDANCE\n" + _FONT_GUIDANCE.strip(),
            "## COLOR GUIDANCE\n" + _COLOR_RULES.strip(),
            "## OUTPUT SCHEMA\n"
            "Return ONLY a single valid JSON object that exactly matches this shape "
            "(replace the comment strings with real values):\n\n" + schema,
        ])

    # ------------------------------------------------------------------
    # Fallback
    # ------------------------------------------------------------------

    @staticmethod
    def _default_tokens() -> dict[str, Any]:
        """
        Dark Industrial fallback — used when the LLM call fails entirely.
        Intentionally distinct from 'generic purple gradient' defaults.
        """
        return {
            "style": "Dark Industrial (fallback)",
            "styleRationale": "Emergency fallback with a strong, opinionated dark palette.",
            "colors": {
                "primary":       "#e8c547",
                "primaryLight":  "#f2d96e",
                "primaryDark":   "#c9a82e",
                "secondary":     "#e05c3a",
                "accent":        "#38bdf8",
                "background":    "#111010",
                "surface":       "#1c1b1b",
                "surfaceHover":  "#252323",
                "text":          "#f0ece4",
                "textMuted":     "#8a8480",
                "border":        "rgba(255,255,255,0.08)",
                "success":       "#4ade80",
                "error":         "#f87171",
                "gradient":      "linear-gradient(135deg, #e8c547 0%, #e05c3a 60%, #38bdf8 100%)",
            },
            "typography": {
                "fontFamily":             "DM Sans",
                "headingFamily":          "Bebas Neue",
                "fontSizeBase":           "16px",
                "lineHeight":             "1.65",
                "headingWeight":          "400",   # Bebas is already heavy at 400
                "letterSpacingHeading":   "0.04em",
            },
            "effects": {
                "borderRadius":  "4px",
                "shadow":        "0 2px 12px rgba(0,0,0,0.45)",
                "shadowGlow":    "0 0 20px rgba(232,197,71,0.35)",
                "transition":    "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            },
            "layout": {
                "maxWidth":     "1400px",
                "sidebarWidth": "280px",
                "navbarHeight": "72px",
            },
        }

    # ------------------------------------------------------------------
    # CSS output helpers
    # ------------------------------------------------------------------

    @staticmethod
    def tokens_to_css_vars(tokens: dict[str, Any]) -> str:
        """
        Serialise a token dict into a :root { … } CSS custom-property block.

        Token categories → CSS variable prefixes:
          colors     → --color-*
          typography → --typo-*
          effects    → --effect-*
          layout     → --layout-*

        Non-string values and metadata keys (style, styleRationale) are skipped.
        """
        _PREFIX = {
            "colors":     "color",
            "typography": "typo",
            "effects":    "effect",
            "layout":     "layout",
        }

        lines: list[str] = [":root {"]

        for category, prefix in _PREFIX.items():
            section = tokens.get(category, {})
            if not isinstance(section, dict):
                continue
            for key, value in section.items():
                if isinstance(value, str):
                    css_name = key.replace("_", "-")
                    # Convert camelCase → kebab-case
                    import re
                    css_name = re.sub(r"([a-z])([A-Z])", r"\1-\2", css_name).lower()
                    lines.append(f"  --{prefix}-{css_name}: {value};")

        lines.append("}")
        return "\n".join(lines)

    @staticmethod
    def tokens_to_google_fonts_url(tokens: dict[str, Any]) -> str | None:
        """
        Build a Google Fonts import URL for the font families declared in *tokens*.

        Returns *None* if no typography data is present.
        """
        from urllib.parse import urlencode, quote

        typo = tokens.get("typography", {})
        families: list[str] = []

        for key in ("fontFamily", "headingFamily"):
            raw = typo.get(key, "")
            # Take just the first name (before any comma/fallback)
            name = raw.split(",")[0].strip()
            if name and name not in families:
                families.append(name)

        if not families:
            return None

        params = "&".join(f"family={quote(f, safe='+')}" for f in families)
        return f"https://fonts.googleapis.com/css2?{params}&display=swap"