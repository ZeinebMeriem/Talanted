# FAQ - Agents & Orchestration

## Questions Fondamentales

### Q1: Qu'est-ce qu'un agent exactement ?
**R**: Un agent est une classe Python qui reçoit un `SourcePack`, effectue une transformation (extraction, LLM call, traitement) et retourne un `SourcePack` modifié. C'est un élément d'une chaîne de traitement.

**Code type** :
```python
class MonAgent:
    def run(self, pack: SourcePack) -> SourcePack:
        # Transformer pack
        return pack
```

---

### Q2: A quoi sert le SourcePack ?
**R**: C'est un **conteneur de données** qui transite entre les agents. Il contient une liste d'items (`SourceItem`) de différents types :
- `"prompt"` → texte de l'utilisateur
- `"file_text"` → texte extrait d'un document
- `"file_ref"` → référence à un fichier MinIO
- `"context"` → contexte consolidé ou RAG output

Chaque agent peut :
- Lire les items
- Ajouter de nouveaux items
- Modifier/surcharger les items existants

---

### Q3: Combien d'agents on a et dans quel ordre ?
**R**: **12 agents au total**, en 4 phases :

#### Phase 1 : EXTRACTION (5 agents)
1. **OCR Agent** - Images → texte (LLM Vision)
2. **DocExtract Agent** - PDFs/DOCX → texte (parsing local)
3. **Diagram Agent** - Mermaid/Excalidraw → prose (parsing local)
4. **RAG Agent** - Textes → chunks pertinents (Embedding LLM)
5. **TextPrep Agent** - Consolide tout (traitement local)

#### Phase 2 : PLANIFICATION (3 agents)
6. **EntityExtractor** - Extrait entities (LLM Chat)
7. **Planner Agent** - Crée le plan de fichiers (LLM Chat)
8. **DesignSystem Agent** - Crée design tokens (LLM Chat)

#### Phase 3 : GÉNÉRATION (2 agents)
9. **Codegen Agent** - Génère les fichiers (LLM Chat, 1 call par file)
10. **ImageAgent** - Remplace placeholders par vraies images (Pexels API)

#### Phase 4 : BUILD & EVAL (2 agents)
11. **Build Stage** - Compile avec Vite (local, peut retry)
12. **UIEvaluator** - Score la qualité (LLM Chat)

---

### Q4: Qu'est-ce que le RAG et pourquoi c'est important ?
**R**: RAG = **Retrieval Augmented Generation**.

**Sans RAG** :
```
Document de 20 000 caractères
    ↓
Tout est envoyé au LLM (coûteux, token limit)
```

**Avec RAG** :
```
Document de 20 000 caractères
    ↓
Découpe en 40 chunks de 500 chars
    ↓
Embedding des chunks (Google Gemini embedding-001)
    ↓
Similarity search : "Quelle partie du doc parle du prompt ?"
    ↓
Retourne top-5 chunks pertinents (2 000 chars)
    ↓
Envoie seulement ces 2 000 chars au LLM
```

**Avantage** :
- Coût réduit de 90%
- Pas de token limit
- Juste le contexte pertinent

---

### Q5: Comment le Planner Agent détecte le type de projet ?
**R**: Par **scoring de keywords**.

```python
PROJECT_PROFILES = {
    "dashboard": {
        "keywords": ["dashboard", "analytics", "metrics", "kpi", "chart", ...],
        "layout": "React SPA avec sidebar..."
    },
    "landing": {
        "keywords": ["landing", "marketing", "saas", "hero", ...],
        ...
    },
    ...
}

def _detect_project_type(context: str):
    scores = {}
    for name, profile in PROJECT_PROFILES.items():
        scores[name] = sum(1 for kw in profile["keywords"] if kw in context.lower())
    return max(scores)  # "dashboard" si score=5, "landing" si score=3
```

**Exemple** :
```
Prompt: "Make a dashboard with user analytics and KPI charts"

Scores:
  - dashboard: 4 (dashboard, analytics, kpi, charts)
  - landing: 0
  - ecommerce: 0
  - app: 1 (user)

Result: "dashboard"
```

---

### Q6: Le Codegen Agent appelle LLM une fois ou plusieurs fois ?
**R**: **Une fois PAR FICHIER**.

```python
plan.files = [
    {"path": "src/data/mockData.ts", "description": "..."},
    {"path": "src/components/Header.tsx", "description": "..."},
    {"path": "src/pages/Dashboard.tsx", "description": "..."},
    # ... 10 fichiers au total
]

for file in plan.files:
    llm_response = llm.chat(f"Generate {file.path}: {file.description}")
    code_bundle.add_file(CodeFile(path, content=llm_response))
    emit_progress(f"Generated {file.path} (3/10)")
```

