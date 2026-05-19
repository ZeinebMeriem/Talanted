"""Qwen LLM client — talks to Ollama's OpenAI-compatible endpoint.

Optimised for speed:
  • Streaming disabled by default (faster for structured output)
  • Low temperature for deterministic, parseable output
  • Prompt caching via keep_alive
"""
from __future__ import annotations

import json
import re
import time
from typing import Optional, Dict, List

import requests

from pipeline.pipeline_config import PipelineConfig


class QwenLLM:
    """Lightweight Qwen client via Ollama REST API."""

    def __init__(self):
        self.base_url = PipelineConfig.OLLAMA_BASE_URL
        self.model = PipelineConfig.QWEN_MODEL
        self.temperature = PipelineConfig.QWEN_TEMPERATURE
        self.max_tokens = PipelineConfig.QWEN_MAX_TOKENS
        self.timeout = PipelineConfig.QWEN_TIMEOUT
        # Store conversation context for enhanced analysis
        self.conversation_context = None
        # Pre-warm the model so first real call is fast
        self._warm_up()

    def _warm_up(self):
        """Send a tiny request so Ollama loads the model into memory."""
        try:
            requests.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": "hi", "options": {"num_predict": 1}},
                timeout=60,
            )
            print(f"🤖 Qwen model '{self.model}' warmed up")
        except Exception as e:
            print(f"⚠️  Qwen warm-up skipped: {e}")

    # ── Conversation Context Analysis ────────────────────────────────

    def analyze_conversation_context(self, transcript_text: str) -> Dict:
        """Analyze the conversation to identify speakers and extract project context.
        
        This is the FIRST step that should be run before any other analysis.
        It identifies:
        - Who is the CLIENT (describing needs, business, requirements)
        - Who is the CONSULTANT (asking questions, probing for details)
        - Project context (industry, scope, goals)
        - Key entities (business domain, users, systems, features)
        - Client's pain points and priorities
        
        The results are stored in self.conversation_context and used to enhance
        all subsequent analysis tasks.
        
        Args:
            transcript_text: Raw conversation transcript (without speaker labels)
            
        Returns:
            Dict with conversation analysis including speakers, context, entities, etc.
        """
        system_prompt = """You are an expert AI assistant specialized in software requirements engineering.

You are given a RAW TRANSCRIPT of a conversation between a client and a consultant. 
The transcript comes from an audio transcription and does NOT label who is speaking.

YOUR FIRST JOB is always to understand the context and figure out:
- Who is the CLIENT (the person describing their needs, their business, what they want built)
- Who is the CONSULTANT (the person asking questions, probing for details, offering guidance)

You can identify them by:
- The client talks about "I want", "I need", "my business", "my customers", "we currently do"
- The consultant asks questions like "What about...?", "Do you need...?", "Any preferences...?"

You understand English, French, and Arabic.
Always provide structured output in valid JSON format."""

        user_prompt = f"""Analyze the following raw conversation transcript.

YOUR TASKS - Respond in valid JSON with these keys:

1. "speaker_identification": {{
     "client_indicators": ["quote showing client speech", ...],
     "consultant_indicators": ["quote showing consultant speech", ...],
     "confidence": "high|medium|low"
   }}

2. "project_context": {{
     "industry": "string",
     "project_type": "string (e.g., web app, mobile app, system integration)",
     "scope_summary": "string (brief overview)",
     "main_goals": ["goal 1", "goal 2", ...]
   }}

3. "key_entities": {{
     "business_domain": "string",
     "target_users": ["user type 1", "user type 2", ...],
     "current_systems": ["system 1", "system 2", ...],
     "desired_features": ["feature 1", "feature 2", ...],
     "constraints": {{
       "budget": "string or null",
       "timeline": "string or null",
       "technology": ["tech constraint 1", ...] or null
     }},
     "business_rules": ["rule 1", "rule 2", ...]
   }}

4. "client_pain_points": [
     {{"pain_point": "description", "severity": "high|medium|low"}},
     ...
   ]

5. "client_priorities": [
     {{"priority": "what's important", "evidence": "quote from transcript"}},
     ...
   ]

6. "conversation_tone": {{
     "client_clarity": "clear|somewhat_clear|unclear",
     "client_certainty": "confident|mixed|uncertain",
     "overall_quality": "excellent|good|fair|poor"
   }}

## RAW TRANSCRIPT (no speaker labels):
{transcript_text}

Provide a clear, structured JSON analysis."""

        print("🔍 Step 0: Analyzing conversation context (identifying speakers & extracting project context)...")
        
        try:
            result = self.generate_json(
                prompt=user_prompt,
                system=system_prompt,
                temperature=0.3  # Slightly higher for better interpretation
            )
            
            # Store the context for use in subsequent analyses
            self.conversation_context = result
            
            print("✅ Conversation context analyzed successfully!")
            print(f"   📊 Project: {result.get('project_context', {}).get('project_type', 'Unknown')}")
            print(f"   🎯 Industry: {result.get('project_context', {}).get('industry', 'Unknown')}")
            print(f"   💡 Features identified: {len(result.get('key_entities', {}).get('desired_features', []))}")
            print(f"   ⚠️  Pain points: {len(result.get('client_pain_points', []))}")
            
            return result
            
        except Exception as e:
            print(f"⚠️  Conversation context analysis failed: {e}")
            print("   Continuing without context analysis...")
            self.conversation_context = None
            return {}

    # ── Core call ─────────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        """Send a prompt and return the full response text."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature or self.temperature,
                "num_predict": max_tokens or self.max_tokens,
            },
        }
        if json_mode:
            payload["format"] = "json"

        t0 = time.time()
        resp = requests.post(
            f"{self.base_url}/api/chat",
            json=payload,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        elapsed = time.time() - t0

        content = data.get("message", {}).get("content", "")
        tokens_eval = data.get("eval_count", 0)
        print(f"   ⚡ Qwen responded in {elapsed:.1f}s ({tokens_eval} tokens)")
        return content

    def generate_json(
        self,
        prompt: str,
        system: str = "",
        temperature: Optional[float] = None,
    ) -> Dict:
        """Generate and parse a JSON response."""
        raw = self.generate(
            prompt, system=system, temperature=temperature, json_mode=True
        )
        # Try to extract JSON even if wrapped in markdown
        json_match = re.search(r"\{[\s\S]*\}", raw)
        json_str = json_match.group() if json_match else raw

        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # LLMs often produce unescaped newlines inside string values
            # (especially in mermaid_code). Fix them before retrying.
            fixed = self._fix_json_string(json_str)
            try:
                return json.loads(fixed)
            except json.JSONDecodeError as e:
                print(f"   ⚠️  JSON repair failed: {e}")
                print(f"   Raw (first 500 chars): {json_str[:500]}")
                raise

    @staticmethod
    def _fix_json_string(raw: str) -> str:
        """Fix common LLM JSON issues: unescaped newlines/tabs inside string values."""
        # Strategy: walk character by character, track whether we're inside a
        # JSON string value, and escape raw newlines/tabs that appear there.
        result = []
        in_string = False
        i = 0
        while i < len(raw):
            ch = raw[i]
            if ch == '\\' and in_string:
                # escaped character — keep as-is (consume next char too)
                result.append(ch)
                if i + 1 < len(raw):
                    i += 1
                    result.append(raw[i])
                i += 1
                continue
            if ch == '"':
                in_string = not in_string
                result.append(ch)
                i += 1
                continue
            if in_string:
                if ch == '\n':
                    result.append('\\n')
                elif ch == '\r':
                    result.append('\\r')
                elif ch == '\t':
                    result.append('\\t')
                else:
                    result.append(ch)
            else:
                result.append(ch)
            i += 1
        return ''.join(result)

    # ── High-level task prompts ───────────────────────────────────────

    def analyse_transcript(
        self,
        transcript_text: str,
        context_chunks: List[str],
        task: str = "requirements",
    ) -> Dict:
        """Analyse a transcript with RAG context and return structured output.

        *task* can be:
          - ``requirements``: extract functional/non-functional requirements
          - ``summary``: meeting summary with action items
          - ``diagram``: generate Mermaid diagram spec
          - ``ambiguity_detection``: detect vague/incomplete/contradictory statements
          - ``clarification_questions``: generate targeted follow-up questions
          - ``consultant_guidance``: provide actionable guidance for consultants
          - ``system_architecture``: generate full system architecture with text-based diagrams
        """
        context_block = "\n---\n".join(context_chunks) if context_chunks else "No prior context."

        system_prompts = {
            "requirements": (
                "You are a senior business analyst. You extract structured requirements "
                "from meeting transcripts. Always respond in valid JSON with these keys:\n"
                '  "title": string,\n'
                '  "summary": string (2-3 sentences),\n'
                '  "functional_requirements": [ {"id": "FR-001", "description": "...", "priority": "high|medium|low"} ],\n'
                '  "non_functional_requirements": [ {"id": "NFR-001", "description": "...", "category": "..."} ],\n'
                '  "action_items": [ {"owner": "...", "task": "...", "deadline": "..."} ],\n'
                '  "open_questions": [ "..." ]\n'
                "Be concise. Include every requirement mentioned."
            ),
            "ambiguity_detection": (
                "You are an expert requirements analyst specializing in ambiguity detection. "
                "Carefully analyse the conversation transcript and identify ALL vague, ambiguous, "
                "incomplete, or contradictory statements. Respond in valid JSON with these keys:\n"
                '  "title": string,\n'
                '  "total_ambiguities_found": integer,\n'
                '  "severity_summary": {"critical": int, "major": int, "minor": int},\n'
                '  "ambiguities": [\n'
                '    {\n'
                '      "id": "AMB-001",\n'
                '      "type": "vague_term|missing_detail|contradictory|incomplete_requirement|undefined_scope|unmeasurable_criterion",\n'
                '      "severity": "critical|major|minor",\n'
                '      "original_statement": "exact quote from transcript",\n'
                '      "issue_description": "why this is ambiguous",\n'
                '      "impact": "what could go wrong if not clarified",\n'
                '      "recommendation": "how to resolve it"\n'
                '    }\n'
                '  ],\n'
                '  "warnings": [\n'
                '    {\n'
                '      "id": "WARN-001",\n'
                '      "category": "scope_creep|missing_stakeholder|technical_risk|budget_risk|timeline_risk|integration_risk",\n'
                '      "description": "description of the warning",\n'
                '      "severity": "high|medium|low",\n'
                '      "affected_requirements": ["FR-001"]\n'
                '    }\n'
                '  ],\n'
                '  "completeness_score": float (0.0-1.0 how complete the requirements are),\n'
                '  "overall_assessment": string (2-3 sentence summary of requirements quality)\n'
                "Be thorough. Flag every vague term like 'fast', 'secure', 'user-friendly', "
                "'scalable', 'easy', 'good performance', etc. Also flag missing information "
                "such as user counts, data volumes, deployment environment, budget, timeline."
            ),
            "clarification_questions": (
                "You are a senior IT consultant preparing for a follow-up meeting with a client. "
                "Based on the conversation transcript, generate targeted clarification questions "
                "that will help resolve ambiguities, fill gaps, and ensure complete requirements. "
                "Respond in valid JSON with these keys:\n"
                '  "title": string,\n'
                '  "total_questions": integer,\n'
                '  "questions": [\n'
                '    {\n'
                '      "id": "CQ-001",\n'
                '      "category": "functional|non_functional|scope|technical|business_rule|integration|data|security|performance|timeline",\n'
                '      "priority": "must_ask|should_ask|nice_to_ask",\n'
                '      "question": "the clarification question to ask the client",\n'
                '      "context": "why this question is important",\n'
                '      "related_ambiguity": "AMB-XXX or null",\n'
                '      "expected_answer_type": "yes_no|numeric|list|description|choice"\n'
                '    }\n'
                '  ],\n'
                '  "question_categories_summary": {"functional": int, "non_functional": int, ...},\n'
                '  "recommended_meeting_agenda": ["topic 1", "topic 2"]\n'
                "Generate at least 8-15 questions. Prioritize must_ask questions. "
                "Group related questions logically. Include questions about missing "
                "budget, timeline, user volumes, deployment, and technical constraints."
            ),
            "consultant_guidance": (
                "You are a senior consulting advisor helping a junior consultant understand "
                "what was discussed. Analyse the conversation to provide actionable guidance. "
                "Respond in valid JSON with these keys:\n"
                '  "title": string,\n'
                '  "client_intent_summary": string (what the client actually wants),\n'
                '  "key_insights": [{"insight": "...", "importance": "high|medium|low"}],\n'
                '  "inconsistencies": [{"description": "...", "statements": ["...", "..."]}],\n'
                '  "hidden_requirements": ["requirements implied but not explicitly stated"],\n'
                '  "risk_areas": [{"area": "...", "risk_level": "high|medium|low", "mitigation": "..."}],\n'
                '  "recommended_next_steps": ["step 1", "step 2"],\n'
                '  "stakeholder_analysis": [{"role": "...", "concerns": ["..."], "influence": "high|medium|low"}],\n'
                '  "technology_stack_recommendation": {\n'
                '    "frontend": [{"technology": "...", "rationale": "why this fits the project", "confidence": "high|medium|low", "alternatives": ["...", "..."]}],\n'
                '    "backend": [{"technology": "...", "rationale": "...", "confidence": "high|medium|low", "alternatives": ["...", "..."]}],\n'
                '    "database": [{"technology": "...", "rationale": "...", "confidence": "high|medium|low", "alternatives": ["...", "..."]}],\n'
                '    "infrastructure": [{"technology": "...", "rationale": "...", "confidence": "high|medium|low", "alternatives": ["...", "..."]}],\n'
                '    "third_party_services": [{"service": "...", "purpose": "what it does", "rationale": "...", "confidence": "high|medium|low", "alternatives": ["...", "..."]}],\n'
                '    "development_tools": [{"tool": "...", "purpose": "...", "rationale": "..."}],\n'
                '    "estimated_complexity": "low|medium|high|very_high",\n'
                '    "estimated_timeline": "X-Y months based on team size and scope",\n'
                '    "team_composition_suggestion": {"frontend_developers": 0, "backend_developers": 0, "ui_ux_designer": 0, "project_manager": 0, "qa_engineer": 0}\n'
                '  }\n'
                "Be practical and actionable. Focus on what could go wrong.\n"
                "For technology recommendations:\n"
                "- Base suggestions on project type, scale, budget, and timeline from the conversation\n"
                "- Consider technical constraints mentioned (platforms, integrations, etc.)\n"
                "- Recommend proven, industry-standard technologies unless client requests cutting-edge\n"
                "- Provide rationale that references specific requirements from the conversation\n"
                "- Include realistic alternatives for flexibility\n"
                "- Estimate complexity and timeline based on the scope discussed\n"
                "- Suggest appropriate team composition for the project scale"
            ),
            "summary": (
                "You are a meeting assistant. Produce a structured JSON summary:\n"
                '  "title": string,\n'
                '  "date": string,\n'
                '  "participants": [string],\n'
                '  "summary": string,\n'
                '  "key_decisions": [string],\n'
                '  "action_items": [ {"owner": "...", "task": "...", "deadline": "..."} ],\n'
                '  "topics_discussed": [string]\n'
                "Be factual. Only include what's explicitly mentioned."
            ),
            "system_architecture": (
                "You are a senior solutions architect. Analyse the conversation transcript and produce a "
                "COMPLETE system architecture conception document with TEXT-BASED diagrams using ASCII art.\n\n"
                "Respond in valid JSON with these keys:\n"
                '  "title": string,\n'
                '  "architecture_overview": string (2-4 paragraph executive overview of the proposed architecture),\n'
                '  "architecture_style": string (e.g. "Monolithic", "Microservices", "Event-Driven", "Serverless", "Layered"),\n'
                '  "system_layers": [\n'
                '    {\n'
                '      "name": string (e.g. "Presentation Layer", "Business Logic Layer", "Data Layer"),\n'
                '      "description": string,\n'
                '      "components": ["component1", "component2"],\n'
                '      "technologies": ["tech1", "tech2"]\n'
                '    }\n'
                '  ],\n'
                '  "ascii_system_diagram": string (MULTI-LINE ASCII art showing the full system architecture with boxes, arrows, and labels using characters like +---+, |, -->, <--, ===, etc.),\n'
                '  "ascii_data_flow_diagram": string (MULTI-LINE ASCII art showing data flow between components using ---> and labels),\n'
                '  "ascii_deployment_diagram": string (MULTI-LINE ASCII art showing deployment topology: servers, containers, cloud services),\n'
                '  "api_endpoints": [\n'
                '    {\n'
                '      "method": "GET|POST|PUT|DELETE",\n'
                '      "path": "/api/v1/...",\n'
                '      "description": string,\n'
                '      "request_body": string or null,\n'
                '      "response": string\n'
                '    }\n'
                '  ],\n'
                '  "database_schema": [\n'
                '    {\n'
                '      "entity": string,\n'
                '      "fields": [{"name": string, "type": string, "constraints": string}],\n'
                '      "relationships": ["Entity1 --< Entity2 (one-to-many)"]\n'
                '    }\n'
                '  ],\n'
                '  "ascii_er_diagram": string (MULTI-LINE ASCII art showing entity relationships using +---+, |, ---<, >--- etc.),\n'
                '  "security_architecture": {\n'
                '    "authentication": string,\n'
                '    "authorization": string,\n'
                '    "data_protection": string,\n'
                '    "api_security": string\n'
                '  },\n'
                '  "integration_points": [\n'
                '    {\n'
                '      "system": string,\n'
                '      "protocol": string,\n'
                '      "direction": "inbound|outbound|bidirectional",\n'
                '      "description": string\n'
                '    }\n'
                '  ],\n'
                '  "scalability_strategy": string,\n'
                '  "monitoring_strategy": string,\n'
                '  "ascii_infrastructure_diagram": string (MULTI-LINE ASCII art showing infrastructure: load balancers, app servers, DB clusters, caches, CDN etc.)\n'
                "\n"
                "CRITICAL RULES for ASCII diagrams:\n"
                "1. Use box-drawing characters: +, -, |, =\n"
                "2. Use arrows: -->, <--, <-->, ==>, ---|, --->\n"
                "3. Label all connections\n"
                "4. Make diagrams at least 10 lines tall and well-structured\n"
                "5. Show ALL components mentioned in the conversation\n"
                "6. Each ASCII diagram must be self-contained and readable\n"
                "7. Use consistent spacing and alignment\n\n"
                "Example ASCII system diagram:\n"
                "+-------------------+     +-------------------+\n"
                "|   Web Browser     |     |   Mobile App      |\n"
                "+--------+----------+     +--------+----------+\n"
                "         |                         |\n"
                "         +----------+--------------+\n"
                "                    |\n"
                "         +----------v----------+\n"
                "         |   API Gateway       |\n"
                "         |   (Nginx/Kong)      |\n"
                "         +----------+----------+\n"
                "                    |\n"
                "    +---------------+---------------+\n"
                "    |               |               |\n"
                "+---v---+   +------v------+   +---v---+\n"
                "| Auth  |   | App Server  |   | Cache |\n"
                "+-------+   +------+------+   +-------+\n"
                "                    |\n"
                "         +----------v----------+\n"
                "         |   Database          |\n"
                "         +---------------------+\n\n"
                "Be thorough. Base EVERYTHING on what was discussed in the transcript."
            ),
            "diagram": (
                "You are a diagram generator. Create a sequenceDiagram from the transcript.\n\n"
                "STRICT RULES - FOLLOW EXACTLY:\n"
                "1. EXACTLY 3 participants: the two speakers from the transcript + one system.\n"
                "2. Speaker names must be the REAL names from the transcript.\n"
                "3. The system name must describe the product discussed (e.g. BookingApp, ReservationSystem).\n"
                "4. Technologies like React, MongoDB, NestJS, AI are NEVER participants.\n"
                "5. Use ->> for requests, -->> for responses. Always pair them.\n"
                "6. CRITICAL: Arrow labels must be EXACTLY 2-3 words. Never a sentence. Never more than 4 words.\n"
                "   GOOD labels: 'Authentication Request', 'Payment Response', 'Booking Confirmation'\n"
                "   BAD labels: 'What are your needs exactly?', 'A web or mobile application for flight booking'\n"
                "7. No special characters in labels. No question marks, periods, commas.\n"
                "8. No activate, deactivate, Note, alt, opt, or loop blocks.\n"
                "9. Include 3-5 request-response pairs. Each feature = one pair.\n"
                "10. Only diagram features EXPLICITLY mentioned in the transcript.\n\n"
                "EXACT FORMAT TO COPY (use real names from transcript instead of Alice and Bob):\n"
                "sequenceDiagram\n"
                "    participant Alice\n"
                "    participant Bob\n"
                "    participant BookingSystem\n"
                "    Alice->>Bob: Feature Discussion Request\n"
                "    Bob-->>Alice: Feature Discussion Response\n"
                "    Bob->>BookingSystem: Account Setup Request\n"
                "    BookingSystem-->>Bob: Account Setup Response\n\n"
                "JSON response keys:\n"
                '  "diagram_type": "sequenceDiagram",\n'
                '  "title": string,\n'
                '  "description": string,\n'
                '  "mermaid_code": string (NO markdown fences, NO backticks),\n'
                '  "components_extracted": [list of participant names as strings]\n'
            ),
        }

        system = system_prompts.get(task, system_prompts["requirements"])

        # Build the prompt with conversation context if available
        prompt_parts = []
        
        # Add conversation context if we have it
        if self.conversation_context:
            context_summary = (
                f"## Conversation Context (Pre-Analysis)\n"
                f"**Project Type**: {self.conversation_context.get('project_context', {}).get('project_type', 'Unknown')}\n"
                f"**Industry**: {self.conversation_context.get('project_context', {}).get('industry', 'Unknown')}\n"
                f"**Scope**: {self.conversation_context.get('project_context', {}).get('scope_summary', 'N/A')}\n"
                f"**Main Goals**: {', '.join(self.conversation_context.get('project_context', {}).get('main_goals', []))}\n"
                f"**Target Users**: {', '.join(self.conversation_context.get('key_entities', {}).get('target_users', []))}\n"
                f"**Desired Features**: {', '.join(self.conversation_context.get('key_entities', {}).get('desired_features', []))}\n"
                f"**Client Pain Points**: {len(self.conversation_context.get('client_pain_points', []))} identified\n"
                f"**Client Priorities**: {len(self.conversation_context.get('client_priorities', []))} identified\n"
                f"**Speaker Confidence**: {self.conversation_context.get('speaker_identification', {}).get('confidence', 'unknown')}\n"
            )
            prompt_parts.append(context_summary)
        
        # Add RAG context
        prompt_parts.append(f"## Prior context (related transcripts)\n{context_block}")
        
        # Add current transcript
        prompt_parts.append(f"## Current transcript to analyse\n{transcript_text}")
        
        # Add instruction
        if self.conversation_context:
            prompt_parts.append(
                "\nUSE the conversation context above to inform your analysis. "
                "You already know the project type, industry, speakers, and key entities. "
                "Focus on extracting detailed requirements based on this understanding.\n"
                "\nAnalyse the above and respond with the required JSON."
            )
        else:
            prompt_parts.append("\nAnalyse the above and respond with the required JSON.")
        
        prompt = "\n\n".join(prompt_parts)

        return self.generate_json(prompt, system=system, temperature=0.2)

    def generate_mermaid(self, description: str) -> str:
        """Ask Qwen to produce raw Mermaid diagram code."""
        system = (
            "You generate ONLY valid Mermaid diagram code. "
            "No explanations, no markdown fences, no extra text. "
            "Just the diagram code starting with the diagram type keyword."
        )
        raw = self.generate(description, system=system, temperature=0.1)
        # Strip markdown fences if model wraps them anyway
        raw = re.sub(r"^```(?:mermaid)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())
        return raw.strip()
