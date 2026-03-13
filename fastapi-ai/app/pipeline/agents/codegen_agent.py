from __future__ import annotations

import json as _json
import logging
import re as _re
import time as _time
from typing import Any

import httpx

from ...schemas import CodeBundle, CodeFile, GenerateRequest
from ..llm_provider import LlmProvider
from ..models import SourcePack
from .design_system_agent import DesignSystemAgent

logger = logging.getLogger(__name__)


class LlmCodegenAgent:
    """Coder model generates files ONE AT A TIME from a plan.

    Each file gets its own LLM call so that:
    - Individual calls are smaller and faster (less likely to timeout)
    - CSS/JS are generated AFTER HTML so they can reference real class names
    - Progress can be tracked per file
    """

    def __init__(self, provider: LlmProvider) -> None:
        self.provider = provider

    @property
    def model(self) -> str:
        return getattr(self.provider, "model", "unknown")

    # ── helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _clean_code_output(raw: str) -> str:
        """Strip markdown fences and LLM prose from generated code.

        Handles Gemini's tendency to wrap code in explanation text like:
        'Here is your HTML:\n```html\n...\n```\nThis uses Tailwind...'
        """
        text = raw.strip()
        if not text:
            return text

        # If there's a fenced code block anywhere, extract the LARGEST one
        # (Gemini often adds prose before/after the block)
        fence_blocks = _re.findall(r'```(?:[a-zA-Z]*)\n([\s\S]*?)```', text)
        if fence_blocks:
            # Pick the longest block — that's the actual code
            text = max(fence_blocks, key=len).strip()
            return text

        # No fences — strip any leading prose line that looks like an intro
        # e.g. "Here's the CSS for your landing page:" → remove it
        lines = text.split("\n")
        while lines and len(lines) > 1:
            first = lines[0].strip()
            # Intro lines: short, end with colon, no code chars
            if (len(first) < 120 and (first.endswith(":") or first.endswith(".")
                    or first.lower().startswith(("here", "below", "sure", "this", "the following")))):
                lines = lines[1:]
            else:
                break
        text = "\n".join(lines)

        # Strip trailing explanation after the code
        # Heuristic: if last non-empty line starts with a lowercase word and no code chars, trim it
        lines = text.rstrip().split("\n")
        while lines:
            last = lines[-1].strip()
            if last and not any(c in last for c in ("{", "}", "<", ">", ";", "//", "/*")) \
                    and last[0].islower() and len(last) < 200:
                lines.pop()
            else:
                break
        text = "\n".join(lines)

        # Legacy: strip bare language label on first line
        first_line = text.split("\n", 1)[0].strip().lower()
        if first_line in {"html", "css", "javascript", "js", "htm"} and "\n" in text:
            text = text.split("\n", 1)[1]

        return text.strip()

    @staticmethod
    def _extract_classes(html: str) -> list[str]:
        """Extract unique CSS class names from an HTML string."""
        raw = _re.findall(r'class=["\']([^"\']+)["\']', html)
        classes: set[str] = set()
        for attr in raw:
            for c in attr.split():
                classes.add(c)
        return sorted(classes)

    @staticmethod
    def _extract_main_content(html: str) -> str:
        """Strip full HTML shell from LLM output — keep only the inner sections."""
        # If LLM returned full HTML with <main>, extract inner content
        m = _re.search(r'<main[^>]*>([\s\S]*?)</main>', html, _re.IGNORECASE)
        if m:
            return m.group(1).strip()
        # Otherwise strip any structural wrappers and return content
        html = _re.sub(r'<!doctype[^>]*>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<html[^>]*>|</html>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<head[^>]*>[\s\S]*?</head>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<body[^>]*>|</body>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<header[^>]*>[\s\S]*?</header>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<footer[^>]*>[\s\S]*?</footer>', '', html, flags=_re.IGNORECASE)
        return html.strip()

    @staticmethod
    def _fix_html_classes(html: str) -> str:
        """Post-process HTML to fix common class name mismatches from the LLM."""
        # Map of wrong class names → correct class names
        fixes = {
            "hamburger-button": "hamburger",
            "hamburger-menu": "hamburger",
            "menu-toggle": "hamburger",
            "mobile-menu": "hamburger",
            "nav-bar": "nav-links",
            "navbar-links": "nav-links",
            "navigation": "nav-links",
            "main-content": "content",
            "hero-section": "hero",
            "hero-title": "hero__title",
            "hero-subtitle": "hero__subtitle",
            "heroTitle": "hero__title",
            "heroSubtitle": "hero__subtitle",
            "hero-cta": "hero__cta",
            "hero-button": "btn btn--primary hero__cta",
            "cta-button": "btn btn--primary hero__cta",
            "book-class-button": "btn btn--primary hero__cta",
            "card-container": "card-grid",
            "cards-container": "card-grid",
            "service-cards": "card-grid",
            "card-wrapper": "card-grid",
            "features": "card-grid",
            "service-card": "card",
            "feature-card": "card",
            "card-title": "card__title",
            "card-text": "card__text",
            "card-description": "card__text",
            "card-image": "card__image",
            "card-img": "card__image",
            "footer-inner": "footer__inner",
            "footer-content": "footer__inner",
            "footer-links": "footer__inner",
            "footer-columns": "footer-grid",
            "footer-cols": "footer-grid",
            "footer-column": "footer-col",
            "footer-section": "footer-col",
            "copyright": "footer__copy",
            "footer-bottom": "footer__copy",
            "primary-btn": "btn btn--primary",
            "button-primary": "btn btn--primary",
            "secondary-btn": "btn btn--secondary",
            "button-secondary": "btn btn--secondary",
            "tag": "badge",
            "label-tag": "badge",
            "category-tag": "badge",
            "status-badge": "badge",
            "section-title": "section__title",
            "section-heading": "section__title",
            "side-bar": "sidebar",
            "side-nav": "sidebar",
            "navigation-sidebar": "sidebar",
            "top-nav": "navbar",
            "top-bar": "navbar",
            "header-navbar": "navbar",
            "main-app-content": "main-view",
            "app-content": "main-view",
            "dashboard-view": "main-view",
            "view-wrapper": "main-view",
            # KPI card BEM mismatches (underscore BEM → hyphen)
            "kpi__card": "kpi-card",
            "kpi__body": "kpi-card__body",
            "kpi__label": "kpi-card__title",
            "kpi__title": "kpi-card__title",
            "kpi__value": "kpi-value",
            "kpi__change": "kpi-change",
            "kpi__icon": "kpi-card__icon",
            "kpi-grid": "kpi-cards",
            "kpi-row": "kpi-cards",
            "kpi-section": "kpi-cards",
            "stats-grid": "kpi-cards",
            "metrics-grid": "kpi-cards",
            "metric-card": "kpi-card",
            "stat-card": "kpi-card",
            "stat-value": "kpi-value",
            "metric-value": "kpi-value",
            "stat-change": "kpi-change",
            "metric-change": "kpi-change",
            # Chart card BEM mismatches
            "chart__card": "chart-card",
            "chart__title": "chart-card__title",
            "chart__subtitle": "chart-card__sub",
            "chart__sub": "chart-card__sub",
            "chart__container": "chart-container",
            "chart__canvas": "chart-canvas",
            "chart-wrapper": "chart-container",
            # Table card BEM mismatches
            "table__card": "table-card",
            "table__header": "table-card__header",
            "table__title": "table-card__title",
            "table__data": "data-table",
            "data-grid": "data-table",
            "users-table": "data-table user-list",
            # Hero/section mismatches
            "hero__section": "hero",
            "section__header": "section-header",
        }
        for wrong, correct in fixes.items():
            # Replace in class="..." attributes only
            html = _re.sub(
                rf'(class="[^"]*)\b{_re.escape(wrong)}\b([^"]*")',
                rf'\1{correct}\2',
                html,
            )
        # Normalize "kpi" standalone class → "kpi-cards" when wrapping kpi-card children
        # (handles models that use <div class="kpi"> as container)
        html = _re.sub(
            r'(class=["\'][^"\']*)\bkpi\b([^"\']*["\'])',
            lambda m: m.group(0).replace('kpi', 'kpi-cards') if 'kpi-card' not in m.group(0) else m.group(0),
            html,
        )
        # Convert broken <img src="#"> to styled <div> placeholders
        html = _re.sub(
            r'<img\s+src=["\']#["\']\s*alt=["\']([^"\']*)["\'][^>]*/?>',
            r'<div class="card__image">\1</div>',
            html,
        )
        html = _re.sub(
            r'<img\s+alt=["\']([^"\']*)["\'][^>]*src=["\']#["\'][^>]*/?>',
            r'<div class="card__image">\1</div>',
            html,
        )
        return html

    # ── per-file generation ──────────────────────────────────────────────

    def _generate_single_file(
        self,
        file_info: dict[str, str],
        plan: dict[str, Any],
        context: str,
        generated_so_far: list[dict[str, str]],
        design_tokens: dict[str, Any] | None = None,
    ) -> str:
        path = file_info["path"]
        desc = file_info["description"]
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
        all_paths = [f["path"] for f in plan.get("files", [])]
        html_paths = [p for p in all_paths if p.endswith(".html")]

        # ── Build lightweight context of already-generated files ──
        gen_ctx = ""
        if generated_so_far:
            if ext == "css":
                all_classes: set[str] = set()
                for gf in generated_so_far:
                    if gf["path"].endswith((".html", ".htm")):
                        all_classes.update(self._extract_classes(gf["content"]))
                if all_classes:
                    gen_ctx = (
                        "\nCSS CLASSES USED IN HTML (you MUST style ALL of these):\n"
                        + ", ".join(f".{c}" for c in sorted(all_classes))
                        + "\n"
                    )
            elif ext == "js":
                gen_ctx = "\nHTML class selectors available: .hamburger, .nav-links, .reveal, .nav-link\n"

        design_ctx = ""
        if design_tokens and ext not in ("css",):
            colors = design_tokens.get("colors", {})
            design_ctx = f"\nDESIGN COLORS: primary={colors.get('primary','#3b82f6')}, bg={colors.get('background','#0f172a')}\n"

        # ── SPEC BLOCK — this is the #1 priority for the LLM ──
        spec_block = context[:4000] if context else "Generic modern website"

        # ── Build nav links HTML for reuse ──
        nav_links_html = "\n".join(
            f'                <a href="{p}" class="nav-link">'
            f'{p.replace(".html","").replace("index","Home").title()}</a>'
            for p in html_paths
        ) if html_paths else ""

        # ── Derive a real brand name from the plan summary ──
        _summary_words = plan.get("summary", "My App").split()
        brand_name = " ".join(_summary_words[:4]) if _summary_words else "My App"

        # ── Always inject Google Fonts Inter (+ any design-token fonts) ──
        font_link = (
            '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
        )
        if design_tokens:
            typo = design_tokens.get("typography", {})
            extra_families: list[str] = []
            for key in ("fontFamily", "headingFamily"):
                raw_fam = typo.get(key, "")
                m = _re.search(r"'([^']+)'", raw_fam)
                if m and m.group(1).lower() not in ("inter", "segoe ui", "system-ui", "sans-serif", "serif", "monospace"):
                    name = m.group(1)
                    if name not in extra_families:
                        extra_families.append(name)
            if extra_families:
                params = "|".join(f.replace(" ", "+") + ":wght@400;600;700;800" for f in extra_families)
                font_link += (
                    f'  <link href="https://fonts.googleapis.com/css2?family={params}&display=swap" rel="stylesheet">\n'
                )

        # ── File-type specific RULES ──
        # ── Determine Project Type & Layout ──
        project_type = plan.get("_meta", {}).get("project_type", "generic")
        is_app = project_type in ("dashboard", "app")
        is_ecommerce = project_type == "ecommerce"
        is_landing = project_type in ("landing", "portfolio", "generic")

        # ── CDN libraries injected into every HTML <head> ──
        # Tailwind CDN for atomic utility classes — eliminates CSS class mismatch problems
        _tailwind_cdn = '  <script src="/tailwind.min.js"></script>\n'
        cdn_links = (
            _tailwind_cdn
            + '  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" defer></script>\n'
        )
        if is_app:
            cdn_links = (
                _tailwind_cdn
                + '  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>\n'
                + '  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" defer></script>\n'
            )

        # ── Deterministic HTML shell — navbar/footer built here, not by LLM ──
        _html_top = ""
        _html_bottom = ""
        if ext in ("html", "htm"):
            # Nav list items for marketing/ecommerce navbars
            _nav_li = "\n".join(
                f'        <li><a href="{p}">{p.replace(".html","").replace("index","Home").title()}</a></li>'
                for p in html_paths
            ) if html_paths else ""
            _has_script = "script.js" in all_paths

            if is_app:
                _sidebar_links = "\n".join(
                    f'      <a href="{p}" class="sidebar__link">'
                    f'<i data-lucide="layout-dashboard"></i> '
                    f'{p.replace(".html","").replace("index","Dashboard").title()}</a>'
                    for p in html_paths
                ) if html_paths else ""
                _nav_html = (
                    '<body class="app-layout">\n'
                    '  <aside class="sidebar">\n'
                    '    <div class="sidebar__brand">\n'
                    '      <div class="sidebar__logo-icon"><i data-lucide="zap"></i></div>\n'
                    f'      <a href="index.html" class="logo">{brand_name}</a>\n'
                    '    </div>\n'
                    '    <nav class="sidebar__nav">\n'
                    f'{_sidebar_links}\n'
                    '    </nav>\n'
                    '    <div class="sidebar__footer"><div class="sidebar__plan">\n'
                    '      <div class="sidebar__plan-name">Free Plan</div>\n'
                    '      <div class="sidebar__plan-sub">Upgrade to unlock all features</div>\n'
                    '      <a href="#" class="sidebar__upgrade-btn">Upgrade</a>\n'
                    '    </div></div>\n'
                    '  </aside>\n'
                    '  <div class="main-container">\n'
                    '    <header class="navbar">\n'
                    '      <div class="navbar__left"><h1 class="navbar__title">Dashboard</h1></div>\n'
                    '      <div class="navbar__search"><i data-lucide="search"></i>'
                    '<input type="text" placeholder="Search..." class="input-search" autocomplete="off"></div>\n'
                    '      <div class="navbar__actions">\n'
                    '        <button class="btn-icon"><i data-lucide="bell"></i></button>\n'
                    '        <button class="btn-icon btn-export"><i data-lucide="download"></i> Export</button>\n'
                    '        <div class="user-profile">JD</div>\n'
                    '        <button class="hamburger">&#9776;</button>\n'
                    '      </div>\n'
                    '    </header>\n'
                )
                _main_open = '    <main class="main-view"><div class="view-content">\n'
                _main_close = '    </div></main>\n  </div>\n'
                _footer = ''
            elif is_ecommerce:
                _nav_li_css = "\n".join(
                    f'        <li><a href="{p}">{p.replace(".html","").replace("index","Home").title()}</a></li>'
                    for p in html_paths
                ) if html_paths else ""
                _nav_html = (
                    '<body class="ecommerce-layout">\n'
                    '  <div class="cart-overlay" id="cart-overlay"></div>\n'
                    '  <div class="cart-drawer" id="cart-drawer">\n'
                    '    <div class="cart-drawer__header"><span class="cart-drawer__title">Your Cart</span>'
                    '<button id="cart-close" style="background:none;border:none;cursor:pointer;font-size:22px;color:#64748b">&times;</button></div>\n'
                    '    <div class="cart-items"><p style="color:#94a3b8;text-align:center;padding:40px 0;font-size:14px">Your cart is empty.</p></div>\n'
                    '    <div class="cart-footer"><div class="cart-total"><span>Total</span><span id="cart-total-price">$0.00</span></div>'
                    '<button class="btn-checkout"><i data-lucide="shopping-bag"></i> Checkout</button></div>\n'
                    '  </div>\n'
                    '  <header class="navbar">\n'
                    '    <div class="navbar__inner">\n'
                    f'      <a href="index.html" class="nav-logo">{brand_name}</a>\n'
                    '      <ul class="nav-links">\n'
                    f'{_nav_li_css}\n'
                    '      </ul>\n'
                    '      <div class="nav-actions">\n'
                    '        <button class="cart-btn" id="cart-trigger"><i data-lucide="shopping-cart"></i> Cart <span class="cart-count">0</span></button>\n'
                    '        <button class="hamburger">&#9776;</button>\n'
                    '      </div>\n'
                    '    </div>\n'
                    '  </header>\n'
                )
                _main_open = '  <main class="main-view">\n'
                _main_close = '  </main>\n'
                _footer = (
                    '  <footer class="footer">\n'
                    '    <div class="footer__grid">\n'
                    f'      <div><div class="footer__brand-name">{brand_name}</div>'
                    '<div class="footer__brand-desc">Premium products delivered fast.</div></div>\n'
                    '      <div><div class="footer__col-title">Shop</div>'
                    '<ul class="footer__links"><li><a href="#">New Arrivals</a></li>'
                    '<li><a href="#">Sale</a></li><li><a href="#">Bestsellers</a></li></ul></div>\n'
                    '      <div><div class="footer__col-title">Support</div>'
                    '<ul class="footer__links"><li><a href="#">FAQ</a></li>'
                    '<li><a href="#">Shipping</a></li><li><a href="#">Returns</a></li></ul></div>\n'
                    '      <div><div class="footer__col-title">Follow</div>'
                    '<ul class="footer__links"><li><a href="#">Instagram</a></li>'
                    '<li><a href="#">Twitter</a></li><li><a href="#">TikTok</a></li></ul></div>\n'
                    '    </div>\n'
                    f'    <div class="footer__bottom"><span class="footer__copy">&copy; 2026 {brand_name}. All rights reserved.</span></div>\n'
                    '  </footer>\n'
                )
            else:
                _nav_li_css = "\n".join(
                    f'        <li><a href="{p}">{p.replace(".html","").replace("index","Home").title()}</a></li>'
                    for p in html_paths
                ) if html_paths else ""
                _nav_html = (
                    '<body class="marketing-layout">\n'
                    '  <header class="navbar">\n'
                    '    <div class="navbar__inner">\n'
                    f'      <a href="index.html" class="logo">{brand_name}</a>\n'
                    '      <ul class="nav-links">\n'
                    f'{_nav_li_css}\n'
                    '      </ul>\n'
                    '      <button class="hamburger">&#9776;</button>\n'
                    '    </div>\n'
                    '  </header>\n'
                )
                _main_open = '  <main class="main-view">\n'
                _main_close = '  </main>\n'
                _footer = (
                    '  <footer class="footer">\n'
                    '    <div class="footer__grid">\n'
                    f'      <div><div class="footer__brand-name">{brand_name}</div>'
                    '<div class="footer__brand-desc">The modern platform for modern teams.</div></div>\n'
                    '      <div><div class="footer__col-title">Product</div>'
                    '<ul class="footer__links"><li><a href="#">Features</a></li>'
                    '<li><a href="#">Pricing</a></li><li><a href="#">Changelog</a></li></ul></div>\n'
                    '      <div><div class="footer__col-title">Company</div>'
                    '<ul class="footer__links"><li><a href="#">About</a></li>'
                    '<li><a href="#">Blog</a></li><li><a href="#">Careers</a></li></ul></div>\n'
                    '      <div><div class="footer__col-title">Legal</div>'
                    '<ul class="footer__links"><li><a href="#">Privacy</a></li>'
                    '<li><a href="#">Terms</a></li><li><a href="#">Security</a></li></ul></div>\n'
                    '    </div>\n'
                    f'    <div class="footer__bottom"><span class="footer__copy">&copy; 2026 {brand_name}. All rights reserved.</span></div>\n'
                    '  </footer>\n'
                )

            _html_top = (
                '<!doctype html>\n<html lang="en">\n<head>\n'
                '  <meta charset="UTF-8">\n'
                '  <meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
                f'  <title>{plan.get("summary","Page")[:50]}</title>\n'
                + font_link + cdn_links
                + '  <link rel="stylesheet" href="styles.css">\n'
                '</head>\n'
                + _nav_html + _main_open
            )
            _html_bottom = (
                _main_close + _footer
                + (f'  <script src="script.js" defer></script>\n' if _has_script else '')
                + '</body>\n</html>\n'
            )

        # ── File-type specific RULES (for LLM prompt) ──
        if ext in ("html", "htm"):
            type_rules = (
                "OUTPUT ONLY the inner content sections for <main> — DO NOT output <!doctype>, <html>, <head>, <body>, <header>, <nav>, <footer>, or <script> tags. Those are pre-built.\n"
                "TAILWIND CSS IS LOADED — use Tailwind utility classes for ALL styling. Examples:\n"
                "  Layout: flex, grid, grid-cols-3, gap-6, p-8, py-20, max-w-screen-xl, mx-auto, px-8\n"
                "  Colors: bg-white, bg-slate-50, bg-indigo-600, text-slate-900, text-slate-500, text-white\n"
                "  Typography: text-5xl, font-black, tracking-tight, leading-tight, text-sm, font-medium\n"
                "  Cards: rounded-2xl, shadow-sm, hover:shadow-lg, overflow-hidden, border, border-slate-200\n"
                "  Buttons: px-6, py-3, rounded-xl, font-bold, hover:-translate-y-0.5, transition-all\n"
                "  Gradients: bg-gradient-to-br, from-indigo-600, to-violet-600, from-indigo-50\n"
                "Icons: <i data-lucide='name' class='w-5 h-5'></i>\n"
                "EVERY top-level section: add class=\"reveal\" AND padding classes like py-20 or py-16.\n"
                "NEVER Lorem Ipsum — use realistic product names, real prices, real stats.\n"
                "Be VERBOSE — more sections, more content, more rows is always better.\n\n"
                + (
                "SECTIONS TO GENERATE (in order):\n"
                "1. <section class=\"reveal\" style=\"padding:40px 28px 0\"> — KPI CARDS ROW:\n"
                "   <div class=\"kpi-cards\">\n"
                "     <div class=\"kpi-card\"><div class=\"kpi-card__body\"><span class=\"kpi-card__title\">Total Revenue</span>"
                "<span class=\"kpi-value\" data-target=\"127840\">$127,840</span>"
                "<span class=\"kpi-change\"><i data-lucide=\"trending-up\"></i> +12.4%</span></div>"
                "<div class=\"kpi-card__icon\"><i data-lucide=\"dollar-sign\"></i></div></div>\n"
                "     ... (4 kpi-cards total)\n"
                "   </div>\n"
                "2. <section class=\"reveal\"> — CHARTS GRID:\n"
                "   <div class=\"charts-grid\">\n"
                "     <div class=\"chart-card\"><div class=\"chart-card__title\">Revenue</div><div class=\"chart-card__sub\">Last 12 months</div>"
                "<div class=\"chart-container\"><canvas id=\"chart-revenue\" class=\"chart-canvas\"></canvas></div></div>\n"
                "     <div class=\"chart-card\"> ... donut chart ... </div>\n"
                "   </div>\n"
                "3. <section class=\"reveal\"> — DATA TABLE:\n"
                "   <div class=\"table-card\"><div class=\"table-card__header\"><span class=\"table-card__title\">Recent Users</span></div>"
                "<table class=\"data-table\"><thead>...</thead><tbody>5+ rows with .badge status</tbody></table></div>\n"
                if is_app else
                "SECTIONS TO GENERATE (in order):\n"
                "1. HERO: <section class=\"hero reveal\" style=\"background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)\">\n"
                "   <div class=\"hero__inner\"><div class=\"hero__content\">\n"
                "   <span class=\"hero__tag\">🔥 New Collection 2026</span>\n"
                "   <h1 class=\"hero__title\" style=\"color:#fff\">YOUR BRAND-SPECIFIC HEADLINE</h1>\n"
                "   <p class=\"hero__sub\" style=\"color:rgba(255,255,255,.8)\">Subtitle text...</p>\n"
                "   <div class=\"hero__cta\"><button class=\"btn-primary\">Shop Now</button><button class=\"btn-secondary\">View Lookbook</button></div>\n"
                "   </div></div></section>\n"
                "2. PRODUCTS: <div class=\"container\"><div class=\"products-section reveal\">\n"
                "   <div class=\"products-header\"><h2>New Arrivals</h2></div>\n"
                "   <div class=\"product-grid\"> (6 product-card divs using exact structure below) </div>\n"
                "   product-card structure:\n"
                "   <div class=\"product-card\"><div class=\"product-card__image\"><div style=\"background:#f1f5f9;height:240px;display:flex;align-items:center;justify-content:center;font-size:64px\">EMOJI</div>"
                "<div class=\"product-card__badges\"><span class=\"badge badge--new\">NEW</span></div></div>\n"
                "   <div class=\"product-card__body\"><div class=\"product-card__brand\">BRAND</div><div class=\"product-card__name\">PRODUCT NAME</div>"
                "<div class=\"product-card__rating\"><span class=\"stars\">★★★★★</span><span class=\"rating-count\">(2,341)</span></div>"
                "<div class=\"product-card__footer\"><div><span class=\"product-price\">$189</span><span class=\"product-price--original\">$249</span></div>"
                "<button class=\"btn-add-cart\"><i data-lucide=\"shopping-cart\"></i></button></div></div></div>\n"
                "3. NEWSLETTER: <section class=\"newsletter reveal\" style=\"background:linear-gradient(135deg,#6366f1,#8b5cf6)\">\n"
                "   <h2>Stay in the Loop</h2><p>Get early access to drops and exclusive deals.</p>\n"
                "   <div class=\"newsletter-form\"><input type=\"email\" placeholder=\"your@email.com\"><button>Subscribe</button></div>\n"
                "   </section>\n"
                if is_ecommerce else
                "SECTIONS TO GENERATE (in order, all with class=\"reveal\"):\n"
                "1. HERO: <section class=\"hero reveal\" style=\"background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:100px 0\">\n"
                "   <div class=\"content\" style=\"text-align:center\">\n"
                "   <span class=\"badge\" style=\"margin-bottom:20px;display:inline-block\">✨ NEW IN 2026</span>\n"
                "   <h1 class=\"hero__title\" style=\"color:#fff;font-size:clamp(40px,6vw,72px);font-weight:900;letter-spacing:-0.04em;margin-bottom:20px\">YOUR HEADLINE HERE</h1>\n"
                "   <p style=\"font-size:18px;color:rgba(255,255,255,.8);max-width:560px;margin:0 auto 32px\">Subtitle...</p>\n"
                "   <div class=\"hero__cta\"><a href=\"#\" class=\"btn--primary\">Get Started Free</a><a href=\"#\" class=\"btn--secondary\" style=\"color:#fff;border-color:rgba(255,255,255,.3)\">Watch Demo <i data-lucide=\"play\"></i></a></div>\n"
                "   </div></section>\n"
                "2. STATS: <section class=\"section reveal\"><div class=\"content\">\n"
                "   <div class=\"stats-grid\"><div><div class=\"stat-value\">50K+</div><div class=\"stat-label\">Teams</div></div>...</div>\n"
                "   </div></section>\n"
                "3. FEATURES: <section class=\"section bg-muted reveal\"><div class=\"content\">\n"
                "   <h2 class=\"section__title\">Everything you need</h2>\n"
                "   <div class=\"card-grid\"> (3+ feature cards using class=\"card\") </div>\n"
                "   </div></section>\n"
                "4. TESTIMONIALS: <section class=\"section reveal\"><div class=\"content\">\n"
                "   <h2 class=\"section__title\">Loved by teams</h2>\n"
                "   <div class=\"testimonial-grid\"> (3 testimonial-card) </div>\n"
                "   </div></section>\n"
                "5. PRICING: <section class=\"section bg-muted reveal\"><div class=\"content\">\n"
                "   <h2 class=\"section__title\">Simple pricing</h2>\n"
                "   <div class=\"pricing-grid\"> (3 pricing-card, middle has class='popular') </div>\n"
                "   </div></section>\n"
                "6. CTA: <section class=\"section reveal\" style=\"background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:24px;margin:0 32px 64px;text-align:center;color:#fff\">\n"
                "   <div style=\"padding:60px 32px\"><h2>Ready to get started?</h2><p>...</p><a href=\"#\" class=\"btn--primary\">Start Free Trial</a></div>\n"
                "   </section>\n"
                if is_landing else
                "SECTIONS TO GENERATE:\n"
                "Generate all appropriate page sections for this page.\n"
                )
            )
        elif ext == "css":
            css_vars = DesignSystemAgent.tokens_to_css_vars(design_tokens) if design_tokens else ""

            # Vibrant default palette injected when no design tokens provided
            _default_vars = "" if css_vars else (
                ":root {\n"
                + ("  --color-primary: #6366f1;\n  --color-primary-dark: #4f46e5;\n  --color-primary-light: #eef2ff;\n"
                   "  --color-background: #f8fafc;\n  --color-surface: #ffffff;\n  --color-surface-hover: #f1f5f9;\n"
                   "  --color-border: #e2e8f0;\n  --color-text: #0f172a;\n  --color-text-muted: #64748b;\n"
                   "  --color-success: #10b981;\n  --color-success-bg: #d1fae5;\n"
                   "  --color-danger: #ef4444;\n  --color-danger-bg: #fee2e2;\n"
                   "  --color-warning: #f59e0b;\n  --color-warning-bg: #fef3c7;\n"
                   "  --color-accent: #8b5cf6;\n"
                   "  --shadow-sm: 0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);\n"
                   "  --shadow-md: 0 4px 12px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.04);\n"
                   "  --shadow-lg: 0 10px 30px rgba(0,0,0,.1),0 4px 10px rgba(0,0,0,.05);\n"
                   "  --radius: 12px;\n  --radius-sm: 8px;\n  --radius-lg: 16px;\n"
                   "  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;\n"
                   if is_app else
                   "  --color-primary: #6366f1;\n  --color-primary-dark: #4f46e5;\n  --color-primary-light: #eef2ff;\n"
                   "  --color-background: #ffffff;\n  --color-surface: #f8fafc;\n  --color-surface-hover: #f1f5f9;\n"
                   "  --color-border: #e2e8f0;\n  --color-text: #0f172a;\n  --color-text-muted: #64748b;\n"
                   "  --color-success: #10b981;\n  --color-danger: #ef4444;\n  --color-accent: #8b5cf6;\n"
                   "  --shadow-sm: 0 1px 3px rgba(0,0,0,.08);\n  --shadow-md: 0 4px 12px rgba(0,0,0,.08);\n"
                   "  --shadow-lg: 0 20px 50px rgba(0,0,0,.12);\n"
                   "  --radius: 12px;\n  --radius-sm: 8px;\n  --radius-lg: 20px;\n"
                   "  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;\n"
                   )
                + "}\n"
                + "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n"
                + "body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }\n"
                + "a { text-decoration: none; color: inherit; }\n"
                + "img { max-width: 100%; display: block; }\n"
            )

            type_rules = (
                f"Generate ELITE, VIBRANT CSS for a {project_type.upper()} layout — Lovable.dev / v0.dev / Linear quality.\n"
                + (f"START with this exact :root block:\n{css_vars}\n\n" if css_vars else _default_vars + "\n")
                + "IMPLEMENT THESE EXACT LAYOUT CLASSES:\n"
                + ("1. .app-layout { display:flex; min-height:100vh; background:#f1f5f9; }\n" if is_app else "1. .marketing-layout, .ecommerce-layout { min-height:100vh; background:#fff; }\n")
                + ("/* DARK SIDEBAR — exactly like Lovable/Linear */\n"
                   "2. .sidebar { width:240px; flex-shrink:0; height:100vh; position:sticky; top:0; background:#1e1b4b; display:flex; flex-direction:column; overflow-y:auto; }\n"
                   "   .sidebar__brand { display:flex; align-items:center; gap:10px; padding:20px 16px; border-bottom:1px solid rgba(255,255,255,.08); }\n"
                   "   .sidebar__logo-icon { width:32px; height:32px; background:linear-gradient(135deg,#818cf8,#6366f1); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }\n"
                   "   .sidebar__logo-icon [data-lucide] { width:16px; height:16px; color:#fff; stroke-width:2.5; }\n"
                   "   .logo { font-size:15px; font-weight:700; color:#fff; text-decoration:none; letter-spacing:-0.01em; }\n"
                   "   .sidebar__nav { padding:12px 8px; display:flex; flex-direction:column; gap:2px; flex:1; }\n"
                   "   .sidebar__link { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; text-decoration:none; color:rgba(255,255,255,.55); font-size:13.5px; font-weight:500; transition:background .15s,color .15s; }\n"
                   "   .sidebar__link [data-lucide] { width:16px; height:16px; stroke-width:2; flex-shrink:0; }\n"
                   "   .sidebar__link:hover { background:rgba(255,255,255,.08); color:rgba(255,255,255,.9); }\n"
                   "   .sidebar__link.active, .sidebar__link[data-active='true'] { background:rgba(129,140,248,.18); color:#a5b4fc; }\n"
                   "   .sidebar__footer { padding:16px; border-top:1px solid rgba(255,255,255,.08); }\n"
                   "   .sidebar__plan { background:rgba(255,255,255,.06); border-radius:10px; padding:14px; }\n"
                   "   .sidebar__plan-name { color:#fff; font-size:12px; font-weight:600; margin-bottom:4px; }\n"
                   "   .sidebar__plan-sub { color:rgba(255,255,255,.4); font-size:11px; margin-bottom:10px; }\n"
                   "   .sidebar__upgrade-btn { display:block; text-align:center; background:#6366f1; color:#fff; border-radius:6px; padding:7px; font-size:12px; font-weight:600; text-decoration:none; transition:background .15s; }\n"
                   "   .sidebar__upgrade-btn:hover { background:#4f46e5; }\n"
                   if is_app else "2. .navbar { height:64px; position:sticky; top:0; z-index:100; background:#fff; border-bottom:1px solid #e2e8f0; }\n")
                + ("/* MAIN CONTAINER */\n"
                   "3. .main-container { flex:1; min-width:0; display:flex; flex-direction:column; background:#f1f5f9; }\n"
                   "   .navbar { height:64px; display:flex; align-items:center; gap:16px; padding:0 28px; background:#fff; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:10; }\n"
                   "   .navbar__left { flex-shrink:0; }\n"
                   "   .navbar__title { font-size:18px; font-weight:700; color:#0f172a; letter-spacing:-0.02em; }\n"
                   "   .navbar__search { flex:1; max-width:340px; display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0 12px; height:36px; }\n"
                   "   .navbar__search [data-lucide] { width:14px; height:14px; color:#94a3b8; flex-shrink:0; }\n"
                   "   .input-search { border:none; background:transparent; outline:none; font-size:13px; color:#0f172a; width:100%; }\n"
                   "   .navbar__actions { display:flex; align-items:center; gap:8px; margin-left:auto; }\n"
                   "   .btn-icon { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; cursor:pointer; color:#64748b; transition:all .15s; }\n"
                   "   .btn-icon:hover { background:#f8fafc; color:#0f172a; }\n"
                   "   .btn-icon [data-lucide] { width:15px; height:15px; }\n"
                   "   .btn-export { width:auto; padding:0 14px; gap:6px; font-size:13px; font-weight:600; }\n"
                   "   .user-profile { width:36px; height:36px; background:#6366f1; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0; }\n"
                   "   .main-view { flex:1; overflow-y:auto; }\n"
                   "   .view-content { padding:28px; display:flex; flex-direction:column; gap:24px; max-width:1400px; }\n"
                   if is_app else "3. .navbar__inner { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:100%; }\n")
                + (
                  "/* KPI CARDS — 2x2 grid like Lovable, icon on right */\n"
                  "4. .kpi-cards { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }\n"
                  "   .kpi-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px 24px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; box-shadow:0 1px 3px rgba(0,0,0,.06); transition:box-shadow .2s,transform .2s; }\n"
                  "   .kpi-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); transform:translateY(-2px); }\n"
                  "   .kpi-card__body { display:flex; flex-direction:column; gap:6px; }\n"
                  "   .kpi-card__title { font-size:12px; font-weight:500; color:#64748b; }\n"
                  "   .kpi-value { font-size:26px; font-weight:700; color:#0f172a; letter-spacing:-0.03em; line-height:1.1; }\n"
                  "   .kpi-change { display:inline-flex; align-items:center; gap:3px; font-size:12px; font-weight:600; padding:2px 8px; border-radius:99px; background:#dcfce7; color:#16a34a; }\n"
                  "   .kpi-change.down { background:#fee2e2; color:#dc2626; }\n"
                  "   .kpi-card__icon { width:40px; height:40px; border-radius:10px; background:#eef2ff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }\n"
                  "   .kpi-card__icon [data-lucide] { width:20px; height:20px; color:#6366f1; stroke-width:1.75; }\n"
                  "/* CHARTS */\n"
                  "5. .charts-grid { display:grid; grid-template-columns:2fr 1fr; gap:16px; }\n"
                  "   .chart-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px 24px; box-shadow:0 1px 3px rgba(0,0,0,.06); }\n"
                  "   .chart-card__title { font-size:14px; font-weight:600; color:#0f172a; margin-bottom:4px; }\n"
                  "   .chart-card__sub { font-size:12px; color:#94a3b8; margin-bottom:16px; }\n"
                  "   .chart-container { position:relative; height:240px; width:100%; }\n"
                  "   .chart-canvas { width:100% !important; height:100% !important; display:block; }\n"
                  "/* TABLE */\n"
                  "6. .table-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }\n"
                  "   .table-card__header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #f1f5f9; }\n"
                  "   .table-card__title { font-size:14px; font-weight:600; color:#0f172a; }\n"
                  "   table.data-table, table.user-list { width:100%; border-collapse:collapse; }\n"
                  "   table th { padding:11px 20px; text-align:left; font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; background:#f8fafc; border-bottom:1px solid #e2e8f0; }\n"
                  "   table td { padding:13px 20px; font-size:13px; color:#0f172a; border-bottom:1px solid #f1f5f9; }\n"
                  "   table tbody tr:last-child td { border-bottom:none; }\n"
                  "   table tbody tr:hover td { background:#f8fafc; }\n"
                  "/* STATUS BADGES */\n"
                  "7. .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; background:#dcfce7; color:#16a34a; }\n"
                  "   .badge.trial { background:#fef9c3; color:#ca8a04; }\n"
                  "   .badge.paused, .badge.inactive { background:#fee2e2; color:#dc2626; }\n"
                  "/* REVEAL ANIMATION — safe: visible by default, hidden only after body.js-ready */\n"
                  "8. .reveal { transition:opacity .5s ease,transform .5s ease; }\n"
                  "   body.js-ready .reveal { opacity:0; transform:translateY(20px); }\n"
                  "   body.js-ready .reveal.revealed { opacity:1; transform:translateY(0); }\n"
                  "/* ICONS */\n"
                  "9. [data-lucide] { width:16px; height:16px; stroke-width:2; vertical-align:middle; flex-shrink:0; }\n"
                  "/* RESPONSIVE */\n"
                  "10. .hamburger { display:none; width:36px; height:36px; align-items:center; justify-content:center; border:1px solid #e2e8f0; border-radius:8px; background:none; cursor:pointer; font-size:18px; }\n"
                  "    @media(max-width:1200px){ .kpi-cards{grid-template-columns:repeat(2,1fr);} }\n"
                  "    @media(max-width:900px){ .charts-grid{grid-template-columns:1fr;} }\n"
                  "    @media(max-width:768px){ .sidebar{display:none;} .hamburger{display:flex;} .kpi-cards{grid-template-columns:1fr 1fr;} .view-content{padding:16px;} }\n"
                  if is_app else
                  "/* ECOMMERCE PRODUCT GRID */\n"
                  "4. .products-section { padding:60px 0; }\n"
                  "   .products-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; }\n"
                  "   .products-header h2 { font-size:28px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; }\n"
                  "   .product-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }\n"
                  "   @media(max-width:1100px){ .product-grid{grid-template-columns:repeat(3,1fr);} }\n"
                  "   @media(max-width:768px){ .product-grid{grid-template-columns:repeat(2,1fr);} }\n"
                  "   @media(max-width:480px){ .product-grid{grid-template-columns:1fr;} }\n"
                  "/* PRODUCT CARD */\n"
                  "5. .product-card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.07); transition:transform .25s,box-shadow .25s; cursor:pointer; }\n"
                  "   .product-card:hover { transform:translateY(-6px); box-shadow:0 12px 32px rgba(0,0,0,.12); }\n"
                  "   .product-card__image { position:relative; aspect-ratio:1/1; overflow:hidden; background:#f8fafc; }\n"
                  "   .product-card__image img { width:100%; height:100%; object-fit:cover; transition:transform .4s; }\n"
                  "   .product-card:hover .product-card__image img { transform:scale(1.06); }\n"
                  "   .product-card__badges { position:absolute; top:12px; left:12px; display:flex; gap:6px; flex-wrap:wrap; }\n"
                  "   .product-card__body { padding:16px; }\n"
                  "   .product-card__brand { font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }\n"
                  "   .product-card__name { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:8px; line-height:1.3; }\n"
                  "   .product-card__rating { display:flex; align-items:center; gap:6px; margin-bottom:12px; }\n"
                  "   .stars { color:#f59e0b; font-size:12px; letter-spacing:1px; }\n"
                  "   .rating-count { font-size:11px; color:#94a3b8; }\n"
                  "   .product-card__footer { display:flex; align-items:center; justify-content:space-between; }\n"
                  "   .product-price { font-size:20px; font-weight:800; color:#0f172a; }\n"
                  "   .product-price--original { font-size:13px; font-weight:500; color:#94a3b8; text-decoration:line-through; margin-left:6px; }\n"
                  "   .btn-add-cart { display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:#6366f1; color:#fff; border:none; border-radius:10px; cursor:pointer; transition:background .15s,transform .15s; }\n"
                  "   .btn-add-cart:hover { background:#4f46e5; transform:scale(1.08); }\n"
                  "/* BADGES */\n"
                  "6. .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }\n"
                  "   .badge--sale { background:#fef2f2; color:#dc2626; }\n"
                  "   .badge--new { background:#f0fdf4; color:#16a34a; }\n"
                  "   .badge--best { background:#fefce8; color:#ca8a04; }\n"
                  "   .badge--low { background:#fff7ed; color:#ea580c; }\n"
                  "/* FILTER SIDEBAR */\n"
                  "7. .shop-layout { display:grid; grid-template-columns:240px 1fr; gap:32px; padding:40px 0; }\n"
                  "   @media(max-width:900px){ .shop-layout{grid-template-columns:1fr;} .filter-sidebar{display:none;} }\n"
                  "   .filter-sidebar { position:sticky; top:80px; align-self:start; }\n"
                  "   .filter-group { margin-bottom:28px; }\n"
                  "   .filter-group__title { font-size:12px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:.08em; margin-bottom:12px; }\n"
                  "   .filter-option { display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; }\n"
                  "   .filter-option input[type=checkbox] { accent-color:#6366f1; width:16px; height:16px; }\n"
                  "   .filter-option label { font-size:13px; color:#334155; cursor:pointer; }\n"
                  "   .filter-option:hover label { color:#6366f1; }\n"
                  "/* HERO BANNER */\n"
                  "8. .hero { position:relative; overflow:hidden; }\n"
                  "   .hero__inner { max-width:1280px; margin:0 auto; padding:80px 32px; display:flex; align-items:center; gap:48px; }\n"
                  "   .hero__content { flex:1; }\n"
                  "   .hero__tag { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:rgba(99,102,241,.1); color:#6366f1; border-radius:99px; font-size:12px; font-weight:700; margin-bottom:20px; }\n"
                  "   .hero__title { font-size:clamp(36px,5vw,64px); font-weight:900; color:#0f172a; letter-spacing:-0.04em; line-height:1.05; margin-bottom:20px; }\n"
                  "   .hero__sub { font-size:18px; color:#64748b; line-height:1.6; margin-bottom:32px; max-width:480px; }\n"
                  "   .hero__cta { display:flex; gap:12px; flex-wrap:wrap; }\n"
                  "   .btn-primary { padding:14px 28px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:transform .2s,box-shadow .2s; box-shadow:0 4px 20px rgba(99,102,241,.4); }\n"
                  "   .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.5); }\n"
                  "   .btn-secondary { padding:14px 28px; background:#fff; color:#0f172a; border:1.5px solid #e2e8f0; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; transition:border-color .2s,background .2s; }\n"
                  "   .btn-secondary:hover { border-color:#6366f1; background:#f8f7ff; }\n"
                  "/* CART SIDEBAR */\n"
                  "9. .cart-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:200; opacity:0; pointer-events:none; transition:opacity .3s; }\n"
                  "   .cart-overlay.open { opacity:1; pointer-events:all; }\n"
                  "   .cart-drawer { position:fixed; top:0; right:0; height:100vh; width:380px; background:#fff; box-shadow:-8px 0 32px rgba(0,0,0,.12); z-index:201; transform:translateX(100%); transition:transform .35s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:column; }\n"
                  "   .cart-drawer.open { transform:translateX(0); }\n"
                  "   .cart-drawer__header { padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; }\n"
                  "   .cart-drawer__title { font-size:18px; font-weight:700; color:#0f172a; }\n"
                  "   .cart-items { flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; }\n"
                  "   .cart-item { display:flex; gap:12px; align-items:center; }\n"
                  "   .cart-item__img { width:64px; height:64px; border-radius:10px; object-fit:cover; background:#f1f5f9; flex-shrink:0; }\n"
                  "   .cart-item__name { font-size:13px; font-weight:600; color:#0f172a; }\n"
                  "   .cart-item__price { font-size:14px; font-weight:700; color:#6366f1; }\n"
                  "   .cart-footer { padding:20px 24px; border-top:1px solid #f1f5f9; }\n"
                  "   .cart-total { display:flex; align-items:center; justify-content:space-between; font-size:16px; font-weight:700; color:#0f172a; margin-bottom:16px; }\n"
                  "   .btn-checkout { width:100%; padding:16px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity .2s; }\n"
                  "   .btn-checkout:hover { opacity:.9; }\n"
                  "/* NAVBAR */\n"
                  "10. .navbar { height:68px; background:#fff; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:100; }\n"
                  "    .navbar__inner { max-width:1280px; margin:0 auto; padding:0 32px; height:100%; display:flex; align-items:center; gap:24px; }\n"
                  "    .nav-logo { font-size:20px; font-weight:900; color:#0f172a; text-decoration:none; letter-spacing:-0.04em; }\n"
                  "    .nav-links { display:flex; align-items:center; gap:4px; margin:0 auto; list-style:none; padding:0; }\n"
                  "    .nav-links a { padding:7px 14px; border-radius:8px; font-size:14px; font-weight:500; color:#64748b; text-decoration:none; transition:background .15s,color .15s; }\n"
                  "    .nav-links a:hover, .nav-links a.active { background:#f1f5f9; color:#0f172a; }\n"
                  "    .nav-actions { display:flex; align-items:center; gap:8px; }\n"
                  "    .cart-btn { position:relative; display:flex; align-items:center; gap:6px; padding:8px 16px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; }\n"
                  "    .cart-btn:hover { background:#1e293b; }\n"
                  "    .cart-count { position:absolute; top:-6px; right:-6px; background:#6366f1; color:#fff; font-size:10px; font-weight:700; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; }\n"
                  "/* NEWSLETTER */\n"
                  "11. .newsletter { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:80px 32px; text-align:center; }\n"
                  "    .newsletter h2 { font-size:32px; font-weight:800; color:#fff; margin-bottom:12px; letter-spacing:-0.03em; }\n"
                  "    .newsletter p { color:rgba(255,255,255,.75); font-size:16px; margin-bottom:28px; }\n"
                  "    .newsletter-form { display:flex; max-width:420px; margin:0 auto; gap:8px; }\n"
                  "    .newsletter-form input { flex:1; padding:14px 18px; border:none; border-radius:10px; font-size:14px; outline:none; }\n"
                  "    .newsletter-form button { padding:14px 22px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; white-space:nowrap; transition:background .15s; }\n"
                  "    .newsletter-form button:hover { background:#1e293b; }\n"
                  "/* REVEAL — safe: visible by default, hidden only after body.js-ready */\n"
                  "12. .reveal { transition:opacity .5s ease,transform .5s ease; }\n"
                  "    body.js-ready .reveal { opacity:0; transform:translateY(20px); }\n"
                  "    body.js-ready .reveal.revealed { opacity:1; transform:translateY(0); }\n"
                  "/* ICONS */\n"
                  "13. [data-lucide] { width:16px; height:16px; stroke-width:2; vertical-align:middle; flex-shrink:0; }\n"
                  "/* CONTAINER */\n"
                  "14. .container { max-width:1280px; margin:0 auto; padding:0 32px; }\n"
                  "    @media(max-width:768px){ .container{padding:0 16px;} .hero__inner{flex-direction:column;} .cart-drawer{width:100%;} }\n"
                )
                + "/* FOOTER */\n"
                  ".footer { background:#0f172a; color:#fff; padding:60px 0 24px; }\n"
                  ".footer__grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:40px; max-width:1280px; margin:0 auto; padding:0 32px; margin-bottom:40px; }\n"
                  ".footer__brand-name { font-size:20px; font-weight:900; letter-spacing:-0.03em; margin-bottom:12px; }\n"
                  ".footer__brand-desc { font-size:13px; color:rgba(255,255,255,.45); line-height:1.6; }\n"
                  ".footer__col-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:rgba(255,255,255,.35); margin-bottom:16px; }\n"
                  ".footer__links { list-style:none; padding:0; display:flex; flex-direction:column; gap:10px; }\n"
                  ".footer__links a { font-size:13px; color:rgba(255,255,255,.5); text-decoration:none; transition:color .15s; }\n"
                  ".footer__links a:hover { color:#fff; }\n"
                  ".footer__bottom { max-width:1280px; margin:0 auto; padding:20px 32px 0; border-top:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; }\n"
                  ".footer__copy { font-size:12px; color:rgba(255,255,255,.3); }\n"
                  "@media(max-width:900px){ .footer__grid{grid-template-columns:1fr 1fr;} }\n"
                  "@media(max-width:600px){ .footer__grid{grid-template-columns:1fr;} }\n"
            )
        elif ext == "js":
            chart_rules = ""
            if is_app:
                chart_rules = (
                    "5. Chart.js — initialize every <canvas class='chart-canvas'> found in the DOM:\n"
                    "   Revenue line chart (id='chart-revenue'): type:'line', labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], "
                    "data:[42,67,55,81,73,95,88,71,84,92,87,110], tension:0.4, fill:true, "
                    "borderColor use getComputedStyle to read --color-primary, backgroundColor rgba(primary,0.1), "
                    "options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.05)'}}}}\n"
                    "   Users bar chart (id='chart-users'): type:'bar', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], "
                    "data:[120,190,150,210,180,90,130], borderRadius:6, backgroundColor:'rgba(99,102,241,0.7)', "
                    "options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}\n"
                    "   Distribution donut (id='chart-distribution'): type:'doughnut', "
                    "labels:['Enterprise','Pro','Starter'], data:[45,35,20], "
                    "backgroundColor:['#3b82f6','#8b5cf6','#06b6d4'], "
                    "options:{responsive:true,maintainAspectRatio:false,cutout:'75%',plugins:{legend:{position:'bottom'}}}\n"
                    "6. KPI animated counters: use requestAnimationFrame to count up every .kpi-value from 0 to its data-target on load.\n"
                )
            type_rules = (
                "Mission-critical ES6+ JS, focused on performance and interaction.\n"
                "1. Initialization: document.body.classList.add('js-ready') on DOMContentLoad. "
                "If window.lucide exists call lucide.createIcons().\n"
                + (
                "2. Sidebar mobile toggle: hamburger click toggles class 'open' on .sidebar element "
                "(NOT .nav-links — that selector doesn't exist in this layout). "
                "Guard: const sidebar = document.querySelector('.sidebar'); if (sidebar) { hamburger.addEventListener('click', () => sidebar.classList.toggle('open')); }\n"
                if is_app else
                "2. Mobile Nav: hamburger click toggles class 'open' on .nav-links element. "
                "Guard: const nav = document.querySelector('.nav-links'); if (nav) { hamburger?.addEventListener('click', () => nav.classList.toggle('open')); }\n"
                + (
                "2b. Cart Drawer: .cart-btn / .cart-trigger click opens .cart-drawer and .cart-overlay by adding class 'open'. "
                "Clicking .cart-overlay removes 'open' from both. Guard all selectors with null checks.\n"
                "2c. Add to Cart: .btn-add-cart click increments .cart-count text by 1 (parse int, add, update innerText).\n"
                if is_ecommerce else "")
                )
                + "3. IntersectionObserver for '.reveal' adding '.revealed' on elements entering viewport.\n"
                "4. Active State: highlight current page's .sidebar__link or .nav-link by matching href to window.location.pathname.\n"
                f"{chart_rules}"
                "7. Tab panels: .tab-btn click shows matching .tab-panel, hides others, updates aria-selected.\n"
                "8. Scroll: add class 'scrolled' to .navbar when scrollY > 60 (for shadow effect).\n"
                "SAFETY: wrap ALL querySelector results in null checks before calling .addEventListener or .classList.\n"
            )
        else:
            type_rules = f"Generate complete content for this {ext} file.\n"

        _is_html = ext in ("html", "htm")
        sys_msg = (
            f"You are an elite UI engineer building production software at the level of Lovable.dev, v0.dev, Linear, and Vercel.\n"
            + (
                "Output ONLY the inner HTML sections for <main>. NO <!doctype>, NO <html>, NO <head>, NO <body>, NO <header>, NO <footer>, NO <nav>. Just the content sections.\n"
                "TAILWIND IS LOADED — use Tailwind utility classes for ALL styling (layout, spacing, colors, typography, shadows, rounded corners).\n"
                "Tailwind color palette: indigo-600=#6366f1, indigo-500=#6366f1, violet-600=#7c3aed, slate-900=#0f172a, slate-600=#475569, slate-400=#94a3b8\n"
                "You MAY also add inline style= for gradients and custom values Tailwind can't express.\n"
                "Keep custom CSS classes ONLY for: .reveal animation, .chart-canvas, and .product-card hover image zoom.\n"
                if _is_html else
                f"Output ONLY raw {ext.upper() if ext else 'code'} for '{path}'. Zero markdown fences. Zero prose. Zero explanations.\n"
            )
            + "MANDATORY QUALITY BAR — violating any of these is a failure:\n"
            "  - TAILWIND-FIRST: Every element styled with Tailwind classes. bg-white, rounded-2xl, shadow-md, p-6, flex, grid, gap-4 etc.\n"
            "  - VIBRANT: Rich indigo/violet gradients on hero. bg-gradient-to-br from-indigo-600 to-violet-600. White text on dark backgrounds.\n"
            "  - TYPOGRAPHY: font-bold, font-extrabold, font-black for headings. tracking-tight. text-slate-900 for body.\n"
            "  - DEPTH: shadow-sm on cards, shadow-lg on hover. transition hover:-translate-y-1.5 for card lifts.\n"
            "  - POPULATED: Real names, real numbers, real dates everywhere. ZERO Lorem Ipsum.\n"
            "  - COMPLETE: Generate ALL sections listed. No stubs, no TODOs, no '...' or ellipsis.\n"
            "  - RICH: More sections, more content, more rows is always better than sparse output.\n"
        )

        # Realistic dummy data injected per project type
        dummy_data = ""
        if ext in ("html", "htm"):
            if is_app:
                dummy_data = (
                    "\n=== REALISTIC DATA — populate EVERY element with this (never use Lorem Ipsum) ===\n"
                    "KPIs: Total Revenue $127,840 (+12.4%) | Active Users 8,429 (+3.1%) | Conversion 4.7% (-0.3%) | Churn 1.2% (-0.8%)\n"
                    "Chart canvas IDs to include: chart-revenue (line), chart-users (bar), chart-distribution (donut)\n"
                    "Add data-target attribute on .kpi-value for animated counters: data-target='127840'\n"
                    "Table rows:\n"
                    "  Sarah Johnson | Enterprise | $4,200/mo | <span class='badge'>Active</span> | Mar 10 2026 | sarah@acme.com\n"
                    "  Marcus Chen   | Pro        | $299/mo   | <span class='badge'>Active</span> | Mar 8 2026  | m.chen@startup.io\n"
                    "  Priya Patel   | Starter    | $49/mo    | <span class='badge'>Trial</span>  | Mar 5 2026  | priya@patel.dev\n"
                    "  James Wilson  | Enterprise | $4,200/mo | <span class='badge'>Paused</span> | Feb 28 2026 | jwilson@corp.com\n"
                    "  Aisha Torres  | Pro        | $299/mo   | <span class='badge'>Active</span> | Feb 25 2026 | aisha.t@ventures.co\n"
                    "NOTE: Navbar, sidebar, and footer are pre-built — generate ONLY the main content sections.\n"
                )
            elif is_ecommerce:
                dummy_data = (
                    "\n=== REALISTIC DATA — populate EVERY element with this ===\n"
                    "MANDATORY: Use class='product-grid' with display:grid of 4 columns for ALL product listings.\n"
                    "MANDATORY: Each product MUST use class='product-card' structure shown in CLASS NAMES section above.\n"
                    "Products to include (fill in ALL 6 in the product-grid):\n"
                    "  1. Nike Air Max Pro 2026 | Brand: Nike | $189 (was $249) | ★★★★★ 4.8 (2,341 reviews) | badge: badge--new\n"
                    "  2. Urban Slim Hoodie     | Brand: Adidas | $79          | ★★★★☆ 4.6 (891 reviews) | badge: badge--sale -30%\n"
                    "  3. Leather Minimal Wallet| Brand: Coach | $49           | ★★★★★ 4.9 (456 reviews) | badge: badge--best BESTSELLER\n"
                    "  4. Retro Runner 90s      | Brand: New Balance | $159    | ★★★★★ 4.7 (1,204 reviews) | badge: badge--low Only 3 left\n"
                    "  5. Cargo Utility Pants   | Brand: Carhartt | $129       | ★★★★☆ 4.5 (673 reviews) |\n"
                    "  6. Merino Wool Tee       | Brand: Uniqlo | $65          | ★★★★★ 4.8 (329 reviews) |\n"
                    "NOTE: Navbar and footer are pre-built — generate ONLY the hero + products + newsletter sections.\n"
                    "Footer: class='footer' with footer__grid, footer__links — 4 columns: Brand, Shop, Support, Follow.\n"
                )
            elif is_landing:
                dummy_data = (
                    "\n=== REALISTIC DATA — populate EVERY element with this ===\n"
                    "Testimonials: 'This saved our team 10 hours/week.' — Sarah K., CTO @ Verve | 4.9/5 from 2,847 reviews\n"
                    "              'Best investment we made this year.' — James T., Founder @ Loop\n"
                    "Stats: 50,000+ teams | 99.9% uptime | 4.9/5 rating | <10min setup\n"
                    "Pricing: Free $0/mo (5 projects, 1GB), Pro $29/mo (unlimited, most popular), Enterprise $99/mo (custom)\n"
                    "Features: Ship 10x faster | Zero downtime deploys | Built-in analytics | SOC2 compliant\n"
                )

        user_msg = (
            f"=== USER SPEC (FOLLOW THIS) ===\n"
            f"{spec_block}\n\n"
            f"=== TASK ===\n"
            f"FILE: {path}\n"
            f"DESCRIPTION: {desc}\n"
            f"PROJECT: {plan.get('summary', '')}\n"
            f"ALL PAGES: {', '.join(all_paths)}\n"
            f"REQUIREMENTS: {'; '.join(str(r)[:80] for r in plan.get('requirements', [])[:8])}\n\n"
            f"{type_rules}\n"
            f"{design_ctx}"
            f"{gen_ctx}"
            f"{dummy_data}"
        )

        raw = self.provider.chat(sys_msg, user_msg)
        content = self._clean_code_output(raw)

        # Post-process HTML: extract inner sections, fix classes, wrap with deterministic shell
        if ext in ("html", "htm"):
            inner = self._extract_main_content(content)
            inner = self._fix_html_classes(inner)
            content = _html_top + inner + _html_bottom

        # Sanity check: detect degenerate repetitive output from small models
        if ext == "js" and len(content) > 5000:
            # If JS is over 5KB it's likely hallucinated — use fallback
            logger.warning("JS output suspiciously large (%d chars), using fallback", len(content))
            return _FALLBACK_JS

        return content

    # ── main entry point ─────────────────────────────────────────────────

    def generate(
        self,
        req: GenerateRequest,
        pack: SourcePack,
        plan: dict[str, Any],
        design_tokens: dict[str, Any] | None = None,
    ) -> CodeBundle:
        context_chunks = [i.content for i in pack.items if i.kind == "context"]
        context = "\n\n".join(context_chunks).strip()
        logger.info("LlmCodegenAgent: context has %d chunks, %d chars, preview: %.200s",
                    len(context_chunks), len(context), context[:200])

        plan_files = plan.get("files", [])
        if not plan_files:
            raise ValueError("Plan has no files to generate")

        # Order: HTML first → CSS (can reference HTML classes) → JS → rest
        html_files = [f for f in plan_files if str(f.get("path", "")).endswith((".html", ".htm"))]
        css_files = [f for f in plan_files if str(f.get("path", "")).endswith(".css")]
        js_files = [f for f in plan_files if str(f.get("path", "")).endswith(".js")]
        other = [f for f in plan_files if f not in html_files and f not in css_files and f not in js_files]
        ordered = html_files + css_files + js_files + other

        generated: list[dict[str, str]] = []
        errors: list[str] = []

        # Pre-build the deterministic CSS custom properties block
        css_vars_block = ""
        if design_tokens:
            css_vars_block = DesignSystemAgent.tokens_to_css_vars(design_tokens)

        for idx, file_info in enumerate(ordered, 1):
            path = file_info.get("path", "unknown")
            logger.info("LlmCodegenAgent: generating %s (%d/%d)", path, idx, len(ordered))
            # Small delay between calls to stay within rate-limit windows
            if idx > 1:
                _time.sleep(3)
            max_retries = 4
            for attempt in range(max_retries + 1):
                try:
                    content = self._generate_single_file(file_info, plan, context, generated, design_tokens)
                    if not content.strip():
                        raise ValueError("Empty output from coder model")

                    # Deterministic CSS injection: ensure :root vars are always present
                    if path.endswith(".css") and css_vars_block:
                        if ":root" not in content[:500]:
                            content = css_vars_block + "\n\n" + content

                    # Sanitize unsafe reveal CSS — LLM often writes `.reveal{opacity:0}`
                    # without the `body.js-ready` guard, making all page content invisible.
                    if path.endswith(".css"):
                        # Replace bare `.reveal { ... opacity: 0 ... }` blocks with the safe pattern
                        content = _re.sub(
                            r'\.reveal\s*\{[^}]*opacity\s*:\s*0[^}]*\}',
                            '.reveal{transition:opacity .5s ease,transform .5s ease}',
                            content, flags=_re.IGNORECASE
                        )

                    # Inject hardcoded structural base CSS — guarantees all layout
                    # classes exist even when the 8b model ignores instructions
                    if path.endswith(".css"):
                        _pt = plan.get("_meta", {}).get("project_type", "generic")
                        if _pt in ("dashboard", "app"):
                            _base = _BASE_CSS_APP
                        elif _pt == "ecommerce":
                            _base = _BASE_CSS_ECOMMERCE
                        else:
                            _base = _BASE_CSS_LANDING
                        content = _base + "\n\n/* ── LLM THEME OVERRIDES ── */\n" + content

                    generated.append({"path": path, "content": content})
                    logger.info("LlmCodegenAgent: %s OK (%d chars)", path, len(content))
                    break
                except Exception as e:  # noqa: BLE001
                    is_rate_limit = "429" in str(e)
                    if is_rate_limit and attempt < max_retries:
                        wait = 5 * (2 ** attempt)  # 5s, 10s, 20s, 40s
                        logger.warning(
                            "Rate limit hit for %s, retrying in %ds (attempt %d/%d)",
                            path, wait, attempt + 1, max_retries,
                        )
                        _time.sleep(wait)
                        continue
                    err_msg = f"{path}: {type(e).__name__}: {e}"
                    errors.append(err_msg)
                    logger.exception("LlmCodegenAgent: failed to generate %s", path)
                    # Build a human-readable error detail
                    if isinstance(e, httpx.HTTPStatusError):
                        status = e.response.status_code
                        _hints = {
                            401: "Invalid or missing API key — check your .env file",
                            403: "Access forbidden — check your API key permissions",
                            429: "Rate limit exceeded — wait and retry",
                            400: "Bad request — the model may have rejected the prompt",
                        }
                        err_detail = f"HTTP {status}: {_hints.get(status, e.response.reason_phrase)}"
                    else:
                        err_detail = f"{type(e).__name__}: {str(e)[:300]}"
                    if path.endswith((".html", ".htm")):
                        generated.append({
                            "path": path,
                            "content": (
                                "<!doctype html><html lang='en'><head><meta charset='UTF-8'>"
                                "<meta name='viewport' content='width=device-width,initial-scale=1.0'>"
                                f"<title>Error</title><link rel='stylesheet' href='styles.css'></head>"
                                f"<body><main style='padding:2rem'>"
                                f"<h1>Failed to generate {path}</h1>"
                                f"<p>Error: {err_detail}</p>"
                                f"</main></body></html>"
                            ),
                        })
                    elif path.endswith(".css"):
                        # Use the design tokens CSS as fallback instead of a stub
                        generated.append({
                            "path": path,
                            "content": css_vars_block + "\n" + _FALLBACK_CSS if css_vars_block else _FALLBACK_CSS,
                        })
                    else:
                        generated.append({"path": path, "content": f"/* Generation failed: {type(e).__name__} */"})
                    break

        if not any(g["content"].strip() and "Generation failed" not in g["content"] for g in generated):
            raise ValueError("All files failed to generate: " + "; ".join(errors))

        return CodeBundle(files=[CodeFile(path=f["path"], content=f["content"]) for f in generated])


