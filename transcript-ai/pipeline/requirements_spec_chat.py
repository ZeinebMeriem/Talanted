"""Interactive Requirements Specification Chat — build complete spec through Q&A.

Guides the user through clarification questions from the analysis report,
providing numbered suggestions for each question, and compiles all answers
into a structured requirements specification document.

Usage:
    # Programmatic usage
    from pipeline.requirements_spec_chat import RequirementsSpecChat
    chat = RequirementsSpecChat()
    chat.start(report_content="...")
    
    # CLI usage
    python -m pipeline.requirements_spec_chat --file pipeline_outputs/reports/report.md
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

import requests

from pipeline.pipeline_config import PipelineConfig


# ── Constants ─────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert requirements analyst helping to build a complete project specification.

You will be given a clarification question and context about a software project.
Your job is to generate 3-5 realistic, numbered suggestions that the user can choose from.

RULES:
1. Generate exactly 3-5 suggestions per question
2. Suggestions should be realistic and based on industry standards
3. Cover a range from simple to complex, or small to large scale
4. Make suggestions specific and actionable, not vague
5. For technical questions, suggest proven technologies
6. For scale questions, use concrete numbers (e.g., "100-1,000 users")
7. Always include one "Other (custom)" option as the last suggestion

Respond in valid JSON format with this structure:
{
  "suggestions": [
    "1. [First suggestion with specific details]",
    "2. [Second suggestion with specific details]",
    "3. [Third suggestion with specific details]",
    "4. Other (please specify)"
  ],
  "rationale": "Brief explanation of why these suggestions are relevant"
}
"""

SPEC_TEMPLATE = """# Project Requirements Specification

**Generated**: {timestamp}  
**Based on**: Meeting transcript analysis

---

## Executive Summary

{executive_summary}

---

## Functional Requirements

{functional_requirements}

---

## Non-Functional Requirements

{non_functional_requirements}

---

## Technology Stack

{technology_stack}

---

## Project Scope

{project_scope}

---

## Timeline & Resources

{timeline_resources}

---

## Constraints & Assumptions

{constraints_assumptions}

---

## Appendix: Clarification Questions & Answers

{qa_appendix}
"""


# ── Requirements Specification Chat ───────────────────────────────────────────


