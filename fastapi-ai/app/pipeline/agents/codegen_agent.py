from __future__ import annotations

import json as _json
import logging
import re as _re
import time as _time
from typing import Any

import os
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
    def _repair_truncated_jsx(content: str) -> str:
        """Close unclosed strings/braces/parens caused by LLM token-limit truncation."""
        repair = content.rstrip()
        # Fix unclosed string on the last line (e.g. className="text-lg hover:text-indigo-600)
        lines = repair.split('\n')
        last_line = lines[-1] if lines else ''
        if last_line.count('"') % 2 != 0:
            repair += '"'
        elif last_line.count("'") % 2 != 0:
            repair += "'"
        # Close unclosed JSX tag if last line looks like an open tag
        if last_line.rstrip().endswith(('<', '>')):
            repair += '/>'
        open_braces = repair.count('{') - repair.count('}')
        open_parens = repair.count('(') - repair.count(')')
        if open_braces <= 0 and open_parens <= 0:
            return repair
        # Close in reverse order: parens first, then braces
        for _ in range(min(open_parens, 20)):
            repair += '\n  )'
        for _ in range(min(open_braces, 20)):
            repair += '\n}'
        return repair

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
            elif ext == "tsx":
                tsx_done = [g for g in generated_so_far if g["path"].endswith(".tsx")]
                if tsx_done:
                    lines = []
                    for gf in tsx_done:
                        gf_name = os.path.basename(gf["path"]).replace(".tsx", "")
                        if "components/" in gf["path"]:
                            gf_rel = f"./components/{gf_name}"
                        elif "pages/" in gf["path"]:
                            gf_rel = f"./pages/{gf_name}"
                        else:
                            gf_rel = f"./{gf_name}"
                        lines.append(f"  import {gf_name} from '{gf_rel}'")
                    gen_ctx = (
                        "\nALREADY GENERATED FILES (use these imports — DO NOT redefine):\n"
                        + "\n".join(lines) + "\n"
                    )

        design_ctx = ""
        if design_tokens and ext not in ("css",):
            colors = design_tokens.get("colors", {})
            design_ctx = (
                f"\nDESIGN COLORS: primary={colors.get('primary','#6366f1')}, bg={colors.get('background','#0f172a')}\n"
                "IMPORTANT: Use real Tailwind CSS classes only — NEVER use bg-primary or text-primary. "
                "Use bg-indigo-600, bg-violet-600, bg-blue-600, text-indigo-600 etc. instead.\n"
            )

        # ── SPEC BLOCK — this is the #1 priority for the LLM ──
        spec_block = context[:4000] if context else "Generic modern website"

        # ── Build nav links HTML for reuse ──
        nav_links_html = "\n".join(
            f'                <a href="{p}" class="nav-link">'
            f'{p.replace(".html","").replace("index","Home").title()}</a>'
            for p in html_paths
        ) if html_paths else ""

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

        # ── React CDN libraries — React 18 + Babel Standalone + Tailwind ──
        _react_cdn = (
            '  <!-- React 18 via CDN -->\n'
            '  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>\n'
            '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>\n'
            '  <!-- Babel Standalone: transpiles JSX in the browser -->\n'
            '  <script src="https://unpkg.com/@babel/standalone@7.23.10/babel.min.js"></script>\n'
            '  <!-- Tailwind CSS -->\n'
            '  <script src="https://cdn.tailwindcss.com"></script>\n'
        )
        cdn_links = _react_cdn
        if is_app:
            cdn_links = (
                _react_cdn
                + '  <!-- Chart.js for data visualization -->\n'
                + '  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>\n'
            )

        # ── Detect output target: TSX (Vite) or legacy HTML (CDN) ──
        output_target = _re.sub(r"\s", "", os.environ.get("AI_OUTPUT_TARGET", "react").lower())
        is_tsx_mode = output_target == "react"

        # Normalize: tsx files use same prompt logic as html, just different wrapper
        is_component_file = ext in ("html", "htm", "tsx")

        # ── Multi-file TSX detection ──
        is_multi_tsx = "/" in path  # e.g. src/components/Sidebar.tsx
        is_tsx_component = "components/" in path and path.endswith(".tsx")
        is_tsx_page = "pages/" in path and path.endswith(".tsx")
        is_tsx_root_app = path in ("src/App.tsx", "App.tsx") and is_multi_tsx
        is_mock_data = path.startswith("src/data/") and path.endswith(".ts")
        tsx_component_name = os.path.basename(path).replace(".tsx", "").replace(".ts", "") if is_multi_tsx else "App"

        # ── Multi-file role instruction (needs is_tsx_mode + is_multi_tsx) ──
        # Build the full list of planned pages from the plan (not just generated so far)
        all_planned_pages = [
            os.path.basename(f.get("path", "")).replace(".tsx", "")
            for f in plan.get("files", [])
            if "pages/" in str(f.get("path", ""))
        ]

        # Shadcn UI components available in the template
        _SHADCN_IMPORTS_HINT = (
            "╔══════════════════════════════════════════════════════════════╗\n"
            "║  INSTALLED COMPONENTS — USE THESE, NEVER RECREATE THEM      ║\n"
            "╚══════════════════════════════════════════════════════════════╝\n"
            "import { cn } from '@/lib/utils'  ← ALWAYS use cn() for conditional classes\n"
            "\n"
            "// Layout & Typography\n"
            "import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'\n"
            "import { Separator } from '@/components/ui/separator'\n"
            "import { ScrollArea } from '@/components/ui/scroll-area'\n"
            "\n"
            "// Forms & Inputs\n"
            "import { Button } from '@/components/ui/button'\n"
            "import { Input } from '@/components/ui/input'\n"
            "import { Label } from '@/components/ui/label'\n"
            "import { Textarea } from '@/components/ui/textarea'\n"
            "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'\n"
            "import { Checkbox } from '@/components/ui/checkbox'\n"
            "import { Switch } from '@/components/ui/switch'\n"
            "\n"
            "// Data Display\n"
            "import { Badge } from '@/components/ui/badge'\n"
            "import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'\n"
            "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'\n"
            "import { Progress } from '@/components/ui/progress'\n"
            "\n"
            "// Navigation & Overlays\n"
            "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'\n"
            "import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'\n"
            "import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'\n"
            "import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'\n"
            "\n"
            "// Charts (recharts)\n"
            "import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'\n"
            "\n"
            "// Icons (lucide-react — icons ONLY, not components)\n"
            "import { LayoutDashboard, Users, Settings, Bell, Search, TrendingUp, BarChart2,\n"
            "         Home, Plus, Edit, Trash2, Download, Upload, Filter, ChevronRight,\n"
            "         LogOut, Menu, X, Check, AlertCircle, Info } from 'lucide-react'\n"
            "\n"
            "MANDATORY RULES:\n"
            "1. ALWAYS use <Card><CardHeader><CardTitle> for stat cards — NEVER raw divs\n"
            "2. ALWAYS use <Table><TableHeader><TableRow> for tables — NEVER raw <table>\n"
            "3. ALWAYS use <Badge> for status chips — NEVER raw <span>\n"
            "4. ALWAYS use <Button> for actions — NEVER raw <button>\n"
            "5. ALWAYS use cn() for conditional classes: className={cn('base', condition && 'active')}\n"
            "6. lucide-react = ICONS ONLY. NEVER import Card/Button/Badge/Table from lucide-react\n"
        )

        multi_file_role = ""
        if is_tsx_mode and is_mock_data:
            mock_data_summary = plan.get("summary", "")
            multi_file_role = (
                f"\n═══ MOCK DATA FILE: {path} ═══\n"
                f"Generate a TypeScript file with ALL mock data for the project.\n"
                f"Project context: {mock_data_summary[:200]}\n"
                f"\n"
                f"RULES:\n"
                f"• Export TypeScript interfaces/types at the top (e.g. export interface Property, export interface Client)\n"
                f"• Export const arrays with 6-10 realistic items each (no imports needed)\n"
                f"• Use domain-specific realistic data (real-sounding names, addresses, prices, dates)\n"
                f"• Include all data that pages will need: items for tables, stats for KPIs, chart series\n"
                f"• End the file with export statements for each const\n"
                f"• NO imports. NO React. ONLY TypeScript types + data.\n"
                f"• Output ONLY the TypeScript file content, no markdown fences\n"
            )
        elif is_tsx_mode and is_multi_tsx:
            if is_tsx_component:
                sidebar_nav = ""
                if "Sidebar" in tsx_component_name and all_planned_pages:
                    page_keys = [p.replace("Page", "").lower() for p in all_planned_pages]
                    sidebar_nav = (
                        f"\n• Navigation must have EXACTLY these items (no more, no less):\n"
                        + "\n".join(
                            f"  - '{key}' → renders {page}"
                            for key, page in zip(page_keys, all_planned_pages)
                        ) + "\n"
                        f"• Each button calls setActivePage('{page_keys[0] if page_keys else 'home'}')\n"
                    )
                is_sidebar = "Sidebar" in tsx_component_name or "sidebar" in tsx_component_name.lower()
                router_hint = (
                    "NAVIGATION (React Router v6 — MANDATORY for Sidebar/Navbar):\n"
                    "  import { Link, useLocation } from 'react-router-dom'\n"
                    "  const location = useLocation()\n"
                    "  const isActive = (path: string) => location.pathname === path\n"
                    "  // Use <Link to='/dashboard'> instead of <button onClick>\n"
                    "  // Active state: className={cn('...base', isActive('/dashboard') && 'bg-indigo-600 text-white')}\n"
                ) if is_sidebar else ""
                multi_file_role = (
                    f"\n═══ STANDALONE COMPONENT: {tsx_component_name} ═══\n"
                    f"Generate ONLY the `{tsx_component_name}` function.\n"
                    f"• Start with: import React from 'react' + any lucide-react icons you use\n"
                    f"• End with: export default {tsx_component_name}\n"
                    f"• Do NOT include other page components or App\n"
                    f"• Use TypeScript props interface\n"
                    f"CRITICAL: lucide-react exports ICONS ONLY (Bell, Search, Home, User, Settings…).\n"
                    f"NEVER import Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar,\n"
                    f"AvatarFallback, Input, Label, Table, Tabs, Dialog, Progress from lucide-react.\n"
                    f"Those are shadcn/ui components — use the import paths listed below.\n"
                    + sidebar_nav
                    + "\n" + router_hint
                    + "\n" + _SHADCN_IMPORTS_HINT
                )
            elif is_tsx_page:
                # Check if mockData.ts was generated so we can reference it
                mock_data_file = next(
                    (gf for gf in generated_so_far if gf["path"].startswith("src/data/")), None
                )
                mock_import_hint = (
                    f"• Import data from '@/data/mockData' (already generated) instead of hardcoding inline\n"
                    if mock_data_file else
                    "• Include realistic hardcoded data inline (charts, tables, KPIs)\n"
                )
                multi_file_role = (
                    f"\n═══ PAGE COMPONENT: {tsx_component_name} ═══\n"
                    f"Generate ONLY the `{tsx_component_name}` function (no Sidebar/Navbar/layout).\n"
                    f"• Start with: import React from 'react' + recharts/lucide imports you use\n"
                    f"• End with: export default {tsx_component_name}\n"
                    + mock_import_hint +
                    f"• This page is rendered inside the app layout — no wrapper div needed\n"
                    f"CRITICAL: lucide-react exports ICONS ONLY (Bell, Search, Home, User, Settings…).\n"
                    f"NEVER import Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar,\n"
                    f"AvatarFallback, Input, Label, Table, Tabs, Dialog, Progress from lucide-react.\n"
                    f"Those are shadcn/ui components — use the import paths listed below.\n"
                    + "\n" + _SHADCN_IMPORTS_HINT
                )
            elif is_tsx_root_app:
                comp_imports = []
                for gf in generated_so_far:
                    if not gf["path"].endswith(".tsx"):
                        continue
                    gf_name = os.path.basename(gf["path"]).replace(".tsx", "")
                    gf_rel = (
                        f"./components/{gf_name}" if "components/" in gf["path"]
                        else f"./pages/{gf_name}" if "pages/" in gf["path"]
                        else f"./{gf_name}"
                    )
                    comp_imports.append(f"import {gf_name} from '{gf_rel}'")
                page_comps = [
                    os.path.basename(g["path"]).replace(".tsx", "")
                    for g in generated_so_far if "pages/" in g["path"]
                ]
                layout_comps = [
                    os.path.basename(g["path"]).replace(".tsx", "")
                    for g in generated_so_far if "components/" in g["path"]
                ]
                first_page = page_comps[0].replace("Page", "").lower() if page_comps else "dashboard"
                import_block = "\n".join(comp_imports)
                route_entries = "\n".join(
                    f"          <Route path='/{p.replace('Page','').lower()}' element={{<{p} />}} />"
                    for p in page_comps
                )
                multi_file_role = (
                    f"\n═══ ROOT APP (multi-file mode) ═══\n"
                    f"App.tsx ONLY wires together already-generated components using React Router v6.\n"
                    f"\n"
                    f"COPY THESE IMPORT LINES EXACTLY — do not modify them:\n"
                    f"import React from 'react'\n"
                    f"import {{ BrowserRouter, Routes, Route, Navigate }} from 'react-router-dom'\n"
                    f"{import_block}\n"
                    f"\n"
                    f"🚨 ABSOLUTE RULES — VIOLATIONS WILL BREAK THE BUILD:\n"
                    f"1. NEVER redefine {', '.join(page_comps + layout_comps)} as functions inside App.tsx\n"
                    f"2. NEVER use useState for navigation — use React Router <Route> instead\n"
                    f"3. NEVER put components inside a lucide-react import\n"
                    f"4. App.tsx must contain ONLY: imports + one App() function + export default App\n"
                    f"\n"
                    f"STRUCTURE OF App() using React Router v6:\n"
                    f"function App() {{\n"
                    f"  return (\n"
                    f"    <BrowserRouter>\n"
                    f"      <div className='flex min-h-screen'>\n"
                    f"        {f'<{layout_comps[0]} />' if layout_comps else ''}\n"
                    f"        <div className='flex-1 flex flex-col'>\n"
                    f"          {f'<{layout_comps[1]} />' if len(layout_comps) > 1 else ''}\n"
                    f"          <Routes>\n"
                    f"            <Route path='/' element={{<Navigate to='/{first_page}' replace />}} />\n"
                    f"{route_entries}\n"
                    f"          </Routes>\n"
                    f"        </div>\n"
                    f"      </div>\n"
                    f"    </BrowserRouter>\n"
                    f"  )\n"
                    f"}}\n"
                    f"\n"
                    f"• Sidebar links must use <Link to='/pagename'> from react-router-dom\n"
                    f"• Active link detection: use useLocation() hook\n"
                    f"• End with: export default App\n"
                )

        # ── TSX wrapper (Vite build mode) ──
        _tsx_top = ""
        _tsx_bottom = ""
        if is_component_file and is_tsx_mode:
            ext = "tsx"  # normalize
            if is_app:
                _tsx_top = (
                    "import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'\n"
                    "import { LayoutDashboard, Users, TrendingUp, Settings, Bell, Search, "
                    "BarChart2, ChevronUp, ChevronDown, DollarSign, Activity, ShoppingCart, "
                    "LogOut, Menu, X, Download, Filter, Plus } from 'lucide-react'\n"
                    "import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, "
                    "XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'\n\n"
                )
            elif is_ecommerce:
                _tsx_top = (
                    "import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'\n"
                    "import { ShoppingCart, X, Star, Heart, Search, Menu, ChevronRight, "
                    "Truck, Shield, RotateCcw, Tag, Plus, Minus } from 'lucide-react'\n"
                    "import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'\n\n"
                )
            else:
                _tsx_top = (
                    "import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'\n"
                    "import { ArrowRight, CheckCircle, Star, Menu, X, ChevronDown, "
                    "Zap, Shield, Users, TrendingUp, Mail, Phone, MapPin } from 'lucide-react'\n\n"
                )
            _tsx_bottom = "\nexport default App\n"

        # Multi-file override: each component/page manages its own imports
        if is_tsx_mode and is_multi_tsx:
            _tsx_top = ""
            _tsx_bottom = ""

        # ── React CDN HTML shell — legacy fallback ──
        _html_top = ""
        _html_bottom = ""
        if is_component_file and not is_tsx_mode:
            ext = "html"  # normalize
            _html_top = (
                '<!doctype html>\n<html lang="en">\n<head>\n'
                '  <meta charset="UTF-8">\n'
                '  <meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
                f'  <title>{plan.get("summary","App")[:50]}</title>\n'
                + font_link + cdn_links
                + '  <link rel="stylesheet" href="styles.css">\n'
                '</head>\n'
                '<body>\n'
                '  <div id="root"></div>\n'
                '  <script type="text/babel" data-presets="env,react">\n'
                '  const { useState, useEffect, useRef, useMemo, useCallback } = React;\n\n'
            )
            _html_bottom = (
                "\n\n  ReactDOM.createRoot(document.getElementById('root')).render(<App />);\n"
                '  </script>\n'
                '</body>\n</html>\n'
            )

        # ── File-type specific RULES (for LLM prompt) ──
        if ext in ("html", "htm", "tsx"):
            # Determine layout guide for this project type
            if is_app:
                _layout_desc = "DASHBOARD APP with dark sidebar navigation, top navbar with search, KPI cards, charts, and data table"
                _component_guide = (
                    "CRITICAL RULE: You MUST generate a COMPLETE function component for EVERY nav item — no stubs, no placeholders.\n\n"
                    "COMPONENTS TO WRITE (in this order):\n\n"
                    "function Sidebar({ activePage, setActivePage }) {\n"
                    "  // Dark sidebar: logo + brand name, nav links with lucide icons, upgrade CTA at bottom\n"
                    "  // className='w-60 shrink-0 h-screen sticky top-0 bg-indigo-950 flex flex-col overflow-y-auto'\n"
                    "  // Each nav item is a <button> (NEVER <a href='#'>) that calls setActivePage\n"
                    "  // Active: bg-indigo-600 text-white  |  Inactive: text-indigo-300 hover:bg-indigo-800\n"
                    "  // <button onClick={() => setActivePage('dashboard')} className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left transition-colors ${activePage==='dashboard'?'bg-indigo-600 text-white':'text-indigo-300 hover:bg-indigo-800'}`}>\n"
                    "}\n\n"
                    "function Navbar({ activePage }) {\n"
                    "  // h-16 sticky top bar: capitalize(activePage) as page title left, search bar center, bell+avatar right\n"
                    "}\n\n"
                    "// ── PAGE COMPONENTS ─────────────────────────────────────────────────────────\n"
                    "// Write ONE complete function for EACH nav item. Name them <NavItemName>Page.\n"
                    "// Every page must have: a page header row (title + action button), then 2-4 content\n"
                    "// sections filled with realistic hardcoded data.\n\n"
                    "function DashboardPage() {\n"
                    "  // SECTION 1 — KPI cards grid (4 cards): metric name, large value, +/-% badge, icon\n"
                    "  // KPIs: Total Revenue $127,840 (+12.4%), Active Users 8,429 (+3.1%), Conversion 4.7% (-0.3%), Churn 1.2% (-0.8%)\n"
                    "  // SECTION 2 — Charts row (use recharts):\n"
                    + (
                    "  const revenueData = [{month:'Jan',value:42000},{month:'Feb',value:67000},{month:'Mar',value:55000},{month:'Apr',value:81000},{month:'May',value:73000},{month:'Jun',value:95000}]\n"
                    "  const donutData = [{name:'Enterprise',value:45},{name:'Pro',value:35},{name:'Starter',value:20}]\n"
                    "  const COLORS = ['#3b82f6','#8b5cf6','#06b6d4']\n"
                    "  //   col-span-2: <ResponsiveContainer><AreaChart data={revenueData}>...</AreaChart></ResponsiveContainer>\n"
                    "  //   col-span-1: <ResponsiveContainer><PieChart><Pie data={donutData} innerRadius={60} outerRadius={90}>...</Pie></PieChart></ResponsiveContainer>\n"
                    if is_tsx_mode else
                    "  //   Use Chart.js canvas refs for line chart and doughnut chart\n"
                    )
                    + "  // SECTION 3 — DataTable: 5 rows with Name, Plan, Revenue, Status badge (Active/Trial/Paused), Date\n"
                    "}\n\n"
                    "// Write the remaining page components below — one per additional nav item.\n"
                    "// Each page must be a REAL, COMPLETE UI with hardcoded data. Examples of what to include:\n"
                    "// - A 'Users' or 'Audience' page: search bar, filter pills, user table with avatars/names/status\n"
                    "// - A 'Campaigns' page: New Campaign button, campaigns table with status badges/metrics\n"
                    "// - An 'Analytics' page: multiple charts (bar, line, pie), metric breakdown table\n"
                    "// - A 'Settings' page: profile form fields, notification toggles, billing info, danger zone\n"
                    "// - An 'Integrations' page: card grid of tools (Slack, Stripe, HubSpot...) with Connect button\n"
                    "// Use whatever fits this specific app. Every component must have 15+ JSX elements of real content.\n\n"
                    "function App() {\n"
                    "  const [activePage, setActivePage] = useState('dashboard');\n"
                    "  return (\n"
                    "    <div className='flex min-h-screen bg-slate-100'>\n"
                    "      <Sidebar activePage={activePage} setActivePage={setActivePage} />\n"
                    "      <div className='flex-1 flex flex-col min-w-0'>\n"
                    "        <Navbar activePage={activePage} />\n"
                    "        <main className='flex-1 p-7 flex flex-col gap-6'>\n"
                    "          {activePage === 'dashboard' && <DashboardPage />}\n"
                    "          {/* ADD ONE LINE FOR EVERY OTHER NAV ITEM: {activePage === 'key' && <KeyPage />} */}\n"
                    "        </main>\n"
                    "      </div>\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                )
            elif is_ecommerce:
                _layout_desc = "ECOMMERCE STORE with sticky navbar, slide-in cart drawer, product grid, newsletter, and footer"
                _component_guide = (
                    "COMPONENTS TO WRITE (in this order):\n\n"
                    "function CartDrawer({ isOpen, onClose, cartItems, cartCount }) {\n"
                    "  // Slide-in drawer from right: cart items list, total price, checkout button\n"
                    "  // Use inline style for transform: isOpen ? 'translateX(0)' : 'translateX(100%)'\n"
                    "}\n\n"
                    "function Navbar({ onCartOpen, cartCount }) {\n"
                    "  // Sticky header: logo left, nav links center, cart button + count right\n"
                    "  // Mobile: hamburger menu\n"
                    "}\n\n"
                    "function Hero() {\n"
                    "  // Full-width hero with gradient bg, large headline, subtitle, 2 CTA buttons\n"
                    "  // style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' }}\n"
                    "}\n\n"
                    "function ProductCard({ product, onAddToCart }) {\n"
                    "  // Card: image placeholder div, badges (NEW/SALE/BEST), brand, name, rating stars, price, add-to-cart button\n"
                    "  // Image: <div className='bg-slate-100 h-60 flex items-center justify-content-center text-6xl'>{product.emoji}</div>\n"
                    "}\n\n"
                    "function ProductGrid({ onAddToCart }) {\n"
                    "  // 4-column responsive grid of 6 ProductCard components with real product data\n"
                    "}\n\n"
                    "function Newsletter() {\n"
                    "  // Gradient section: headline, subtitle, email input + subscribe button\n"
                    "}\n\n"
                    "function Footer() {\n"
                    "  // Dark footer: 4 columns (brand/desc, Shop links, Support links, Social links), copyright\n"
                    "}\n\n"
                    "function App() {\n"
                    "  const [cartOpen, setCartOpen] = useState(false);\n"
                    "  const [cartItems, setCartItems] = useState([]);\n"
                    "  const addToCart = (product) => setCartItems(prev => [...prev, product]);\n"
                    "  return (\n"
                    "    <div className='min-h-screen bg-white'>\n"
                    "      {cartOpen && <div className='fixed inset-0 bg-black/40 z-40' onClick={() => setCartOpen(false)} />}\n"
                    "      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} cartItems={cartItems} cartCount={cartItems.length} />\n"
                    "      <Navbar onCartOpen={() => setCartOpen(true)} cartCount={cartItems.length} />\n"
                    "      <main>\n"
                    "        <Hero />\n"
                    "        <div className='max-w-screen-xl mx-auto px-8 py-16'>\n"
                    "          <ProductGrid onAddToCart={addToCart} />\n"
                    "        </div>\n"
                    "        <Newsletter />\n"
                    "      </main>\n"
                    "      <Footer />\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                )
            else:
                _layout_desc = "SAAS/MARKETING LANDING PAGE with sticky navbar, hero, stats, features, testimonials, pricing, CTA banner, and footer"
                _component_guide = (
                    "COMPONENTS TO WRITE (in this order):\n\n"
                    "function Navbar() {\n"
                    "  // Sticky header: logo left, nav links (Features/Pricing/Blog/About) center, Sign In + Get Started right\n"
                    "  // Add scrolled shadow via useState + useEffect on window.scroll\n"
                    "}\n\n"
                    "function Hero() {\n"
                    "  // Gradient bg hero: badge pill, large headline (clamp 48-80px), subtitle, 2 CTA buttons, trust badges row\n"
                    "  // style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)' }}\n"
                    "}\n\n"
                    "function Stats() {\n"
                    "  // 4-stat row: 50K+ Teams | 99.9% Uptime | 4.9/5 Rating | <10min Setup\n"
                    "}\n\n"
                    "function Features() {\n"
                    "  // 3-column grid of feature cards: emoji icon, title, 2-sentence description\n"
                    "  // At least 6 feature cards covering real use-cases\n"
                    "}\n\n"
                    "function Testimonials() {\n"
                    "  // 3 testimonial cards: quote, avatar initials, name, title, company, star rating\n"
                    "}\n\n"
                    "function Pricing() {\n"
                    "  // 3 pricing cards: Free $0/mo, Pro $29/mo (highlighted with indigo bg), Enterprise $99/mo\n"
                    "  // Each card: plan name, price, feature list with checkmarks, CTA button\n"
                    "}\n\n"
                    "function CtaBanner() {\n"
                    "  // Gradient banner: large headline, subtitle, 'Start Free Trial' button\n"
                    "}\n\n"
                    "function Footer() {\n"
                    "  // Dark footer (bg-slate-900): 4 columns (Product/Company/Legal/Social), copyright row\n"
                    "}\n\n"
                    "function App() {\n"
                    "  return (\n"
                    "    <div className='min-h-screen bg-white'>\n"
                    "      <Navbar />\n"
                    "      <main>\n"
                    "        <Hero />\n"
                    "        <Stats />\n"
                    "        <Features />\n"
                    "        <Testimonials />\n"
                    "        <Pricing />\n"
                    "        <CtaBanner />\n"
                    "      </main>\n"
                    "      <Footer />\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                )

            type_rules = (
                f"Generate a COMPLETE React app {'as TSX' if is_tsx_mode else 'as JSX (Babel Standalone)'} for a {_layout_desc}.\n\n"
                "═══ MANDATORY RULES ═══\n"
                "- Use className (NOT class) on ALL elements\n"
                "- Tailwind utility classes for ALL styling — bg-white, rounded-2xl, shadow-md, p-6, flex, grid, gap-4, text-4xl, font-black\n"
                "- Gradients: use style={{ background: 'linear-gradient(...)' }} — NOT bg-gradient-to-br (Tailwind CDN JIT may not generate it)\n"
                "- useState/useEffect/useRef/useCallback/useMemo already imported from React\n"
                "- IMAGES: use <img src='https://picsum.photos/seed/KEYWORD/600/400' alt='description' className='w-full h-48 object-cover rounded-xl' /> — replace KEYWORD with a relevant word (shoe, jacket, wallet, food, tech, etc.) — NEVER use emojis for images\n"
                + ("- ICONS: Use lucide-react icons already imported (e.g. <LayoutDashboard size={20} />, <Users size={20} />, <Bell size={20} />)\n"
                   "- CHARTS: Use recharts components already imported (AreaChart, BarChart, PieChart, ResponsiveContainer, etc.)\n"
                   if is_tsx_mode else
                   "- ICONS: use emoji (💰 📊 👥 🛒 🔔 ✨ 🚀 ⚡ 💼 🎯 ✅ ⭐) — DO NOT use data-lucide\n")
                + "- NEVER Lorem Ipsum — real product names, prices, stats, testimonials, team names\n"
                "- Be VERBOSE: full realistic content in every component, no stubs, no TODOs\n"
                "- Transitions: className='transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'\n"
                + ("- NAVIGATION: sidebar links MUST be <button onClick={() => setActivePage('key')}> — NEVER <a href='#'>\n"
                   "- ROUTING: App() tracks const [activePage, setActivePage] = useState('defaultKey') and renders each page with {activePage==='key' && <PageComponent />}\n"
                   "- Every nav item needs its own full page component with realistic content — no empty stubs\n\n"
                   if is_app and is_tsx_mode else "\n")
                + "═══ OUTPUT FORMAT ═══\n"
                + ("Output ONLY the React function definitions as TSX. NO import statements. NO export default. NO markdown fences. Start with 'function'.\n\n"
                   if is_tsx_mode else
                   "Output ONLY the React function definitions. NO markdown fences. NO prose. Start directly with 'function'.\n"
                   "DO NOT output ReactDOM.createRoot() — that is handled by the wrapper.\n\n")
                + _component_guide
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

        _is_component = ext in ("html", "htm", "tsx")
        sys_msg = (
            f"You are an elite UI engineer building production software at the level of Lovable.dev, v0.dev, Linear, and Vercel.\n"
            + multi_file_role
            + (
                (
                    (
                        "Output ONLY the complete standalone TSX file. Include your own imports at the top.\n"
                        "Use className (NOT class). Tailwind utility classes for styling. style={{}} for gradients.\n"
                        "IMAGES: <img src='https://picsum.photos/seed/KEYWORD/600/400' className='w-full h-48 object-cover rounded-xl' />\n"
                        "ICONS: import only the lucide-react icons you use.\n"
                    ) if is_multi_tsx else (
                        "Output ONLY React function definitions as TSX. No markdown fences, no prose, no explanations.\n"
                        "Start directly with 'function'. DO NOT add import statements or 'export default' — those are handled by the wrapper.\n"
                        "Use className (NOT class). Tailwind utility classes for styling. style={{}} for gradients.\n"
                        "IMAGES: use <img src='https://picsum.photos/seed/KEYWORD/600/400' alt='description' className='w-full h-48 object-cover rounded-xl' /> with a relevant seed word — NEVER emojis for images.\n"
                        "ICONS: Use lucide-react icons already imported (e.g. <LayoutDashboard size={20} />, <Users size={20} />, <TrendingUp size={20} />).\n"
                    )
                ) if is_tsx_mode else (
                    "Output ONLY React function definitions as JSX (Babel Standalone). No markdown fences, no prose, no explanations.\n"
                    "Start directly with 'function'. DO NOT output ReactDOM.createRoot() — that is already in the wrapper.\n"
                    "Use className (NOT class). Tailwind utility classes for styling. style={{}} for gradients.\n"
                    "IMAGES: use <img src='https://picsum.photos/seed/KEYWORD/600/400' alt='description' className='w-full h-48 object-cover rounded-xl' /> with a relevant seed word — NEVER emojis for images.\n"
                    "ICONS: emoji only (💰 📊 👥 🛒 🚀 ✨ ⚡ ✅ ⭐ 🎯) — DO NOT use data-lucide.\n"
                )
            ) if _is_component else (
                f"Output ONLY raw {ext.upper() if ext else 'code'} for '{path}'. Zero markdown fences. Zero prose. Zero explanations.\n"
            )
            + "MANDATORY QUALITY BAR — violating any of these is a failure:\n"
            "  - TAILWIND-FIRST: Every element styled with Tailwind classes. bg-white, rounded-2xl, shadow-md, p-6, flex, grid, gap-4 etc.\n"
            "  - VIBRANT: Rich gradients on hero. bg-gradient-to-br with 2-3 color stops. White text on dark backgrounds.\n"
            "  - TYPOGRAPHY: font-bold, font-extrabold, font-black for headings. tracking-tight. text-4xl/5xl/6xl for hero titles.\n"
            "  - DEPTH: shadow-sm on cards, shadow-xl on hover. transition-all duration-300 hover:-translate-y-2 for card lifts.\n"
            "  - POPULATED: Real names, real numbers, real dates, real prices everywhere. ZERO Lorem Ipsum.\n"
            "  - COMPLETE: Generate ALL sections listed. No stubs, no TODOs, no '...' or ellipsis.\n"
            "  - RICH: More sections, more content, more rows is always better than sparse output.\n"
            "  - IMAGES: Use <div class=\"card__image\">KEYWORD</div> for EVERY image. NEVER use <img> tags.\n"
            "  - SPACING: Generous padding py-20 or py-24 for sections. Cards with p-8. Gaps of gap-6 to gap-10.\n"
            "  - MODERN: rounded-3xl for cards, rounded-full for badges. Subtle borders. Professional Lovable-level quality.\n"
        )

        # Realistic dummy data injected per project type
        dummy_data = ""
        if ext in ("html", "htm", "tsx"):
            if is_app:
                dummy_data = (
                    "\n=== REALISTIC DATA — populate EVERY element with this (never use Lorem Ipsum) ===\n"
                    "KPIs: Total Revenue $127,840 (+12.4%) | Active Users 8,429 (+3.1%) | Conversion 4.7% (-0.3%) | Churn 1.2% (-0.8%)\n"
                    "Charts: use useRef + useEffect + Chart.js. canvasRef for line chart (revenue, 12 months), donutRef for doughnut (plan distribution)\n"
                    "Line chart data: [42000,67000,55000,81000,73000,95000,88000,71000,84000,92000,87000,110000] labels: Jan-Dec\n"
                    "Donut data: [45,35,20] labels: ['Enterprise','Pro','Starter'] colors: ['#3b82f6','#8b5cf6','#06b6d4']\n"
                    "Table rows (use className not class, use spans for badges):\n"
                    "  Sarah Johnson | Enterprise | $4,200/mo | Active (green) | Mar 10 2026 | sarah@acme.com\n"
                    "  Marcus Chen   | Pro        | $299/mo   | Active (green) | Mar 8 2026  | m.chen@startup.io\n"
                    "  Priya Patel   | Starter    | $49/mo    | Trial (yellow) | Mar 5 2026  | priya@patel.dev\n"
                    "  James Wilson  | Enterprise | $4,200/mo | Paused (red)   | Feb 28 2026 | jwilson@corp.com\n"
                    "  Aisha Torres  | Pro        | $299/mo   | Active (green) | Feb 25 2026 | aisha.t@ventures.co\n"
                    "NOTE: Generate ALL components including Sidebar, Navbar, KpiCards, Charts, DataTable, and App.\n"
                )
            elif is_ecommerce:
                dummy_data = (
                    "\n=== REALISTIC DATA — populate EVERY element with this ===\n"
                    "MANDATORY: Use className (NOT class) on all JSX elements.\n"
                    "Products to include (fill in ALL 6 in the ProductGrid):\n"
                    "  1. Nike Air Max Pro 2026 | Brand: Nike | $189 (was $249) | ★★★★★ 4.8 (2,341 reviews) | badge: badge--new\n"
                    "  2. Urban Slim Hoodie     | Brand: Adidas | $79          | ★★★★☆ 4.6 (891 reviews) | badge: badge--sale -30%\n"
                    "  3. Leather Minimal Wallet| Brand: Coach | $49           | ★★★★★ 4.9 (456 reviews) | badge: badge--best BESTSELLER\n"
                    "  4. Retro Runner 90s      | Brand: New Balance | $159    | ★★★★★ 4.7 (1,204 reviews) | badge: badge--low Only 3 left\n"
                    "  5. Cargo Utility Pants   | Brand: Carhartt | $129       | ★★★★☆ 4.5 (673 reviews) |\n"
                    "  6. Merino Wool Tee       | Brand: Uniqlo | $65          | ★★★★★ 4.8 (329 reviews) |\n"
                    "NOTE: Generate ALL components including CartDrawer, Navbar, Hero, ProductCard, ProductGrid, Newsletter, Footer, and App.\n"
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

        # Post-process: wrap in TSX imports or legacy HTML shell
        if ext == "tsx" and is_tsx_mode:
            content = self._repair_truncated_jsx(content)
            content = _tsx_top + content + _tsx_bottom
        elif ext in ("html", "htm"):
            content = self._repair_truncated_jsx(content)
            content = _html_top + content + _html_bottom

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

        # Multi-file React: components → pages → App.tsx (dependency order)
        is_multi_file_react = any("/" in str(f.get("path", "")) for f in plan_files)
        if is_multi_file_react:
            comp_files = [f for f in plan_files if "components/" in str(f.get("path", ""))]
            page_files = [f for f in plan_files if "pages/" in str(f.get("path", ""))]
            root_files = [f for f in plan_files if str(f.get("path", "")) in ("src/App.tsx", "App.tsx")]
            other_tsx  = [f for f in plan_files if f not in comp_files and f not in page_files and f not in root_files]
            ordered = comp_files + page_files + other_tsx + root_files
        else:
            # Order: HTML first → CSS (can reference HTML classes) → JS → rest
            html_files = [f for f in plan_files if str(f.get("path", "")).endswith((".html", ".htm"))]
            css_files  = [f for f in plan_files if str(f.get("path", "")).endswith(".css")]
            js_files   = [f for f in plan_files if str(f.get("path", "")).endswith(".js")]
            other      = [f for f in plan_files if f not in html_files and f not in css_files and f not in js_files]
            ordered    = html_files + css_files + js_files + other

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
                _time.sleep(30)
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