# ── Hardcoded base CSS templates injected deterministically ──────────────
_BASE_CSS_APP = """\
/* === APP BASE LAYOUT (always injected, not LLM-generated) === */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.5}
a{text-decoration:none;color:inherit}
img{max-width:100%;display:block}
ul{list-style:none;padding:0}

/* APP LAYOUT */
.app-layout{display:flex;min-height:100vh;background:#f1f5f9}

/* SIDEBAR */
.sidebar{width:240px;flex-shrink:0;height:100vh;position:sticky;top:0;background:#1e1b4b;display:flex;flex-direction:column;overflow-y:auto;z-index:50}
.sidebar__brand{display:flex;align-items:center;gap:10px;padding:20px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
.sidebar__logo-icon{width:32px;height:32px;background:linear-gradient(135deg,#818cf8,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sidebar__logo-icon [data-lucide]{width:16px;height:16px;color:#fff;stroke-width:2.5}
.logo{font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em}
.sidebar__nav{padding:12px 8px;display:flex;flex-direction:column;gap:2px;flex:1}
.sidebar__link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;text-decoration:none;color:rgba(255,255,255,.55);font-size:13.5px;font-weight:500;transition:background .15s,color .15s}
.sidebar__link [data-lucide]{width:16px;height:16px;stroke-width:2;flex-shrink:0}
.sidebar__link:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.9)}
.sidebar__link.active,.sidebar__link[data-active='true']{background:rgba(129,140,248,.18);color:#a5b4fc}
.sidebar__footer{padding:16px;border-top:1px solid rgba(255,255,255,.08)}
.sidebar__plan{background:rgba(255,255,255,.06);border-radius:10px;padding:14px}
.sidebar__plan-name{color:#fff;font-size:12px;font-weight:600;margin-bottom:4px}
.sidebar__plan-sub{color:rgba(255,255,255,.4);font-size:11px;margin-bottom:10px}
.sidebar__upgrade-btn{display:block;text-align:center;background:#6366f1;color:#fff;border-radius:6px;padding:7px;font-size:12px;font-weight:600;text-decoration:none;transition:background .15s}
.sidebar__upgrade-btn:hover{background:#4f46e5}

/* MAIN CONTAINER */
.main-container{flex:1;min-width:0;display:flex;flex-direction:column;background:#f1f5f9}
.navbar{height:64px;display:flex;align-items:center;gap:16px;padding:0 28px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:10;box-shadow:none;transition:box-shadow .2s}
.navbar.scrolled{box-shadow:0 2px 8px rgba(0,0,0,.06)}
.navbar__left{flex-shrink:0}
.navbar__title{font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em}
.navbar__search{flex:1;max-width:340px;display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;height:36px}
.navbar__search [data-lucide]{width:14px;height:14px;color:#94a3b8;flex-shrink:0}
.input-search{border:none;background:transparent;outline:none;font-size:13px;color:#0f172a;width:100%}
.navbar__actions{display:flex;align-items:center;gap:8px;margin-left:auto}
.btn-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;color:#64748b;transition:all .15s}
.btn-icon:hover{background:#f8fafc;color:#0f172a}
.btn-icon [data-lucide]{width:15px;height:15px}
.btn-export{width:auto;padding:0 14px;gap:6px;font-size:13px;font-weight:600}
.user-profile{width:36px;height:36px;background:#6366f1;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0}
.main-view{flex:1;overflow-y:auto}
.view-content{padding:28px;display:flex;flex-direction:column;gap:24px;max-width:1400px}

/* KPI CARDS */
.kpi-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.kpi-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:box-shadow .2s,transform .2s}
.kpi-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-2px)}
.kpi-card__body{display:flex;flex-direction:column;gap:6px}
.kpi-card__title{font-size:12px;font-weight:500;color:#64748b}
.kpi-value{font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.03em;line-height:1.1}
.kpi-change{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:99px;background:#dcfce7;color:#16a34a}
.kpi-change.down{background:#fee2e2;color:#dc2626}
.kpi-card__icon{width:40px;height:40px;border-radius:10px;background:#eef2ff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.kpi-card__icon [data-lucide]{width:20px;height:20px;color:#6366f1;stroke-width:1.75}

/* CHARTS */
.charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}
.chart-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.chart-card__title{font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px}
.chart-card__sub{font-size:12px;color:#94a3b8;margin-bottom:16px}
.chart-container{position:relative;height:240px;width:100%}
.chart-canvas{width:100%!important;height:100%!important;display:block}

/* TABLE */
.table-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.table-card__header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #f1f5f9}
.table-card__title{font-size:14px;font-weight:600;color:#0f172a}
table.data-table,table.user-list{width:100%;border-collapse:collapse}
table th{padding:11px 20px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;border-bottom:1px solid #e2e8f0}
table td{padding:13px 20px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9}
table tbody tr:last-child td{border-bottom:none}
table tbody tr:hover td{background:#f8fafc}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;background:#dcfce7;color:#16a34a}
.badge.trial{background:#fef9c3;color:#ca8a04}
.badge.paused,.badge.inactive{background:#fee2e2;color:#dc2626}

/* ICONS */
[data-lucide]{width:16px;height:16px;stroke-width:2;vertical-align:middle;flex-shrink:0}

/* REVEAL — safe pattern: content visible by default, hidden only after JS loads */
.reveal{transition:opacity .5s ease,transform .5s ease}
body.js-ready .reveal{opacity:0;transform:translateY(20px)}
body.js-ready .reveal.revealed{opacity:1;transform:translateY(0)}

/* MOBILE */
.hamburger{display:none;width:36px;height:36px;align-items:center;justify-content:center;border:1px solid #e2e8f0;border-radius:8px;background:none;cursor:pointer;font-size:18px}
.sidebar.open{transform:translateX(0)!important}
@media(max-width:1300px){.kpi-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.charts-grid{grid-template-columns:1fr}}
@media(max-width:768px){.sidebar{display:none;position:fixed;height:100%;z-index:200}.sidebar.open{display:flex}.hamburger{display:flex}.kpi-cards{grid-template-columns:1fr 1fr}.view-content{padding:16px}}
@media(max-width:480px){.kpi-cards{grid-template-columns:1fr}}
"""

