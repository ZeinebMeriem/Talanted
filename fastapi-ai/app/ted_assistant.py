"""TED Assistant - Context-aware AI helper for UI generation."""

import logging
from typing import Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel

from .pipeline.llm_provider import create_planner_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ted", tags=["ted"])


class TedContext(BaseModel):
    generationId: Optional[str] = None
    currentFile: Optional[str] = None
    editedLines: Optional[int] = None
    action: Optional[str] = None
    fileCount: Optional[int] = 0
    userMessage: Optional[str] = None


class TedChatRequest(BaseModel):
    message: str
    context: dict = {}
    conversationHistory: list[dict] = []  # NEW: track conversation


class TedSuggestion(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    action: str
    steps: list[str] = []  # NEW: actionable steps


class TedChatResponse(BaseModel):
    response: str
    suggestions: list[TedSuggestion] = []
    contextUsed: list[str] = []
    actionSteps: list[str] = []  # NEW: steps for the main response


class TedAssistant:
    """TED - The UI Generation Assistant."""

    def __init__(self):
        self.llm = create_planner_provider()

    def get_suggestions(self, context: dict) -> list[TedSuggestion]:
        """Generate smart suggestions based on entire project analysis."""
        current_file = context.get('currentFile', '')
        file_count = context.get('fileCount', 0)
        action = context.get('action', 'editing')
        all_files = context.get('allFiles', [])  # NEW: all project files

        context_info = []
        if file_count:
            context_info.append(f"Project: {file_count} files total")
        if current_file:
            context_info.append(f"Current file: {current_file}")

        context_str = "\n".join(context_info) if context_info else "General project development"

        # Build project overview (analyze all files)
        project_overview = self._build_project_overview(all_files)

        system_prompt = f"""You are TED, an expert UI developer analyzing an entire project for improvement suggestions.
Analyze the project structure and content to suggest 3 specific, actionable improvements.

{context_str}
Action: {action}

PROJECT STRUCTURE:
{project_overview}

Generate 3 targeted suggestions based on the project's actual code and structure. Focus on:
1. Missing best practices across the project
2. Common patterns that could be improved
3. Performance or architectural issues

Respond with a JSON array of exactly 3 suggestions. Each must have:
- id: identifier (lowercase, no spaces)
- icon: single emoji
- title: short title (max 40 chars)
- description: brief specific tip (max 60 chars)
- action: what to do (max 80 chars)

Return ONLY valid JSON array, no extra text."""

        try:
            response_text = self.llm.chat(system_prompt, "Generate 3 specific suggestions for this entire project as JSON.")

            # Parse JSON response
            import json
            import re

            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                suggestions_data = json.loads(json_match.group())
                suggestions = [
                    TedSuggestion(
                        id=s.get('id', f'sugg-{i}'),
                        icon=s.get('icon', '💡'),
                        title=s.get('title', 'Suggestion'),
                        description=s.get('description', ''),
                        action=s.get('action', '')
                    )
                    for i, s in enumerate(suggestions_data[:3])
                ]
                if suggestions:
                    return suggestions
        except Exception as e:
            logger.warning(f"TED suggestions LLM error: {e} — using fallback")

        # Fallback to static suggestions if LLM fails
        return self._get_static_suggestions(current_file, action)

    def _build_project_overview(self, all_files: list) -> str:
        """Build a summary of the project structure and files."""
        if not all_files:
            return "(no files provided)"

        # Group files by extension
        files_by_ext = {}
        for f in all_files:
            path = f.get('path', '')
            ext = path.split('.')[-1] if '.' in path else 'no-ext'
            if ext not in files_by_ext:
                files_by_ext[ext] = []
            files_by_ext[ext].append(path)

        # Build overview
        overview = f"Total: {len(all_files)} files\n\n"
        overview += "Files by type:\n"
        for ext in sorted(files_by_ext.keys()):
            files = files_by_ext[ext]
            overview += f"  .{ext}: {len(files)} file(s) - {', '.join(files[:3])}"
            if len(files) > 3:
                overview += f", +{len(files) - 3} more"
            overview += "\n"

        # Add file size info (rough analysis)
        total_lines = sum(len(f.get('content', '').split('\n')) for f in all_files)
        avg_lines = total_lines // len(all_files) if all_files else 0
        overview += f"\nCode metrics: ~{total_lines} total lines, ~{avg_lines} avg per file"

        # Analyze tech stack
        tech_stack = self._detect_tech_stack(all_files)
        if tech_stack:
            overview += f"\n\nDetected tech: {tech_stack}"

        return overview

    def _detect_tech_stack(self, all_files: list) -> str:
        """Detect the tech stack from file extensions and content."""
        paths = [f.get('path', '') for f in all_files]
        tech = []

        if any('.tsx' in p or '.jsx' in p for p in paths):
            tech.append('React')
        if any('.ts' in p for p in paths):
            tech.append('TypeScript')
        if any('.css' in p or '.scss' in p for p in paths):
            tech.append('Styling')
        if any('tailwind' in p.lower() or 'tailwind.config' in p for p in paths):
            tech.append('Tailwind CSS')
        if any('package.json' in p for p in paths):
            tech.append('Node.js')
        if any('.html' in p for p in paths):
            tech.append('HTML5')

        return ', '.join(tech) if tech else ""

    def _extract_action_steps(self, text: str) -> list[str]:
        """Extract numbered steps from response text."""
        import re

        # Match "STEP N: text" or numbered lists "1. text" or "N) text"
        step_patterns = [
            r'STEP\s+\d+:\s*(.+?)(?=STEP\s+\d+:|$)',
            r'\d+\.\s+(.+?)(?=\d+\.|$)',
            r'\d+\)\s+(.+?)(?=\d+\)|$)',
        ]

        steps = []
        for pattern in step_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            if matches:
                for match in matches:
                    step_text = match.strip()
                    if step_text and len(step_text) > 3:
                        steps.append(step_text[:100])  # Limit to 100 chars
                if steps:
                    break

        return steps[:3]  # Return max 3 steps

    def _clean_response_text(self, text: str) -> str:
        """Clean response, keeping actual content and removing only step prefixes."""
        import re

        if not text or not text.strip():
            return ""

        lines = text.split('\n')
        cleaned_lines = []

        for line in lines:
            # Remove STEP N: prefix only, keep the content
            line = re.sub(r'^STEP\s+\d+:\s*', '', line.strip(), flags=re.IGNORECASE)
            # Remove numbered list prefix only, keep content
            line = re.sub(r'^\d+\.\s+', '', line.strip())
            line = re.sub(r'^\d+\)\s+', '', line.strip())

            if line:  # Only add non-empty lines
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines).strip()

    def _get_static_suggestions(self, current_file: str, action: str) -> list[TedSuggestion]:
        """Fallback static suggestions based on file context."""
        suggestions = []

        # Suggestion 1: Add validation
        if 'form' in current_file.lower() or 'input' in current_file.lower():
            suggestions.append(TedSuggestion(
                id='form-validation',
                title='Add Form Validation',
                description='Validate user input before submission',
                icon='✅',
                action='Add React form validation with error messages for better UX',
            ))

        # Suggestion 2: Add error handling
        if action == 'editing':
            suggestions.append(TedSuggestion(
                id='error-handling',
                title='Add Error Boundaries',
                description='Catch and handle React errors gracefully',
                icon='🛡️',
                action='Create an Error Boundary component to handle runtime errors',
            ))

        # Suggestion 3: Improve accessibility
        suggestions.append(TedSuggestion(
            id='a11y',
            title='Improve Accessibility',
            description='Add ARIA labels and semantic HTML',
            icon='♿',
            action='Add aria-labels and keyboard navigation support',
        ))

        return suggestions[:3]

    def chat(self, message: str, context: dict, conversation_history: list = None) -> TedChatResponse:
        """Get a response from TED based on user message and entire project context."""
        if conversation_history is None:
            conversation_history = []

        current_file = context.get('currentFile', '')
        file_count = context.get('fileCount', 0)
        all_files = context.get('allFiles', [])

        context_info = []
        if file_count:
            context_info.append(f"Project: {file_count} files")
        if current_file:
            context_info.append(f"Current file: {current_file}")

        context_str = "\n".join(context_info) if context_info else "General question"

        # Build project overview for chat awareness
        project_overview = self._build_project_overview(all_files)
        tech_stack = self._detect_tech_stack(all_files)

        # Build conversation history context (last 5 messages)
        history_context = ""
        if conversation_history:
            recent_history = conversation_history[-10:]  # Last 5 exchanges (user + bot)
            history_lines = []
            for msg in recent_history:
                role = "User" if msg.get('type') == 'user' else "TED"
                text = msg.get('text', '')[:100]  # Truncate long messages
                history_lines.append(f"{role}: {text}")
            history_context = "\n".join(history_lines)

        system_prompt = f"""You are TED, a friendly AI assistant helping developers build amazing UIs.

Your personality:
- Helpful and encouraging
- Brief responses (2-3 sentences max)
- Use emojis to be engaging
- Give actionable, practical advice
- Reference the actual project structure when relevant

ABOUT THIS PROJECT:
{project_overview}

Tech Stack: {tech_stack if tech_stack else "Not detected yet"}

User Query Context:
{context_str}

CONVERSATION CONTEXT (remember what we discussed):
{history_context if history_context else "(First message in this session)"}

When answering:
1. Reference SPECIFIC files or patterns you see
2. Remember what was discussed before
3. Build on previous advice if relevant
"""

        user_prompt = f"User asks: {message}\n\nProvide a helpful, brief response specific to their project and our previous discussion.\n\nIf your answer includes steps, format them as:\nSTEP 1: [action]\nSTEP 2: [action]\nSTEP 3: [action]"

        try:
            response_text = self.llm.chat(system_prompt, user_prompt)

            # Extract action steps if present in response
            action_steps = self._extract_action_steps(response_text)

            # Clean response text (remove step formatting for display)
            clean_response = self._clean_response_text(response_text)

            # Fallback if response is empty
            if not clean_response or clean_response.strip() == "":
                clean_response = "Great question! Based on your project structure, I'd recommend focusing on component organization and accessibility. What specific aspect would you like help with? 🎯"

            suggestions = self.get_suggestions(context)

            return TedChatResponse(
                response=clean_response,
                suggestions=suggestions,
                contextUsed=context_info,
                actionSteps=action_steps,
            )
        except Exception as e:
            logger.error(f"TED chat error: {e}")
            return TedChatResponse(
                response="I'm here to help! What would you like to know about your project? 🚀",
                suggestions=self.get_suggestions(context),
                contextUsed=[],
            )


# Global TED instance
ted = TedAssistant()


@router.post("/chat", response_model=TedChatResponse)
async def ted_chat(request: TedChatRequest) -> TedChatResponse:
    """Chat with TED - get responses and suggestions."""
    return ted.chat(request.message, request.context, request.conversationHistory)


@router.post("/suggestions", response_model=list[TedSuggestion])
async def ted_suggestions(context: dict) -> list[TedSuggestion]:
    """Get smart suggestions based on current context."""
    return ted.get_suggestions(context)