**Avantage** :
- Chaque call est petit et rapide
- Progress tracking par fichier
- CSS généré APRÈS HTML (peut référencer vraies classes)

---

### Q7: Que se passe-t-il si le build Vite échoue ?
**R**: **Auto-repair avec LLM**.

```python
def _build_with_self_healing(project_path, code, max_retries=2):
    for attempt in range(max_retries + 1):
        success, output = _run_vite_build(project_path)

        if success:
            return True, code

        # Erreur → demander réparation
        error_msg = _parse_vite_error(output)
        # Exemple: "QuestionMarkCircle is not exported from lucide-react"

        repaired_code = llm.chat(
            f"This code failed to build: {error_msg}\n"
            f"Fix only the file causing the error:\n{file_content}"
        )

        # Retry avec code réparé
        code = update_file(code, repaired_code)

    return False, code
```

**Exemple de repair** :
```
Error: QuestionMarkCircle not in lucide-react

LLM fix:
  "Replace QuestionMarkCircle with HelpCircle (that exists in lucide-react)"

Retry build → Success!
```

---

### Q8: Comment le streaming (SSE) affiche la progression ?
**R**: Chaque agent émet des `events` dans une queue thread-safe.

```python
def run_stream(self, req: GenerateRequest):
    q = queue.Queue()

    def worker():
        try:
            result = self.run(req, callback=lambda e: q.put(e))
            q.put({"type": "complete", "result": result})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})

    t = threading.Thread(target=worker, daemon=True)
    t.start()

    while True:
        event = q.get()
        yield f"data: {json.dumps(event)}\n\n"  # SSE format

        if event["type"] in ("complete", "error"):
            break
```

**Events émis** :
```json
{"type": "progress", "stage": "extract", "progress": 10, "message": "Extracting documents…"}
{"type": "progress", "stage": "rag", "progress": 16, "message": "Building knowledge base…"}
{"type": "progress", "stage": "planning", "progress": 28, "message": "AI planning…"}
{"type": "progress", "stage": "codegen", "progress": 44, "message": "Starting code generation…"}
{"type": "progress", "stage": "codegen_file", "progress": 50, "filePath": "src/components/Header.tsx"}
{"type": "progress", "stage": "build", "progress": 88, "message": "Building with Vite…"}
{"type": "complete", "progress": 100, "result": {...}}
```

**Frontend reçoit** :
```typescript
const eventSource = new EventSource('/api/generations/stream');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setProgress(data.progress);
    setMessage(data.message);
};
```

---

### Q9: Quelle est la différence entre OCR Agent et DocExtract Agent ?
**R**:

| Agent | Input | LLM ? | Traitement |
|-------|-------|-------|-----------|
| **OCR** | Images JPG/PNG scannées | ✅ Vision | Google Gemini vision → extrait texte |
| **DocExtract** | PDFs/DOCX/PPT texte | ❌ | pdfplumber / python-docx / python-pptx → parsing local |

**Exemple** :
```
Input: design.pdf (image = page scannée)
→ OCR Agent appelle Gemini vision API
→ "This is a blue logo at the top, with navigation menu..."

Input: requirements.pdf (texte = searchable PDF)
→ DocExtract Agent utilise pdfplumber (pas d'API)
→ Extrait le texte brut directement
```

---

### Q10: Comment le DesignSystem Agent crée les tokens ?
**R**: Par appel LLM avec le plan + contexte.

```python
prompt = f"""
Based on this project:
- Type: {plan.project_type}
- Description: {plan.summary}
- Content: {context}

Generate complete design tokens:
1. Color palette (primary, secondary, background, surface, text, border, success, error)
2. Typography (heading font, body font, sizes)
3. Spacing scale (sm, md, lg, xl)
4. Border radius (sm, md, lg)
5. Shadows (sm, md, lg)

Return as JSON only.
"""

tokens = llm.chat(prompt)
# Returns: {
#   "colors": {"primary": "#3b82f6", ...},
#   "fonts": {"heading": "Inter", "body": "Space Mono"},
#   "spacing": {"sm": "0.25rem", "md": "1rem", ...}
# }
```

Ensuite le Codegen Agent utilise ces tokens :
```
Generate src/App.tsx using colors.primary = "#3b82f6"
and fonts.heading = "Inter" for all headings
```

---

### Q11: Est-ce qu'on utilise RAG maintenant ou avant on l'utilisait pas ?
**R**: **OUI, on utilise RAG**. C'est dans le code actuel.

Fichier: `fastapi-ai/app/pipeline/agents/rag_agent.py`

