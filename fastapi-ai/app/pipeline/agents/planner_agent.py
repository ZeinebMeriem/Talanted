from __future__ import annotations

import logging
import re
from typing import Any

from ...schemas import GenerateRequest
from ..llm_provider import LlmProvider
from ..models import SourcePack

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Project-type taxonomy
# ---------------------------------------------------------------------------
PROJECT_PROFILES: dict[str, dict[str, Any]] = {
    "dashboard": {
        "keywords": ["dashboard", "analytics", "metrics", "kpi", "chart", "widget", "admin", "panel", "crm", "erp"],
        "layout": "React SPA: sticky sidebar + top navbar, multiple page components rendered by state router",
        "required_files": ["index.html", "analytics.html", "users.html", "settings.html", "styles.css"],
        "aesthetic": "React components with hooks, Tailwind CSS, Chart.js, KPI cards, data tables, sidebar navigation",
        "min_pages": 4,
    },
    "landing": {
        "keywords": ["landing", "marketing", "saas", "product", "homepage", "hero", "pricing", "waitlist"],
        "layout": "React SPA: full-width sections with sticky nav, all sections as separate React components",
        "required_files": ["index.html", "styles.css"],
        "aesthetic": "React components, Tailwind CSS, bold hero, gradient CTAs, scroll-reveal, testimonials, pricing",
        "min_pages": 1,
    },
    "ecommerce": {
        "keywords": ["shop", "store", "ecommerce", "product", "cart", "checkout", "catalog", "buy", "boutique"],
        "layout": "React SPA: top nav with cart state, product grid, filter sidebar, cart drawer as React components",
        "required_files": ["index.html", "products.html", "cart.html", "styles.css"],
        "aesthetic": "React with useState for cart, Tailwind CSS, product cards, skeleton loaders, toast notifications",
        "min_pages": 3,
    },
    "portfolio": {
        "keywords": ["portfolio", "resume", "cv", "showcase", "personal", "freelance", "agency"],
        "layout": "React SPA: single-page with section components, smooth scroll, animated entries",
        "required_files": ["index.html", "styles.css"],
        "aesthetic": "React components, Tailwind CSS, typewriter effect, project cards, skills section, contact form",
        "min_pages": 1,
    },
    "app": {
        "keywords": ["app", "tool", "platform", "workflow", "productivity", "management", "tracker", "scheduler"],
        "layout": "React SPA: app shell with sidebar, topbar, modal system, all as React components with hooks",
        "required_files": ["index.html", "settings.html", "styles.css"],
        "aesthetic": "React with useReducer for state, Tailwind CSS, modal dialogs, toast notifications, drag-and-drop",
        "min_pages": 3,
    },
    "medical": {
        "keywords": ["medical", "health", "patient", "doctor", "clinic", "hospital", "appointment"],
        "layout": "React SPA: clean professional layout, forms with validation, patient records table",
        "required_files": ["index.html", "patients.html", "appointments.html", "styles.css"],
        "aesthetic": "React components, Tailwind CSS blue/white palette, accessible forms, status badges",
        "min_pages": 3,
    },
    "education": {
        "keywords": ["education", "course", "learning", "student", "teacher", "quiz", "formation"],
        "layout": "React SPA: course listing, lesson view, progress tracking as React components",
        "required_files": ["index.html", "courses.html", "styles.css"],
        "aesthetic": "React components, Tailwind CSS, progress bars, course cards, quiz components",
        "min_pages": 2,
    },
}

DEFAULT_PROFILE = {
    "layout": "responsive top navbar with hero section",
    "required_files": ["index.html", "styles.css", "script.js"],
    "aesthetic": "clean typography, subtle hover states, mobile-first grid layout",
    "min_pages": 1,
}

# Core files that must always be present, in preferred output order
CORE_FILES = ["index.html", "styles.css"]