class RequirementsSpecChat:
    """Interactive Q&A session to build a complete requirements specification."""

    def __init__(self):
        PipelineConfig.ensure_dirs()
        self.base_url = PipelineConfig.OLLAMA_BASE_URL
        self.model = PipelineConfig.QWEN_MODEL
        self.temperature = 0.4
        self.max_tokens = PipelineConfig.QWEN_MAX_TOKENS
        self.timeout = PipelineConfig.QWEN_TIMEOUT
        
        self.questions: List[Dict] = []
        self.answers: Dict[str, Any] = {}
        self.current_index: int = 0
        self.report_data: Dict = {}
        
        # Warm up the model
        self._warm_up()

    def _warm_up(self):
        """Send a tiny request so Ollama loads the model into memory."""
        try:
            requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False,
                    "options": {"num_predict": 1},
                },
                timeout=30,
            )
        except Exception:
            pass  # Best-effort warm-up

    # ── Question Parsing ──────────────────────────────────────────────────

    def parse_report(self, report_content: str) -> Dict:
        """Parse the markdown report to extract clarification questions and context.
        
        Args:
            report_content: The markdown report text
            
        Returns:
            Dict with parsed report data including questions, requirements, etc.
        """
        # Try to parse as JSON first (if it's the raw pipeline output)
        try:
            data = json.loads(report_content)
            if "clarification_questions" in data:
                # Handle nested structure from pipeline results
                cq = data["clarification_questions"]
                if isinstance(cq, dict) and "questions" in cq:
                    # Flatten the structure: { "clarification_questions": { "questions": [...] } }
                    data["clarification_questions"] = cq["questions"]
                return data
        except (json.JSONDecodeError, TypeError):
            pass
        
        # Parse markdown format
        parsed = {
            "clarification_questions": [],
            "requirements": {},
            "summary": {},
            "consultant_guidance": {}
        }
        
        # Extract clarification questions section
        cq_match = re.search(
            r"## Clarification Questions\s*\n(.*?)(?=\n##|\Z)",
            report_content,
            re.DOTALL
        )
        
        if cq_match:
            cq_section = cq_match.group(1)
            # Parse individual questions (format: **CQ-001**: Question text)
            question_pattern = r"\*\*([A-Z]+-\d+)\*\*:\s*(.+?)(?=\n\*\*[A-Z]+-|\Z)"
            matches = re.finditer(question_pattern, cq_section, re.DOTALL)
            
            for match in matches:
                q_id = match.group(1)
                q_text = match.group(2).strip()
                
                # Try to extract category and priority from context
                category = "general"
                priority = "should_ask"
                
                if any(word in q_text.lower() for word in ["user", "authentication", "login", "feature"]):
                    category = "functional"
                elif any(word in q_text.lower() for word in ["performance", "scale", "concurrent", "response time"]):
                    category = "non_functional"
                elif any(word in q_text.lower() for word in ["technology", "framework", "database", "stack"]):
                    category = "technical"
                elif any(word in q_text.lower() for word in ["budget", "timeline", "deadline", "cost"]):
                    category = "timeline"
                
                parsed["clarification_questions"].append({
                    "id": q_id,
                    "question": q_text,
                    "category": category,
                    "priority": priority,
                    "context": ""
                })
        
        return parsed

    # ── Suggestion Generation ─────────────────────────────────────────────

    def generate_suggestions(self, question: Dict, project_context: str = "") -> List[str]:
        """Generate numbered suggestions for a clarification question.
        
        Args:
            question: Question dict with id, question, category, etc.
            project_context: Brief project context for better suggestions
            
        Returns:
            List of numbered suggestion strings
        """
        user_prompt = f"""Generate suggestions for this clarification question:

**Question ID**: {question.get('id', 'N/A')}
**Category**: {question.get('category', 'general')}
**Question**: {question.get('question', '')}
**Context**: {question.get('context', 'N/A')}

**Project Context**: {project_context or 'General software project'}

Provide 3-5 realistic, specific suggestions that cover different scales or approaches.
"""

        try:
            response = self._chat(user_prompt, SYSTEM_PROMPT)
            
            # Parse JSON response
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
                suggestions = data.get("suggestions", [])
                if suggestions:
                    return suggestions
        except Exception as e:
            print(f"⚠️  Suggestion generation failed: {e}")
        
        # Fallback: generic suggestions based on category
        return self._fallback_suggestions(question)

    def _fallback_suggestions(self, question: Dict) -> List[str]:
        """Generate fallback suggestions when AI generation fails."""
        category = question.get("category", "general")
        
        fallbacks = {
            "functional": [
                "1. Basic functionality with core features only",
                "2. Standard functionality with common features",
                "3. Advanced functionality with extended features",
                "4. Other (please specify)"
            ],
            "non_functional": [
                "1. Small scale (up to 100 concurrent users)",
                "2. Medium scale (100-1,000 concurrent users)",
                "3. Large scale (1,000-10,000 concurrent users)",
                "4. Enterprise scale (10,000+ concurrent users)",
                "5. Other (please specify)"
            ],
            "technical": [
                "1. Modern web stack (React/Vue + Node.js + PostgreSQL)",
                "2. Enterprise Java stack (Spring Boot + MySQL)",
                "3. Python stack (Django/Flask + PostgreSQL)",
                "4. Other (please specify)"
            ],
            "timeline": [
                "1. 1-3 months (MVP/prototype)",
                "2. 3-6 months (full initial release)",
                "3. 6-12 months (comprehensive solution)",
                "4. Other (please specify)"
            ],
            "general": [
                "1. Option A (simple approach)",
                "2. Option B (balanced approach)",
                "3. Option C (comprehensive approach)",
                "4. Other (please specify)"
            ]
        }
        
        return fallbacks.get(category, fallbacks["general"])

    def _chat(self, user_message: str, system_prompt: str = SYSTEM_PROMPT) -> str:
        """Send a message to Qwen and get response."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        try:
            resp = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
        except Exception as e:
            print(f"❌ Qwen error: {e}")
            return ""

    # ── Answer Processing ─────────────────────────────────────────────────

    def process_answer(self, answer: str, suggestions: List[str]) -> str:
        """Process user's answer (number selection or custom text).
        
        Args:
            answer: User's input (number or custom text)
            suggestions: List of suggestions that were presented
            
        Returns:
            The final answer text to record
        """
        answer = answer.strip()
        
        # Check if it's a number selection
        if answer.isdigit():
            idx = int(answer) - 1  # Convert to 0-indexed
            if 0 <= idx < len(suggestions):
                selected = suggestions[idx]
                # Remove the number prefix
                return re.sub(r"^\d+\.\s*", "", selected)
        
        # Otherwise, treat as custom answer
        return answer

    # ── Spec File Generation ──────────────────────────────────────────────

    def generate_spec_file(self, output_file: Optional[str] = None) -> str:
        """Generate the final requirements specification file.
        
        Args:
            output_file: Optional path for output file
            
        Returns:
            Path to the generated file
        """
        # Create specs directory if it doesn't exist
        specs_dir = os.path.join(PipelineConfig.OUTPUTS_DIR, "specs")
        os.makedirs(specs_dir, exist_ok=True)
        
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(specs_dir, f"requirements_spec_{timestamp}.md")
        
        # Build sections
        sections = self._build_spec_sections()
        
        # Fill template
        content = SPEC_TEMPLATE.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            **sections
        )
        
        # Write file
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"✅ Requirements specification saved: {output_file}")
        return output_file

    def _build_spec_sections(self) -> Dict[str, str]:
        """Build all sections of the spec document from answers."""
        sections = {}
        
        # Executive Summary
        sections["executive_summary"] = self._build_executive_summary()
        
        # Functional Requirements
        sections["functional_requirements"] = self._build_functional_requirements()
        
        # Non-Functional Requirements
        sections["non_functional_requirements"] = self._build_nfr_section()
        
        # Technology Stack
        sections["technology_stack"] = self._build_tech_stack_section()
        
        # Project Scope
        sections["project_scope"] = self._build_scope_section()
        
        # Timeline & Resources
        sections["timeline_resources"] = self._build_timeline_section()
        
        # Constraints & Assumptions
        sections["constraints_assumptions"] = self._build_constraints_section()
        
        # Q&A Appendix
        sections["qa_appendix"] = self._build_qa_appendix()
        
        return sections

    def _build_executive_summary(self) -> str:
        """Generate executive summary from answers."""
        # This would ideally use AI to synthesize, but for now use a template
        return (
            "This document specifies the requirements for the software project based on "
            "stakeholder interviews and clarification sessions. All ambiguities from the "
            "initial analysis have been resolved through targeted questions and answers. "
            "The specification covers functional requirements, non-functional requirements, "
            "technology stack decisions, project scope, timeline, and constraints."
        )

    def _build_functional_requirements(self) -> str:
        """Build functional requirements section from answers."""
        lines = []
        
        # Get functional answers
        functional_answers = {
            q_id: ans for q_id, ans in self.answers.items()
            if any(q.get("category") == "functional" for q in self.questions if q.get("id") == q_id)
        }
        
        if not functional_answers:
            return "*No functional requirements clarified.*\n"
        
        for i, (q_id, answer) in enumerate(functional_answers.items(), 1):
            question = next((q for q in self.questions if q.get("id") == q_id), {})
            lines.append(f"### FR-{i:03d}: {question.get('question', 'Requirement')}\n")
            lines.append(f"- **Clarification**: {answer}\n")
            lines.append(f"- **Source**: {q_id}\n")
            lines.append("\n")
        
        return "".join(lines)

    def _build_nfr_section(self) -> str:
        """Build non-functional requirements section."""
        lines = []
        
        nfr_answers = {
            q_id: ans for q_id, ans in self.answers.items()
            if any(q.get("category") == "non_functional" for q in self.questions if q.get("id") == q_id)
        }
        
        if not nfr_answers:
            return "*No non-functional requirements clarified.*\n"
        
        for q_id, answer in nfr_answers.items():
            question = next((q for q in self.questions if q.get("id") == q_id), {})
            lines.append(f"### {question.get('question', 'NFR')}\n")
            lines.append(f"- **Specification**: {answer}\n")
            lines.append(f"- **Source**: {q_id}\n")
            lines.append("\n")
        
        return "".join(lines)

    def _build_tech_stack_section(self) -> str:
        """Build technology stack section."""
        lines = []
        
        tech_answers = {
            q_id: ans for q_id, ans in self.answers.items()
            if any(q.get("category") == "technical" for q in self.questions if q.get("id") == q_id)
        }
        
        if not tech_answers:
            return "*No technology stack decisions recorded.*\n"
        
        for q_id, answer in tech_answers.items():
            question = next((q for q in self.questions if q.get("id") == q_id), {})
            lines.append(f"**{question.get('question', 'Technology')}**\n")
            lines.append(f"- Selected: {answer}\n")
            lines.append("\n")
        
        return "".join(lines)

    def _build_scope_section(self) -> str:
        """Build project scope section."""
        return "*Scope to be defined based on requirements above.*\n"

    def _build_timeline_section(self) -> str:
        """Build timeline and resources section."""
        timeline_answers = {
            q_id: ans for q_id, ans in self.answers.items()
            if any(q.get("category") == "timeline" for q in self.questions if q.get("id") == q_id)
        }
        
        if not timeline_answers:
            return "*Timeline and resource requirements to be determined.*\n"
        
        lines = []
        for q_id, answer in timeline_answers.items():
            question = next((q for q in self.questions if q.get("id") == q_id), {})
            lines.append(f"**{question.get('question', 'Timeline')}**: {answer}\n\n")
        
        return "".join(lines)

    def _build_constraints_section(self) -> str:
        """Build constraints and assumptions section."""
        return "*Constraints and assumptions documented during requirements gathering.*\n"

    def _build_qa_appendix(self) -> str:
        """Build Q&A appendix with all questions and answers."""
        lines = []
        
        for question in self.questions:
            q_id = question.get("id", "N/A")
            q_text = question.get("question", "")
            answer = self.answers.get(q_id, "*Not answered*")
            
            lines.append(f"**{q_id}**: {q_text}  \n")
            lines.append(f"**Answer**: {answer}\n\n")
        
        return "".join(lines)

    # ── Main Loop (CLI) ───────────────────────────────────────────────────

    def start(self, report_content: str):
        """Start the interactive CLI session.
        
        Args:
            report_content: The markdown report or JSON data
        """
        print("\n" + "="*70)
        print("📋 Requirements Specification Builder")
        print("="*70)
        print("\nParsing report and extracting clarification questions...\n")
        
        # Parse report
        self.report_data = self.parse_report(report_content)
        self.questions = self.report_data.get("clarification_questions", [])
        
        if not self.questions:
            print("⚠️  No clarification questions found in report.")
            return
        
        print(f"✅ Found {len(self.questions)} clarification questions\n")
        print("Instructions:")
        print("  - Enter a number to select a suggestion")
        print("  - Or type your own answer")
        print("  - Type 'skip' to skip optional questions")
        print("  - Type 'quit' to exit\n")
        print("="*70 + "\n")
        
        # Process each question
        for i, question in enumerate(self.questions, 1):
            self.current_index = i - 1
            
            print(f"\n📌 Question {i}/{len(self.questions)}")
            print(f"Category: {question.get('category', 'general').upper()}")
            print(f"Priority: {question.get('priority', 'should_ask').replace('_', ' ').upper()}")
            print(f"\n{question.get('question', '')}\n")
            
            if question.get('context'):
                print(f"💡 Context: {question['context']}\n")
            
            # Generate suggestions
            print("Generating suggestions...")
            suggestions = self.generate_suggestions(question)
            
            print("\nSuggestions:")
            for suggestion in suggestions:
                print(f"  {suggestion}")
            
            # Get user input
            while True:
                try:
                    user_input = input("\n📝 Your answer: ").strip()
                except (EOFError, KeyboardInterrupt):
                    print("\n\n👋 Exiting...")
                    return
                
                if user_input.lower() == 'quit':
                    print("\n👋 Exiting...")
                    return
                
                if user_input.lower() == 'skip':
                    print("⏭️  Skipped")
                    break
                
                if user_input:
                    answer = self.process_answer(user_input, suggestions)
                    self.answers[question['id']] = answer
                    print(f"✅ Recorded: {answer}")
                    break
                else:
                    print("⚠️  Please enter an answer or 'skip'")
        
        # Generate spec file
        print("\n" + "="*70)
        print("📄 Generating requirements specification file...")
        spec_file = self.generate_spec_file()
        print(f"\n✅ Complete! Specification saved to:\n   {spec_file}")
        print("="*70 + "\n")


# ── CLI Entry Point ───────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Interactive requirements specification builder"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--file", "-f",
        help="Path to a markdown report file"
    )
    group.add_argument(
        "--text", "-t",
        help="Inline report text"
    )
    args = parser.parse_args()

    if args.file:
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8") as f:
            report_content = f.read()
        print(f"📄 Loaded report: {args.file}")
    else:
        report_content = args.text

    chat = RequirementsSpecChat()
    chat.start(report_content)


if __name__ == "__main__":
    main()