_BASE_CSS_ECOMMERCE = """\
/* === ECOMMERCE BASE LAYOUT (always injected, not LLM-generated) === */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.5;background:#fff;color:#0f172a}
a{text-decoration:none;color:inherit}
img{max-width:100%;display:block}
ul{list-style:none;padding:0}

/* CONTAINER */
.container{max-width:1280px;margin:0 auto;padding:0 32px}
@media(max-width:768px){.container{padding:0 16px}}

/* NAVBAR */
.navbar{height:68px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:100}
.navbar__inner{max-width:1280px;margin:0 auto;padding:0 32px;height:100%;display:flex;align-items:center;gap:24px}
.nav-logo{font-size:20px;font-weight:900;color:#0f172a;text-decoration:none;letter-spacing:-0.04em}
.nav-links{display:flex;align-items:center;gap:4px;margin:0 auto;list-style:none;padding:0}
.nav-links li a,.nav-links a{padding:7px 14px;border-radius:8px;font-size:14px;font-weight:500;color:#64748b;text-decoration:none;transition:background .15s,color .15s}
.nav-links li a:hover,.nav-links a:hover,.nav-links a.active{background:#f1f5f9;color:#0f172a}
.nav-actions{display:flex;align-items:center;gap:8px}
.cart-btn{position:relative;display:flex;align-items:center;gap:6px;padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.cart-btn:hover{background:#1e293b}
.cart-count{position:absolute;top:-6px;right:-6px;background:#6366f1;color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.btn-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;color:#64748b;transition:all .15s}
.hamburger{display:none;background:none;border:none;cursor:pointer;font-size:24px;color:#0f172a}

/* HERO BANNER */
.hero{position:relative;overflow:hidden}
.hero__inner{max-width:1280px;margin:0 auto;padding:80px 32px;display:flex;align-items:center;gap:48px}
.hero__content{flex:1}
.hero__tag{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(99,102,241,.1);color:#6366f1;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:20px}
.hero__title{font-size:clamp(36px,5vw,64px);font-weight:900;letter-spacing:-0.04em;line-height:1.05;margin-bottom:20px}
.hero__sub{font-size:18px;color:#64748b;line-height:1.6;margin-bottom:32px;max-width:480px}
.hero__cta{display:flex;gap:12px;flex-wrap:wrap}
.btn-primary{padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 20px rgba(99,102,241,.4)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.5)}
.btn-secondary{padding:14px 28px;background:#fff;color:#0f172a;border:1.5px solid #e2e8f0;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:border-color .2s,background .2s}
.btn-secondary:hover{border-color:#6366f1;background:#f8f7ff}

/* PRODUCTS SECTION */
.products-section{padding:60px 0}
.products-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px}
.products-header h2{font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.03em}
.product-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
@media(max-width:1100px){.product-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.product-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.product-grid{grid-template-columns:1fr}}

/* PRODUCT CARD */
.product-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);transition:transform .25s,box-shadow .25s;cursor:pointer}
.product-card:hover{transform:translateY(-6px);box-shadow:0 12px 32px rgba(0,0,0,.12)}
.product-card__image{position:relative;aspect-ratio:1/1;overflow:hidden;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:48px}
.product-card__image img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.product-card:hover .product-card__image img{transform:scale(1.06)}
.product-card__badges{position:absolute;top:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap}
.product-card__body{padding:16px}
.product-card__brand{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.product-card__name{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;line-height:1.3}
.product-card__rating{display:flex;align-items:center;gap:6px;margin-bottom:12px}
.stars{color:#f59e0b;font-size:12px;letter-spacing:1px}
.rating-count{font-size:11px;color:#94a3b8}
.product-card__footer{display:flex;align-items:center;justify-content:space-between}
.product-price{font-size:20px;font-weight:800;color:#0f172a}
.product-price--original{font-size:13px;font-weight:500;color:#94a3b8;text-decoration:line-through;margin-left:6px}
.btn-add-cart{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#6366f1;color:#fff;border:none;border-radius:10px;cursor:pointer;transition:background .15s,transform .15s}
.btn-add-cart:hover{background:#4f46e5;transform:scale(1.08)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.badge--sale{background:#fef2f2;color:#dc2626}
.badge--new{background:#f0fdf4;color:#16a34a}
.badge--best{background:#fefce8;color:#ca8a04}
.badge--low{background:#fff7ed;color:#ea580c}

/* FILTER SIDEBAR */
.shop-layout{display:grid;grid-template-columns:240px 1fr;gap:32px;padding:40px 0}
@media(max-width:900px){.shop-layout{grid-template-columns:1fr}.filter-sidebar{display:none}}
.filter-sidebar{position:sticky;top:80px;align-self:start}
.filter-group{margin-bottom:28px}
.filter-group__title{font-size:12px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.filter-option{display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer}
.filter-option input[type=checkbox]{accent-color:#6366f1;width:16px;height:16px}
.filter-option label{font-size:13px;color:#334155;cursor:pointer}
.filter-option:hover label{color:#6366f1}

/* CART DRAWER */
.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;opacity:0;pointer-events:none;transition:opacity .3s}
.cart-overlay.open{opacity:1;pointer-events:all}
.cart-drawer{position:fixed;top:0;right:0;height:100vh;width:380px;background:#fff;box-shadow:-8px 0 32px rgba(0,0,0,.12);z-index:201;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
.cart-drawer.open{transform:translateX(0)}
.cart-drawer__header{padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
.cart-drawer__title{font-size:18px;font-weight:700;color:#0f172a}
.cart-items{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px}
.cart-item{display:flex;gap:12px;align-items:center}
.cart-item__img{width:64px;height:64px;border-radius:10px;object-fit:cover;background:#f1f5f9;flex-shrink:0}
.cart-item__name{font-size:13px;font-weight:600;color:#0f172a}
.cart-item__price{font-size:14px;font-weight:700;color:#6366f1}
.cart-footer{padding:20px 24px;border-top:1px solid #f1f5f9}
.cart-total{display:flex;align-items:center;justify-content:space-between;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px}
.btn-checkout{width:100%;padding:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s}
.btn-checkout:hover{opacity:.9}
@media(max-width:768px){.cart-drawer{width:100%}}

/* NEWSLETTER */
.newsletter{padding:80px 32px;text-align:center}
.newsletter h2{font-size:32px;font-weight:800;color:#fff;margin-bottom:12px;letter-spacing:-0.03em}
.newsletter p{color:rgba(255,255,255,.75);font-size:16px;margin-bottom:28px}
.newsletter-form{display:flex;max-width:420px;margin:0 auto;gap:8px}
.newsletter-form input{flex:1;padding:14px 18px;border:none;border-radius:10px;font-size:14px;outline:none}
.newsletter-form button{padding:14px 22px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s}
.newsletter-form button:hover{background:#1e293b}

/* FOOTER */
.footer{background:#0f172a;color:#fff;padding:60px 0 24px}
.footer__grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;max-width:1280px;margin:0 auto;padding:0 32px;margin-bottom:40px}
.footer__brand-name{font-size:20px;font-weight:900;letter-spacing:-0.03em;margin-bottom:12px}
.footer__brand-desc{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6}
.footer__col-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:16px}
.footer__links{list-style:none;padding:0;display:flex;flex-direction:column;gap:10px}
.footer__links a{font-size:13px;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s}
.footer__links a:hover{color:#fff}
.footer__bottom{max-width:1280px;margin:0 auto;padding:20px 32px 0;border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between}
.footer__copy{font-size:12px;color:rgba(255,255,255,.3)}
@media(max-width:900px){.footer__grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.footer__grid{grid-template-columns:1fr}}

/* REVEAL — safe pattern: content visible by default, hidden only after JS loads */
.reveal{transition:opacity .5s ease,transform .5s ease}
body.js-ready .reveal{opacity:0;transform:translateY(20px)}
body.js-ready .reveal.revealed{opacity:1;transform:translateY(0)}

/* ICONS */
[data-lucide]{width:16px;height:16px;stroke-width:2;vertical-align:middle;flex-shrink:0}
"""