**Historique** :
- Avant : Tous les textes étaient envoyés tels quels au LLM
- Maintenant : RAG optionnel SI l'utilisateur upload des fichiers

**Code** :
```python
if req.fileRefs:  # Si des fichiers téléchargés
    pack = self.rag.run(pack)  # Applique RAG
else:
    # Pas de documents → pas de RAG
```

**Flow** :
1. TextPrep consolide les file_text items
2. RAG Agent cherche: "Chunks similaires au prompt ?"
3. Retourne 1 context item avec top-5 chunks
4. Cet item est utilisé par Planner + Codegen

---

### Q12: L'ImageAgent c'est quoi exactement ?
**R**: C'est un agent qui remplace les placeholders image par des vraies.

```python
class ImageAgent:
    def run(self, code: CodeBundle, plan, design_tokens):
        for file in code.files:
            if file.content has ![placeholder](placeholder.jpg):

                # Extraire context: "Dashboard with user analytics"
                query_for_pexels = derive_image_query(context)

                # Appeler Pexels API
                images = pexels.search(query_for_pexels)

                # Remplacer placeholder
                file.content = file.content.replace(
                    "![placeholder](placeholder.jpg)",
                    f"![User dashboard]({images[0].url})"
                )

        return code
```

**Exemple** :
```
Generated code a: <img src="placeholder.jpg" />

ImageAgent:
  - Détecte placeholder
  - Appelle Pexels: search("dashboard analytics")
  - Récupère image: "https://images.pexels.com/photos/3722568/..."
  - Remplace: <img src="https://images.pexels.com/photos/3722568/..." />
```

---

## Questions Avancées

### Q13: Que se passe-t-il si un agent échoue ?
**R**: Dépend de l'agent.

