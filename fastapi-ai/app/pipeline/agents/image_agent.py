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

    def run(
        self,
        code: CodeBundle,
        plan: dict[str, Any],
        design_tokens: dict[str, Any] | None = None,
    ) -> CodeBundle:
        """Scan HTML files for image placeholders and replace with real photos."""
        placeholder_re = re.compile(
            r'<div\s+class="card__image">\s*([^<]*?)\s*</div>', re.IGNORECASE
        )

        # Collect every placeholder with its file index, full match, and nearby context
        placeholders: list[dict] = []  # [{file_idx, match_str, alt, keyword, page}]
        for idx, f in enumerate(code.files):
            if not f.path.endswith((".html", ".htm")):
                continue
            page_name = os.path.splitext(os.path.basename(f.path))[0]
            for m in placeholder_re.finditer(f.content):
                raw_alt = m.group(1).strip()
                # If alt text is empty/generic, extract context from surrounding HTML
                alt = raw_alt if self._is_descriptive(raw_alt) else self._extract_context(f.content, m.start())
                placeholders.append({
                    "file_idx": idx,
                    "match_str": m.group(0),
                    "alt": alt,
                    "page": page_name,
                })

        if not placeholders:
            logger.info("ImageAgent: no placeholders found, skipping")
            return code

        theme_hint = plan.get("summary", "")[:60]

        # Build a keyword for each placeholder (unique per alt+page combo)
        for p in placeholders:
            p["keyword"] = self._build_keyword(p["alt"], p["page"], theme_hint)

        # Group by keyword to batch Pexels calls
        keyword_set = sorted({p["keyword"] for p in placeholders})
        logger.info("ImageAgent: %d placeholders, %d unique keywords across %d HTML files",
                     len(placeholders), len(keyword_set),
                     len({p["file_idx"] for p in placeholders}))

        # Fetch a pool of photos for each keyword
        photo_pools: dict[str, list[str]] = {}
        for kw in keyword_set:
            photo_pools[kw] = self._fetch_photos(kw)
            count = len(photo_pools[kw])
            logger.info("ImageAgent: '%s' → %d photos", kw, count)

        # Assign a DIFFERENT photo to each placeholder (round-robin within pool)
        pool_counters: dict[str, int] = {kw: 0 for kw in keyword_set}
        files = list(code.files)
        replaced = 0

        for p in placeholders:
            kw = p["keyword"]
            pool = photo_pools.get(kw, [])
            if not pool:
                continue

            # Pick next photo from the pool (round-robin)
            idx_in_pool = pool_counters[kw] % len(pool)
            pool_counters[kw] += 1
            img_url = pool[idx_in_pool]

            safe_alt = (p["alt"] or kw).replace('"', '&quot;')
            img_tag = (
                f'<img class="card__image" src="{img_url}" '
                f'alt="{safe_alt}" loading="lazy">'
            )

            fi = p["file_idx"]
            new_content = files[fi].content.replace(p["match_str"], img_tag, 1)
            if new_content != files[fi].content:
                files[fi] = CodeFile(path=files[fi].path, content=new_content)
                replaced += 1

        logger.info("ImageAgent: replaced %d / %d placeholders", replaced, len(placeholders))
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