_BASE_CSS_LANDING = """\
/* === LANDING BASE LAYOUT (always injected, not LLM-generated) === */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:16px;line-height:1.6;background:#fff;color:#0f172a}
a{text-decoration:none;color:inherit}
img{max-width:100%;display:block}
ul{list-style:none;padding:0}

/* NAVBAR */
.navbar{height:64px;position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0;transition:box-shadow .2s}
.navbar.scrolled{box-shadow:0 2px 8px rgba(0,0,0,.06)}
.navbar__inner{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:100%;max-width:1280px;margin:0 auto}
.logo{color:#0f172a;font-weight:800;font-size:1.25rem;text-decoration:none;letter-spacing:-0.03em}
.nav-links{display:flex;gap:4px;list-style:none;align-items:center}
.nav-links a,.nav-link{color:#64748b;text-decoration:none;font-weight:500;font-size:14px;padding:7px 14px;border-radius:8px;transition:background .15s,color .15s}
.nav-links a:hover,.nav-link:hover,.nav-link.active{background:#f1f5f9;color:#0f172a}
.hamburger{display:none;background:none;border:1px solid #e2e8f0;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:18px;align-items:center;justify-content:center}

/* HERO */
.hero{position:relative;overflow:hidden}
.hero__inner{max-width:1280px;margin:0 auto;padding:80px 32px;text-align:center}
.hero__tag{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(99,102,241,.08);color:#6366f1;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:24px}
.hero__title{font-size:clamp(40px,6vw,72px);font-weight:900;color:#0f172a;letter-spacing:-0.04em;line-height:1.05;margin-bottom:20px}
.hero__subtitle,.hero__sub{font-size:18px;color:#64748b;max-width:600px;margin:0 auto 32px;line-height:1.7}
.hero__cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn--primary,.btn-primary{padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 20px rgba(99,102,241,.35);display:inline-flex;align-items:center;gap:8px}
.btn--primary:hover,.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.45)}
.btn--secondary,.btn-secondary{padding:14px 28px;background:#fff;color:#0f172a;border:1.5px solid #e2e8f0;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:border-color .2s;display:inline-flex;align-items:center;gap:8px}
.btn--secondary:hover,.btn-secondary:hover{border-color:#6366f1;color:#6366f1}

/* LAYOUT HELPERS */
.content,.container{max-width:1280px;margin:0 auto;padding:0 32px}
.section{padding:80px 0}
.section__title{font-size:clamp(28px,4vw,42px);font-weight:800;color:#0f172a;letter-spacing:-0.03em;margin-bottom:16px}
.section__sub{font-size:17px;color:#64748b;max-width:560px;margin-bottom:48px;line-height:1.6}

/* CARD GRID */
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;overflow:hidden;transition:transform .25s,box-shadow .25s,border-color .25s}
.card:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(0,0,0,.08);border-color:#c7d2fe}
.card__image{width:100%;aspect-ratio:16/9;border-radius:12px;margin-bottom:20px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem;overflow:hidden}
.card__title{font-size:18px;font-weight:700;margin-bottom:10px;color:#0f172a;letter-spacing:-0.01em}
.card__text{color:#64748b;line-height:1.7;font-size:14px}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;background:#eef2ff;color:#6366f1}

/* SECTION BG */
.bg-muted{background:#f8fafc}

/* STATS */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;text-align:center}
.stat-value{font-size:40px;font-weight:900;color:#6366f1;letter-spacing:-0.04em}
.stat-label{font-size:14px;color:#64748b;font-weight:500;margin-top:6px}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.pricing-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;transition:transform .2s,box-shadow .2s}
.pricing-card.popular{border-color:#6366f1;box-shadow:0 8px 40px rgba(99,102,241,.15);transform:scale(1.03)}
.pricing-card__badge{display:inline-block;padding:4px 12px;background:#eef2ff;color:#6366f1;border-radius:99px;font-size:11px;font-weight:700;margin-bottom:16px}
.pricing-card__price{font-size:42px;font-weight:900;color:#0f172a;letter-spacing:-0.04em}
.pricing-card__period{font-size:14px;color:#94a3b8;font-weight:400}
.pricing-card__features{list-style:none;margin:24px 0;display:flex;flex-direction:column;gap:10px}
.pricing-card__features li{display:flex;align-items:center;gap:8px;font-size:14px;color:#334155}

/* TESTIMONIALS */
.testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.testimonial-card{background:#f8fafc;border-radius:16px;padding:28px}
.testimonial-card__quote{font-size:15px;color:#334155;line-height:1.7;margin-bottom:20px;font-style:italic}
.testimonial-card__author{display:flex;align-items:center;gap:12px}
.testimonial-card__avatar{width:40px;height:40px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0}
.testimonial-card__name{font-size:14px;font-weight:700;color:#0f172a}
.testimonial-card__role{font-size:12px;color:#94a3b8}

/* FOOTER */
.footer{background:#0f172a;color:#fff;padding:60px 0 24px}
.footer__grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;max-width:1280px;margin:0 auto;padding:0 32px;margin-bottom:40px}
.footer__brand-name{font-size:20px;font-weight:900;letter-spacing:-0.03em;margin-bottom:12px}
.footer__brand-desc{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6}
.footer__col-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:16px}
.footer__links{list-style:none;padding:0;display:flex;flex-direction:column;gap:10px}
.footer__links a{font-size:13px;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s}
.footer__links a:hover{color:#fff}
.footer__bottom{max-width:1280px;margin:0 auto;padding:20px 32px 0;border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between}
.footer__copy,.footer-col p{font-size:12px;color:rgba(255,255,255,.3)}
.footer-col h4,.footer-col-title{font-size:13px;font-weight:700;color:#fff;margin-bottom:16px}
.footer-col a{font-size:13px;color:rgba(255,255,255,.5);display:block;margin-bottom:10px;transition:color .15s}
.footer-col a:hover{color:#fff}
@media(max-width:900px){.footer__grid{grid-template-columns:1fr 1fr}.pricing-grid{grid-template-columns:1fr}.testimonial-grid{grid-template-columns:1fr}}
@media(max-width:600px){.footer__grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}}

/* REVEAL — safe pattern: content visible by default, hidden only after JS loads */
.reveal{transition:opacity .5s ease,transform .5s ease}
body.js-ready .reveal{opacity:0;transform:translateY(20px)}
body.js-ready .reveal.revealed{opacity:1;transform:translateY(0)}

/* ICONS */
[data-lucide]{width:16px;height:16px;stroke-width:2;vertical-align:middle;flex-shrink:0}

/* MOBILE NAV */
@media(max-width:768px){
  .hamburger{display:flex}
  .nav-links{display:none;position:absolute;top:64px;left:0;right:0;background:#fff;flex-direction:column;padding:12px;border-bottom:1px solid #e2e8f0;gap:2px}
  .nav-links.open{display:flex}
  .hero__inner{padding:60px 20px}
  .card-grid{grid-template-columns:1fr}
  .navbar__inner{padding:0 16px}
}
@media(max-width:900px){.pricing-grid{grid-template-columns:1fr}.testimonial-grid{grid-template-columns:1fr}}
"""

