"""TED Assistant — context-aware AI helper with 4 precise modes + chat mode."""

import json
import logging
import re
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from .pipeline.llm_provider import create_ted_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ted", tags=["ted"])

# ── Conversational phrases → always chat mode, never generate code ─────────────
_CHAT_ONLY_PHRASES = {
    "hi", "hello", "hey", "salut", "bonjour", "bonsoir", "coucou", "yo",
    "ça va", "ca va", "comment tu vas", "quoi de neuf", "what's up",
    "merci", "thanks", "thank you", "ok", "okay", "super", "cool", "nice",
    "parfait", "ouais", "oui", "non", "yes", "no", "alright", "d'accord",
    "sympa", "bien", "génial", "great", "good", "got it", "compris",
}

# ── Mode detection keywords ────────────────────────────────────────────────────
_MODE_KEYWORDS = {
    "explain": [
        "c'est quoi", "explique", "comment", "pourquoi", "qu'est-ce",
        "what is", "what does", "explain", "how does", "why", "describe",
        "tell me", "dis moi", "c quoi", "ça sert", "comprends pas",
        "understand", "meaning", "definition",
    ],
    "fix": [
        "bug", "erreur", "error", "ne marche pas", "doesn't work", "broken",
        "fix", "problème", "problem", "issue", "crash", "fail", "wrong",
        "incorrect", "marche plus", "fonctionne pas", "plante", "répare",
        "corrige", "debug", "s'affiche pas", "affiche pas", "ne s'affiche",
        "disparaît", "invisible", "blank", "vide", "rien", "not working",
        "not showing", "not rendering", "ne charge pas", "charge pas",
        "ne fonctionne", "ne marche", "ne s'ouvre", "ne répond",
        "ne se lance", "cassé", "bloque", "bloqué", "freezes",
    ],
    "improve": [
        "améliore", "optimise", "improve", "better", "refactor", "clean",
        "enhance", "performance", "simplify", "rends", "mieux",
        "upgrade", "modifier", "changer", "ameliore",
        "use", "utilise", "utilisez", "add", "ajoute", "ajoutez",
        "implement", "intègre", "intégrez", "apply", "applique",
        "change", "modify", "update", "set", "make", "turn",
        "color", "colour", "couleur", "background", "style",
        "rename", "resize", "move", "replace", "swap",
    ],
    "generate": [
        "crée", "ajoute", "génère", "create", "add", "generate",
        "nouveau", "new", "make", "build", "write", "implement",
        "écris", "fais", "mets", "rajoute", "compose",
        "extraire", "extract", "séparer", "separate", "déplacer",
        "move", "refactor", "split", "divise", "découpe",
    ],
}

