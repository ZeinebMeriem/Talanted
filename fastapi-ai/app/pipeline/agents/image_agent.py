"""ImageAgent — injects real, theme-relevant images into generated HTML.

Uses Pexels API (free, 200 req/hour) to fetch high-quality photos
matching each placeholder context.  Falls back to Lorem Picsum
(seeded by keyword, zero config) when no API key is provided.

Key design:
- Fetches up to 15 photos per keyword so every placeholder gets a DIFFERENT image.
- Extracts context from surrounding HTML (card title, section heading) when alt text
  is empty/generic.
- Includes page filename for variety across pages.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from typing import Any

import httpx

from ...schemas import CodeBundle, CodeFile

logger = logging.getLogger(__name__)

_PEXELS_SEARCH = "https://api.pexels.com/v1/search"
_PICSUM_URL = "https://picsum.photos/seed/{seed}/{w}/{h}"
_PHOTOS_PER_QUERY = 15  # fetch a pool of photos per keyword


class ImageAgent:
    """Post-processes CodeBundle HTML files, replacing <div class="card__image">
    placeholders with real <img> tags pointing to theme-relevant photos."""

    def __init__(self) -> None:
        self.api_key = os.getenv("PEXELS_API_KEY", "").strip()

    # ── public entry ─────────────────────────────────────────────────────

    # Matches picsum URLs the LLM writes in TSX:
    # https://picsum.photos/seed/KEYWORD/600/400
    _PICSUM_RE = re.compile(
        r'https://picsum\.photos/seed/([^/"\s]+)/(\d+)/(\d+)',
        re.IGNORECASE,
    )
    # Matches HTML div placeholders in legacy HTML files
    _HTML_PLACEHOLDER_RE = re.compile(
        r'<div\s+class="card__image">\s*([^<]*?)\s*</div>', re.IGNORECASE
    )

    def run(
        self,
        code: CodeBundle,
        plan: dict[str, Any],
        design_tokens: dict[str, Any] | None = None,
    ) -> CodeBundle:
        """Replace image placeholders with real photos in both HTML and TSX files."""
        theme_hint = plan.get("summary", "")[:60]
        files = list(code.files)

        # ── 1. TSX files: replace picsum URLs with Pexels photos ─────────────
        tsx_replaced = 0
        # Collect all unique keywords first to batch Pexels calls
        tsx_keywords: dict[str, str] = {}  # raw_seed → search keyword
        for f in files:
            if not f.path.endswith(".tsx"):
                continue
            page_name = os.path.splitext(os.path.basename(f.path))[0]
            for m in self._PICSUM_RE.finditer(f.content):
                raw_seed = m.group(1)
                kw = self._build_keyword(
                    raw_seed.replace("-", " ").replace("_", " "),
                    page_name,
                    theme_hint,
                )
                tsx_keywords[raw_seed] = kw

        if tsx_keywords:
            # Fetch photo pools for unique keywords
            unique_kws = sorted(set(tsx_keywords.values()))
            photo_pools: dict[str, list[str]] = {}
            for kw in unique_kws:
                photo_pools[kw] = self._fetch_photos(kw)
                logger.info("ImageAgent TSX: '%s' → %d photos", kw, len(photo_pools[kw]))

            pool_counters: dict[str, int] = {kw: 0 for kw in unique_kws}

            for idx, f in enumerate(files):
                if not f.path.endswith(".tsx"):
                    continue

                def _replace_picsum(m: re.Match) -> str:
                    nonlocal tsx_replaced
                    raw_seed = m.group(1)
                    w, h = m.group(2), m.group(3)
                    kw = tsx_keywords.get(raw_seed, theme_hint)
                    pool = photo_pools.get(kw, [])
                    if not pool:
                        return m.group(0)  # keep original if no photos
                    i = pool_counters[kw] % len(pool)
                    pool_counters[kw] += 1
                    tsx_replaced += 1
                    return pool[i]

                new_content = self._PICSUM_RE.sub(_replace_picsum, f.content)
                if new_content != f.content:
                    files[idx] = CodeFile(path=f.path, content=new_content)

        logger.info("ImageAgent: replaced %d picsum URLs in TSX files", tsx_replaced)

        # ── 2. HTML files: replace <div class="card__image"> placeholders ────
        html_placeholders: list[dict] = []
        for idx, f in enumerate(files):
            if not f.path.endswith((".html", ".htm")):
                continue
            page_name = os.path.splitext(os.path.basename(f.path))[0]
            for m in self._HTML_PLACEHOLDER_RE.finditer(f.content):
                raw_alt = m.group(1).strip()
                alt = raw_alt if self._is_descriptive(raw_alt) else self._extract_context(f.content, m.start())
                html_placeholders.append({
                    "file_idx": idx,
                    "match_str": m.group(0),
                    "alt": alt,
                    "page": page_name,
                })

        if not html_placeholders:
            code.files = files
            return code

        for p in html_placeholders:
            p["keyword"] = self._build_keyword(p["alt"], p["page"], theme_hint)

        keyword_set = sorted({p["keyword"] for p in html_placeholders})
        logger.info("ImageAgent HTML: %d placeholders, %d keywords", len(html_placeholders), len(keyword_set))

        html_pools: dict[str, list[str]] = {}
        for kw in keyword_set:
            html_pools[kw] = self._fetch_photos(kw)

        html_counters: dict[str, int] = {kw: 0 for kw in keyword_set}
        html_replaced = 0

        for p in html_placeholders:
            kw = p["keyword"]
            pool = html_pools.get(kw, [])
            if not pool:
                continue
            img_url = pool[html_counters[kw] % len(pool)]
            html_counters[kw] += 1
            safe_alt = (p["alt"] or kw).replace('"', '&quot;')
            img_tag = f'<img class="card__image" src="{img_url}" alt="{safe_alt}" loading="lazy">'
            fi = p["file_idx"]
            new_content = files[fi].content.replace(p["match_str"], img_tag, 1)
            if new_content != files[fi].content:
                files[fi] = CodeFile(path=files[fi].path, content=new_content)
                html_replaced += 1

        logger.info("ImageAgent HTML: replaced %d / %d placeholders", html_replaced, len(html_placeholders))
        code.files = files
        return code

    # ── private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _is_descriptive(text: str) -> bool:
        """Return True if the alt text contains real descriptive content."""
        if not text or len(text) < 4:
            return False
        generic = {"image", "photo", "placeholder", "picture", "img", "card image"}
        return text.lower().strip() not in generic

    @staticmethod
    def _extract_context(html: str, pos: int) -> str:
        """Look for the nearest card__title or section__title before this position."""
        # Search backwards up to 500 chars for a heading or card title
        start = max(0, pos - 500)
        fragment = html[start:pos]
        # Try card__title first, then section__title, then any h2/h3
        for pattern in [
            r'class="card__title"[^>]*>\s*([^<]{3,60})',
            r'class="section__title"[^>]*>\s*([^<]{3,60})',
            r'<h[23][^>]*>\s*([^<]{3,60})',
        ]:
            m = re.search(pattern, fragment, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return ""

    # Terms that visually mislead Pexels (python→snake, java→island, villa→forest, etc.)
    _KEYWORD_SUBSTITUTIONS = {
        # Programming languages
        "python":        "programming laptop",
        "java":          "software development",
        "javascript":    "web development",
        "react":         "web application",
        "angular":       "software engineering",
        "vue":           "frontend development",
        "node":          "backend development",
        "sql":           "database analytics",
        "data science":  "data analytics laptop",
        "machine learning": "artificial intelligence",
        # Professional/training
        "communication": "team meeting presentation",
        "soft skills":   "professional workshop",
        "management":    "business team office",
        "formation":     "professional training",
        "training":      "professional workshop",
        "course":        "online learning laptop",
        # Real estate (French + English misleading terms)
        "villa":         "luxury house exterior",
        "maison":        "modern house exterior",
        "appartement":   "modern apartment interior",
        "apartment":     "modern apartment interior",
        "propriété":     "real estate property",
        "propriete":     "real estate property",
        "immobilier":    "real estate building",
        "logement":      "residential building",
        "résidence":     "residential building",
        "residence":     "residential building",
        "chalet":        "mountain house exterior",
        "studio":        "small apartment interior",
        "duplex":        "modern apartment building",
        "terrain":       "land plot aerial view",
        "jardin":        "garden house backyard",
        # E-commerce / products
        "produit":       "product photography",
        "boutique":      "retail store interior",
        "magasin":       "shop interior",
        "collection":    "fashion collection clothing",
        "vêtement":      "clothing fashion",
        "vetement":      "clothing fashion",
        "sport":         "athletic sportswear",
        # Food / restaurant
        "restaurant":    "restaurant interior food",
        "cuisine":       "gourmet food kitchen",
        "plat":          "gourmet dish food",
        "menu":          "restaurant food plate",
        "chef":          "chef cooking kitchen",
        "recette":       "cooking food recipe",
        # Medical / health
        "médecin":       "doctor hospital medical",
        "medecin":       "doctor hospital medical",
        "santé":         "health wellness medical",
        "sante":         "health wellness medical",
        "hôpital":       "hospital medical building",
        "hopital":       "hospital medical building",
        # Travel
        "voyage":        "travel destination landscape",
        "hôtel":         "hotel lobby interior",
        "hotel":         "hotel lobby interior",
        "destination":   "travel destination landscape",
    }

    @staticmethod
    def _build_keyword(alt_text: str, page_name: str, theme_hint: str) -> str:
        """Turn alt text + page context into a Pexels search keyword."""
        text = alt_text.lower() if alt_text else ""
        for noise in ("image", "photo", "placeholder", "picture", "icon",
                       "background", "card image"):
            text = text.replace(noise, "")
        text = text.strip(" -_,.")

        # If still too short after cleaning, try page name as context
        if len(text) < 3:
            page = page_name.lower().replace("-", " ").replace("_", " ")
            for noise in ("index", "page", "home"):
                page = page.replace(noise, "")
            page = page.strip()
            if len(page) >= 3:
                text = page

        # Last resort: use the project theme
        if len(text) < 3:
            text = theme_hint.lower().split("—")[0].split("-")[0].strip()[:30]

        # Apply substitutions for visually misleading terms
        for misleading, replacement in ImageAgent._KEYWORD_SUBSTITUTIONS.items():
            if misleading in text:
                text = text.replace(misleading, replacement)
                break

        # Combine: keep it short for API search (max 5 words)
        words = text.split()[:5]
        return " ".join(words) or "modern website"

    def _fetch_photos(self, keyword: str, w: int = 600, h: int = 400) -> list[str]:
        """Fetch a pool of photos for a keyword. Pexels first, Picsum fallback."""
        if self.api_key:
            urls = self._pexels_search(keyword)
            if urls:
                return urls

        # Fallback: generate several Picsum URLs with varied seeds
        return [self._picsum_url(f"{keyword} {i}", w, h) for i in range(_PHOTOS_PER_QUERY)]

    def _pexels_search(self, keyword: str) -> list[str]:
        """Search Pexels and return up to _PHOTOS_PER_QUERY landscape URLs."""
        try:
            resp = httpx.get(
                _PEXELS_SEARCH,
                params={
                    "query": keyword,
                    "per_page": _PHOTOS_PER_QUERY,
                    "orientation": "landscape",
                },
                headers={"Authorization": self.api_key},
                timeout=10,
            )
            if resp.status_code == 200:
                photos = resp.json().get("photos", [])
                urls = []
                for photo in photos:
                    src = photo.get("src", {})
                    url = src.get("landscape") or src.get("large") or src.get("original", "")
                    if url:
                        urls.append(url)
                return urls
            logger.warning("Pexels API returned %d for '%s'", resp.status_code, keyword)
        except Exception:
            logger.exception("Pexels API error for '%s'", keyword)
        return []

    @staticmethod
    def _picsum_url(keyword: str, w: int, h: int) -> str:
        """Generate a Lorem Picsum URL with a deterministic seed."""
        seed = hashlib.md5(keyword.encode()).hexdigest()[:8]  # noqa: S324
        return _PICSUM_URL.format(seed=seed, w=w, h=h)
