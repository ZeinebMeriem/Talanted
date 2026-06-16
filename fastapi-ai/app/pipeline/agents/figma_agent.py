from __future__ import annotations

import logging
import os
import re
from typing import Any

try:
    import httpx  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    httpx = None  # type: ignore[assignment]

from ..models import SourceItem, SourcePack

logger = logging.getLogger(__name__)

_FIGMA_API_BASE = "https://api.figma.com/v1"
_KEY_RE = re.compile(r"figma\.com/(?:file|design|proto)/([A-Za-z0-9_-]+)")


def _extract_file_key(url: str) -> str | None:
    m = _KEY_RE.search(url)
    return m.group(1) if m else None


def _color_hex(color: dict[str, float]) -> str:
    r = round(color.get("r", 0) * 255)
    g = round(color.get("g", 0) * 255)
    b = round(color.get("b", 0) * 255)
    return f"#{r:02x}{g:02x}{b:02x}"


def _parse_nodes(nodes: list[dict[str, Any]], depth: int = 0) -> list[str]:
    """Recursively convert Figma node tree to a human-readable description."""
    lines: list[str] = []
    indent = "  " * depth

    for node in nodes:
        node_type = node.get("type", "")
        name = node.get("name", "")
        nid = node.get("id", "")

        if node_type in ("DOCUMENT", "CANVAS"):
            lines.extend(_parse_nodes(node.get("children", []), depth))
            continue

        if node_type in ("FRAME", "COMPONENT"):
            bbox = node.get("absoluteBoundingBox", {})
            w, h = bbox.get("width", "?"), bbox.get("height", "?")
            label = "Component" if node_type == "COMPONENT" else "Frame"
            lines.append(f"{indent}[{label}] \"{name}\" ({w}×{h}px, id={nid})")
            for fill in node.get("fills", []):
                if fill.get("type") == "SOLID":
                    lines.append(f"{indent}  background: {_color_hex(fill.get('color', {}))}")
            lines.extend(_parse_nodes(node.get("children", []), depth + 1))

        elif node_type == "TEXT":
            chars = node.get("characters", "")
            style = node.get("style", {})
            size = style.get("fontSize", "?")
            weight = style.get("fontWeight", "?")
            color_str = ""
            fills = node.get("fills", [])
            if fills and fills[0].get("type") == "SOLID":
                color_str = f", color={_color_hex(fills[0].get('color', {}))}"
            lines.append(
                f"{indent}[Text] \"{name}\": \"{chars}\" "
                f"(fontSize={size}, weight={weight}{color_str})"
            )

        elif node_type == "INSTANCE":
            lines.append(f"{indent}[Instance] \"{name}\" (id={nid})")
            lines.extend(_parse_nodes(node.get("children", []), depth + 1))

        elif node_type == "RECTANGLE":
            bbox = node.get("absoluteBoundingBox", {})
            w, h = bbox.get("width", "?"), bbox.get("height", "?")
            corner = node.get("cornerRadius", 0)
            fill_str = ""
            for fill in node.get("fills", []):
                if fill.get("type") == "SOLID":
                    fill_str = f", fill={_color_hex(fill.get('color', {}))}"
            lines.append(f"{indent}[Rectangle] \"{name}\" ({w}×{h}px, radius={corner}{fill_str})")

        elif node_type in ("GROUP", "SECTION"):
            lines.append(f"{indent}[{node_type.title()}] \"{name}\"")
            lines.extend(_parse_nodes(node.get("children", []), depth + 1))

        elif node_type in ("VECTOR", "ELLIPSE", "LINE", "POLYGON", "STAR"):
            lines.append(f"{indent}[{node_type.title()}] \"{name}\"")

        else:
            if node.get("children"):
                lines.append(f"{indent}[{node_type}] \"{name}\"")
                lines.extend(_parse_nodes(node["children"], depth + 1))

    return lines


def _summarize_styles(styles: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for style_info in styles.values():
        if isinstance(style_info, dict):
            stype = style_info.get("styleType", "")
            sname = style_info.get("name", "")
            if stype and sname:
                lines.append(f"  - {stype}: {sname}")
    return lines


class FigmaAgent:
    """Fetch a Figma file and convert the node tree into a SourceItem(kind='file_text').

    Expects a SourceItem in the pack with:
        kind="context"
        meta={"extract": "figma_url", "figmaToken": "<token>"}
        content="<figma url>"

    Calls GET https://api.figma.com/v1/files/{key} and produces a structured
    text description that the PlannerAgent and CodegenAgent can use as context.
    """

    def run(self, pack: SourcePack) -> SourcePack:
        if httpx is None:
            logger.warning("FigmaAgent: httpx not installed, skipping")
            return pack

        figma_items = [
            it for it in pack.items
            if it.kind == "context" and it.meta.get("extract") == "figma_url"
        ]
        if not figma_items:
            return pack

        new_items: list[SourceItem] = []
        for it in figma_items:
            url = it.content.strip()
            token = str(
                it.meta.get("figmaToken") or os.getenv("FIGMA_API_TOKEN", "")
            ).strip()

            if not url:
                continue
            if not token:
                logger.warning(
                    "FigmaAgent: no token — set FIGMA_API_TOKEN env or pass figmaToken"
                )
                continue

            file_key = _extract_file_key(url)
            if not file_key:
                logger.warning("FigmaAgent: cannot parse file key from: %s", url)
                continue

            description = self._fetch_and_describe(file_key, token, url)
            if description:
                new_items.append(SourceItem(
                    kind="file_text",
                    content=description,
                    meta={
                        "extract": "figma",
                        "figmaFileKey": file_key,
                        "figmaUrl": url,
                        "originalName": f"figma:{file_key}",
                    },
                ))
                logger.info("FigmaAgent: parsed file %s (%d chars)", file_key, len(description))

        if not new_items:
            return pack

        return SourcePack(items=[*pack.items, *new_items])

    def _fetch_and_describe(self, file_key: str, token: str, original_url: str) -> str | None:
        try:
            resp = httpx.get(
                f"{_FIGMA_API_BASE}/files/{file_key}",
                params={"depth": "3"},
                headers={"X-Figma-Token": token},
                timeout=40.0,
                follow_redirects=True,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("FigmaAgent: API error for %s: %s", file_key, exc)
            return None

        doc_name = data.get("name", "Figma File")
        document = data.get("document", {})
        styles = data.get("styles", {})

        lines: list[str] = [
            f"=== Figma Design Import: \"{doc_name}\" ===",
            f"Source: {original_url}",
            "",
            "--- Component / Frame Tree ---",
        ]

        for page in document.get("children", []):
            page_name = page.get("name", "Page")
            lines.append(f"\n[Page] \"{page_name}\"")
            lines.extend(_parse_nodes(page.get("children", []), depth=1))

        if styles:
            lines.append("\n--- Design Tokens ---")
            lines.extend(_summarize_styles(styles))

        lines += [
            "",
            "--- Generation Instructions ---",
            (
                "Reproduce the Figma layout above using React + TailwindCSS. "
                "Each [Frame] becomes a React component. Each [Text] becomes JSX. "
                "Respect colors, font sizes, border-radius values, and visual hierarchy. "
                "Use Tailwind utility classes for spacing and typography."
            ),
        ]

        result = "\n".join(lines)
        max_chars = int(os.getenv("AI_EXTRACT_MAX_CHARS", "20000"))
        if len(result) > max_chars:
            result = result[:max_chars] + "\n... [truncated]"
        return result