# ── Few-shot examples per mode (show TED the expected behavior) ───────────────
_FEW_SHOT = {
    "chat": """
Examples of good TED responses in CHAT mode:

User: hi ted
TED: Hey! 👋 I'm TED, your UI assistant. Want me to explain code, fix a bug, improve a component, or generate something new?

User: thanks
TED: Happy to help! 😊 Let me know if you need anything else.

User: how are you?
TED: Ready to code! What are we working on today? 🚀
""",

    "explain": """
Examples of good TED responses in EXPLAIN mode:

User: what is useEffect?
TED: `useEffect` is a React hook that runs code after each render.
- Executes after the DOM is updated
- The dependency array `[]` controls when it re-runs
- Empty `[]` = runs once on mount, like `componentDidMount`

User: how does this component work?
TED: This component does 3 things:
- Line 12: fetches data from the API on mount
- Line 28: filters results by `searchQuery`
- Line 45: renders a paginated list
""",

    "fix": """
Examples of good TED responses in FIX mode:

User: my button doesn't respond to clicks
TED: The problem: `onClick` handler is defined after the return, so it's never attached.

```tsx
// Before (broken)
return <button onClick={handleClick}>Click</button>
const handleClick = () => console.log('clicked')

// After (fixed)
const handleClick = () => console.log('clicked')
return <button onClick={handleClick}>Click</button>
```
Always define functions before the `return`.
""",

    "improve": """
Examples of good TED responses in IMPROVE mode:

User: improve my list performance
TED: Your list re-renders unnecessarily on every parent state change. Here's the fix:

```tsx
// Wrap the list component with React.memo
const UserList = React.memo(({ users }: { users: User[] }) => (
  <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
))
```
- `React.memo` skips re-renders when `users` hasn't changed
- ~60% render reduction on long lists
""",

    "generate": """
Examples of good TED responses in GENERATE mode:

User: create a product card component
TED: Here's a `ProductCard` component that fits your existing Tailwind style:

```tsx
interface ProductCardProps {
  name: string
  price: number
  image: string
  onAddToCart: () => void
}

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, image, onAddToCart }) => (
  <div className="rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <img src={image} alt={name} className="w-full h-48 object-cover rounded-lg" />
    <h3 className="mt-3 font-semibold text-gray-900">{name}</h3>
    <div className="mt-2 flex items-center justify-between">
      <span className="text-lg font-bold text-blue-600">{price}€</span>
      <button onClick={onAddToCart} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
        Ajouter
      </button>
    </div>
  </div>
)
```
- Importe dans la page : `import { ProductCard } from './components/ProductCard'`
- Passe les props depuis ton état ou API
""",
}

# ── Mode system prompts ────────────────────────────────────────────────────────
_MODE_SYSTEM = {
    "chat": """You are TED, a friendly and skilled UI assistant. You talk naturally like a helpful developer teammate.
STRICT RULES:
- ALWAYS respond in ENGLISH regardless of the language of the message
- Max 1-3 sentences per response
- For greetings: greet back and ask what they want to do
- For thanks/acknowledgements: respond naturally in 1 sentence
- NEVER generate code in this mode
- NEVER suggest improvements unless explicitly asked
- Stay casual and human""",

    "explain": """You are TED in EXPLAIN mode. You clearly explain what code does.
RULES:
- ALWAYS respond in ENGLISH
- 1 summary sentence, then bullet points if needed (max 5)
- Reference exact function/component names from the actual code
- If showing code: max 10 lines, inside ```tsx or ```python block
- No filler — every word counts""",

    "fix": """You are TED in FIX mode. You identify and fix bugs.
STRICT RULES:
- ALWAYS respond in ENGLISH
- If the message doesn't mention a specific component or file: ask ONE question "Which component or file?" and STOP — don't generate code
- If component/file is known: start with exactly: 📁 **File: `src/App.tsx`** (use actual path)
- 1 sentence: the exact problem
- Fixed code in ```tsx or ```python block
- 1 sentence: what changed
- Show ONLY the changed lines""",

    "improve": """You are TED in IMPROVE mode. You apply improvements and style changes IMMEDIATELY — no questions ever.
RULES:
- ALWAYS respond in ENGLISH
- ALWAYS start with exactly this format: 📁 **File: `src/App.tsx`** (replace with actual file path)
- MAKE THE CHANGE IMMEDIATELY. Do not ask ANY question, ever. Not even "which shade?".
- For color requests: pick the most obvious interpretation and apply it right away
  • "yellow" → bg-yellow-400 text-yellow-400 border-yellow-400
  • "light yellow" → bg-yellow-200
  • "dark yellow" → bg-yellow-600
  • "red" → bg-red-500, "blue" → bg-blue-500, "green" → bg-green-500, "purple" → bg-purple-600
- Find the relevant code in the context, replace the class/color in-place
- Show ONLY the changed lines in a ```tsx block
- 1 sentence after: what changed and where
- If the user gives a follow-up like "light" or "dark" after a previous color request: apply the refined shade IMMEDIATELY""",

    "generate": """You are TED in GENERATE mode. You generate working code.
RULES:
- ALWAYS respond in ENGLISH
- ALWAYS start with exactly this format: 📁 **File: `src/components/ui/StatCard.tsx`** (use actual target path)
- Complete, usable code in a ```tsx or ```python block
- Use the same tech stack detected in the project
- Follow the project's naming conventions
- 2-3 bullet points after the code: how to integrate it
- Code must compile without modification""",
}