**Agents optionnels** (ne bloquent pas) :
- OCR (pas d'images? OK, skip)
- ImageAgent (déjà du placeholder? OK, utiliser comme-est)
- Diagram (pas de diagram? OK, skip)

**Agents critiques** (doit réussir) :
- Planner
- Codegen
- Build

**Retry logic** :
```python
for attempt in range(4):
    try:
        plan = self.planner.plan(req, pack)
        break
    except Exception as e:
        if "429" in str(e) and attempt < 3:  # Rate limit
            wait = 10 * (2 ** attempt)
            time.sleep(wait)
        else:
            raise  # Fail if not rate limit
```

---

### Q14: Comment on limite la token consumption ?
**R**: Plusieurs stratégies :

**1. RAG** (si documents) :
```
20 000 chars → 2 000 chars (top-5 chunks pertinents)
```

**2. TextPrep** :
```python
MAX_CONTEXT = 3000
if len(pack_text) > MAX_CONTEXT:
    pack_text = pack_text[:MAX_CONTEXT]  # Truncate
```

**3. Codegen par fichier** :
```
Au lieu de:  20 fichiers × 1000 tokens chacun = 20 000 tokens
On fait:     1 fichier × 1000 tokens = 1 000 tokens (20 appels)
```

**4. Re-use des outputs** :
```
Plan JSON (réutilisé par Design + Codegen)
Design tokens JSON (réutilisé par Codegen)
```

---

### Q15: C'est quoi le "self-healing" du build ?
**R**: Le système **répare le code lui-même** en cas d'erreur Vite.

**Exemple réel** :
```
Build Error:
  "QuestionMarkCircle is not exported from lucide-react"

Repair prompt:
  "This icon doesn't exist.
   Replace it with: HelpCircle
   (which exists in lucide-react)"

LLM response:
  "Replace line 15:
   import { QuestionMarkCircle } from 'lucide-react'
   with:
   import { HelpCircle } from 'lucide-react'"

Apply fix → Retry build → Success!
```

**Max retries** : 2 (après 3 tentatives = fail)

---

### Q16: Comment on track le progress exactement ?
**R**: **Callback + Queue + SSE**.

```python
def run(self, req, callback=None):
    def emit(stage, progress, message=""):
        if callback:
            callback({
                "type": "progress",
                "stage": stage,
                "progress": progress,
                "message": message
            })

    # Phase 1
    emit("extract", 10, "Extracting documents…")
    pack = self.ocr.run(pack)

    emit("rag", 16, "Building knowledge base…")
    pack = self.rag.run(pack)

    # Phase 2
    emit("planning", 28, "Planning structure…")
    plan = self.planner.plan(req, pack)

    # Phase 3
    emit("codegen", 44, "Starting code generation…")
    for i, file in enumerate(plan.files):
        emit("codegen_file", 44 + i*10, f"Generating {file.path}…")
        file_code = self.codegen.generate(file)

    # Final
    emit("complete", 100, "Done!")
```

---

### Q17: A quoi sert le Scoring (UIEvaluator) ?
**R**: Évaluer la **qualité** du code généré sur 5 dimensions.

```python
class UIEvaluator:
    def evaluate(self, prompt, code, build_success) -> AiScore:
        llm_prompt = f"""
Evaluate this generated UI on 5 dimensions (0-100):
1. semantic_fidelity: Does it match the prompt?
2. code_quality: Is the code clean, readable, efficient?
3. completeness: Are all features present?
4. accessibility: WCAG 2.1 AA compliant?
5. visual_richness: Is it visually polished?

Code:
{code}

Return JSON:
{{
    "semantic_fidelity": 90,
    "code_quality": 82,
    "completeness": 88,
    "accessibility": 78,
    "visual_richness": 85,
    "global_score": 85,
    "improvements": "..."
}}
"""
        result = llm.chat(llm_prompt)
        return AiScore(**result)
```

**Bonus** : Cet AiScore est sauvegardé dans MongoDB et visible dans le frontend.

---

### Q18: L'EntityExtractor extraits quoi au juste ?
**R**: Les **entités** du prompt (noms, acteurs, features, etc.).

```python
llm_prompt = f"""
Extract from this requirement:

{prompt}

1. Application name
2. Main entities/models (User, Product, Order, etc.)
3. Key features (Authentication, Notifications, Analytics)
4. User roles (Admin, Regular User, Guest)
5. Aesthetic/Style (Modern, Dark, Minimalist, Colorful)
6. Data models and relationships

Return JSON only.
"""

entities = {
    "app_name": "E-Commerce Platform",
    "entities": ["User", "Product", "Order", "Cart"],
    "features": ["User Auth", "Product Search", "Cart Management", "Payment"],
    "roles": ["Admin", "Customer", "Guest"],
    "aesthetic": "Modern, mobile-first, dark theme",
    "models": {
        "User": ["id", "email", "name", "role"],
        "Product": ["id", "name", "price", "image"],
        "Order": ["id", "userId", "items", "total"]
    }
}
```

Ensuite, Planner utilise ces infos pour mieux structurer le plan.

---

### Q19: Peut-on désactiver le RAG ?
**R**: **OUI, automatiquement**.

```python
if req.fileRefs:  # Si user a uploaded des files
    pack = self.rag.run(pack)  # Activer RAG
else:  # Si pas de files, juste prompt texte
    # RAG skip automatiquement
    pass
```

Si tu veux le désactiver manuellement :
```python
config.RAG_ENABLED = False  # Dans les configs
```

---

### Q20: Quel LLM on choisit par défaut pour chaque agent ?
**R**: Configurable, avec fallback.

**Fichier** : `fastapi-ai/app/pipeline/llm_provider.py`

```python
PROVIDER_CONFIGS = {
    "planner": os.getenv("PLANNER_PROVIDER", "gemini"),
    "coder": os.getenv("CODER_PROVIDER", "gemini"),
    "ocr": "gemini",  # Vision = Gemini seulement
    "rag": "gemini",  # Embedding = Gemini seulement
    "scorer": "gemini"
}

# Fallback chain
FALLBACK_CHAIN = ["groq", "gemini", "openai", "ollama"]

def select_provider(agent_type):
    preferred = PROVIDER_CONFIGS[agent_type]

    try:
        return AVAILABLE_PROVIDERS[preferred]
    except:
        for fallback_provider in FALLBACK_CHAIN:
            try:
                return AVAILABLE_PROVIDERS[fallback_provider]
            except:
                continue
```

**Env vars à set** :
```bash
GROQ_API_KEY=sk-...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...
PLANNER_PROVIDER=gemini      # Préféré pour planning
CODER_PROVIDER=gemini        # Préféré pour codegen
```

---

## Cas d'Usage & Exemples

### Q21: Exemple complet : User demande `"Dark mode landing page"`
**R**:

```
User: "Dark mode landing page"
Files: NONE (pas d'uploads)

Step 1: EXTRACTION (5-16%)
  OCR: Aucune image → skip
  DocExtract: Aucun doc → skip
  Diagram: No diagram → skip
  RAG: req.fileRefs vide → skip
  TextPrep:
    → SourcePack contient:
       SourceItem(kind="prompt", content="Dark mode landing page")

Step 2: PLANNING (16-44%)
  EntityExtractor (18%):
    → app_name: "Landing Page"
    → aesthetic: "Dark mode"
    → features: ["Hero section", "CTA buttons", "Footer"]

  Planner (28%):
    → project_type: "landing"
    → files: [
        "index.html",
        "styles.css",
        "script.js"
      ]

  DesignSystem (35%):
    → colors:
       primary: "#fff"
       background: "#0f172a"
       surface: "#1e293b"
       text: "#f1f5f9"
    → fonts: "Inter"

Step 3: CODEGEN (44-88%)
  Codegen:
    LLM#1: "Generate index.html (Dark landing page hero section)"
    → <html><head>...<body><section class="hero">...</section></body></html>

    LLM#2: "Generate styles.css using colors"
    → .hero { background: #1e293b; color: #f1f5f9; }

    LLM#3: "Generate script.js"
    → Mobile menu toggle, scroll animations

  ImageAgent (80%):
    → No placeholders → skip

  Build (88%):
    → vite build → Success

Step 4: EVAL (88-100%)
  UIEvaluator:
    → semantic_fidelity: 95
    → code_quality: 90
    → completeness: 92
    → accessibility: 88
    → visual_richness: 91
    → global_score: 91

Output: GenerateResponse(
  codeBundle={
    files: [index.html, styles.css, script.js],
    bundle: dist/
  },
  aiReport=AiReport(
    score=91,
    semantic_fidelity=95,
    ...
  )
)
```

---

### Q22: Que se passe-t-il si l'utilisateur upload une image avec du texte ?
**R**:

```
User: "Create an app like this design"
Upload: design.png (screenshot d'une app avec texte)

Step 1: EXTRACTION (5-40%)
  OCR Agent:
    → Appelle Gemini Vision API
    → Extrait: "This is a dashboard with a sidebar on the left,
               top navigation bar, and content area showing a table
               with columns: Name, Email, Status"
    → Sauvegarde: SourceItem(kind="file_text", content="...")

  RAG Agent (détecte text + context):
    → Chunks le texte extrait
    → Embedding + similarity search
    → Retourne top-5 chunks pertinents
    → Sauvegarde: SourceItem(kind="context", content="...")

Step 2-4: PLANNING / CODEGEN
  Planner voit le context RAG + OCR text
  → project_type: "app" (dashboard + sidebar = app pattern)
  → Crée un plan avec plus de détails basé sur l'OCR
```

---

### Q23: Peut-on utiliser plusieurs fichiers uploadés ?
**R**: **OUI**.

```python
req = GenerateRequest(
    prompt="E-commerce dashboard with user analytics",
    fileRefs=[
        "design-mockup.pdf",      # Design visuel
        "database-schema.pdf",    # Schema DB
        "requirements.docx"       # Requirements texte
    ]
)

# Flow:
Orchestrator.run(req):
  # Extraction
  OCR: design-mockup.pdf (images) → text
  DocExtract: database-schema.pdf, requirements.docx → text

  # RAG: Tous les textes → chunks pertinents
  All file_text items → embedding + similarity search
  → 1 context item avec top-5 chunks

  # Planner utilise: prompt + RAG context
  → Plan plus détaillé basé sur tous les inputs
```

---

## Dépannage

### Q24: Comment savoir quel agent a échoué si erreur générale ?
**R**: **Logs avec timestamps**.

```python
logger = logging.getLogger(__name__)

# Dans chaque agent:
logger.info("OCRAgent: Starting vision extraction...")
try:
    result = gemini.vision_extract(image)
    logger.info("OCRAgent: Extracted %d chars", len(result))
except Exception as e:
    logger.error("OCRAgent: Failed - %s", str(e))
    raise
```

**Logs affichent** :
```
[INFO] OCRAgent: Starting vision extraction...
[INFO] OCRAgent: Extracted 1523 chars
[INFO] DocExtractAgent: Processing 3 PDFs...
[INFO] RAGAgent: Building embeddings...
[ERROR] RAGAgent: Failed - GEMINI_API_KEY not set
```

Donc tu vois exactement où ça casse.

---

### Q25: La progress bar peut rester coincée ?
**R**: **Rarement**, mais possible si :

1. LLM timeout (45s) → Frontend voit 50% pendant longtemps
2. Build stuck → Frontend voit 88% indéfiniment

**Solution** :
```python
# Dans Orchestrator
TIMEOUT_PER_STAGE = {
    "extraction": 60,
    "planning": 120,
    "codegen": 300,  # 5 min (codegen peut être long)
    "build": 120
}

# Ou ajouter timeout
from concurrent.futures import TimeoutError

with concurrent.futures.ThreadPoolExecutor() as executor:
    future = executor.submit(self.codegen.generate, file)
    try:
        result = future.result(timeout=120)
    except TimeoutError:
        emit("error", "Codegen timeout for " + file.path)
```
