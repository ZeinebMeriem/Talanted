from __future__ import annotations

import logging
import os
from io import BytesIO
from urllib.parse import urlparse

try:
    from minio import Minio  # type: ignore[import-not-found]
    from minio.error import S3Error  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    Minio = None  # type: ignore[assignment]

    class S3Error(Exception):  # type: ignore[no-redef]
        pass

try:
    from pypdf import PdfReader  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    PdfReader = None  # type: ignore[assignment]

from ..models import SourceItem, SourcePack

logger = logging.getLogger(__name__)


class DocExtractAgent:
    """Download uploaded files from MinIO and extract text (text/* and PDF)."""

    def run(self, pack: SourcePack) -> SourcePack:
        if Minio is None:
            return pack

        endpoint = os.getenv("MINIO_ENDPOINT", "").strip()
        access_key = os.getenv("MINIO_ACCESS_KEY", "").strip()
        secret_key = os.getenv("MINIO_SECRET_KEY", "").strip()
        bucket = os.getenv("MINIO_BUCKET", "").strip()

        if not endpoint or not access_key or not secret_key or not bucket:
            return pack

        parsed = urlparse(endpoint)
        secure = parsed.scheme == "https"
        host = parsed.netloc or parsed.path  # allow "minio:9000" without scheme

        client = Minio(host, access_key=access_key, secret_key=secret_key, secure=secure)

        max_bytes = int(os.getenv("AI_EXTRACT_MAX_BYTES", "5242880"))  # 5MB
        max_chars = int(os.getenv("AI_EXTRACT_MAX_CHARS", "20000"))
        max_pdf_pages = int(os.getenv("AI_EXTRACT_MAX_PDF_PAGES", "15"))

        new_items: list[SourceItem] = []
        for it in pack.items:
            if it.kind != "file_ref":
                continue

            key = (it.meta.get("minioPath") or it.content or "").strip()
            if not key:
                continue

            mime = str(it.meta.get("mimeType") or "").lower()
            name = str(it.meta.get("originalName") or key)

            try:
                resp = client.get_object(bucket, key)
                try:
                    data = resp.read(max_bytes + 1)
                finally:
                    resp.close()
                    resp.release_conn()

                if len(data) > max_bytes:
                    continue

                text: str | None = None
                extracted_pages: int | None = None

                is_textish = mime.startswith("text/") or any(
                    name.lower().endswith(ext) for ext in (".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml")
                )
                is_pdf = (mime == "application/pdf") or name.lower().endswith(".pdf")

                if is_textish:
                    text = data.decode("utf-8-sig", errors="replace")
                elif is_pdf:
                    if PdfReader is None:
                        continue
                    reader = PdfReader(BytesIO(data))
                    parts: list[str] = []
                    for i, page in enumerate(reader.pages):
                        if i >= max_pdf_pages:
                            break
                        try:
                            parts.append(page.extract_text() or "")
                        except Exception:
                            parts.append("")
                    extracted_pages = min(len(reader.pages), max_pdf_pages)
                    text = "\n".join(p for p in parts if p)

                if text is None:
                    continue

                cleaned = "\n".join(line.rstrip() for line in text.splitlines()).strip()
                extracted_chars = len(cleaned)

                if cleaned and len(cleaned) > max_chars:
                    cleaned = cleaned[:max_chars] + "\n..."

                new_items.append(
                    SourceItem(
                        kind="file_text",
                        content=cleaned,
                        meta={
                            **it.meta,
                            "minioPath": key,
                            "originalName": name,
                            "mimeType": mime,
                            "extract": "text" if is_textish else "pdf_text",
                            "extractedChars": extracted_chars,
                            "extractedPages": extracted_pages,
                            "extractEmpty": (extracted_chars == 0),
                        },
                    )
                )
            except S3Error as e:
                logger.warning("DocExtractAgent: S3 error for %s: %s", key, e)
                continue
            except Exception as e:
                logger.warning("DocExtractAgent: error extracting %s: %s", key, e)
                continue

        logger.info("DocExtractAgent: processed %d file_ref items, extracted %d file_text items",
                     sum(1 for i in pack.items if i.kind == "file_ref"), len(new_items))
        for ni in new_items:
            logger.info("  extracted: %s (%d chars)", ni.meta.get("originalName", "?"), len(ni.content))

        if not new_items:
            return pack

        return SourcePack(items=[*pack.items, *new_items])