def detect_mode(message: str, conversation_history: list = None) -> str:
    """Detect mode from message, using history to handle follow-up messages."""
    msg = message.strip().lower()
    words = msg.split()

    # Check if previous TED response was in a technical mode — short follow-ups should continue it
    if conversation_history and len(words) <= 6:
        for item in reversed(conversation_history[-6:]):
            if item.get("type") == "bot" and item.get("mode") in ("improve", "fix", "generate", "explain"):
                prev_mode = item["mode"]
                # If the current message is a short clarification/color/value → continue previous mode
                has_chat_phrase = any(phrase in msg for phrase in _CHAT_ONLY_PHRASES)
                if not has_chat_phrase:
                    return prev_mode
                break

    # Explicit chat phrases → chat
    for phrase in _CHAT_ONLY_PHRASES:
        if phrase in msg:
            return "chat"

    # Short messages (≤ 4 words) without technical keywords → chat
    if len(words) <= 4:
        has_tech = any(
            kw in msg
            for keywords in _MODE_KEYWORDS.values()
            for kw in keywords
        )
        if not has_tech:
            return "chat"

    # French negation pattern "ne...pas / n'...pas" → likely a problem → fix
    if re.search(r"\bne\b.{1,20}\bpas\b", msg) or re.search(r"\bn'.{1,20}\bpas\b", msg):
        return "fix"

    # Score each technical mode
    scores = {mode: 0 for mode in _MODE_KEYWORDS}
    for mode, keywords in _MODE_KEYWORDS.items():
        for kw in keywords:
            if kw in msg:
                scores[mode] += 1

    best = max(scores, key=lambda m: scores[m])
    return best if scores[best] > 0 else "chat"


def select_relevant_files(all_files: list, current_file: str, message: str, max_files: int = 4) -> list:
    """Select most relevant files based on current file, imports, and message keywords."""
    if not all_files:
        return []

    file_map = {f.get("path", ""): f for f in all_files}
    scored: list[tuple[int, dict]] = []
    msg_lower = message.lower()

    for f in all_files:
        path = f.get("path", "")
        content = f.get("content", "")
        score = 0

        if path == current_file:
            score += 100
        if path in ("src/App.tsx", "App.tsx", "src/main.tsx", "src/index.tsx"):
            score += 20

        filename = path.split("/")[-1].lower()
        for ext in (".tsx", ".ts", ".py", ".js"):
            filename = filename.replace(ext, "")
        if filename and filename in msg_lower:
            score += 30

        for word in [w for w in re.split(r'\W+', msg_lower) if len(w) > 3]:
            if word in content.lower():
                score += 1

        scored.append((score, f))

    # Boost imported files from current file
    current_content = file_map.get(current_file, {}).get("content", "")
    for imp in re.findall(r"from ['\"](.+?)['\"]", current_content):
        imp_name = imp.split("/")[-1]
        for i, (s, sf) in enumerate(scored):
            if imp_name in sf.get("path", ""):
                scored[i] = (s + 15, sf)

    scored.sort(key=lambda x: x[0], reverse=True)
    return [f for _, f in scored[:max_files]]


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
    conversationHistory: list[dict] = []


