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


class TedSuggestion(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    action: str


class TedChatResponse(BaseModel):
    response: str
    suggestions: list[TedSuggestion] = []
    contextUsed: list[str] = []


class TedAssistant:
    """TED - The UI Generation Assistant."""

    def __init__(self):
        self.llm = create_planner_provider()

    def get_suggestions(self, context: dict) -> list[TedSuggestion]:
        """Generate smart suggestions based on current context using LLM."""
        current_file = context.get('currentFile', '')
        file_count = context.get('fileCount', 0)
        action = context.get('action', 'editing')

        context_info = []
        if current_file:
            context_info.append(f"Currently editing: {current_file}")
        if file_count:
            context_info.append(f"Project has {file_count} files")

        context_str = "\n".join(context_info) if context_info else "General project development"

        system_prompt = f"""You are TED, an AI assistant that generates helpful UI development suggestions.
Generate 3 practical suggestions to improve the developer's code.

Context:
{context_str}
Action: {action}

Return suggestions as a JSON array with exactly 3 items. Each item must have:
- id: unique identifier (lowercase, no spaces)
- icon: single emoji
- title: short title (max 40 chars)
- description: brief description (max 60 chars)
- action: the action text to perform (max 80 chars)

Example format:
```json
[
  {{"id": "perf-opt", "icon": "⚡", "title": "Optimize Performance", "description": "Add memoization to expensive components", "action": "Implement React.memo for performance gains"}},
  {{"id": "test", "icon": "✅", "title": "Add Tests", "description": "Increase test coverage for reliability", "action": "Write unit tests for critical functions"}},
  {{"id": "a11y", "icon": "♿", "title": "Improve Accessibility", "description": "Make UI accessible to all users", "action": "Add ARIA labels and keyboard navigation"}}
]
```

Generate suggestions based on the current context. Be specific and actionable."""

        try:
            response_text = self.llm.chat(system_prompt, "Generate 3 helpful suggestions for this project as JSON.")

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
            logger.warning(f"TED suggestions LLM error: {e} — falling back to static suggestions")

        # Fallback to static suggestions if LLM fails
        return self._get_static_suggestions(current_file, action)

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

    def chat(self, message: str, context: dict) -> TedChatResponse:
        """Get a response from TED based on user message and context."""
        current_file = context.get('currentFile', '')
        file_count = context.get('fileCount', 0)

        context_info = []
        if current_file:
            context_info.append(f"Currently editing: {current_file}")
        if file_count:
            context_info.append(f"Project has {file_count} files")

        context_str = "\n".join(context_info) if context_info else "General question"

        system_prompt = f"""You are TED, a friendly AI assistant helping developers build amazing UIs.

Your personality:
- Helpful and encouraging
- Brief responses (2-3 sentences max)
- Use emojis to be engaging
- Give actionable, practical advice

Context:
{context_str}
"""

        user_prompt = f"User asks: {message}\n\nGive a helpful, brief response with one practical tip."

        try:
            response_text = self.llm.chat(system_prompt, user_prompt)
            suggestions = self.get_suggestions(context)

            return TedChatResponse(
                response=response_text,
                suggestions=suggestions,
                contextUsed=context_info,
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
    return ted.chat(request.message, request.context)


@router.post("/suggestions", response_model=list[TedSuggestion])
async def ted_suggestions(context: dict) -> list[TedSuggestion]:
    """Get smart suggestions based on current context."""
    return ted.get_suggestions(context)
