"""Domain-specific prompt configurations for context-aware UI generation.

The user selects a business domain (e-commerce, medical, dashboard...)
and the system automatically adapts the LLM prompt to generate
a more relevant and professional UI for that sector.
"""
from __future__ import annotations

# ── Domain Configurations ─────────────────────────────────────────────────────

DOMAIN_CONTEXTS: dict[str, dict[str, str | list[str]]] = {
    "ecommerce": {
        "label": "E-commerce / Boutique en ligne",
        "style": "modern, conversion-focused, trust-building, professional retail",
        "colors": "Warm accents: red-500/orange-400 for CTAs, green-500 for success states, white/gray-50 backgrounds",
        "components": "product cards with image placeholders, shopping cart, price badges with discounts, star ratings, buy-now buttons, promotional banners, newsletter signup",
        "rules": "Always include clear call-to-action buttons, show prices prominently with original/sale price, add trust signals (reviews, shipping info, secure badge), use product-grid layout",
        "keywords": ["shop", "store", "product", "cart", "checkout", "price", "buy", "boutique", "catalogue", "commande", "panier"],
    },
    "medical": {
        "label": "Médical / Santé",
        "style": "clean, professional, accessible, trustworthy, calm and reassuring",
        "colors": "Calming palette: blue-600/teal-500 primary, white backgrounds, soft gray-100 sections, red only for alerts",
        "components": "patient intake forms with validation, appointment scheduler, health records table, status badges (stable/critical/pending), medication lists, doctor profile cards",
        "rules": "Clear labels on all form fields, mark required fields with asterisk, avoid flashy animations, high contrast text for accessibility, use professional medical terminology",
        "keywords": ["patient", "doctor", "appointment", "medical", "health", "clinic", "hospital", "médecin", "santé", "consultation", "ordonnance"],
    },
    "dashboard": {
        "label": "Dashboard / Analytics",
        "style": "dark theme preferred, data-dense, minimal chrome, professional enterprise",
        "colors": "Dark backgrounds: gray-900/slate-800, accent purple-500/cyan-400, data colors: green-400 positive, red-400 negative, yellow-400 warning",
        "components": "KPI cards with large numbers and trend arrows, bar/line/pie chart placeholders, data tables with sorting, filter sidebars, date range pickers, activity feed",
        "rules": "Show key metrics at the top as KPI cards, use compact spacing for data density, add percentage change indicators with arrows (↑↓), include a sidebar navigation",
        "keywords": ["dashboard", "analytics", "metrics", "chart", "graph", "stats", "kpi", "report", "tableau de bord", "statistiques", "analyse"],
    },
    "education": {
        "label": "Éducation / E-learning",
        "style": "friendly, engaging, motivating, clear hierarchy, student-friendly",
        "colors": "Energetic: blue-500/green-400 primary, yellow-400 highlights, white clean backgrounds with subtle gradients",
        "components": "course cards with progress bars, lesson list with checkmarks, quiz forms, certificate display, video placeholder sections, instructor profile, enrollment CTA",
        "rules": "Show progress clearly with progress bars, use encouraging language, large readable text (text-base minimum), clear navigation breadcrumbs, gamification elements",
        "keywords": ["course", "lesson", "student", "teacher", "quiz", "learning", "education", "cours", "élève", "formation", "module", "apprentissage"],
    },
    "saas": {
        "label": "SaaS / Application B2B",
        "style": "professional, modern, feature-rich, enterprise-grade, clean",
        "colors": "Indigo-600/blue-500 primary, neutral gray-100/200 backgrounds, white cards, subtle shadows",
        "components": "pricing tables with feature comparison, feature grid with icons, testimonials carousel, integration logos, FAQ accordion, team member cards, subscription badge",
        "rules": "Show value propositions clearly in hero section, include social proof (logos, testimonials), professional typography, clear upgrade/CTA path, free trial button prominent",
        "keywords": ["saas", "subscription", "plan", "api", "integration", "enterprise", "team", "abonnement", "logiciel", "plateforme", "solution"],
    },
    "portfolio": {
        "label": "Portfolio / Site Créatif",
        "style": "creative, unique, visually striking, personal brand, memorable",
        "colors": "Bold or dark: dramatic contrasts, custom accent color, generous whitespace, cinematic sections",
        "components": "full-screen hero with name/title, project showcase grid, skills section with progress bars, timeline/experience, contact form, social links, testimonials",
        "rules": "Make the hero section impactful with large typography, show work samples prominently with image placeholders, include personality, smooth hover effects on project cards",
        "keywords": ["portfolio", "project", "skill", "designer", "developer", "creative", "work", "cv", "projet", "compétence", "réalisation"],
    },
    "restaurant": {
        "label": "Restaurant / Food & Beverage",
        "style": "warm, appetizing, atmospheric, inviting, premium feel",
        "colors": "Warm tones: amber-500/orange-400, deep brown/black backgrounds for premium, white text on dark sections",
        "components": "menu sections with dish cards and prices, reservation form, gallery grid with food images, opening hours table, chef profile, customer reviews, location map placeholder",
        "rules": "Use food/restaurant image placeholders, show menu prices clearly, reservation CTA always visible, warm inviting color palette, elegant typography",
        "keywords": ["restaurant", "menu", "food", "reservation", "chef", "dish", "cuisine", "repas", "carte", "réservation", "plat"],
    },
    "real_estate": {
        "label": "Immobilier",
        "style": "trustworthy, professional, clean, property-focused",
        "colors": "Navy blue/emerald green primary, white clean backgrounds, gold accents for premium properties",
        "components": "property listing cards with image/price/details, search filters (location/price/type), property detail page, agent profile, contact form, map placeholder, featured properties carousel",
        "rules": "Always show price prominently, include property specs (m², rooms, floor), use image placeholders for property photos, include agent contact info, add mortgage calculator section",
        "keywords": ["property", "real estate", "house", "apartment", "rent", "buy", "immobilier", "appartement", "maison", "loyer", "vente", "agence"],
    },
}

# ── Auto-detection ────────────────────────────────────────────────────────────

def detect_domain(prompt: str) -> str | None:
    """Auto-detect the business domain from user prompt keywords."""
    prompt_lower = prompt.lower()
    scores: dict[str, int] = {}
    for domain, ctx in DOMAIN_CONTEXTS.items():
        keywords = ctx.get("keywords", [])
        score = sum(1 for kw in keywords if kw in prompt_lower)
        if score > 0:
            scores[domain] = score
    if scores:
        return max(scores, key=lambda d: scores[d])
    return None


# ── Prompt Builder ────────────────────────────────────────────────────────────

def get_domain_prompt_addition(domain: str | None) -> str:
    """Build the domain-specific prompt block to inject into the LLM system prompt."""
    if not domain:
        return ""
    ctx = DOMAIN_CONTEXTS.get(domain)
    if not ctx:
        return ""

    return (
        f"\n═══════════════════════════════════════════════════════\n"
        f"DOMAIN CONTEXT — {str(ctx['label']).upper()}\n"
        f"═══════════════════════════════════════════════════════\n"
        f"Visual style   : {ctx['style']}\n"
        f"Color palette  : {ctx['colors']}\n"
        f"Key components : {ctx['components']}\n"
        f"Domain rules   : {ctx['rules']}\n"
        f"═══════════════════════════════════════════════════════\n"
    )
