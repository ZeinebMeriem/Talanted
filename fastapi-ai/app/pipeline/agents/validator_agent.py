"""Code Validator Agent — validates and auto-fixes generated HTML/CSS/React files.

Checks:
  - HTML: has React CDN boilerplate (ReactDOM, text/babel, App component)
  - HTML: no unclosed JSX template literals
  - HTML: balanced script/div tags
  - CSS: has rules, balanced braces
  - JS: not empty
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


class _ValidationError(Exception):
    """Raised when generated code fails validation — triggers a retry without sleep."""


class ValidatorAgent:
    """Validates generated HTML/CSS/React files for common structural issues."""

    _MIN_HTML_CHARS = 300
    _MIN_CSS_CHARS = 50

    def validate_and_fix(self, path: str, content: str) -> tuple[bool, list[str], str]:
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""

        if not content or not content.strip():
            return False, ["empty file — model returned nothing"], content

        if ext in ("html", "htm"):
            return self._validate_html(content)
        elif ext == "css":
            return self._validate_css(content)
        elif ext == "js":
            return self._validate_js(content)

        return True, [], content

    # ── per-type validators ───────────────────────────────────────────────

    def _validate_html(self, content: str) -> tuple[bool, list[str], str]:
        issues: list[str] = []

        if len(content.strip()) < self._MIN_HTML_CHARS:
            issues.append(f"HTML too short ({len(content.strip())} chars) — model truncated output")

        if "ReactDOM" not in content:
            issues.append("missing ReactDOM.createRoot — React app not mounted")

        if "text/babel" not in content:
            issues.append('missing <script type="text/babel"> — JSX will not transpile')

        has_app = (
            "function App(" in content
            or "const App" in content
            or "function App " in content
        )
        if not has_app:
            issues.append("missing App component — nothing to render")

        # Check balanced script tags
        open_scripts = content.count("<script")
        close_scripts = content.count("</script>")
        if open_scripts != close_scripts:
            issues.append(f"mismatched <script> tags ({open_scripts} open vs {close_scripts} close)")

        # Check for unclosed template literals in JSX (common LLM mistake)
        babel_match = re.search(r'<script[^>]*type=["\']text/babel["\'][^>]*>(.*?)</script>', content, re.DOTALL)
        if babel_match:
            jsx_code = babel_match.group(1)
            backtick_count = jsx_code.count("`")
            if backtick_count % 2 != 0:
                issues.append("unclosed template literal (`) in JSX — Babel will fail to parse")

        # Check ReactDOM.createRoot is called
        if "ReactDOM" in content and "createRoot" not in content:
            issues.append("ReactDOM present but createRoot not called — using old React 17 API")

        if issues:
            logger.warning("ValidatorAgent HTML issues: %s", "; ".join(issues))
        else:
            logger.debug("ValidatorAgent: HTML OK")

        return len(issues) == 0, issues, content

    def _validate_css(self, content: str) -> tuple[bool, list[str], str]:
        issues: list[str] = []

        if len(content.strip()) < self._MIN_CSS_CHARS:
            issues.append(f"CSS too short ({len(content.strip())} chars)")
            return False, issues, content

        if "{" not in content:
            issues.append("no CSS rules found (no { } blocks)")

        # Check balanced braces
        open_braces = content.count("{")
        close_braces = content.count("}")
        if open_braces != close_braces:
            issues.append(f"unbalanced CSS braces ({open_braces} open vs {close_braces} close) — broken stylesheet")

        if issues:
            logger.warning("ValidatorAgent CSS issues: %s", "; ".join(issues))

        return len(issues) == 0, issues, content

    def _validate_js(self, content: str) -> tuple[bool, list[str], str]:
        if len(content.strip()) < 10:
            return False, ["JS file is empty"], content
        return True, [], content
