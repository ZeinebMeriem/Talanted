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
        "react": {
            "keywords": ["react", "component", "tsx", "spa", "single page", "frontend", "vite", "typescript", "ui", "app", "dashboard", "admin", "analytics", "multi-file", "modular"],
            "layout": "src/App.tsx entry, src/components/ for modular views, global styles, and utility files",
            "required_files": [
                "index.html",
                "styles.css",
                "src/App.tsx",
                "src/components/Dashboard.tsx",
                "src/components/Users.tsx",
                "src/components/Analytics.tsx",
                "src/components/Billing.tsx",
                "src/components/Settings.tsx",
                "src/components/Support.tsx",
                "src/components/Navbar.tsx",
                "src/components/Sidebar.tsx",
                "src/components/Footer.tsx",
                "src/components/Modal.tsx",
                "src/components/Table.tsx",
                "src/components/Chart.tsx",
                "src/pages/Login.tsx",
                "src/pages/Register.tsx",
                "src/pages/Profile.tsx",
                "src/pages/NotFound.tsx"
            ],
            "aesthetic": "modern React SPA, Google Fonts, professional color palette, modular and reusable components, responsive and accessible",
            "min_pages": 10,
        },
    "dashboard": {
        "keywords": ["dashboard", "analytics", "metrics", "kpi", "chart", "widget", "admin", "panel", "crm", "erp"],
        "layout": "sticky sidebar + top navbar with user profile",
        "required_files": ["index.html", "analytics.html", "users.html", "settings.html", "styles.css", "script.js"],
        "aesthetic": "clean card layout, Chart.js charts, KPI grid, data tables, sidebar navigation",
        "min_pages": 4,
    },
    "landing": {
        "keywords": ["landing", "marketing", "saas", "product", "homepage", "hero", "pricing", "waitlist"],
        "layout": "full-width sections with sticky top nav",
        "required_files": ["index.html", "styles.css", "script.js"],
        "aesthetic": "bold hero typography, gradient CTAs, scroll-reveal sections, testimonial cards",
        "min_pages": 1,
    },
    "ecommerce": {
        "keywords": ["shop", "store", "ecommerce", "product", "cart", "checkout", "catalog", "buy"],
        "layout": "top nav with cart icon + product grid layout",
        "required_files": ["index.html", "products.html", "cart.html", "styles.css", "script.js"],
        "aesthetic": "product hover zoom, sticky add-to-cart bar, badge notifications, skeleton loaders",
        "min_pages": 3,
    },
    "portfolio": {
        "keywords": ["portfolio", "resume", "cv", "showcase", "personal", "freelance", "agency"],
        "layout": "single-page parallax or multi-section scroll",
        "required_files": ["index.html", "styles.css", "script.js"],
        "aesthetic": "cursor trail effects, project card flips, typewriter hero text, smooth scroll anchors",
        "min_pages": 1,
    },
    "app": {
        "keywords": ["app", "tool", "platform", "workflow", "productivity", "management", "tracker", "scheduler"],
        "layout": "app shell with sidebar, topbar, and main content pane",
        "required_files": ["index.html", "app.html", "settings.html", "styles.css", "script.js"],
        "aesthetic": "modal dialogs, toast notifications, drag-and-drop lists, command palette",
        "min_pages": 3,
    },
}

DEFAULT_PROFILE = {
    "layout": "responsive top navbar with hero section",
    "required_files": ["index.html", "styles.css", "script.js"],
    "aesthetic": "clean typography, subtle hover states, mobile-first grid layout",
    "min_pages": 1,
}

