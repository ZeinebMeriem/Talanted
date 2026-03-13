from __future__ import annotations

import logging
import os

from ..models import SourceItem, SourcePack

logger = logging.getLogger(__name__)


class TextPrepAgent:
    """Normalize + chunk text so downstream LLM can consume it reliably."""

    def run(self, pack: SourcePack) -> SourcePack:
        max_total_chars = int(os.getenv("AI_CONTEXT_MAX_CHARS", "20000"))
        max_chunk_chars = int(os.getenv("AI_CONTEXT_CHUNK_CHARS", "1200"))
        max_chunks = int(os.getenv("AI_CONTEXT_MAX_CHUNKS", "8"))

        prompt_items = [i for i in pack.items if i.kind == "prompt" and i.content.strip()]
        doc_items = [i for i in pack.items if i.kind == "file_text" and i.content.strip()]
        has_docs = len(doc_items) > 0

        parts: list[str] = []
        if has_docs:
            parts.append(
                "INSTRUCTIONS\n"
                "- The SPEC DOCUMENT sections are the ABSOLUTE source of truth.\n"
                "- Implement the UI requirements from the SPEC DOCUMENT EXACTLY as written.\n"
                "- If the user prompt conflicts with the SPEC DOCUMENT, the SPEC DOCUMENT wins.\n"
                "- Do NOT add features, pages, or UI elements not mentioned in the SPEC DOCUMENT.\n"
                "- Do NOT add login/auth/admin unless the SPEC DOCUMENT explicitly asks for it.\n"
                "- Follow the user's style and design preferences strictly.\n"
            )
            for di in doc_items:
                name = str(di.meta.get("originalName") or di.meta.get("minioPath") or "document")
                parts.append(f"SPEC DOCUMENT: {name}\n" + di.content.strip())
        if prompt_items:
            label = "USER PROMPT (secondary)" if has_docs else "USER PROMPT (primary)"
            parts.append(label + "\n" + prompt_items[0].content.strip())

        if not parts:
            return pack

        merged = "\n\n".join(parts)
        merged = "\n".join(line.rstrip() for line in merged.splitlines())
        merged = merged.strip()
        if len(merged) > max_total_chars:
            merged = merged[:max_total_chars] + "\n..."

        blocks = [b.strip() for b in merged.split("\n\n") if b.strip()]
        chunks: list[str] = []
        current = ""
        for block in blocks:
            candidate = block if not current else current + "\n\n" + block
            if len(candidate) <= max_chunk_chars:
                current = candidate
                continue
            if current:
                chunks.append(current)
                if len(chunks) >= max_chunks:
                    current = ""
                    break
            if len(block) <= max_chunk_chars:
                current = block
            else:
                for start in range(0, len(block), max_chunk_chars):
                    chunks.append(block[start : start + max_chunk_chars])
                    if len(chunks) >= max_chunks:
                        current = ""
                        break
                if len(chunks) >= max_chunks:
                    break

        if current and len(chunks) < max_chunks:
            chunks.append(current)

        context_items: list[SourceItem] = []
        for idx, chunk in enumerate(chunks):
            context_items.append(
                SourceItem(
                    kind="context",
                    content=chunk,
                    meta={"chunkIndex": idx, "totalChunks": len(chunks), "chars": len(chunk)},
                )
            )

        if not context_items:
            logger.warning("TextPrepAgent: no context items produced (prompt_items=%d, doc_items=%d)", len(prompt_items), len(doc_items))
            return pack

        total_chars = sum(len(c.content) for c in context_items)
        logger.info(
            "TextPrepAgent: produced %d context chunks (%d chars) from %d prompt + %d doc items",
            len(context_items), total_chars, len(prompt_items), len(doc_items),
        )

        kept = [i for i in pack.items if i.kind != "context"]
        return SourcePack(items=[*kept, *context_items])
