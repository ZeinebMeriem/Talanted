"""DiagramAgent — interprets Mermaid and Excalidraw diagrams into structured
UI descriptions that the planner can use directly.

Supported inputs (detected from SourcePack file_text items):
  • .mmd files             — Mermaid diagram source
  • .excalidraw files      — Excalidraw JSON
  • Markdown files         — ```mermaid code blocks extracted
  • Inline prompt text     — ```mermaid blocks in the user prompt

Mermaid diagram types handled:
  flowchart / graph        → pages, navigation, user flows
  classDiagram             → data entities, component hierarchy
  sequenceDiagram          → interactions, API calls
  erDiagram                → data models, relationships
  stateDiagram             → UI states, modals, transitions
  pie                      → chart data, KPIs

Output: adds a SourceItem(kind="file_text", meta.extract="diagram_parse")
with a structured prose description ready for the planner agent.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..models import SourceItem, SourcePack

logger = logging.getLogger(__name__)

# ── Mermaid block extraction ─────────────────────────────────────────────────

_MERMAID_BLOCK_RE = re.compile(
    r"```mermaid\s*\n(.*?)```",
    re.DOTALL | re.IGNORECASE,
)


def _extract_mermaid_blocks(text: str) -> list[str]:
    """Find all ```mermaid ... ``` blocks in a text."""
    return [m.group(1).strip() for m in _MERMAID_BLOCK_RE.finditer(text)]


def _is_mermaid(text: str) -> bool:
    """Quick check — does this text look like a Mermaid diagram?"""
    first = text.lstrip()[:120].lower()
    return any(first.startswith(kw) for kw in (
        "flowchart", "graph ", "graph\n", "sequencediagram",
        "classdiagram", "erdiagram", "statediagram",
        "pie", "gantt", "mindmap", "timeline", "gitgraph",
    ))


# ── Mermaid parser ────────────────────────────────────────────────────────────

class MermaidParser:
    """Regex-based Mermaid → prose description converter."""

    def parse(self, source: str) -> str:
        source = source.strip()
        first_line = source.split("\n")[0].strip().lower()

        if first_line.startswith(("flowchart", "graph ")):
            return self._parse_flowchart(source)
        if first_line.startswith("sequencediagram"):
            return self._parse_sequence(source)
        if first_line.startswith("classdiagram"):
            return self._parse_class(source)
        if first_line.startswith("erdiagram"):
            return self._parse_er(source)
        if first_line.startswith("statediagram"):
            return self._parse_state(source)
        if first_line.startswith("pie"):
            return self._parse_pie(source)
        # fallback: return raw with a note
        return f"Mermaid diagram source:\n{source}"

    # ── Flowchart ─────────────────────────────────────────────────────────

    def _parse_flowchart(self, source: str) -> str:
        # Extract node labels:  A[Label]  A(Label)  A{Label}  A((Label))
        node_label: dict[str, str] = {}
        node_re = re.compile(r'\b([A-Za-z0-9_]+)\s*[\[\({<]+([^\]\)\}>]+)[\]\)}>]+')
        for m in node_re.finditer(source):
            node_label[m.group(1)] = m.group(2).strip()

        # Extract edges:  A --> B  A -->|label| B  A -- text --> B
        edge_re = re.compile(
            r'([A-Za-z0-9_]+)\s*(?:--[>|]+|==>[>|]*|-.->|--+)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)'
        )
        edges: list[tuple[str, str, str]] = []
        for m in edge_re.finditer(source):
            src, lbl, dst = m.group(1), (m.group(2) or ""), m.group(3)
            edges.append((src, lbl.strip(), dst))

        # Build description
        pages = list(node_label.values()) if node_label else []
        lines: list[str] = [
            "This is a flowchart / navigation diagram describing the application structure."
        ]

        if pages:
            lines.append(
                f"The application has the following screens or sections: "
                f"{', '.join(pages)}."
            )

        if edges:
            nav_lines: list[str] = []
            for src, lbl, dst in edges:
                src_name = node_label.get(src, src)
                dst_name = node_label.get(dst, dst)
                if lbl:
                    nav_lines.append(f"From '{src_name}' the user can go to '{dst_name}' via '{lbl}'.")
                else:
                    nav_lines.append(f"'{src_name}' navigates to '{dst_name}'.")
            lines.append("Navigation flow: " + " ".join(nav_lines))

        # Detect if it looks like a multi-page app
        if len(pages) >= 3:
            lines.append(
                "This is a multi-page application. Use React Router or a sidebar navigation "
                "to let users switch between all the listed sections."
            )

        return "\n".join(lines)

    # ── Sequence diagram ──────────────────────────────────────────────────

    def _parse_sequence(self, source: str) -> str:
        participants: list[str] = []
        part_re = re.compile(r'(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?', re.IGNORECASE)
        for m in part_re.finditer(source):
            label = (m.group(2) or m.group(1)).strip()
            participants.append(label)

        # Messages:  A->>B: text  or  A->B: text
        msg_re = re.compile(r'(\S+)\s*-?->>?\s*(\S+)\s*:\s*(.+)')
        messages: list[str] = []
        for m in msg_re.finditer(source):
            messages.append(f"{m.group(1)} → {m.group(2)}: {m.group(3).strip()}")

        lines = ["This is a sequence diagram describing interactions between components."]
        if participants:
            lines.append(f"Actors / components involved: {', '.join(participants)}.")
        if messages:
            lines.append("Key interactions: " + "; ".join(messages[:10]) + ".")
            lines.append(
                "Build UI components that reflect these interactions — forms, API calls, "
                "loading states, and response displays."
            )
        return "\n".join(lines)

    # ── Class diagram ─────────────────────────────────────────────────────

    def _parse_class(self, source: str) -> str:
        # class Name { ... }
        class_re = re.compile(r'class\s+(\w+)\s*\{([^}]*)\}', re.DOTALL)
        classes: dict[str, list[str]] = {}
        for m in class_re.finditer(source):
            name = m.group(1)
            members = [
                l.strip().lstrip("+-#~")
                for l in m.group(2).strip().splitlines()
                if l.strip() and not l.strip().startswith("<<")
            ]
            classes[name] = members

        # Relationships
        rel_re = re.compile(r'(\w+)\s+(?:\"|\')?([<|>o*]+[-.]+[<|>o*]+)(?:\"|\')?(?:\s*:\s*(.+))?\s+(\w+)')
        rels: list[str] = []
        for m in rel_re.finditer(source):
            label = m.group(3) or ""
            rels.append(f"{m.group(1)} ↔ {m.group(4)}" + (f" ({label})" if label else ""))

        lines = ["This is a class diagram describing the data model and component structure."]
        if classes:
            for cname, members in classes.items():
                if members:
                    lines.append(f"'{cname}' has fields: {', '.join(members[:8])}.")
                else:
                    lines.append(f"Component/entity: '{cname}'.")
            lines.append(
                "Build React components and TypeScript interfaces matching these entities. "
                "Each entity should have a corresponding card, table row, or form section in the UI."
            )
        if rels:
            lines.append("Relationships: " + "; ".join(rels[:6]) + ".")
        return "\n".join(lines)

    # ── ER diagram ────────────────────────────────────────────────────────

    def _parse_er(self, source: str) -> str:
        # ENTITY_NAME { ... }
        entity_re = re.compile(r'(\w+)\s*\{([^}]*)\}', re.DOTALL)
        entities: dict[str, list[str]] = {}
        for m in entity_re.finditer(source):
            name = m.group(1)
            fields = [
                l.strip() for l in m.group(2).strip().splitlines()
                if l.strip()
            ]
            entities[name] = fields

        # Relationships: A ||--o{ B : "label"
        rel_re = re.compile(r'(\w+)\s+[|o{}<\-]+\s+(\w+)\s*:\s*"?([^"\n]+)"?')
        rels: list[str] = []
        for m in rel_re.finditer(source):
            rels.append(f"{m.group(1)} → {m.group(2)} ({m.group(3).strip()})")

        lines = ["This is an ER diagram describing the data structure of the application."]
        for ename, fields in entities.items():
            if fields:
                lines.append(f"Entity '{ename}': fields are {', '.join(fields[:8])}.")
            else:
                lines.append(f"Entity: '{ename}'.")
        if rels:
            lines.append("Relationships: " + "; ".join(rels[:6]) + ".")
        lines.append(
            "Build a React UI with data tables, detail views, and forms matching these entities. "
            "Use the field names as column headers and form labels."
        )
        return "\n".join(lines)

    # ── State diagram ─────────────────────────────────────────────────────

    def _parse_state(self, source: str) -> str:
        # state "Label" as ID  or  ID : label
        state_re = re.compile(r'state\s+"([^"]+)"\s+as\s+(\w+)|(\w+)\s*:\s*(.+)')
        states: list[str] = []
        for m in state_re.finditer(source):
            label = m.group(1) or m.group(4) or ""
            if label:
                states.append(label.strip())

        # Transitions: A --> B
        trans_re = re.compile(r'(\w+)\s*-->\s*(\w+)(?:\s*:\s*(.+))?')
        transitions: list[str] = []
        for m in trans_re.finditer(source):
            lbl = m.group(3) or ""
            transitions.append(
                f"{m.group(1)} → {m.group(2)}" + (f" on '{lbl}'" if lbl else "")
            )

        lines = ["This is a state diagram describing UI states and transitions."]
        if states:
            lines.append(f"UI states: {', '.join(states)}.")
        if transitions:
            lines.append("Transitions: " + "; ".join(transitions[:8]) + ".")
        lines.append(
            "Implement these states using React useState or useReducer. "
            "Each state should correspond to a distinct UI view or modal."
        )
        return "\n".join(lines)

    # ── Pie chart ─────────────────────────────────────────────────────────

    def _parse_pie(self, source: str) -> str:
        title_m = re.search(r'title\s+(.+)', source, re.IGNORECASE)
        title = title_m.group(1).strip() if title_m else "Distribution"
        slices_re = re.compile(r'"([^"]+)"\s*:\s*([\d.]+)')
        slices = [(m.group(1), float(m.group(2))) for m in slices_re.finditer(source)]

        lines = [f"This is a pie chart titled '{title}' showing the following distribution:"]
        for label, value in slices:
            lines.append(f"  • {label}: {value}%")
        lines.append(
            "Include a pie/donut chart component in the UI using Recharts (PieChart) "
            "with this exact data."
        )
        return "\n".join(lines)


# ── Excalidraw parser ─────────────────────────────────────────────────────────

class ExcalidrawParser:
    """Extracts layout and labels from Excalidraw JSON files."""

    def parse(self, data: dict[str, Any]) -> str:
        elements: list[dict] = data.get("elements", [])
        if not elements:
            return "Empty Excalidraw diagram."

        texts: list[str] = []
        rectangles: list[str] = []
        arrows: int = 0

        for el in elements:
            if el.get("isDeleted"):
                continue
            etype = el.get("type", "")
            text  = (el.get("text") or el.get("label", {}).get("text", "") or "").strip()

            if etype == "text" and text:
                texts.append(text)
            elif etype in ("rectangle", "frame", "ellipse") and text:
                rectangles.append(text)
            elif etype == "arrow":
                arrows += 1

        lines = ["This is an Excalidraw wireframe/diagram describing the UI layout."]

        if rectangles:
            lines.append(
                f"UI sections / components identified: {', '.join(rectangles[:15])}."
            )
        if texts:
            unique_texts = list(dict.fromkeys(t for t in texts if t not in rectangles))
            if unique_texts:
                lines.append(f"Labels and content: {', '.join(unique_texts[:20])}.")
        if arrows:
            lines.append(
                f"There are {arrows} arrows indicating navigation or data flow between sections."
            )

        lines.append(
            "Build a React UI that matches this wireframe layout. Use the identified section "
            "names as component names and heading labels."
        )
        return "\n".join(lines)


# ── Agent ─────────────────────────────────────────────────────────────────────

_mermaid_parser    = MermaidParser()
_excalidraw_parser = ExcalidrawParser()


class DiagramAgent:
    """Converts diagram file_text items (Mermaid / Excalidraw) into prose
    descriptions that the planner can use directly.

    Also scans markdown file_text items for embedded ```mermaid blocks.
    """

    def run(self, pack: SourcePack) -> SourcePack:
        new_items: list[SourceItem] = []

        for it in pack.items:
            if it.kind != "file_text":
                continue

            name       = str(it.meta.get("originalName") or "").lower()
            content    = it.content.strip()

            # ── .mmd file ────────────────────────────────────────────────
            if name.endswith(".mmd") or (not name and _is_mermaid(content)):
                description = _mermaid_parser.parse(content)
                new_items.append(self._make_item(it, description, "mermaid_parse"))
                logger.info("DiagramAgent: parsed Mermaid file '%s' → %d chars", name, len(description))
                continue

            # ── .excalidraw file ─────────────────────────────────────────
            if name.endswith(".excalidraw"):
                try:
                    data = json.loads(content)
                    description = _excalidraw_parser.parse(data)
                    new_items.append(self._make_item(it, description, "excalidraw_parse"))
                    logger.info("DiagramAgent: parsed Excalidraw '%s' → %d chars", name, len(description))
                except Exception as e:
                    logger.warning("DiagramAgent: failed to parse Excalidraw '%s': %s", name, e)
                continue

            # ── Markdown or text with embedded ```mermaid blocks ─────────
            if name.endswith((".md", ".markdown", ".txt")) or (not name and "```mermaid" in content):
                blocks = _extract_mermaid_blocks(content)
                for i, block in enumerate(blocks):
                    description = _mermaid_parser.parse(block)
                    label = f"{name or 'inline'} (mermaid block {i + 1})"
                    new_items.append(SourceItem(
                        kind="file_text",
                        content=description,
                        meta={
                            **it.meta,
                            "originalName": label,
                            "extract": "mermaid_block",
                            "extractedChars": len(description),
                        },
                    ))
                    logger.info("DiagramAgent: extracted mermaid block %d from '%s' → %d chars",
                                i + 1, name, len(description))

        if not new_items:
            return pack

        logger.info("DiagramAgent: added %d diagram description(s)", len(new_items))
        return SourcePack(items=[*pack.items, *new_items])

    @staticmethod
    def _make_item(original: SourceItem, description: str, method: str) -> SourceItem:
        return SourceItem(
            kind="file_text",
            content=description,
            meta={
                **original.meta,
                "extract":        method,
                "extractedChars": len(description),
                "extractEmpty":   False,
            },
        )