# Core files that must always be present, in preferred output order
CORE_FILES = ["index.html", "styles.css", "script.js"]

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
    """Return files in logical generation order: HTML pages → CSS → JS."""
    pages   = [f for f in files if f["path"].endswith(".html")]
    styles  = [f for f in files if f["path"] in STYLE_FILES or (f["path"].endswith(".css") and f["path"] not in {p["path"] for p in pages})]
    scripts = [f for f in files if f["path"] in SCRIPT_FILES or (f["path"].endswith(".js")  and f["path"] not in {p["path"] for p in pages})]
    other   = [f for f in files if f not in pages and f not in styles and f not in scripts]

    # index.html always first
    idx = next((f for f in pages if f["path"] == "index.html"), None)
    rest_pages = [f for f in pages if f["path"] != "index.html"]
    ordered = ([idx] if idx else []) + rest_pages + other + styles + scripts
    return ordered


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
    """Sanitize and deduplicate a list of file entries from the LLM."""
    clean: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or "").strip()
        # Strip any leading directory components to stay flat
        path = path.split("/")[-1].strip()
        if not path or path in seen:
            continue
        # Only allow safe web file extensions (add tsx for React)
        if not re.match(r"^[\w\-]+\.(html|css|js|json|svg|webmanifest|tsx)$", path, re.IGNORECASE):
            logger.warning("PlannerAgent: skipping suspicious file path '%s'", path)
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

        plan = self._validate_and_enrich(plan, profile)
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
            "R5. File paths must be flat (no subdirectories), kebab-case,",
            "    extension from: .html  .css  .js  .json  .svg  .webmanifest",
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

        required_files = profile["required_files"]

        # Build an annotated file table aligned for readability
        file_rows: list[str] = []
        for path in required_files:
            role, purpose = file_roles.get(path, ("ASSET", f"Supporting file for {path}"))
            file_rows.append(f"  {path:<22} [{role:<14}]  →  {purpose}")

        # Add any extra common files not in the profile but worth considering
        optional_hints: list[str] = []
        type_optional_map: dict[str, list[str]] = {
            "dashboard":  ["charts.js", "animations.css", "utils.js"],
            "landing":    ["animations.css", "animations.js"],
            "ecommerce":  ["utils.js", "components.css"],
            "portfolio":  ["animations.js", "animations.css"],
            "app":        ["utils.js", "charts.js", "components.css"],
            "generic":    ["utils.js"],
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
            "REQUIRED FILE MANIFEST (annotated):",
            required_files_block,
            optional_files_block,
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
            "FILES:",
            "  • Minimum 3 files, maximum 6 files.",
            "  • MUST include: index.html, styles.css, script.js.",
            "  • Add a 2nd HTML page only if the project clearly needs separate screens.",
            "  • Only add helper JS/CSS files if they own a distinct, non-trivial concern.",
            "  • Do NOT invent file paths outside the allowed extensions.",
            "  • For simple prompts (landing, portfolio, basic app): 3 files is ideal.",
            "",
            "REQUIREMENTS (produce exactly 8–12):",
            "  • Each requirement = one concrete, implementable UI/UX behaviour.",
            "  • Must name the element + the technique + the values/timing.",
            "  • Must be achievable with vanilla HTML/CSS/JS (no React, no Vue).",
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
            '  "_thinking": "2–5 sentences: why this file split, what layout pattern, key risks",',
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
            '    {"path": "index.html",     "description": "Specific responsibility + key contents"},',
            '    {"path": "analytics.html", "description": "Specific responsibility + key contents"},',
            '    {"path": "styles.css",     "description": "Specific responsibility + key contents"},',
            '    {"path": "script.js",      "description": "Specific responsibility + key contents"}',
            "  ]",
            "}",
        ])

    def _validate_and_enrich(
        self,
        plan: dict[str, Any],
        profile: dict[str, Any],
    ) -> dict[str, Any]:
        # --- Files ---
        raw_files = plan.get("files")
        files = _clean_files(raw_files) if isinstance(raw_files, list) else []
        files = _ensure_core_files(files)
        files = _sort_files(files)
        # Debug log: print planned file paths
        logger.info("PlannerAgent: planned files before .tsx injection: %s", [f['path'] for f in files])
        # Ensure .tsx files are always included for React projects
        if plan.get('_meta', {}).get('project_type') == 'react':
            tsx_required = [f for f in PROJECT_PROFILES['react']['required_files'] if f.endswith('.tsx')]
            existing_paths = {f['path'] for f in files}
            for tsx_file in tsx_required:
                if tsx_file not in existing_paths:
                    files.append({"path": tsx_file, "description": f"React component: {tsx_file}"})
            files = _sort_files(files)
            logger.info("PlannerAgent: .tsx files forced into plan: %s", [f['path'] for f in files if f['path'].endswith('.tsx')])
        plan["files"] = files[:6]
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