# ── Fallback CSS that at least makes the page look decent ────────────────
_FALLBACK_CSS = """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
::selection { background: var(--color-primary, #3b82f6); color: #fff; }
ul { list-style: none; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
body { font-family: var(--typo-fontFamily, 'Inter', system-ui, sans-serif); font-size: var(--typo-fontSizeBase, 16px); line-height: var(--typo-lineHeight, 1.6); background: var(--color-background, #0f172a); color: var(--color-text, #f1f5f9); }
h1, h2, h3 { font-family: var(--typo-headingFamily, inherit); font-weight: var(--typo-headingWeight, 700); }
.header nav { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px; position: sticky; top: 0; z-index: 100; background: var(--color-surface, rgba(15,23,42,0.95)); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.1)); }
.logo { color: var(--color-primary, #3b82f6); font-weight: 800; font-size: 1.35rem; text-decoration: none; letter-spacing: -0.02em; }
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-link { color: var(--color-textMuted, #94a3b8); text-decoration: none; font-weight: 500; transition: color 0.2s; position: relative; }
.nav-link:hover, .nav-link.active { color: var(--color-primary, #3b82f6); }
.nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: var(--color-primary, #3b82f6); transition: width 0.3s; }
.nav-link:hover::after { width: 100%; }
.hamburger { display: none; background: none; border: none; color: var(--color-text, #f1f5f9); font-size: 1.5rem; cursor: pointer; }
.content { max-width: 1100px; margin: 0 auto; padding: 2rem 24px; }
.hero { position: relative; padding: 6rem 2rem; text-align: center; background: var(--color-gradient, linear-gradient(135deg, #3b82f6, #8b5cf6)); border-radius: var(--effect-borderRadiusLarge, 20px); margin-bottom: 3rem; color: #fff; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 50%); pointer-events: none; }
.hero__title { font-size: clamp(2.25rem,5vw,3.75rem); font-weight: 800; color: #fff; margin-bottom: .75rem; font-family: var(--typo-headingFamily, inherit); letter-spacing: -0.03em; line-height: 1.1; }
.hero__subtitle { font-size: 1.2rem; color: rgba(255,255,255,0.8); max-width: 600px; margin: .75rem auto 0; line-height: 1.6; }
.hero__cta { display: inline-block; margin-top: 2rem; }
.section { padding: 4rem 0; }
.section:nth-child(even) { background: var(--color-surface, #1e293b); border-radius: var(--effect-borderRadiusLarge, 20px); padding: 4rem 2rem; margin: 2rem 0; }
.section__title { font-size: var(--typo-h2Size, 1.875rem); font-weight: 700; margin-bottom: .5rem; color: var(--color-text, #f1f5f9); letter-spacing: -0.02em; }
.section__title + p { color: var(--color-textMuted, #94a3b8); margin-bottom: 2rem; max-width: 600px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.card { background: var(--color-surface, #1e293b); border: 1px solid var(--color-border, rgba(255,255,255,0.1)); border-radius: var(--effect-borderRadius, 12px); padding: 1.5rem; overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
.card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); border-color: var(--color-primary, #3b82f6); }
.card__image { width: 100%; aspect-ratio: 16/9; border-radius: var(--effect-borderRadiusSmall, 8px); margin-bottom: 1rem; background: linear-gradient(135deg, var(--color-surface, #1e293b), var(--color-surfaceHover, #334155)); display: flex; align-items: center; justify-content: center; color: var(--color-textMuted, #94a3b8); font-size: .85rem; }
.card__title { font-size: 1.25rem; font-weight: 600; margin-bottom: .5rem; color: var(--color-text, #f1f5f9); }
.card__text { color: var(--color-textMuted, #94a3b8); line-height: 1.6; font-size: .95rem; }
.badge { display: inline-block; padding: .25rem .75rem; border-radius: 9999px; font-size: .75rem; font-weight: 600; background: var(--color-primary, #3b82f6); color: #fff; letter-spacing: .02em; text-transform: uppercase; }
.btn { display: inline-flex; align-items: center; gap: .5rem; padding: 0.75rem 1.75rem; border-radius: 9999px; font-weight: 600; font-size: .95rem; text-decoration: none; cursor: pointer; transition: all 0.25s ease; border: none; }
.btn--primary { background: var(--color-primary, #3b82f6); color: #fff; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }
.btn--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59,130,246,0.4); filter: brightness(1.1); }
.btn--secondary { background: transparent; color: var(--color-text, #f1f5f9); border: 1px solid var(--color-border, rgba(255,255,255,0.2)); }
.btn--secondary:hover { border-color: var(--color-primary, #3b82f6); color: var(--color-primary, #3b82f6); }
.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.375rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border, rgba(255,255,255,0.15)); border-radius: 8px; background: var(--color-surface, #1e293b); color: var(--color-text, #f1f5f9); font-size: 1rem; transition: border 0.2s, box-shadow 0.2s; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: var(--color-primary, #3b82f6); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.footer { background: var(--color-surface, #1e293b); border-top: 1px solid var(--color-border, rgba(255,255,255,0.1)); padding: 3rem 24px 1.5rem; margin-top: 4rem; }
.footer__inner { max-width: 1100px; margin: 0 auto; }
.footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
.footer-col h4 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-text, #f1f5f9); }
.footer-col p, .footer-col li, .footer-col a { font-size: .9rem; color: var(--color-textMuted, #94a3b8); line-height: 1.8; transition: color 0.2s; }
.footer-col a:hover { color: var(--color-primary, #3b82f6); }
.footer__copy { text-align: center; padding-top: 1.5rem; border-top: 1px solid var(--color-border, rgba(255,255,255,0.06)); font-size: .85rem; color: var(--color-textMuted, #94a3b8); }
.reveal { transition: opacity 0.6s ease, transform 0.6s ease; }
body.js-ready .reveal { opacity: 0; transform: translateY(30px); }
body.js-ready .reveal.revealed { opacity: 1; transform: translateY(0); }
@media (max-width: 768px) {
  .hamburger { display: block; color: var(--color-text, #f1f5f9); }
  .nav-links { display: none; position: absolute; top: 64px; left: 0; right: 0; background: var(--color-surface, rgba(15,23,42,0.98)); flex-direction: column; padding: 1rem; border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.1)); }
  .nav-links.open { display: flex; }
  .card-grid { grid-template-columns: 1fr; }
  .hero { padding: 3rem 1.5rem; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .footer-grid { grid-template-columns: 1fr; }
}
"""

_FALLBACK_JS = """\
document.addEventListener('DOMContentLoaded', () => {
  // Enable reveal animations only when JS is available
  document.body.classList.add('js-ready');

  // Hamburger menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Scroll reveal with IntersectionObserver
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Active nav link highlighting
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Sticky header shadow on scroll
  const header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.15)' : 'none';
    }, { passive: true });
  }
});
"""
