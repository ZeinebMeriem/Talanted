"""OcrAgent — vision-based analysis for images and scanned PDFs.

Run order in the orchestrator:
    1. DocExtractAgent  → extracts text from PDF/docx/pptx/text files
    2. OcrAgent (this)  → handles:
         a. Image file_ref items  (PNG, JPG, WEBP, GIF, BMP)
         b. Empty PDF file_text items  (scanned PDFs — renders pages with PyMuPDF)

Both inputs are converted to a structured text description injected as a
`file_text` SourceItem so downstream agents (planner, codegen) treat them
like any other document.
"""
from __future__ import annotations

import base64
import logging
import os
from io import BytesIO
from urllib.parse import urlparse

from ..models import SourceItem, SourcePack
from ..llm_provider import LlmProvider

try:
    from minio import Minio          # type: ignore[import-not-found]
    from minio.error import S3Error  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    Minio = None  # type: ignore[assignment]

    class S3Error(Exception):  # type: ignore[no-redef]
        pass

try:
    import fitz  # PyMuPDF  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    fitz = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

# ── Type detection ───────────────────────────────────────────────────────

_IMAGE_MIMES: set[str] = {
    "image/png", "image/jpeg", "image/jpg",
    "image/gif", "image/webp", "image/bmp",
}
_IMAGE_EXTS: tuple[str, ...] = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp")
_SVG_EXTS:   tuple[str, ...] = (".svg",)

# ── Vision prompt ────────────────────────────────────────────────────────

_VISION_PROMPT = """\
You are an expert UI/UX analyst. Carefully analyze this image.
It could be a wireframe, mockup, UI screenshot, diagram, chart, or scanned document page.

Extract ALL information that would be useful for building a React web application:

1. LAYOUT — overall structure: sections, panels, columns, grids, sidebars, header, footer
2. COMPONENTS — every UI element: navigation bars, buttons, forms, input fields, tables,
   data cards, charts, modals, tabs, dropdowns, search bars, badges, icons
3. CONTENT & DATA — visible labels, field names, data types, values, titles, headings,
   any domain-specific entities (e.g. "price: €450 000", "patient: John D.", "order #1042")
4. INTERACTIONS — clickable elements, form flows, hover states, actions implied by the UI
5. VISUAL STYLE — color palette (name dominant colors), typography style, spacing density,
   card style (flat / elevated / bordered)
6. DOMAIN — what kind of application is this? (real estate, medical, e-commerce, SaaS, etc.)

Write flowing descriptive paragraphs. Be exhaustive and precise.
Plain prose only — no markdown headers, no bullet points.
"""


# ── Agent ────────────────────────────────────────────────────────────────