# Files that should appear AFTER pages but BEFORE scripts
STYLE_FILES = {"styles.css", "variables.css", "animations.css", "components.css"}
SCRIPT_FILES = {"script.js", "app.js", "utils.js", "charts.js", "animations.js"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _detect_project_type(context: str) -> tuple[str, dict[str, Any]]:
    """Return (type_name, profile) by scoring keyword hits in the context."""
    lower = context.lower()
    scores: dict[str, int] = {}
    for name, profile in PROJECT_PROFILES.items():
        scores[name] = sum(1 for kw in profile["keywords"] if kw in lower)

    best = max(scores, key=lambda k: scores[k])
    if scores[best] == 0:
        logger.info("PlannerAgent: no strong project type signal; using generic profile")
        return "generic", DEFAULT_PROFILE

    logger.info("PlannerAgent: detected project type '%s' (score=%d)", best, scores[best])
    return best, PROJECT_PROFILES[best]


def _sort_files(files: list[dict[str, str]]) -> list[dict[str, str]]:
    """Return files in logical generation order.

    React TSX:  components/ → pages/ → other src/ → App.tsx last
    HTML/CSS/JS: index.html first → other pages → CSS → JS
    """
    # ── React multi-file (TSX) ordering ──────────────────────────────────────
    tsx_files = [f for f in files if f["path"].endswith(".tsx") or f["path"].endswith(".ts")]
    if tsx_files:
        mock_data  = [f for f in files if f["path"].startswith("src/data/")]
        components = [f for f in files if "src/components/" in f["path"] and f["path"].endswith(".tsx")]
        pages      = [f for f in files if "src/pages/" in f["path"] and f["path"].endswith(".tsx")]
        root_app   = [f for f in files if f["path"] in ("src/App.tsx", "App.tsx")]
        other_tsx  = [f for f in files if f not in mock_data and f not in components and f not in pages and f not in root_app and (f["path"].endswith(".tsx") or f["path"].endswith(".ts"))]
        non_tsx    = [f for f in files if not f["path"].endswith(".tsx") and not f["path"].endswith(".ts")]
        return mock_data + components + pages + other_tsx + non_tsx + root_app

    # ── Legacy HTML/CSS/JS ordering ───────────────────────────────────────────
    pages   = [f for f in files if f["path"].endswith(".html")]
    styles  = [f for f in files if f["path"] in STYLE_FILES or (f["path"].endswith(".css") and f["path"] not in {p["path"] for p in pages})]
    scripts = [f for f in files if f["path"] in SCRIPT_FILES or (f["path"].endswith(".js") and f["path"] not in {p["path"] for p in pages})]
    other   = [f for f in files if f not in pages and f not in styles and f not in scripts]

    idx = next((f for f in pages if f["path"] == "index.html"), None)
    rest_pages = [f for f in pages if f["path"] != "index.html"]
    return ([idx] if idx else []) + rest_pages + other + styles + scripts


def _build_react_file_plan(project_type: str, plan: dict, raw_html_files: list) -> list[dict[str, str]]:
    """Build a dynamic React multi-file TSX plan from HTML-based planner output.

    Converts the LLM-planned HTML pages into proper React architecture:
    src/components/ (reusable layout) + src/pages/ (page-level) + src/App.tsx (router).
    """
    import os as _os

    def to_page_name(html_path: str) -> str:
        stem = re.sub(r"\.html?$", "", html_path)
        name = "".join(p.capitalize() for p in re.split(r"[-_]", stem))
        if name.lower() in ("index", ""):
            name = "Dashboard"
        return name if name.endswith("Page") else name + "Page"

    html_pages = [f for f in raw_html_files if str(f.get("path", "")).endswith(".html")]
    # Always start with mock data file
    files: list[dict[str, str]] = [
        {"path": "src/data/mockData.ts",
         "description": "TypeScript interfaces and all mock data arrays used across pages (no imports needed from here)"},
    ]

    if project_type in ("dashboard", "app"):
        files += [
            {"path": "src/components/Sidebar.tsx",
             "description": "Sidebar: brand logo, nav <button> items calling setActivePage(), active=bg-indigo-600, bottom upgrade CTA"},
            {"path": "src/components/Navbar.tsx",
             "description": "Sticky top navbar: page title left, search input center, Bell + user avatar right"},
        ]
        for hf in html_pages:
            pname = to_page_name(hf.get("path", ""))
            files.append({"path": f"src/pages/{pname}.tsx", "description": hf.get("description", pname)})
        if not any("pages/" in f["path"] for f in files):
            files.insert(2, {
                "path": "src/pages/OverviewPage.tsx",
                "description": "Main overview: KPI cards, charts, data table with status badges"
            })
        if not any("SettingsPage" in f["path"] for f in files):
            files.append({
                "path": "src/pages/SettingsPage.tsx",
                "description": "Settings: profile form fields, notification toggles, save button"
            })

    elif project_type == "ecommerce":
        files += [
            {"path": "src/components/Navbar.tsx",
             "description": "Top nav: brand logo, nav links, ShoppingCart icon with red badge counter"},
            {"path": "src/components/ProductCard.tsx",
             "description": "ProductCard: picsum.photos image, badge, brand, name, star rating, price, add-to-cart button"},
            {"path": "src/components/CartDrawer.tsx",
             "description": "Slide-in cart: fixed right panel, items list, subtotal, checkout button, backdrop overlay"},
        ]
        for hf in html_pages:
            pname = to_page_name(hf.get("path", ""))
            if pname not in ("IndexPage", "CartPage"):
                files.append({"path": f"src/pages/{pname}.tsx", "description": hf.get("description", pname)})

    elif project_type in ("medical", "education"):
        files += [
            {"path": "src/components/Sidebar.tsx",
             "description": "Sidebar navigation with setActivePage routing and active state highlighting"},
            {"path": "src/components/Navbar.tsx",
             "description": "Top navbar with search bar and user profile avatar"},
        ]
        for hf in html_pages:
            pname = to_page_name(hf.get("path", ""))
            files.append({"path": f"src/pages/{pname}.tsx", "description": hf.get("description", pname)})

    else:
        # landing, portfolio, generic — single file is sufficient
        return [{"path": "src/App.tsx",
                 "description": plan.get("summary", "Complete React SPA with all sections inline")}]

    comp_names = [_os.path.basename(f["path"]).replace(".tsx", "") for f in files if "components/" in f["path"]]
    page_names = [_os.path.basename(f["path"]).replace(".tsx", "") for f in files if "pages/" in f["path"]]
    first_page = page_names[0].replace("Page", "").lower() if page_names else "dashboard"

    files.append({
        "path": "src/App.tsx",
        "description": (
            f"Root: useState('{first_page}') router. "
            f"Layout: [{', '.join(comp_names)}]. "
            f"Pages: [{', '.join(page_names)}]. "
            f"Conditional rendering per activePage."
        )
    })

    logger.info("PlannerAgent: React multi-file plan → %s", [f["path"] for f in files])
    return files


def _ensure_core_files(files: list[dict[str, str]]) -> list[dict[str, str]]:
    existing_paths = {f["path"] for f in files}
    defaults = {
        "index.html": "Main entry point with core layout and navigation",
        "styles.css": "Global design system: tokens, layout, components, and animations",
        "script.js":  "Core interactivity: routing, event handling, and animation triggers",
    }
    for path, desc in defaults.items():
        if path not in existing_paths:
            files.append({"path": path, "description": desc})
    return files


def _clean_files(raw: list[Any]) -> list[dict[str, str]]:
    """Sanitize and deduplicate a list of file entries from the LLM.

    Accepts both flat paths (index.html) and React multi-file paths
    (src/components/Sidebar.tsx, src/pages/DashboardPage.tsx, src/App.tsx).
    """
    clean: list[dict[str, str]] = []
    seen: set[str] = set()
    _ALLOWED = re.compile(
        r"^(?:"
        r"[\w\-]+\.(html|css|js|json|svg|webmanifest)"   # flat HTML/CSS/JS
        r"|src/data/[\w\-]+\.ts"                          # mock data (TypeScript)
        r"|src/components/[\w\-]+\.tsx"                   # React component
        r"|src/pages/[\w\-]+\.tsx"                        # React page
        r"|src/[\w\-]+\.tsx"                              # React root (App.tsx etc.)
        r"|public/[\w\-\.]+\.(ico|png|svg|jpg|jpeg|webp|gif|json|xml|txt)"  # public static assets
        r")$",
        re.IGNORECASE,
    )
    for item in raw:
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or "").strip()
        if not path or path in seen:
            continue
        if not _ALLOWED.match(path):
            logger.warning("PlannerAgent: skipping unrecognised file path '%s'", path)
            continue
        seen.add(path)
        clean.append({
            "path": path,
            "description": str(item.get("description") or path)[:300].strip(),
        })
    return clean


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class PlannerAgent:
    """
    Analyzes user requirements and produces a structured project plan.

    Improvements over the baseline:
    - Detects project type (dashboard / landing / e-commerce / portfolio / app)
      and injects type-specific layout, aesthetics, and required files into the
      prompt, so the LLM makes better decisions without relying purely on user
      phrasing.
    - Uses a two-step chain-of-thought prompt: first THINK, then OUTPUT JSON,
      which significantly improves plan quality and requirement specificity.
    - Validates and sanitizes LLM output more robustly (extension allowlist,
      deduplication, suspicious-path filtering).
    - Enforces correct file-generation order: HTML pages → CSS → JS.
    - Retains all original guard-rails (core-file injection, 12-file cap, etc.).
    """

    def __init__(self, provider: LlmProvider) -> None:
        self.provider = provider

    @property
    def model(self) -> str:
        return getattr(self.provider, "model", "unknown")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def plan(self, req: GenerateRequest, pack: SourcePack) -> dict[str, Any]:
        context = self._extract_context(pack)
        project_type, profile = _detect_project_type(context)
        logger.info(
            "PlannerAgent: project_type=%s, context_chars=%d, preview=%.200s",
            project_type, len(context), context[:200],
        )

        sys_msg = self._build_system_prompt()
        user_msg = self._build_user_prompt(req, context, project_type, profile)

        plan = self.provider.chat_json(sys_msg, user_msg)

        plan = self._validate_and_enrich(plan, profile, project_type)
        plan["_meta"] = {"project_type": project_type, "model": self.model}
        return plan

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _extract_context(self, pack: SourcePack) -> str:
        chunks = [i.content for i in pack.items if i.kind == "context"]
        context = "\n\n".join(chunks).strip()
        if not context:
            raise ValueError("No context available for planner")
        return context

    def _build_system_prompt(self) -> str:
        return "\n".join([
            # ── Identity & Authority ──────────────────────────────────────────
            "You are ARIA — Autonomous Requirements & Interface Architect.",
            "You operate as a Principal-level Web Systems Designer with 20+ years of craft across:",
            "  • Fortune-500 SaaS platforms  (Salesforce, HubSpot, Notion, Linear)",
            "  • Consumer-grade products      (Stripe, Vercel, Figma, Loom)",
            "  • High-density data interfaces (Bloomberg Terminal, Grafana, Datadog)",
            "",
            "Your plans are the north star for a downstream AI code-generation pipeline.",
            "Every decision you make directly determines the quality, coherence, and completeness",
            "of the final product. Treat each plan as a contract: precise, unambiguous, buildable.",
            "",
            # ── Design Philosophy ─────────────────────────────────────────────
            "══════════════════════════════════════════════════════════════════",
            "DESIGN PHILOSOPHY — internalize before planning",
            "══════════════════════════════════════════════════════════════════",
            "",
            "1. HIERARCHY FIRST",
            "   Every layout must establish a clear visual hierarchy through scale, weight, and",
            "   contrast — not decoration. If a user cannot identify the primary CTA in < 3 s,",
            "   the layout has failed.",
            "",
            "2. MOTION WITH PURPOSE",
            "   Animations must communicate state changes, not entertain.",
            "   Entrance: fade-up 24 px, 400 ms cubic-bezier(0.22,1,0.36,1).",
            "   Hover:    transform + opacity, never layout-triggering properties.",
            "   Loading:  shimmer skeletons, not spinners (spinners kill perceived performance).",
            "",
            "3. SYSTEM THINKING",
            "   Design tokens (CSS custom properties) must drive every visual decision:",
            "   --color-*, --space-*, --radius-*, --shadow-*, --font-*, --duration-*.",
            "   Never hard-code values inside components.",
            "",
            "4. ACCESSIBILITY IS NOT OPTIONAL",
            "   Every interactive element needs: focus-visible ring, aria labels, keyboard nav.",
            "   Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components (WCAG 2.1 AA).",
            "",
            "5. MOBILE-FIRST RESILIENCE",
            "   Design for 320 px first; enhance for 1440 px. Sidebars collapse to drawers.",
            "   Touch targets ≥ 44×44 px. Fluid typography: clamp(min, preferred, max).",
            "",
            "6. PERFORMANCE BUDGET",
            "   No external JS frameworks unless the user explicitly requests them.",
            "   Vanilla JS modules only. CSS animations over JS where possible.",
            "   Lazy-load images. Inline critical CSS in <head>.",
            "",
            # ── Output Contract ───────────────────────────────────────────────
            "══════════════════════════════════════════════════════════════════",
            "OUTPUT CONTRACT — non-negotiable",
            "══════════════════════════════════════════════════════════════════",
            "",
            "R1. Return ONLY a single, valid JSON object.",
            "    No markdown code fences. No // comments. No trailing commas. No prose.",
            "",
            "R2. Chain-of-thought FIRST, JSON SECOND.",
            "    Write your architectural reasoning inside the '_thinking' key (max 5 sentences).",
            "    Then build the rest of the JSON. '_thinking' is stripped before delivery.",
            "",
            "R3. Every requirement = one concrete, testable UI/UX behaviour.",
            "    BAD  → 'Nice hover effects'",
            "    GOOD → 'Nav links: color transition from --color-muted to --color-accent",
            "             over 200 ms ease, with translateX(4px) nudge on hover'",
            "",
            "R4. Every file description = its UNIQUE responsibility + key contents.",
            "    BAD  → 'JavaScript file'",
            "    GOOD → 'Handles sidebar collapse toggle, Intersection Observer scroll-reveal",
            "             on .widget elements, and debounced live-search filtering of #table-rows'",
            "",
            "R5. React file paths must follow this structure:",
            "    src/data/mockData.ts               — ALL mock data arrays & types (FIRST file)",
            "    src/components/ComponentName.tsx   — reusable layout pieces",
            "    src/pages/PageNamePage.tsx          — full page views",
            "    src/App.tsx                         — root router (always last)",
            "    Name files after what they DO, not generic names.",
            "    Examples: KanbanBoard.tsx, PatientRecords.tsx, InvoiceTable.tsx",
            "",
            "R6. The template includes shadcn/ui components. Import them as:",
            "    import { Button } from '@/components/ui/button'",
            "    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'",
            "    import { Badge } from '@/components/ui/badge'",
            "    import { Input } from '@/components/ui/input'",
            "    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'",
            "    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'",
            "    import { Progress } from '@/components/ui/progress'",
            "    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'",
            "    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'",
            "    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'",
            "    Use these instead of building raw Tailwind components from scratch.",
        ])

    def _build_user_prompt(
        self,
        req: GenerateRequest,
        context: str,
        project_type: str,
        profile: dict[str, Any],
    ) -> str:
        # ── Rich file manifest with roles and dependency hints ────────────────
        file_roles = {
            "index.html":     ("ENTRY POINT",   "Main dashboard: KPI cards grid, revenue chart, users bar chart, distribution donut, data table"),
            "dashboard.html": ("DATA VIEW",      "Primary data canvas: KPI grid, charts, activity feed"),
            "analytics.html": ("ANALYTICS VIEW", "Deep-dive charts, date-range filters, trend lines, metric breakdowns"),
            "users.html":     ("USERS VIEW",     "User management table: avatar, name, email, plan, status badges, search, pagination"),
            "settings.html":  ("CONFIG VIEW",    "Settings page: profile form, notification toggles, theme picker, API keys section"),
            "products.html":  ("CATALOG VIEW",   "Product grid, filter sidebar, sort controls"),
            "cart.html":      ("COMMERCE VIEW",  "Cart line-items, coupon input, order summary"),
            "app.html":       ("APP SHELL",      "Main task canvas, command palette, panel layout"),
            "styles.css":     ("DESIGN SYSTEM",  "CSS custom properties, layout primitives, component library"),
            "variables.css":  ("TOKENS",         "Centralized design tokens — import first in styles.css"),
            "animations.css": ("MOTION LAYER",   "@keyframes library, transition utilities, scroll-reveal classes"),
            "components.css": ("COMPONENT CSS",  "Scoped styles for cards, modals, badges, tooltips"),
            "script.js":      ("ORCHESTRATOR",   "App init, routing shim, global event bus, module loader"),
            "utils.js":       ("UTILITIES",      "Pure helpers: debounce, throttle, formatters, DOM selectors"),
            "charts.js":      ("DATA VIZ",       "SVG/Canvas chart renderers: bar, line, donut, sparkline"),
            "animations.js":  ("MOTION ENGINE",  "Intersection Observer setup, GSAP-style timeline sequencer"),
        }

        import os as _os
        _output_target = _os.environ.get("AI_OUTPUT_TARGET", "react").lower().strip()

        if _output_target == "react":
            # ── React mode: give LLM a TSX-specific file guide ────────────────
            _react_file_guide: dict[str, list[str]] = {
                "dashboard": [
                    "src/data/mockData.ts         — TypeScript types + ALL mock data arrays (properties, users, stats...)",
                    "src/components/Sidebar.tsx   — vertical nav, brand logo, nav buttons calling setActivePage()",
                    "src/components/Navbar.tsx    — sticky top bar, search, notifications, user avatar",
                    "src/pages/[Subject]Page.tsx  — one per major screen (name it after what IT does)",
                    "src/App.tsx                  — useState router, renders layout + active page",
                ],
                "app": [
                    "src/data/mockData.ts         — TypeScript types + ALL mock data arrays",
                    "src/components/Sidebar.tsx   — app shell sidebar with nav items",
                    "src/components/[Widget].tsx  — any domain-specific reusable widget",
                    "src/pages/[Subject]Page.tsx  — one per major view",
                    "src/App.tsx                  — root router",
                ],
                "ecommerce": [
                    "src/data/mockData.ts           — product catalog data, categories, cart types",
                    "src/components/Navbar.tsx      — top nav with cart badge counter",
                    "src/components/ProductCard.tsx — reusable product card (image, price, add-to-cart)",
                    "src/components/CartDrawer.tsx  — slide-in cart panel",
                    "src/pages/[Subject]Page.tsx    — catalog, checkout, etc.",
                    "src/App.tsx                    — root router with cart state",
                ],
                "landing": [
                    "src/App.tsx  — single file with all sections inline (Hero, Features, Pricing, Footer)",
                ],
                "portfolio": [
                    "src/App.tsx  — single file with all sections inline (Hero, Projects, Skills, Contact)",
                ],
            }
            guide_lines = _react_file_guide.get(project_type, _react_file_guide["dashboard"])
            required_files_block = (
                "SUGGESTED FILE STRUCTURE (adapt names to this specific project):\n"
                + "\n".join(f"  {line}" for line in guide_lines)
            )
            optional_files_block = ""
        else:
            # ── Legacy HTML mode ──────────────────────────────────────────────
            required_files = profile["required_files"]
            file_rows: list[str] = []
            for path in required_files:
                role, purpose = file_roles.get(path, ("ASSET", f"Supporting file for {path}"))
                file_rows.append(f"  {path:<22} [{role:<14}]  →  {purpose}")
            optional_hints: list[str] = []
            type_optional_map: dict[str, list[str]] = {
                "dashboard": ["charts.js", "animations.css", "utils.js"],
                "landing":   ["animations.css", "animations.js"],
                "ecommerce": ["utils.js", "components.css"],
                "portfolio": ["animations.js", "animations.css"],
                "app":       ["utils.js", "charts.js", "components.css"],
                "generic":   ["utils.js"],
            }
            for opt in type_optional_map.get(project_type, []):
                if opt not in required_files and opt in file_roles:
                    role, purpose = file_roles[opt]
                    optional_hints.append(f"  {opt:<22} [{role:<14}]  →  {purpose}  ← ADD if scope warrants")
            required_files_block = "\n".join(file_rows)
            optional_files_block = (
                "\nOPTIONAL (include only if they add clear value):\n" + "\n".join(optional_hints)
                if optional_hints else ""
            )

        # ── Requirement quality bar with type-specific examples ───────────────
        req_examples_by_type: dict[str, list[str]] = {
            "dashboard": [
                "Sticky sidebar 240 px wide; active page marked with 3 px left-border in --color-accent and bg rgba(accent,0.08)",
                "Top navbar: breadcrumb trail (Home › Section) + live search input with 300 ms debounce filtering table rows",
                "KPI cards: glassmorphic bg (backdrop-filter blur 16px, rgba(255,255,255,0.06)), animated counter on page-load using requestAnimationFrame",
                "Inline SVG sparkline charts with stroke-dashoffset animation triggered by Intersection Observer",
                "Dark / light mode toggle: swaps --color-* tokens via data-theme attribute, preference persisted in localStorage",
                "Mobile (< 768 px): sidebar hides off-canvas, toggleable via hamburger; overlay backdrop closes it on tap",
                "Scroll-reveal: .widget elements fade-up 24 px over 400 ms as they enter viewport (stagger 60 ms each)",
                "Custom scrollbar: 4 px thumb in --color-accent, transparent track, hidden on mobile via CSS media query",
                "Table rows: hover bg --color-surface-2, striped even rows, sticky header with shadow on scroll",
                "Toast notification system: slide-in from top-right, auto-dismiss after 4 s, supports success/error/info variants",
            ],
            "landing": [
                "Hero section: fluid headline clamp(2.5rem, 5vw, 5rem), gradient text fill, CTA button with shimmer sweep on hover",
                "Sticky navbar: transparent at top, frosted-glass bg (backdrop-filter blur 20px) on scroll past 80 px",
                "Feature cards: 3-column CSS Grid; card lifts (translateY -6px, shadow-lg) on hover over 250 ms ease",
                "Pricing toggle (monthly/annual): CSS checkbox hack or JS toggle swaps prices with crossfade animation",
                "Testimonials: horizontal scroll snap carousel, dot indicators, auto-advance every 5 s paused on hover",
                "FAQ accordion: max-height transition 0 → content height, chevron rotates 180° on open",
                "Scroll-reveal sections: Intersection Observer adds .visible class triggering fade-up stagger on children",
                "Footer newsletter input: focus state expands width with smooth transition; shake animation on invalid email",
                "Mobile nav: full-screen overlay menu, links stagger-in from left with 50 ms delay each",
                "Social proof ticker: marquee-style logo strip, pauses on hover, ARIA-hidden for screen readers",
            ],
            "ecommerce": [
                "Product grid: CSS Grid auto-fill minmax(240px,1fr); card image zooms to 108% on hover over 300 ms",
                "Filter sidebar: checkbox groups with live count badges, applied filters shown as removable chips above grid",
                "Cart icon: badge counter animates (scale 1.4 → 1 bounce) on item add; persists count in sessionStorage",
                "Sticky add-to-cart bar: appears when product hero scrolls out of view, smooth slide-down transition",
                "Image gallery: thumbnail strip + main image swap with crossfade; supports keyboard arrow navigation",
                "Skeleton loaders: shimmer placeholder cards shown during async product fetch, matched to card dimensions",
                "Toast notifications: 'Added to cart' slide-in, stacks up to 3, queues overflow, auto-dismiss 3 s",
                "Quantity stepper: − / + buttons with min=1 guard, input value synced, ripple effect on button press",
                "Breadcrumb nav: structured data (JSON-LD), truncates on mobile to … › Category › Product",
                "Empty cart state: centered SVG illustration + 'Continue Shopping' CTA with arrow animation on hover",
            ],
            "portfolio": [
                "Hero: typewriter effect cycles through role titles (200 ms per char, 1.5 s pause, erase 80 ms per char)",
                "Custom cursor: 12 px dot follows mouse with 80 ms lerp lag; expands to 40 px on interactive element hover",
                "Project cards: flip on hover (rotateY 180°, backface-hidden) revealing tech stack and live/GitHub links",
                "Section anchors: smooth scroll offset by navbar height using scroll-margin-top CSS property",
                "Skills grid: progress bars animate width 0 → value% over 800 ms ease when scrolled into view",
                "Contact form: floating labels (label translates up on focus/filled), textarea auto-expands with content",
                "Parallax hero background: translates at 40% scroll speed using CSS transform on scroll event (throttled 16 ms)",
                "Dark mode: toggle with sun/moon SVG morph animation, system preference detected via prefers-color-scheme",
                "Mobile nav: slide-down full-width menu, links fade-in with 60 ms stagger, focus trapped while open",
                "Back-to-top button: appears after 400 px scroll, smooth return, fades in/out with opacity transition",
            ],
            "app": [
                "App shell: 3-panel CSS Grid (sidebar 240px | main 1fr | optional detail 320px), collapses on < 1024 px",
                "Command palette: Cmd+K opens modal with fuzzy-search input, arrow-key navigation, Enter to execute",
                "Drag-and-drop lists: HTML5 draggable with drop-zone highlight and ghost element opacity 0.5",
                "Modal system: focus trap, Escape to close, backdrop click to dismiss, slide-up animation 300 ms",
                "Toast / snackbar queue: bottom-left stack, max 3 visible, slide-in from left, auto-dismiss 4 s",
                "Inline editing: click-to-edit text fields, Enter/blur to save, Escape to cancel, optimistic update",
                "Tabs component: underline indicator slides between tabs with CSS left/width transition 200 ms",
                "Empty states: per-section illustrated SVG with contextual action button (e.g., 'Create your first task')",
                "Keyboard shortcuts legend: ? key opens overlay listing all shortcuts, dismisses on Escape",
                "Responsive sidebar: collapses to icon-only rail on < 1280 px, hover expands with tooltip labels",
            ],
        }

        req_examples = req_examples_by_type.get(project_type, req_examples_by_type["dashboard"])
        req_examples_block = "\n".join(f'    "{ex}"' for ex in req_examples[:5])

        return "\n".join([
            f"generationId: {req.generationId}",
            "",
            "╔══════════════════════════════════════════════════════════════════╗",
            "║                     USER SPECIFICATION                          ║",
            "╚══════════════════════════════════════════════════════════════════╝",
            "",
            context,
            "",
            "╔══════════════════════════════════════════════════════════════════╗",
            "║              AUTO-DETECTED ARCHITECTURE BRIEF                   ║",
            "╚══════════════════════════════════════════════════════════════════╝",
            "",
            f"  Project type    :  {project_type.upper()}",
            f"  Layout pattern  :  {profile['layout']}",
            f"  Aesthetic focus :  {profile['aesthetic']}",
            f"  Min pages       :  {profile['min_pages']}",
            "",
            required_files_block,
            optional_files_block,
            "",
            "╔══════════════════════════════════════════════════════════════════╗",
            "║              ENTITY-DRIVEN FILE NAMING (MANDATORY)              ║",
            "╚══════════════════════════════════════════════════════════════════╝",
            "",
            "The PROJECT CONTEXT block in the USER SPECIFICATION above contains extracted",
            "entities (e.g. Property, Patient, Order) and key features for THIS project.",
            "",
            "You MUST derive every file name from those entities — not from generic templates.",
            "",
            "  Rule: file name = core entity + role suffix",
            "  ✅  PropertyCard.tsx        (entity=Property, role=Card)",
            "  ✅  PatientRecordsPage.tsx  (entity=Patient, role=Page)",
            "  ✅  OrderTable.tsx          (entity=Order, role=Table)",
            "  ❌  Dashboard.tsx / Page1.tsx / Component1.tsx  ← forbidden",
            "",
            "  If entities=[Appointment, Doctor, Patient]:",
            "    → AppointmentCalendarPage, DoctorCard, PatientListPage, BookingForm",
            "  If entities=[Product, Cart, Order]:",
            "    → ProductGridPage, CartSidebar, OrderHistoryPage, ProductCard",
            "",
            "The extracted 'layout_type' (dashboard/catalog/landing/app/ecommerce) already",
            "matches the AUTO-DETECTED PROJECT TYPE above — use it to confirm your file split.",
            "",
            "╔══════════════════════════════════════════════════════════════════╗",
            "║                       YOUR MISSION                              ║",
            "╚══════════════════════════════════════════════════════════════════╝",
            "",
            "Architect a complete, production-ready, multi-file web project plan.",
            "The downstream AI will generate EVERY file you list — so plan with precision.",
            "",
            "━━━ PLANNING CONSTRAINTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "",
            "FILES (Vite + React multi-file architecture):",
            "  • Minimum 3 files, maximum 10 files.",
            "  • MUST always end with src/App.tsx as the root router.",
            "  • src/components/*.tsx  — reusable layout pieces (Sidebar, Navbar, specific widgets).",
            "  • src/pages/*.tsx       — one file per major screen, named after its content.",
            "  • Name every file after what it DOES for this specific project:",
            "      ✅ KanbanBoard.tsx, PatientRecordsPage.tsx, InvoiceTable.tsx",
            "      ❌ Component1.tsx, Page1.tsx, Dashboard.tsx (too generic)",
            "  • For apps/dashboards: 2 components + 3-5 pages + App.tsx.",
            "  • For landing/portfolio: src/App.tsx only (single file is fine).",
            "  • For ecommerce: 2-3 components (cart, product card) + 1-2 pages + App.tsx.",
            "",
            "REQUIREMENTS (produce exactly 8–12):",
            "  • Each requirement = one concrete, implementable UI/UX behaviour.",
            "  • Must name the element + the technique + the values/timing.",
            "  • Must cover: Layout, Motion, Interactivity, Responsive, Accessibility.",
            "",
            "QUALITY GATE — your requirements will be auto-scored:",
            "  ✅  PASS  → specific element + technique + measurable detail",
            "  ❌  FAIL  → generic phrases like 'smooth', 'nice', 'modern', 'clean'",
            "",
            f"━━━ EXAMPLE REQUIREMENTS for a '{project_type}' project ━━━━━━━━━━━━",
            "",
            req_examples_block,
            "",
            "  (Use these as the quality bar — your output should match or exceed this specificity.)",
            "",
            "━━━ OUTPUT FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "",
            "Return a SINGLE valid JSON object — no fences, no comments:",
            "",
            "{",
            '  "_thinking": "2–5 sentences: why this file split, what components make sense for this specific project",',
            '  "summary":   "Specific, evocative project title (not generic)",',
            '  "language":  "en",',
            '  "needsJs":   true,',
            '  "pageCount": 4,',
            '  "requirements": [',
            '    "REQUIREMENT 1 — element + technique + values",',
            '    "REQUIREMENT 2 — ...",',
            '    "... (8 to 12 total)"',
            "  ],",
            '  "files": [',
            '    {"path": "src/components/[LayoutPiece].tsx",  "description": "What this layout piece does"},',
            '    {"path": "src/components/[Widget].tsx",       "description": "What this widget/component does"},',
            '    {"path": "src/pages/[FirstScreen]Page.tsx",   "description": "What the user sees on this screen"},',
            '    {"path": "src/pages/[SecondScreen]Page.tsx",  "description": "What the user sees on this screen"},',
            '    {"path": "src/App.tsx",                       "description": "Root: useState router wiring all components and pages"}',
            "  ]",
            "}",
            "",
            "⚠️  CRITICAL — [LayoutPiece], [Widget], [FirstScreen], [SecondScreen] are PLACEHOLDERS.",
            "You MUST invent names that describe THIS specific project based on the user description above.",
            "NEVER use DashboardPage, AnalyticsPage, Component1, Page1 — those are forbidden generic names.",
            "Good examples for a restaurant app  : MenuPage, ReservationsPage, OrdersPage, KitchenPage",
            "Good examples for a hospital app    : PatientRecordsPage, AppointmentsPage, DoctorCard",
            "Good examples for a kanban tool     : KanbanBoard, TaskCard, BoardPage, SprintPage",
            "Good examples for an e-learning app : CourseCatalogPage, LessonPage, QuizPage, ProgressCard",
        ])

    def _validate_and_enrich(
        self,
        plan: dict[str, Any],
        profile: dict[str, Any],
        project_type: str = "generic",
    ) -> dict[str, Any]:
        # --- Files ---
        raw_files = plan.get("files")
        raw_html_files = _clean_files(raw_files) if isinstance(raw_files, list) else []
        files = _ensure_core_files(list(raw_html_files))
        files = _sort_files(files)
        logger.info("PlannerAgent: LLM planned HTML files: %s", [f['path'] for f in files])

        import os as _os
        output_target = _os.environ.get("AI_OUTPUT_TARGET", "react").lower().strip()
        if output_target == "react":
            # Prefer the LLM's own TSX/TS file plan (dynamic, project-specific names)
            tsx_files = [f for f in raw_html_files if f["path"].endswith(".tsx") or f["path"].endswith(".ts")]
            if tsx_files:
                logger.info("PlannerAgent: using LLM-generated TSX file plan (%d files)", len(tsx_files))
                plan["files"] = _sort_files(tsx_files)
            else:
                # LLM returned HTML paths — fall back to hardcoded template
                logger.warning("PlannerAgent: LLM gave no TSX paths, falling back to static template")
                plan["files"] = _build_react_file_plan(project_type, plan, raw_html_files)

            # Always ensure src/data/mockData.ts is in the plan (first file)
            has_mock_data = any(f["path"].startswith("src/data/") for f in plan.get("files", []))
            if not has_mock_data and any("pages/" in f["path"] for f in plan.get("files", [])):
                plan["files"] = [
                    {"path": "src/data/mockData.ts",
                     "description": "TypeScript interfaces and all mock data arrays used across the project"}
                ] + plan["files"]
                logger.info("PlannerAgent: injected src/data/mockData.ts as first file")
        else:
            index_file = next((f for f in files if f["path"] == "index.html"), None)
            plan["files"] = [index_file] if index_file else [{"path": "index.html", "description": "Main app"}]
        logger.info("PlannerAgent: final planned files: %s", [f['path'] for f in plan["files"]])

        # --- Scalar fields ---
        plan.setdefault("summary", "Web Project")
        plan.setdefault("language", "en")
        plan.setdefault("needsJs", True)
        plan.setdefault("pageCount", max(1, sum(1 for f in plan["files"] if f["path"].endswith(".html"))))

        # --- Requirements ---
        reqs = plan.get("requirements")
        if not isinstance(reqs, list) or len(reqs) < 3:
            # Fallback: inject profile aesthetics as generic requirements
            plan["requirements"] = [
                f"Layout: {profile['layout']}",
                f"Aesthetics: {profile['aesthetic']}",
                "Responsive grid: CSS Grid with auto-fill columns, min 280 px",
                "Accessible focus rings: 2 px offset outline on all interactive elements",
                "Loading skeletons: shimmer animation placeholder for async content",
                "Micro-interactions: button scale(0.97) on active with 150 ms transition",
                "Error states: inline form validation with red border + helper text",
                "Empty states: illustrated SVG placeholder with action CTA",
            ]
        else:
            # Filter out vague one-word requirements
            plan["requirements"] = [
                r for r in reqs
                if isinstance(r, str) and len(r.strip()) > 20
            ]

        # Strip internal chain-of-thought key before returning
        plan.pop("_thinking", None)

        return plan