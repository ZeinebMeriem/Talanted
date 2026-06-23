"""PDF Report Generator — renders structured analysis into a professional PDF.

Uses ReportLab for fast, dependency-light PDF creation.
Handles Arabic/RTL text, multi-speaker transcripts, and requirements tables.
"""
from __future__ import annotations

import os
import time
from datetime import datetime
from typing import Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
    Image,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from pipeline.pipeline_config import PipelineConfig


# ── Styles ────────────────────────────────────────────────────────────────────

def _build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#92400e"),
        spaceAfter=6 * mm,
    ))
    styles.add(ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#78716c"),
        alignment=TA_CENTER,
        spaceAfter=20 * mm,
    ))
    styles.add(ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#78350f"),
        spaceBefore=8 * mm,
        spaceAfter=4 * mm,
        borderPadding=(0, 0, 2, 0),
    ))
    styles.add(ParagraphStyle(
        "SubHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#b45309"),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    ))
    styles.add(ParagraphStyle(
        "BodyText2",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "RequirementID",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#b45309"),
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "WarningText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#92400e"),
        backColor=colors.HexColor("#fef3c7"),
        borderPadding=6,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "CriticalText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#991b1b"),
        backColor=colors.HexColor("#fee2e2"),
        borderPadding=6,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "InsightText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e40af"),
        backColor=colors.HexColor("#eff6ff"),
        borderPadding=6,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "ScoreText",
        parent=styles["Normal"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1c1917"),
    ))
    styles.add(ParagraphStyle(
        "TableCellSmall",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1c1917"),
    ))
    return styles


# ── Priority colour mapping ──────────────────────────────────────────────────

PRIORITY_COLORS = {
    "high": colors.HexColor("#ef4444"),
    "medium": colors.HexColor("#f59e0b"),
    "low": colors.HexColor("#10b981"),
}


# ── PDF Builder ───────────────────────────────────────────────────────────────