class OcrAgent:
    """Vision-based image + scanned-PDF analysis.

    Falls back silently (pass-through) when:
      • No LLM provider given, or provider returns empty string
      • MinIO is not configured
      • PyMuPDF not installed (scanned-PDF path only)
    """

    def __init__(self, provider: LlmProvider | None = None) -> None:
        self.provider = provider

    def run(self, pack: SourcePack) -> SourcePack:
        if self.provider is None:
            return pack

        minio_client = _make_minio_client()

        new_items: list[SourceItem] = []

        # ── Pass A: raster images (file_ref) ────────────────────────────
        if minio_client:
            new_items.extend(self._process_images(pack, minio_client))

        # ── Pass B: scanned PDFs (empty file_text from DocExtractAgent) ──
        if minio_client and fitz is not None:
            new_items.extend(self._process_scanned_pdfs(pack, minio_client))

        if not new_items:
            return pack

        logger.info("OcrAgent: added %d vision-extracted item(s)", len(new_items))
        return SourcePack(items=[*pack.items, *new_items])

    # ── Image processing ─────────────────────────────────────────────────

    def _process_images(self, pack: SourcePack, client: object) -> list[SourceItem]:
        max_bytes = int(os.getenv("AI_OCR_MAX_BYTES", "10485760"))  # 10 MB
        bucket    = os.getenv("MINIO_BUCKET", "").strip()
        results: list[SourceItem] = []

        for it in pack.items:
            if it.kind != "file_ref":
                continue

            key        = (it.meta.get("minioPath") or it.content or "").strip()
            mime       = str(it.meta.get("mimeType") or "").lower()
            name       = str(it.meta.get("originalName") or key)
            name_lower = name.lower()

            is_image = (mime in _IMAGE_MIMES) or any(name_lower.endswith(e) for e in _IMAGE_EXTS)
            is_svg   = name_lower.endswith(_SVG_EXTS) or mime == "image/svg+xml"

            if not (is_image or is_svg) or not key:
                continue

            try:
                data = _download(client, bucket, key, max_bytes)
                if data is None:
                    continue

                if is_svg:
                    description = f"SVG diagram '{name}':\n{data.decode('utf-8', errors='replace')[:3000]}"
                    actual_mime = "image/svg+xml"
                else:
                    if not mime or mime == "image/jpg":
                        mime = _infer_mime(name_lower)
                    b64 = base64.b64encode(data).decode("ascii")
                    description = self.provider.chat_vision(b64, mime, _VISION_PROMPT)  # type: ignore[union-attr]
                    actual_mime = mime

                if not description or not description.strip():
                    logger.warning("OcrAgent: vision returned empty for %s", name)
                    continue

                description = description.strip()
                logger.info("OcrAgent [image]: '%s' → %d chars", name, len(description))
                results.append(SourceItem(
                    kind="file_text",
                    content=description,
                    meta={
                        **it.meta,
                        "minioPath":      key,
                        "originalName":   name,
                        "mimeType":       actual_mime,
                        "extract":        "vision" if not is_svg else "svg_text",
                        "extractedChars": len(description),
                        "extractEmpty":   False,
                    },
                ))
            except Exception as e:
                logger.warning("OcrAgent: error processing image %s: %s", name, e)

        return results

    # ── Scanned PDF processing ────────────────────────────────────────────

    def _process_scanned_pdfs(self, pack: SourcePack, client: object) -> list[SourceItem]:
        """Re-process PDFs that DocExtractAgent could not extract text from."""
        max_bytes     = int(os.getenv("AI_OCR_MAX_BYTES",       "10485760"))
        max_pages     = int(os.getenv("AI_OCR_MAX_PDF_PAGES",   "8"))
        zoom          = float(os.getenv("AI_OCR_PDF_ZOOM",      "1.5"))  # render quality
        bucket        = os.getenv("MINIO_BUCKET", "").strip()
        results: list[SourceItem] = []

        # Only process PDFs where text extraction yielded 0 chars
        empty_pdfs = [
            it for it in pack.items
            if it.kind == "file_text"
            and it.meta.get("extract") == "pdf_text"
            and int(it.meta.get("extractedChars") or 0) == 0
        ]

        for it in empty_pdfs:
            key  = (it.meta.get("minioPath") or "").strip()
            name = str(it.meta.get("originalName") or key)

            if not key:
                continue

            try:
                data = _download(client, bucket, key, max_bytes)
                if data is None:
                    continue

                doc = fitz.open(stream=data, filetype="pdf")
                page_descriptions: list[str] = []
                mat = fitz.Matrix(zoom, zoom)

                for page_num in range(min(len(doc), max_pages)):
                    page = doc[page_num]
                    pix  = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    b64 = base64.b64encode(img_bytes).decode("ascii")

                    desc = self.provider.chat_vision(b64, "image/png", _VISION_PROMPT)  # type: ignore[union-attr]
                    if desc and desc.strip():
                        page_descriptions.append(f"[Page {page_num + 1}]\n{desc.strip()}")
                    logger.info("OcrAgent [scanned PDF]: '%s' page %d → %d chars",
                                name, page_num + 1, len(desc or ""))

                doc.close()

                if not page_descriptions:
                    continue

                combined = "\n\n".join(page_descriptions)
                logger.info("OcrAgent [scanned PDF]: '%s' total → %d chars", name, len(combined))

                # Replace the empty file_text item with vision-extracted content
                results.append(SourceItem(
                    kind="file_text",
                    content=combined,
                    meta={
                        **it.meta,
                        "extract":        "pdf_vision",
                        "extractedChars": len(combined),
                        "extractEmpty":   False,
                    },
                ))

            except Exception as e:
                logger.warning("OcrAgent: error processing scanned PDF %s: %s", name, e)

        return results


# ── Helpers ───────────────────────────────────────────────────────────────

def _make_minio_client() -> object | None:
    if Minio is None:
        return None
    endpoint   = os.getenv("MINIO_ENDPOINT",   "").strip()
    access_key = os.getenv("MINIO_ACCESS_KEY",  "").strip()
    secret_key = os.getenv("MINIO_SECRET_KEY",  "").strip()
    if not (endpoint and access_key and secret_key):
        return None
    parsed = urlparse(endpoint)
    secure = parsed.scheme == "https"
    host   = parsed.netloc or parsed.path
    return Minio(host, access_key=access_key, secret_key=secret_key, secure=secure)


def _download(client: object, bucket: str, key: str, max_bytes: int) -> bytes | None:
    try:
        resp = client.get_object(bucket, key)  # type: ignore[union-attr]
        try:
            data = resp.read(max_bytes + 1)
        finally:
            resp.close()
            resp.release_conn()
        if len(data) > max_bytes:
            logger.warning("OcrAgent: %s exceeds %d bytes, skipping", key, max_bytes)
            return None
        return data
    except S3Error as e:
        logger.warning("OcrAgent: S3 error for %s: %s", key, e)
        return None


def _infer_mime(filename_lower: str) -> str:
    if filename_lower.endswith(".png"):   return "image/png"
    if filename_lower.endswith((".jpg", ".jpeg")): return "image/jpeg"
    if filename_lower.endswith(".gif"):   return "image/gif"
    if filename_lower.endswith(".webp"):  return "image/webp"
    if filename_lower.endswith(".bmp"):   return "image/bmp"
    return "image/png"