class TedSuggestion(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    action: str
    steps: list[str] = []
    file: Optional[str] = None
    instruction: Optional[str] = None


class TedChatResponse(BaseModel):
    response: str
    mode: str = "chat"
    suggestions: list[TedSuggestion] = []
    contextUsed: list[str] = []
    actionSteps: list[str] = []


class TedAssistant:
    """TED with 5 modes: chat, explain, fix, improve, generate."""

    def __init__(self):
        self.llm = create_ted_provider()
        self._session: dict[str, dict] = {}

    def _session_get(self, gid: str) -> dict:
        if gid not in self._session:
            self._session[gid] = {"discussed": [], "applied": []}
        return self._session[gid]

    def chat(self, message: str, context: dict, conversation_history: list = None) -> TedChatResponse:
        if conversation_history is None:
            conversation_history = []

        current_file = context.get("currentFile", "")
        all_files = context.get("allFiles", [])
        file_count = context.get("fileCount", 0)
        generation_id = context.get("generationId", "")

        mode = detect_mode(message, conversation_history)

        # For chat mode: no need to load all files → faster response
        if mode == "chat":
            system = _MODE_SYSTEM["chat"] + "\n\n" + _FEW_SHOT["chat"]
            history_str = self._build_history(conversation_history)
            user_prompt = f"{history_str}\nUser: {message}" if history_str else f"User: {message}"
            try:
                response = self.llm.chat(system, user_prompt)
                if not response.strip():
                    response = "Hey! 👋 How can I help you?"
            except Exception as e:
                logger.error("TED chat error: %s", e)
                response = "Hey! 👋 I'm here to help. What are we working on?"
            return TedChatResponse(response=response, mode=mode, suggestions=[], contextUsed=[])

        # Technical modes: load relevant files
        relevant_files = select_relevant_files(all_files, current_file, message)
        code_context = self._build_code_context(relevant_files, current_file)
        tech_stack = self._detect_tech_stack(all_files)
        history_str = self._build_history(conversation_history)

        # Session memory
        session = self._session_get(generation_id) if generation_id else {}
        applied = session.get("applied", [])
        memory_note = f"\nDéjà appliqué : {', '.join(applied[-2:])}" if applied else ""

        system = (
            f"{_MODE_SYSTEM[mode]}\n\n"
            f"{_FEW_SHOT[mode]}\n\n"
            f"STACK : {tech_stack or 'React + TypeScript + Tailwind'}\n"
            f"FICHIER ACTUEL : {current_file or '(aucun)'}{memory_note}\n\n"
            f"CODE DU PROJET :\n{code_context}"
        )
        user_prompt = f"{history_str}\nUser: {message}" if history_str else f"User: {message}"

        try:
            response = self.llm.chat(system, user_prompt)
            if not response.strip():
                response = "I couldn't analyze the code. Can you clarify what you want to do? 🎯"

            # ── Post-process: ensure File: header is present when code block exists ──
            has_code = bool(re.search(r"```", response))
            has_file_header = bool(re.search(r"(?:File|Fichier)\s*:", response, re.IGNORECASE))

            if has_code and not has_file_header and mode in ("fix", "improve", "generate"):
                # Determine the target file path
                target_file = current_file or "src/App.tsx"
                # For generate mode, try to extract a new filename from the message
                if mode == "generate":
                    name_match = re.search(r'\b([A-Z][a-zA-Z]+(?:Card|Modal|Page|Button|Form|List|Item|Panel|Bar|Nav|Header|Footer))\b', message)
                    if name_match:
                        target_file = f"src/components/ui/{name_match.group(1)}.tsx"
                response = f"📁 **File: `{target_file}`**\n\n{response}"

            # Update session memory
            if generation_id and current_file:
                s = self._session_get(generation_id)
                if current_file not in s["discussed"]:
                    s["discussed"].append(current_file)
                if mode not in s["applied"]:
                    s["applied"].append(mode)

            # Extract action steps if code blocks present
            action_steps = [f"Apply the code above to `{current_file}`"] if has_code and current_file else []

            context_info = []
            if file_count:
                context_info.append(f"{file_count} fichiers")
            if relevant_files:
                context_info.append(f"Analyse : {', '.join(f.get('path','') for f in relevant_files[:2])}")

            suggestions = self.get_suggestions(context)

            return TedChatResponse(
                response=response,
                mode=mode,
                suggestions=suggestions,
                contextUsed=context_info,
                actionSteps=action_steps,
            )

        except Exception as e:
            logger.error("TED error: %s", e)
            return TedChatResponse(
                response="Something went wrong. Please try again! 🔧",
                mode=mode,
                suggestions=[],
                contextUsed=[],
            )

    def _build_history(self, history: list, max_msgs: int = 6) -> str:
        if not history:
            return ""
        lines = []
        for msg in history[-max_msgs:]:
            role = "User" if msg.get("type") == "user" else "TED"
            lines.append(f"{role}: {msg.get('text', '')[:150]}")
        return "\n".join(lines)

    def _build_code_context(self, files: list, current_file: str) -> str:
        if not files:
            return "(aucun fichier disponible)"
        parts = []
        for f in files:
            path = f.get("path", "")
            content = f.get("content", "")
            limit = 80 if path == current_file else 40
            lines = content.split("\n")[:limit]
            snippet = "\n".join(lines)
            if len(content.split("\n")) > limit:
                snippet += f"\n... ({len(content.split(chr(10))) - limit} lignes de plus)"
            parts.append(f"=== {path} ===\n{snippet}")
        return "\n\n".join(parts)

    def _detect_tech_stack(self, files: list) -> str:
        paths = [f.get("path", "") for f in files]
        tech = []
        if any(".tsx" in p or ".jsx" in p for p in paths):
            tech.append("React")
        if any(".ts" in p for p in paths):
            tech.append("TypeScript")
        if any("tailwind" in p.lower() for p in paths):
            tech.append("Tailwind CSS")
        if any(".py" in p for p in paths):
            tech.append("Python/FastAPI")
        return ", ".join(tech)

    def get_suggestions(self, context: dict) -> list[TedSuggestion]:
        current_file = context.get("currentFile", "")
        all_files = context.get("allFiles", [])

        if not all_files and not current_file:
            return self._smart_fallback(current_file, all_files)

        tech = self._detect_tech_stack(all_files)
        # Pass actual code so suggestions are specific
        relevant = select_relevant_files(all_files, current_file, "", max_files=3)
        code_context = self._build_code_context(relevant, current_file)

        system = f"""Tu es TED. Analyse ce code et génère 3 suggestions TRÈS SPÉCIFIQUES basées sur ce qui existe dans le code.

RÈGLE ABSOLUE : chaque suggestion doit mentionner un nom réel du code (composant, fonction, variable, hook).
❌ INTERDIT : "Mettre à jour les types", "Améliorer les styles", "Créer un composant" — trop générique
✅ OBLIGATOIRE : "Ajouter aria-label au bouton <Search> dans Navbar", "Mémoïser la fonction filterProjects dans App.tsx"

EXEMPLES de bonnes suggestions :
- "Ajouter useMemo sur filterItems dans App.tsx ligne 145 pour éviter recalcul à chaque render"
- "Ajouter aria-label manquant sur le bouton <Bell> dans Navbar pour l'accessibilité"
- "Extraire le composant <StatCard> répété 4 fois dans Dashboard en composant réutilisable"

STACK : {tech}
FICHIER ACTUEL : {current_file or 'aucun'}

CODE :
{code_context}

Retourne un JSON array de 3 objets :
- id: identifiant court (ex: "memo-filter")
- icon: 1 emoji pertinent
- title: max 40 chars, mentionne le vrai nom du composant/fonction
- description: max 80 chars, cite le fichier et la raison concrète
- action: phrase pour déclencher TED (ex: "Ajoute useMemo sur filterItems dans App.tsx")
- file: chemin exact du fichier (ex: "src/App.tsx")
- instruction: 2 phrases précises pour l'éditeur IA

Retourne UNIQUEMENT le JSON array, rien d'autre."""

        try:
            raw = self.llm.chat(system, "Génère 3 suggestions spécifiques basées sur le code réel.")
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            if match:
                data = json.loads(match.group())
                result = [
                    TedSuggestion(
                        id=s.get("id", f"s{i}"),
                        icon=s.get("icon", "💡"),
                        title=s.get("title", "Suggestion"),
                        description=s.get("description", ""),
                        action=s.get("action", ""),
                        file=s.get("file") or None,
                        instruction=s.get("instruction") or None,
                    )
                    for i, s in enumerate(data[:3])
                    if s.get("title") and len(s.get("title", "")) > 5
                ]
                if len(result) == 3:
                    return result
        except Exception as e:
            logger.warning("TED suggestions error: %s", e)

        return self._smart_fallback(current_file, all_files)

    def _smart_fallback(self, current_file: str, all_files: list) -> list[TedSuggestion]:
        """Context-aware fallback suggestions based on detected tech stack."""
        tech = self._detect_tech_stack(all_files)
        is_react = "React" in tech
        is_python = "Python" in tech

        if is_react:
            return [
                TedSuggestion(
                    id="a11y-aria", icon="♿", title="Add aria-labels",
                    description="Improve accessibility of buttons and inputs",
                    action=f"Add aria-labels to interactive elements{' in ' + current_file if current_file else ''}",
                    file=current_file or None,
                    instruction="Add aria-label to all buttons without visible text and inputs without associated labels.",
                ),
                TedSuggestion(
                    id="perf-memo", icon="⚡", title="Optimize with useMemo",
                    description="Avoid unnecessary recalculations on each render",
                    action=f"Add useMemo to expensive computations{' in ' + current_file if current_file else ''}",
                    file=current_file or None,
                    instruction="Identify variables computed from props or state and wrap them with useMemo.",
                ),
                TedSuggestion(
                    id="error-boundary", icon="🛡️", title="Add Error Boundary",
                    description="Catch React errors without crashing the app",
                    action="Wrap critical components with an Error Boundary",
                    file=current_file or None,
                    instruction="Create an ErrorBoundary component and wrap the main sections of the app.",
                ),
            ]
        if is_python:
            return [
                TedSuggestion(
                    id="type-hints", icon="🔍", title="Add type hints",
                    description="Improve readability and error detection",
                    action="Add Python type hints to functions",
                    file=current_file or None,
                    instruction="Add type annotations to function parameters and return values.",
                ),
                TedSuggestion(
                    id="error-handling", icon="🛡️", title="Improve error handling",
                    description="Add try/except with clear messages",
                    action="Add robust error handling to endpoints",
                    file=current_file or None,
                    instruction="Wrap critical operations in try/except blocks with descriptive error messages.",
                ),
                TedSuggestion(
                    id="logging", icon="📋", title="Add logging",
                    description="Trace important operations for debugging",
                    action="Add structured logs to main functions",
                    file=current_file or None,
                    instruction="Use Python's logging module to trace inputs/outputs of critical functions.",
                ),
            ]
        # Generic fallback
        return [
            TedSuggestion(id="a11y", icon="♿", title="WCAG Accessibility",
                          description="Add aria-labels and keyboard navigation",
                          action="Improve accessibility"),
            TedSuggestion(id="perf", icon="⚡", title="Performance",
                          description="Optimize rendering and computations",
                          action="Optimize performance"),
            TedSuggestion(id="errors", icon="🛡️", title="Error handling",
                          description="Add error and loading states",
                          action="Add robust error handling"),
        ]


ted = TedAssistant()


@router.post("/chat", response_model=TedChatResponse)
async def ted_chat(request: TedChatRequest) -> TedChatResponse:
    return ted.chat(request.message, request.context, request.conversationHistory)


@router.post("/suggestions", response_model=list[TedSuggestion])
async def ted_suggestions(context: dict) -> list[TedSuggestion]:
    return ted.get_suggestions(context)