class ReportGenerator:
    """Generates a professional PDF report from pipeline analysis output."""

    def __init__(self):
        PipelineConfig.ensure_dirs()
        self.styles = _build_styles()

    def generate(
        self,
        analysis: Dict,
        task: str = "requirements",
        transcript_text: str = "",
        diagram_path: Optional[str] = None,
        output_file: Optional[str] = None,
    ) -> str:
        """Build and save a PDF report. Returns the file path."""
        t0 = time.time()

        if not output_file:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(
                PipelineConfig.REPORTS_DIR, f"report_{task}_{ts}.pdf"
            )

        doc = SimpleDocTemplate(
            output_file,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=25 * mm,
            bottomMargin=20 * mm,
        )

        story = []
        data = analysis.get("analysis", analysis)

        # ── Cover ─────────────────────────────────────────────────────
        story.append(Spacer(1, 30 * mm))
        title = data.get("title", "Transcript Analysis Report")
        story.append(Paragraph(title, self.styles["CoverTitle"]))
        story.append(Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')}",
            self.styles["CoverSubtitle"],
        ))
        story.append(Paragraph(
            f"Task: {task.replace('_', ' ').title()} &bull; "
            f"Model: {PipelineConfig.QWEN_MODEL}",
            self.styles["CoverSubtitle"],
        ))
        story.append(HRFlowable(
            width="80%", thickness=1,
            color=colors.HexColor("#d97706"),
            spaceAfter=10 * mm,
        ))

        # Summary
        summary = data.get("summary", "")
        if summary:
            story.append(Paragraph("Executive Summary", self.styles["SectionHeading"]))
            story.append(Paragraph(summary, self.styles["BodyText2"]))

        story.append(PageBreak())

        # ── Task-specific content ─────────────────────────────────────
        if task == "requirements":
            self._add_requirements(story, data)
            self._add_ambiguities(story, data)
            self._add_warnings(story, data)
            self._add_clarification_questions(story, data)
            self._add_consultant_guidance(story, data)
            self._add_system_architecture(story, data)
        elif task == "summary":
            self._add_meeting_summary(story, data)
        elif task == "diagram":
            self._add_diagram_section(story, data, diagram_path)

        # ── Transcript excerpt ────────────────────────────────────────
        if transcript_text:
            story.append(Paragraph("Source Transcript", self.styles["SectionHeading"]))
            # Truncate long transcripts
            excerpt = transcript_text[:2000]
            if len(transcript_text) > 2000:
                excerpt += "  [... truncated ...]"
            story.append(Paragraph(excerpt, self.styles["BodyText2"]))

        # ── Metadata footer ───────────────────────────────────────────
        story.append(Spacer(1, 10 * mm))
        story.append(HRFlowable(
            width="100%", thickness=0.5,
            color=colors.HexColor("#e2e8f0"),
            spaceAfter=3 * mm,
        ))
        meta_lines = [
            f"Context chunks used: {analysis.get('context_chunks_used', 'N/A')}",
            f"Processing time: {analysis.get('processing_time', 'N/A')}s",
            f"Context sources: {', '.join(analysis.get('context_sources', []))}",
        ]
        story.append(Paragraph(" | ".join(meta_lines), self.styles["Footer"]))

        # ── Build PDF ─────────────────────────────────────────────────
        doc.build(story)
        elapsed = time.time() - t0
        print(f"📄 PDF report saved: {output_file} ({elapsed:.1f}s)")
        return output_file

    # ── Markdown report ────────────────────────────────────────────────

    def generate_markdown(
        self,
        analysis: Dict,
        task: str = "requirements",
        transcript_text: str = "",
        output_file: Optional[str] = None,
    ) -> tuple:
        """Build a Markdown text version of the report.

        Returns:
            (markdown_string, file_path) tuple.
        """
        if not output_file:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(
                PipelineConfig.REPORTS_DIR, f"report_{task}_{ts}.md"
            )

        data = analysis.get("analysis", analysis)
        lines: list = []

        # ── Header ────────────────────────────────────────────────
        title = data.get("title", "Transcript Analysis Report")
        lines.append(f"# {title}\n")
        lines.append(
            f"*Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')} "
            f"| Task: {task.replace('_', ' ').title()} "
            f"| Model: {PipelineConfig.QWEN_MODEL}*\n"
        )

        summary = data.get("summary", "")
        if summary:
            lines.append("## Executive Summary\n")
            lines.append(f"{summary}\n")

        # ── Requirements ──────────────────────────────────────────
        if task == "requirements":
            fr_list = data.get("functional_requirements", [])
            if fr_list:
                lines.append("## Functional Requirements\n")
                lines.append("| ID | Description | Priority |")
                lines.append("|---|---|---|")
                for fr in fr_list:
                    lines.append(
                        f"| {fr.get('id', '--')} "
                        f"| {fr.get('description', '')} "
                        f"| {fr.get('priority', 'medium').title()} |"
                    )
                lines.append("")

            nfr_list = data.get("non_functional_requirements", [])
            if nfr_list:
                lines.append("## Non-Functional Requirements\n")
                lines.append("| ID | Description | Category |")
                lines.append("|---|---|---|")
                for nfr in nfr_list:
                    lines.append(
                        f"| {nfr.get('id', '--')} "
                        f"| {nfr.get('description', '')} "
                        f"| {nfr.get('category', '')} |"
                    )
                lines.append("")

            items = data.get("action_items", [])
            if items:
                lines.append("## Action Items\n")
                lines.append("| Owner | Task | Deadline |")
                lines.append("|---|---|---|")
                for item in items:
                    lines.append(
                        f"| {item.get('owner', 'TBD')} "
                        f"| {item.get('task', '')} "
                        f"| {item.get('deadline', 'TBD')} |"
                    )
                lines.append("")

            questions = data.get("open_questions", [])
            if questions:
                lines.append("## Open Questions\n")
                for q in questions:
                    lines.append(f"- {q}")
                lines.append("")

            # Ambiguities
            ambiguities = data.get("ambiguities", [])
            if ambiguities:
                lines.append("## Ambiguity Detection\n")
                completeness = data.get("completeness_score")
                if completeness is not None:
                    lines.append(
                        f"**Requirements Completeness:** {int(float(completeness) * 100)}%\n"
                    )
                overall = data.get("overall_assessment", "")
                if overall:
                    lines.append(f"{overall}\n")
                lines.append("| ID | Type | Severity | Issue | Recommendation |")
                lines.append("|---|---|---|---|---|")
                for amb in ambiguities:
                    lines.append(
                        f"| {amb.get('id', '—')} "
                        f"| {amb.get('type', '').replace('_', ' ').title()} "
                        f"| {amb.get('severity', '').title()} "
                        f"| {amb.get('original_statement', '')} — {amb.get('issue_description', '')} "
                        f"| {amb.get('recommendation', '')} |"
                    )
                lines.append("")

            # Warnings
            warnings_list = data.get("warnings", [])
            if warnings_list:
                lines.append("## Project Warnings\n")
                lines.append("| ID | Category | Severity | Description |")
                lines.append("|---|---|---|---|")
                for w in warnings_list:
                    lines.append(
                        f"| {w.get('id', '—')} "
                        f"| {w.get('category', '').replace('_', ' ').title()} "
                        f"| {w.get('severity', '').title()} "
                        f"| {w.get('description', '')} |"
                    )
                lines.append("")

            # Clarification questions
            cq_list = data.get("clarification_questions", [])
            if cq_list:
                lines.append("## Clarification Questions\n")
                for q in cq_list:
                    priority = q.get("priority", "").replace("_", " ").title()
                    lines.append(
                        f"- **[{priority}]** ({q.get('category', '')}) "
                        f"{q.get('question', '')}"
                    )
                    ctx = q.get("context", "")
                    if ctx:
                        lines.append(f"  - *Context: {ctx}*")
                lines.append("")

            agenda = data.get("recommended_meeting_agenda", [])
            if agenda:
                lines.append("### Recommended Meeting Agenda\n")
                for i, item in enumerate(agenda, 1):
                    lines.append(f"{i}. {item}")
                lines.append("")

            # Consultant guidance
            intent = data.get("client_intent_summary", "")
            insights = data.get("key_insights", [])
            hidden_reqs = data.get("hidden_requirements", [])
            risk_areas = data.get("risk_areas", [])
            next_steps = data.get("recommended_next_steps", [])
            stakeholders = data.get("stakeholder_analysis", [])

            if any([intent, insights, hidden_reqs, risk_areas, next_steps, stakeholders]):
                lines.append("## Consultant Guidance\n")
                if intent:
                    lines.append(f"### Client Intent Summary\n\n{intent}\n")
                if insights:
                    lines.append("### Key Insights\n")
                    for ins in insights:
                        imp = ins.get("importance", "medium").upper()
                        lines.append(f"- **[{imp}]** {ins.get('insight', '')}")
                    lines.append("")
                if hidden_reqs:
                    lines.append("### Hidden / Implied Requirements\n")
                    for hr in hidden_reqs:
                        lines.append(f"- {hr}")
                    lines.append("")
                if risk_areas:
                    lines.append("### Risk Areas\n")
                    lines.append("| Area | Risk Level | Mitigation |")
                    lines.append("|---|---|---|")
                    for r in risk_areas:
                        lines.append(
                            f"| {r.get('area', '')} "
                            f"| {r.get('risk_level', '').title()} "
                            f"| {r.get('mitigation', '')} |"
                        )
                    lines.append("")
                if next_steps:
                    lines.append("### Recommended Next Steps\n")
                    for i, step in enumerate(next_steps, 1):
                        lines.append(f"{i}. {step}")
                    lines.append("")
                if stakeholders:
                    lines.append("### Stakeholder Analysis\n")
                    lines.append("| Role | Concerns | Influence |")
                    lines.append("|---|---|---|")
                    for s in stakeholders:
                        concerns = ", ".join(s.get("concerns", []))
                        lines.append(
                            f"| {s.get('role', '')} "
                            f"| {concerns} "
                            f"| {s.get('influence', '').title()} |"
                        )
                    lines.append("")

            # Diagram
            mermaid_code = data.get("mermaid_code", "")
            if mermaid_code:
                lines.append("## System Diagram\n")
                desc = data.get("diagram_description", "")
                if desc:
                    lines.append(f"{desc}\n")
                lines.append("```mermaid")
                lines.append(mermaid_code)
                lines.append("```\n")

            # System Architecture
            arch = data.get("system_architecture", {})
            if arch:
                lines.append("## System Architecture & Conception\n")
                arch_overview = arch.get("architecture_overview", "")
                if arch_overview:
                    lines.append(f"{arch_overview}\n")

                arch_style = arch.get("architecture_style", "")
                if arch_style:
                    lines.append(f"**Architecture Style:** {arch_style}\n")

                # System Layers
                layers = arch.get("system_layers", [])
                if layers:
                    lines.append("### System Layers\n")
                    lines.append("| Layer | Description | Components | Technologies |")
                    lines.append("|---|---|---|---|")
                    for layer in layers:
                        comps = ", ".join(layer.get("components", []))
                        techs = ", ".join(layer.get("technologies", []))
                        lines.append(
                            f"| {layer.get('name', '')} "
                            f"| {layer.get('description', '')} "
                            f"| {comps} "
                            f"| {techs} |"
                        )
                    lines.append("")

                # ASCII System Architecture Diagram
                ascii_sys = arch.get("ascii_system_diagram", "")
                if ascii_sys:
                    lines.append("### System Architecture Diagram\n")
                    lines.append("```")
                    lines.append(ascii_sys)
                    lines.append("```\n")

                # ASCII Data Flow Diagram
                ascii_df = arch.get("ascii_data_flow_diagram", "")
                if ascii_df:
                    lines.append("### Data Flow Diagram\n")
                    lines.append("```")
                    lines.append(ascii_df)
                    lines.append("```\n")

                # ASCII Deployment Diagram
                ascii_deploy = arch.get("ascii_deployment_diagram", "")
                if ascii_deploy:
                    lines.append("### Deployment Diagram\n")
                    lines.append("```")
                    lines.append(ascii_deploy)
                    lines.append("```\n")

                # API Endpoints
                endpoints = arch.get("api_endpoints", [])
                if endpoints:
                    lines.append("### API Endpoints\n")
                    lines.append("| Method | Path | Description |")
                    lines.append("|---|---|---|")
                    for ep in endpoints:
                        lines.append(
                            f"| `{ep.get('method', '')}` "
                            f"| `{ep.get('path', '')}` "
                            f"| {ep.get('description', '')} |"
                        )
                    lines.append("")

                # Database Schema
                db_schema = arch.get("database_schema", [])
                if db_schema:
                    lines.append("### Database Schema\n")
                    for entity in db_schema:
                        lines.append(f"**{entity.get('entity', '')}**\n")
                        fields = entity.get("fields", [])
                        if fields:
                            lines.append("| Field | Type | Constraints |")
                            lines.append("|---|---|---|")
                            for f in fields:
                                lines.append(
                                    f"| {f.get('name', '')} "
                                    f"| {f.get('type', '')} "
                                    f"| {f.get('constraints', '')} |"
                                )
                        rels = entity.get("relationships", [])
                        if rels:
                            lines.append("\nRelationships:")
                            for r in rels:
                                lines.append(f"- {r}")
                        lines.append("")

                # ASCII ER Diagram
                ascii_er = arch.get("ascii_er_diagram", "")
                if ascii_er:
                    lines.append("### Entity-Relationship Diagram\n")
                    lines.append("```")
                    lines.append(ascii_er)
                    lines.append("```\n")

                # Security Architecture
                security = arch.get("security_architecture", {})
                if security:
                    lines.append("### Security Architecture\n")
                    for key, val in security.items():
                        if val:
                            lines.append(f"- **{key.replace('_', ' ').title()}:** {val}")
                    lines.append("")

                # Integration Points
                integrations = arch.get("integration_points", [])
                if integrations:
                    lines.append("### Integration Points\n")
                    lines.append("| System | Protocol | Direction | Description |")
                    lines.append("|---|---|---|---|")
                    for ip in integrations:
                        lines.append(
                            f"| {ip.get('system', '')} "
                            f"| {ip.get('protocol', '')} "
                            f"| {ip.get('direction', '')} "
                            f"| {ip.get('description', '')} |"
                        )
                    lines.append("")

                # Scalability & Monitoring
                scalability = arch.get("scalability_strategy", "")
                if scalability:
                    lines.append(f"### Scalability Strategy\n\n{scalability}\n")

                monitoring = arch.get("monitoring_strategy", "")
                if monitoring:
                    lines.append(f"### Monitoring Strategy\n\n{monitoring}\n")

                # ASCII Infrastructure Diagram
                ascii_infra = arch.get("ascii_infrastructure_diagram", "")
                if ascii_infra:
                    lines.append("### Infrastructure Diagram\n")
                    lines.append("```")
                    lines.append(ascii_infra)
                    lines.append("```\n")

        elif task == "summary":
            for section, heading in [
                ("participants", "Participants"),
                ("topics_discussed", "Topics Discussed"),
                ("key_decisions", "Key Decisions"),
            ]:
                items = data.get(section, [])
                if items:
                    lines.append(f"## {heading}\n")
                    for item in items:
                        lines.append(f"- {item}")
                    lines.append("")

        # ── Transcript excerpt ────────────────────────────────────
        if transcript_text:
            lines.append("## Source Transcript\n")
            excerpt = transcript_text[:2000]
            if len(transcript_text) > 2000:
                excerpt += "\n\n*[... truncated ...]*"
            lines.append(excerpt)
            lines.append("")

        # ── Metadata footer ───────────────────────────────────────
        lines.append("---\n")
        meta = (
            f"Context chunks: {analysis.get('context_chunks_used', 'N/A')} | "
            f"Processing time: {analysis.get('processing_time', 'N/A')}s | "
            f"Sources: {', '.join(analysis.get('context_sources', []))}"
        )
        lines.append(f"*{meta}*\n")

        # ── Save ──────────────────────────────────────────────────
        md_content = "\n".join(lines)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"📝 Markdown report saved: {output_file}")
        return md_content, output_file

    # ── Section builders ──────────────────────────────────────────────

    def _add_requirements(self, story, data):
        """Add functional & non-functional requirements tables."""
        # Functional Requirements
        fr_list = data.get("functional_requirements", [])
        if fr_list:
            story.append(Paragraph("Functional Requirements", self.styles["SectionHeading"]))
            cell = self.styles["TableCell"]
            priority_styles = {}
            for p_name, p_color in PRIORITY_COLORS.items():
                priority_styles[p_name] = ParagraphStyle(
                    f"Priority_{p_name}", parent=cell,
                    textColor=p_color, fontName="Helvetica-Bold",
                )
            table_data = [["ID", "Description", "Priority"]]
            for fr in fr_list:
                priority = fr.get("priority", "medium")
                p_style = priority_styles.get(priority.lower(), cell)
                table_data.append([
                    Paragraph(fr.get("id", "--"), cell),
                    Paragraph(fr.get("description", ""), cell),
                    Paragraph(priority.title(), p_style),
                ])
            style_cmds = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
            for row_i in range(2, len(table_data), 2):
                style_cmds.append(("BACKGROUND", (0, row_i), (-1, row_i), colors.HexColor("#faf5f0")))
            table = Table(table_data, colWidths=[25 * mm, None, 25 * mm])
            table.setStyle(TableStyle(style_cmds))
            story.append(table)
            story.append(Spacer(1, 6 * mm))

        # Non-Functional Requirements
        nfr_list = data.get("non_functional_requirements", [])
        if nfr_list:
            story.append(Paragraph("Non-Functional Requirements", self.styles["SubHeading"]))
            cell = self.styles["TableCell"]
            table_data = [["ID", "Description", "Category"]]
            for nfr in nfr_list:
                table_data.append([
                    Paragraph(nfr.get("id", "--"), cell),
                    Paragraph(nfr.get("description", ""), cell),
                    Paragraph(nfr.get("category", ""), cell),
                ])
            style_cmds = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
            for row_i in range(2, len(table_data), 2):
                style_cmds.append(("BACKGROUND", (0, row_i), (-1, row_i), colors.HexColor("#faf5f0")))
            table = Table(table_data, colWidths=[25 * mm, None, 30 * mm])
            table.setStyle(TableStyle(style_cmds))
            story.append(table)
            story.append(Spacer(1, 6 * mm))

        # Action Items
        self._add_action_items(story, data)

        # Open Questions
        questions = data.get("open_questions", [])
        if questions:
            story.append(Paragraph("Open Questions", self.styles["SubHeading"]))
            for q in questions:
                story.append(Paragraph(f"• {q}", self.styles["BodyText2"]))

    def _add_meeting_summary(self, story, data):
        """Add meeting summary sections."""
        # Participants
        participants = data.get("participants", [])
        if participants:
            story.append(Paragraph("Participants", self.styles["SectionHeading"]))
            story.append(Paragraph(", ".join(participants), self.styles["BodyText2"]))

        # Topics
        topics = data.get("topics_discussed", [])
        if topics:
            story.append(Paragraph("Topics Discussed", self.styles["SectionHeading"]))
            for t in topics:
                story.append(Paragraph(f"• {t}", self.styles["BodyText2"]))

        # Key Decisions
        decisions = data.get("key_decisions", [])
        if decisions:
            story.append(Paragraph("Key Decisions", self.styles["SectionHeading"]))
            for d in decisions:
                story.append(Paragraph(f"✓ {d}", self.styles["BodyText2"]))

        # Action Items
        self._add_action_items(story, data)

    def _add_diagram_section(self, story, data, diagram_path=None):
        """Add diagram description and embedded image if available."""
        story.append(Paragraph("System Diagram", self.styles["SectionHeading"]))
        desc = data.get("description", "")
        if desc:
            story.append(Paragraph(desc, self.styles["BodyText2"]))

        if diagram_path and os.path.exists(diagram_path):
            try:
                img = Image(diagram_path, width=160 * mm, height=100 * mm)
                img.hAlign = "CENTER"
                story.append(Spacer(1, 4 * mm))
                story.append(img)
            except Exception as e:
                story.append(Paragraph(f"[Diagram image error: {e}]", self.styles["BodyText2"]))

        mermaid = data.get("mermaid_code", "")
        if mermaid:
            story.append(Paragraph("Mermaid Source", self.styles["SubHeading"]))
            # Wrap in a grey box
            code_style = ParagraphStyle(
                "MermaidCode",
                parent=self.styles["Normal"],
                fontSize=8,
                leading=11,
                fontName="Courier",
                textColor=colors.HexColor("#334155"),
                backColor=colors.HexColor("#f1f5f9"),
                borderPadding=8,
                spaceBefore=2 * mm,
            )
            story.append(Paragraph(mermaid.replace("\n", "<br/>"), code_style))

    def _add_action_items(self, story, data):
        """Add action items table."""
        items = data.get("action_items", [])
        if not items:
            return
        story.append(Paragraph("Action Items", self.styles["SubHeading"]))
        cell = self.styles["TableCell"]
        table_data = [["Owner", "Task", "Deadline"]]
        for item in items:
            table_data.append([
                Paragraph(item.get("owner", "TBD"), cell),
                Paragraph(item.get("task", ""), cell),
                Paragraph(item.get("deadline", "TBD"), cell),
            ])
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("LEADING", (0, 0), (-1, -1), 13),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
        for row_i in range(2, len(table_data), 2):
            style_cmds.append(("BACKGROUND", (0, row_i), (-1, row_i), colors.HexColor("#faf5f0")))
        table = Table(table_data, colWidths=[30 * mm, None, 30 * mm])
        table.setStyle(TableStyle(style_cmds))
        story.append(table)

    # ── Ambiguity Detection Section ───────────────────────────────────

    def _add_ambiguities(self, story, data):
        """Add ambiguity detection results with severity indicators."""
        ambiguities = data.get("ambiguities", [])
        completeness = data.get("completeness_score")
        severity_summary = data.get("severity_summary", {})
        overall = data.get("overall_assessment", "")

        if not ambiguities and completeness is None:
            return

        story.append(PageBreak())
        story.append(Paragraph("Ambiguity Detection Report", self.styles["SectionHeading"]))

        # Completeness score banner
        if completeness is not None:
            score_pct = int(float(completeness) * 100)
            if score_pct >= 70:
                score_color = "#10b981"
            elif score_pct >= 40:
                score_color = "#f59e0b"
            else:
                score_color = "#ef4444"
            score_style = ParagraphStyle(
                "ScoreBanner", parent=self.styles["Normal"],
                fontSize=16, leading=20, alignment=TA_CENTER,
                textColor=colors.HexColor(score_color),
                fontName="Helvetica-Bold", spaceAfter=4 * mm,
            )
            story.append(Paragraph(
                f"Requirements Completeness: {score_pct}%", score_style
            ))

        # Severity summary
        if severity_summary:
            crit = severity_summary.get("critical", 0)
            major = severity_summary.get("major", 0)
            minor = severity_summary.get("minor", 0)
            sev_data = [
                ["Critical", "Major", "Minor", "Total"],
                [str(crit), str(major), str(minor), str(crit + major + minor)],
            ]
            sev_table = Table(sev_data, colWidths=[35 * mm, 35 * mm, 35 * mm, 35 * mm])
            sev_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(sev_table)
            story.append(Spacer(1, 4 * mm))

        # Overall assessment
        if overall:
            story.append(Paragraph(overall, self.styles["BodyText2"]))
            story.append(Spacer(1, 3 * mm))

        # Ambiguities table
        if ambiguities:
            story.append(Paragraph("Detected Ambiguities", self.styles["SubHeading"]))
            table_data = [["ID", "Type", "Severity", "Issue", "Recommendation"]]
            for amb in ambiguities:
                table_data.append([
                    amb.get("id", "—"),
                    amb.get("type", "").replace("_", " ").title(),
                    amb.get("severity", "").title(),
                    Paragraph(
                        f"<b>{amb.get('original_statement', '')}</b><br/>{amb.get('issue_description', '')}",
                        ParagraphStyle("AmbCell", parent=self.styles["Normal"], fontSize=8, leading=11)
                    ),
                    Paragraph(
                        amb.get("recommendation", ""),
                        ParagraphStyle("RecCell", parent=self.styles["Normal"], fontSize=8, leading=11)
                    ),
                ])
            table = Table(table_data, colWidths=[18 * mm, 25 * mm, 18 * mm, None, 44 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            # Colour-code severity cells
            SEVERITY_COLORS = {
                "critical": colors.HexColor("#ef4444"),
                "major": colors.HexColor("#f59e0b"),
                "minor": colors.HexColor("#10b981"),
            }
            for i, amb in enumerate(ambiguities, start=1):
                sev = amb.get("severity", "").lower()
                if sev in SEVERITY_COLORS:
                    table.setStyle(TableStyle([
                        ("TEXTCOLOR", (2, i), (2, i), SEVERITY_COLORS[sev]),
                        ("FONTNAME", (2, i), (2, i), "Helvetica-Bold"),
                    ]))
            story.append(table)
            story.append(Spacer(1, 6 * mm))

    # ── Warnings Section ──────────────────────────────────────────────

    def _add_warnings(self, story, data):
        """Add project warnings and risk flags."""
        warnings = data.get("warnings", [])
        if not warnings:
            return

        story.append(Paragraph("Project Warnings", self.styles["SectionHeading"]))
        table_data = [["ID", "Category", "Severity", "Description"]]
        for w in warnings:
            table_data.append([
                w.get("id", "—"),
                w.get("category", "").replace("_", " ").title(),
                w.get("severity", "").title(),
                Paragraph(
                    w.get("description", ""),
                    ParagraphStyle("WarnCell", parent=self.styles["Normal"], fontSize=8, leading=11)
                ),
            ])
        table = Table(table_data, colWidths=[20 * mm, 30 * mm, 20 * mm, None])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("LEADING", (0, 0), (-1, -1), 11),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        WARNING_SEVERITY = {
            "high": colors.HexColor("#ef4444"),
            "medium": colors.HexColor("#f59e0b"),
            "low": colors.HexColor("#10b981"),
        }
        for i, w in enumerate(warnings, start=1):
            sev = w.get("severity", "").lower()
            if sev in WARNING_SEVERITY:
                table.setStyle(TableStyle([
                    ("TEXTCOLOR", (2, i), (2, i), WARNING_SEVERITY[sev]),
                    ("FONTNAME", (2, i), (2, i), "Helvetica-Bold"),
                ]))
        story.append(table)
        story.append(Spacer(1, 6 * mm))

    # ── Clarification Questions Section ───────────────────────────────

    def _add_clarification_questions(self, story, data):
        """Add suggested clarification questions for the consultant."""
        questions = data.get("clarification_questions", [])
        agenda = data.get("recommended_meeting_agenda", [])

        if not questions and not agenda:
            return

        story.append(PageBreak())
        story.append(Paragraph("Clarification Questions", self.styles["SectionHeading"]))
        story.append(Paragraph(
            "The following questions should be asked in the next client meeting to "
            "resolve ambiguities and complete the requirements.",
            self.styles["BodyText2"],
        ))

        if questions:
            # Group by priority
            must_ask = [q for q in questions if q.get("priority") == "must_ask"]
            should_ask = [q for q in questions if q.get("priority") == "should_ask"]
            nice_to_ask = [q for q in questions if q.get("priority") == "nice_to_ask"]

            for label, group, bg_color, text_color in [
                ("Must Ask (Critical)", must_ask, "#451a03", "#fef3c7"),
                ("Should Ask (Important)", should_ask, "#78350f", "#fef3c7"),
                ("Nice to Ask (Optional)", nice_to_ask, "#92400e", "#fef3c7"),
            ]:
                if not group:
                    continue
                story.append(Paragraph(label, self.styles["SubHeading"]))
                table_data = [["#", "Category", "Question", "Context"]]
                for q in group:
                    table_data.append([
                        q.get("id", "—"),
                        q.get("category", "").replace("_", " ").title(),
                        Paragraph(
                            q.get("question", ""),
                            ParagraphStyle("QCell", parent=self.styles["Normal"], fontSize=9, leading=12)
                        ),
                        Paragraph(
                            q.get("context", ""),
                            ParagraphStyle("QCtx", parent=self.styles["Normal"], fontSize=8, leading=11,
                                           textColor=colors.HexColor("#64748b"))
                        ),
                    ])
                table = Table(table_data, colWidths=[16 * mm, 25 * mm, None, 54 * mm])
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(bg_color)),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor(text_color)),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("LEADING", (0, 0), (-1, -1), 11),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]))
                story.append(table)
                story.append(Spacer(1, 4 * mm))

        # Recommended meeting agenda
        if agenda:
            story.append(Paragraph("Recommended Meeting Agenda", self.styles["SubHeading"]))
            for i, item in enumerate(agenda, 1):
                story.append(Paragraph(f"{i}. {item}", self.styles["BodyText2"]))

    # ── Consultant Guidance Section ───────────────────────────────────

    def _add_consultant_guidance(self, story, data):
        """Add consultant guidance: insights, risks, hidden reqs, next steps."""
        intent = data.get("client_intent_summary", "")
        insights = data.get("key_insights", [])
        inconsistencies = data.get("inconsistencies", [])
        hidden_reqs = data.get("hidden_requirements", [])
        risk_areas = data.get("risk_areas", [])
        next_steps = data.get("recommended_next_steps", [])
        stakeholders = data.get("stakeholder_analysis", [])

        has_content = any([intent, insights, inconsistencies, hidden_reqs, risk_areas, next_steps, stakeholders])
        if not has_content:
            return

        story.append(PageBreak())
        story.append(Paragraph("Consultant Guidance", self.styles["SectionHeading"]))

        # Client intent
        if intent:
            story.append(Paragraph("Client Intent Summary", self.styles["SubHeading"]))
            story.append(Paragraph(intent, self.styles["InsightText"]))

        # Key insights
        if insights:
            story.append(Paragraph("Key Insights", self.styles["SubHeading"]))
            for ins in insights:
                importance = ins.get("importance", "medium")
                icon = {"high": "[HIGH]", "medium": "[MEDIUM]", "low": "[LOW]"}.get(importance, "")
                story.append(Paragraph(
                    f"<b>{icon}</b> {ins.get('insight', '')}",
                    self.styles["BodyText2"],
                ))

        # Inconsistencies
        if inconsistencies:
            story.append(Paragraph("Inconsistencies Detected", self.styles["SubHeading"]))
            for inc in inconsistencies:
                story.append(Paragraph(
                    f"<b>Issue:</b> {inc.get('description', '')}",
                    self.styles["CriticalText"],
                ))
                stmts = inc.get("statements", [])
                for s in stmts:
                    story.append(Paragraph(f"  &rarr; \"{s}\"", self.styles["BodyText2"]))

        # Hidden requirements
        if hidden_reqs:
            story.append(Paragraph("Hidden / Implied Requirements", self.styles["SubHeading"]))
            for hr in hidden_reqs:
                story.append(Paragraph(f"&bull; {hr}", self.styles["BodyText2"]))

        # Risk areas
        if risk_areas:
            story.append(Paragraph("Risk Areas", self.styles["SubHeading"]))
            table_data = [["Area", "Risk Level", "Mitigation"]]
            for r in risk_areas:
                table_data.append([
                    r.get("area", ""),
                    r.get("risk_level", "").title(),
                    Paragraph(
                        r.get("mitigation", ""),
                        ParagraphStyle("RiskCell", parent=self.styles["Normal"], fontSize=8, leading=11)
                    ),
                ])
            table = Table(table_data, colWidths=[40 * mm, 25 * mm, None])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            RISK_COLORS = {
                "high": colors.HexColor("#ef4444"),
                "medium": colors.HexColor("#f59e0b"),
                "low": colors.HexColor("#10b981"),
            }
            for i, r in enumerate(risk_areas, start=1):
                rl = r.get("risk_level", "").lower()
                if rl in RISK_COLORS:
                    table.setStyle(TableStyle([
                        ("TEXTCOLOR", (1, i), (1, i), RISK_COLORS[rl]),
                        ("FONTNAME", (1, i), (1, i), "Helvetica-Bold"),
                    ]))
            story.append(table)
            story.append(Spacer(1, 4 * mm))

        # Recommended next steps
        if next_steps:
            story.append(Paragraph("Recommended Next Steps", self.styles["SubHeading"]))
            for i, step in enumerate(next_steps, 1):
                story.append(Paragraph(f"{i}. {step}", self.styles["BodyText2"]))

        # Stakeholder analysis
        if stakeholders:
            story.append(Paragraph("Stakeholder Analysis", self.styles["SubHeading"]))
            table_data = [["Role", "Concerns", "Influence"]]
            for s in stakeholders:
                concerns = ", ".join(s.get("concerns", []))
                table_data.append([
                    s.get("role", ""),
                    Paragraph(
                        concerns,
                        ParagraphStyle("StakeCell", parent=self.styles["Normal"], fontSize=8, leading=11)
                    ),
                    s.get("influence", "").title(),
                ])
            table = Table(table_data, colWidths=[35 * mm, None, 30 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(table)

        # Technology Stack Recommendation
        tech_stack = data.get("technology_stack_recommendation", {})
        if tech_stack:
            story.append(Spacer(1, 6 * mm))
            story.append(Paragraph("Technology Stack Recommendation", self.styles["SubHeading"]))
            
            # Frontend
            frontend = tech_stack.get("frontend", [])
            if frontend:
                story.append(Paragraph("Frontend Technologies", self.styles["BodyText2"]))
                for tech in frontend:
                    confidence_color = {
                        "high": "#10b981",
                        "medium": "#f59e0b",
                        "low": "#ef4444"
                    }.get(tech.get("confidence", "medium").lower(), "#f59e0b")
                    
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{tech.get('technology', 'N/A')}</b> "
                        f"<font color='{confidence_color}'>[{tech.get('confidence', 'medium').upper()}]</font>",
                        tech_style
                    ))
                    story.append(Paragraph(
                        f"  → {tech.get('rationale', '')}",
                        ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                     fontSize=8, leading=11, leftIndent=20,
                                     textColor=colors.HexColor("#64748b"))
                    ))
                    alternatives = tech.get("alternatives", [])
                    if alternatives:
                        story.append(Paragraph(
                            f"  Alternatives: {', '.join(alternatives)}",
                            ParagraphStyle("TechAlt", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Backend
            backend = tech_stack.get("backend", [])
            if backend:
                story.append(Paragraph("Backend Technologies", self.styles["BodyText2"]))
                for tech in backend:
                    confidence_color = {
                        "high": "#10b981",
                        "medium": "#f59e0b",
                        "low": "#ef4444"
                    }.get(tech.get("confidence", "medium").lower(), "#f59e0b")
                    
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{tech.get('technology', 'N/A')}</b> "
                        f"<font color='{confidence_color}'>[{tech.get('confidence', 'medium').upper()}]</font>",
                        tech_style
                    ))
                    story.append(Paragraph(
                        f"  → {tech.get('rationale', '')}",
                        ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                     fontSize=8, leading=11, leftIndent=20,
                                     textColor=colors.HexColor("#64748b"))
                    ))
                    alternatives = tech.get("alternatives", [])
                    if alternatives:
                        story.append(Paragraph(
                            f"  Alternatives: {', '.join(alternatives)}",
                            ParagraphStyle("TechAlt", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Database
            database = tech_stack.get("database", [])
            if database:
                story.append(Paragraph("Database Solutions", self.styles["BodyText2"]))
                for tech in database:
                    confidence_color = {
                        "high": "#10b981",
                        "medium": "#f59e0b",
                        "low": "#ef4444"
                    }.get(tech.get("confidence", "medium").lower(), "#f59e0b")
                    
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{tech.get('technology', 'N/A')}</b> "
                        f"<font color='{confidence_color}'>[{tech.get('confidence', 'medium').upper()}]</font>",
                        tech_style
                    ))
                    story.append(Paragraph(
                        f"  → {tech.get('rationale', '')}",
                        ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                     fontSize=8, leading=11, leftIndent=20,
                                     textColor=colors.HexColor("#64748b"))
                    ))
                    alternatives = tech.get("alternatives", [])
                    if alternatives:
                        story.append(Paragraph(
                            f"  Alternatives: {', '.join(alternatives)}",
                            ParagraphStyle("TechAlt", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Infrastructure
            infrastructure = tech_stack.get("infrastructure", [])
            if infrastructure:
                story.append(Paragraph("Infrastructure & Deployment", self.styles["BodyText2"]))
                for tech in infrastructure:
                    confidence_color = {
                        "high": "#10b981",
                        "medium": "#f59e0b",
                        "low": "#ef4444"
                    }.get(tech.get("confidence", "medium").lower(), "#f59e0b")
                    
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{tech.get('technology', 'N/A')}</b> "
                        f"<font color='{confidence_color}'>[{tech.get('confidence', 'medium').upper()}]</font>",
                        tech_style
                    ))
                    story.append(Paragraph(
                        f"  → {tech.get('rationale', '')}",
                        ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                     fontSize=8, leading=11, leftIndent=20,
                                     textColor=colors.HexColor("#64748b"))
                    ))
                    alternatives = tech.get("alternatives", [])
                    if alternatives:
                        story.append(Paragraph(
                            f"  Alternatives: {', '.join(alternatives)}",
                            ParagraphStyle("TechAlt", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Third-party services
            services = tech_stack.get("third_party_services", [])
            if services:
                story.append(Paragraph("Third-Party Services & APIs", self.styles["BodyText2"]))
                for svc in services:
                    confidence_color = {
                        "high": "#10b981",
                        "medium": "#f59e0b",
                        "low": "#ef4444"
                    }.get(svc.get("confidence", "medium").lower(), "#f59e0b")
                    
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{svc.get('service', 'N/A')}</b> ({svc.get('purpose', '')}) "
                        f"<font color='{confidence_color}'>[{svc.get('confidence', 'medium').upper()}]</font>",
                        tech_style
                    ))
                    story.append(Paragraph(
                        f"  → {svc.get('rationale', '')}",
                        ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                     fontSize=8, leading=11, leftIndent=20,
                                     textColor=colors.HexColor("#64748b"))
                    ))
                    alternatives = svc.get("alternatives", [])
                    if alternatives:
                        story.append(Paragraph(
                            f"  Alternatives: {', '.join(alternatives)}",
                            ParagraphStyle("TechAlt", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Development tools
            tools = tech_stack.get("development_tools", [])
            if tools:
                story.append(Paragraph("Development Tools", self.styles["BodyText2"]))
                for tool in tools:
                    tech_style = ParagraphStyle(
                        "TechItem", parent=self.styles["Normal"],
                        fontSize=9, leading=12,
                        leftIndent=10, spaceBefore=2, spaceAfter=2
                    )
                    story.append(Paragraph(
                        f"<b>{tool.get('tool', 'N/A')}</b> ({tool.get('purpose', '')})",
                        tech_style
                    ))
                    if tool.get('rationale'):
                        story.append(Paragraph(
                            f"  → {tool.get('rationale', '')}",
                            ParagraphStyle("TechRationale", parent=self.styles["Normal"],
                                         fontSize=8, leading=11, leftIndent=20,
                                         textColor=colors.HexColor("#64748b"))
                        ))
                story.append(Spacer(1, 3 * mm))
            
            # Project estimates
            complexity = tech_stack.get("estimated_complexity", "")
            timeline = tech_stack.get("estimated_timeline", "")
            team = tech_stack.get("team_composition_suggestion", {})
            
            if complexity or timeline or team:
                story.append(Paragraph("Project Estimates", self.styles["BodyText2"]))
                
                if complexity:
                    complexity_color = {
                        "low": "#10b981",
                        "medium": "#f59e0b",
                        "high": "#ef4444",
                        "very_high": "#991b1b"
                    }.get(complexity.lower(), "#f59e0b")
                    story.append(Paragraph(
                        f"<b>Complexity:</b> <font color='{complexity_color}'>{complexity.replace('_', ' ').title()}</font>",
                        ParagraphStyle("EstItem", parent=self.styles["Normal"],
                                     fontSize=9, leading=12, leftIndent=10)
                    ))
                
                if timeline:
                    story.append(Paragraph(
                        f"<b>Estimated Timeline:</b> {timeline}",
                        ParagraphStyle("EstItem", parent=self.styles["Normal"],
                                     fontSize=9, leading=12, leftIndent=10)
                    ))
                
                if team:
                    team_members = []
                    role_labels = {
                        "frontend_developers": "Frontend Developers",
                        "backend_developers": "Backend Developers",
                        "ui_ux_designer": "UI/UX Designer",
                        "project_manager": "Project Manager",
                        "qa_engineer": "QA Engineer"
                    }
                    for key, count in team.items():
                        if count and count > 0:
                            label = role_labels.get(key, key.replace("_", " ").title())
                            team_members.append(f"{count} {label}")
                    
                    if team_members:
                        story.append(Paragraph(
                            f"<b>Recommended Team:</b> {', '.join(team_members)}",
                            ParagraphStyle("EstItem", parent=self.styles["Normal"],
                                         fontSize=9, leading=12, leftIndent=10)
                        ))

    # ── System Architecture Section ───────────────────────────────────

    def _add_system_architecture(self, story, data):
        """Add full system architecture conception with text-based diagrams."""
        arch = data.get("system_architecture", {})
        if not arch:
            return

        # Reusable ASCII code style
        ascii_style = ParagraphStyle(
            "ASCIIArt", parent=self.styles["Normal"],
            fontSize=7, leading=9,
            fontName="Courier",
            textColor=colors.HexColor("#1e293b"),
            backColor=colors.HexColor("#f8fafc"),
            borderPadding=8,
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
            borderWidth=1,
            borderColor=colors.HexColor("#e2e8f0"),
        )

        story.append(PageBreak())
        story.append(Paragraph("System Architecture &amp; Conception", self.styles["SectionHeading"]))

        # Architecture overview
        overview = arch.get("architecture_overview", "")
        if overview:
            story.append(Paragraph(overview, self.styles["BodyText2"]))

        arch_style_name = arch.get("architecture_style", "")
        if arch_style_name:
            story.append(Paragraph(
                f"<b>Architecture Style:</b> {arch_style_name}",
                self.styles["InsightText"],
            ))
            story.append(Spacer(1, 3 * mm))

        # System Layers table
        layers = arch.get("system_layers", [])
        if layers:
            story.append(Paragraph("System Layers", self.styles["SubHeading"]))
            cell = self.styles["TableCell"]
            table_data = [["Layer", "Description", "Components", "Technologies"]]
            for layer in layers:
                comps = ", ".join(layer.get("components", []))
                techs = ", ".join(layer.get("technologies", []))
                table_data.append([
                    Paragraph(f"<b>{layer.get('name', '')}</b>", cell),
                    Paragraph(layer.get("description", ""), cell),
                    Paragraph(comps, cell),
                    Paragraph(techs, ParagraphStyle(
                        "TechCell", parent=cell,
                        textColor=colors.HexColor("#b45309"),
                    )),
                ])
            table = Table(table_data, colWidths=[30 * mm, None, 35 * mm, 35 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            for row_i in range(2, len(table_data), 2):
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, row_i), (-1, row_i), colors.HexColor("#faf5f0")),
                ]))
            story.append(table)
            story.append(Spacer(1, 6 * mm))

        # ASCII System Architecture Diagram
        ascii_sys = arch.get("ascii_system_diagram", "")
        if ascii_sys:
            story.append(Paragraph("System Architecture Diagram", self.styles["SubHeading"]))
            # Convert to HTML-safe, preserving spaces
            safe_ascii = (ascii_sys
                          .replace("&", "&amp;")
                          .replace("<", "&lt;")
                          .replace(">", "&gt;")
                          .replace(" ", "&nbsp;")
                          .replace("\n", "<br/>"))
            story.append(Paragraph(safe_ascii, ascii_style))

        # ASCII Data Flow Diagram
        ascii_df = arch.get("ascii_data_flow_diagram", "")
        if ascii_df:
            story.append(Paragraph("Data Flow Diagram", self.styles["SubHeading"]))
            safe_ascii = (ascii_df
                          .replace("&", "&amp;")
                          .replace("<", "&lt;")
                          .replace(">", "&gt;")
                          .replace(" ", "&nbsp;")
                          .replace("\n", "<br/>"))
            story.append(Paragraph(safe_ascii, ascii_style))

        # ASCII Deployment Diagram
        ascii_deploy = arch.get("ascii_deployment_diagram", "")
        if ascii_deploy:
            story.append(Paragraph("Deployment Diagram", self.styles["SubHeading"]))
            safe_ascii = (ascii_deploy
                          .replace("&", "&amp;")
                          .replace("<", "&lt;")
                          .replace(">", "&gt;")
                          .replace(" ", "&nbsp;")
                          .replace("\n", "<br/>"))
            story.append(Paragraph(safe_ascii, ascii_style))

        # API Endpoints table
        endpoints = arch.get("api_endpoints", [])
        if endpoints:
            story.append(PageBreak())
            story.append(Paragraph("API Endpoints", self.styles["SubHeading"]))
            cell = self.styles["TableCellSmall"]
            table_data = [["Method", "Path", "Description", "Response"]]
            method_colors = {
                "GET": "#10b981", "POST": "#3b82f6",
                "PUT": "#f59e0b", "DELETE": "#ef4444",
                "PATCH": "#8b5cf6",
            }
            for ep in endpoints:
                method = ep.get("method", "GET").upper()
                m_color = method_colors.get(method, "#64748b")
                table_data.append([
                    Paragraph(
                        f"<font color='{m_color}'><b>{method}</b></font>",
                        cell,
                    ),
                    Paragraph(
                        f"<font name='Courier'>{ep.get('path', '')}</font>",
                        cell,
                    ),
                    Paragraph(ep.get("description", ""), cell),
                    Paragraph(ep.get("response", ""), cell),
                ])
            table = Table(table_data, colWidths=[18 * mm, 40 * mm, None, 35 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            for row_i in range(2, len(table_data), 2):
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, row_i), (-1, row_i), colors.HexColor("#f8fafc")),
                ]))
            story.append(table)
            story.append(Spacer(1, 6 * mm))

        # Database Schema
        db_schema = arch.get("database_schema", [])
        if db_schema:
            story.append(Paragraph("Database Schema", self.styles["SubHeading"]))
            for entity in db_schema:
                entity_name = entity.get("entity", "Unknown")
                story.append(Paragraph(
                    f"<b>{entity_name}</b>",
                    ParagraphStyle("EntityName", parent=self.styles["Normal"],
                                   fontSize=10, leading=13,
                                   textColor=colors.HexColor("#1e40af"),
                                   spaceBefore=3 * mm),
                ))
                fields = entity.get("fields", [])
                if fields:
                    cell = self.styles["TableCellSmall"]
                    table_data = [["Field", "Type", "Constraints"]]
                    for f in fields:
                        table_data.append([
                            Paragraph(f"<font name='Courier'>{f.get('name', '')}</font>", cell),
                            Paragraph(f.get("type", ""), cell),
                            Paragraph(f.get("constraints", ""), cell),
                        ])
                    table = Table(table_data, colWidths=[35 * mm, 30 * mm, None])
                    table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("LEADING", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]))
                    story.append(table)

                rels = entity.get("relationships", [])
                if rels:
                    for r in rels:
                        story.append(Paragraph(
                            f"&rarr; {r}",
                            ParagraphStyle("RelText", parent=self.styles["Normal"],
                                           fontSize=8, leading=10, leftIndent=10,
                                           textColor=colors.HexColor("#64748b")),
                        ))
                story.append(Spacer(1, 3 * mm))

        # ASCII ER Diagram
        ascii_er = arch.get("ascii_er_diagram", "")
        if ascii_er:
            story.append(Paragraph("Entity-Relationship Diagram", self.styles["SubHeading"]))
            safe_ascii = (ascii_er
                          .replace("&", "&amp;")
                          .replace("<", "&lt;")
                          .replace(">", "&gt;")
                          .replace(" ", "&nbsp;")
                          .replace("\n", "<br/>"))
            story.append(Paragraph(safe_ascii, ascii_style))

        # Security Architecture
        security = arch.get("security_architecture", {})
        if security:
            story.append(Paragraph("Security Architecture", self.styles["SubHeading"]))
            for key, val in security.items():
                if val:
                    label = key.replace("_", " ").title()
                    story.append(Paragraph(
                        f"<b>{label}:</b> {val}",
                        self.styles["BodyText2"],
                    ))

        # Integration Points table
        integrations = arch.get("integration_points", [])
        if integrations:
            story.append(Paragraph("Integration Points", self.styles["SubHeading"]))
            cell = self.styles["TableCellSmall"]
            table_data = [["System", "Protocol", "Direction", "Description"]]
            for ip in integrations:
                direction = ip.get("direction", "")
                dir_icon = {"inbound": "⬇", "outbound": "⬆", "bidirectional": "⬍"}.get(direction, "—")
                table_data.append([
                    Paragraph(f"<b>{ip.get('system', '')}</b>", cell),
                    Paragraph(ip.get("protocol", ""), cell),
                    Paragraph(f"{dir_icon} {direction.title()}", cell),
                    Paragraph(ip.get("description", ""), cell),
                ])
            table = Table(table_data, colWidths=[30 * mm, 25 * mm, 25 * mm, None])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#451a03")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(table)
            story.append(Spacer(1, 4 * mm))

        # Scalability & Monitoring
        scalability = arch.get("scalability_strategy", "")
        if scalability:
            story.append(Paragraph("Scalability Strategy", self.styles["SubHeading"]))
            story.append(Paragraph(scalability, self.styles["BodyText2"]))

        monitoring = arch.get("monitoring_strategy", "")
        if monitoring:
            story.append(Paragraph("Monitoring Strategy", self.styles["SubHeading"]))
            story.append(Paragraph(monitoring, self.styles["BodyText2"]))

        # ASCII Infrastructure Diagram
        ascii_infra = arch.get("ascii_infrastructure_diagram", "")
        if ascii_infra:
            story.append(Paragraph("Infrastructure Diagram", self.styles["SubHeading"]))
            safe_ascii = (ascii_infra
                          .replace("&", "&amp;")
                          .replace("<", "&lt;")
                          .replace(">", "&gt;")
                          .replace(" ", "&nbsp;")
                          .replace("\n", "<br/>"))
            story.append(Paragraph(safe_ascii, ascii_style))
