# Les Agents & Orchestration - Explication Détaillée

## 🏗️ Architecture Globale

```
USER REQUEST
    ↓
FastAPI (main.py)
    ↓
Orchestrator.run() ou run_stream()
    ↓
Sequential Agent Pipeline
    ↓
GenerateResponse (code + report)
```

---

## 🤖 Qu'est-ce qu'un Agent ?

Un **agent** c'est une classe Python qui :
1. **Reçoit** des données d'entrée (SourcePack)
2. **Traite** les données (peut appeler un LLM ou faire du traitement local)
3. **Retourne** des données transformées

Exemple simplifié :
```python
class MonAgent:
    def run(self, pack: SourcePack) -> SourcePack:
        # Traiter pack.items
        # Retourner SourcePack modifié
        return pack
```

**SourcePack** = container de données :
```python
class SourcePack:
    items: list[SourceItem]  # Chaque item a un kind et du contenu
```

---

## 📊 Les 12 Agents en Détail

### **PHASE 1 : EXTRACTION (Non-LLM)**

#### **1. OCR Agent** (`ocr_agent.py`)
- **Input**: Fichiers (images, PDFs scannés)
- **Traitement**: Vision LLM (Google Gemini) → extrait texte des images
- **Output**: `SourceItem(kind="file_text", content=texte_extrait)`
- **Fallback**: Si image = texte non extrait → saute

#### **2. Doc Extract Agent** (`doc_extract_agent.py`)
- **Input**: Documents téléchargés (PDF texte, DOCX, PPT, Mermaid, Excalidraw)
- **Traitement**:
  - PDF → `pdfplumber.open()` → texte brut
  - DOCX → `python-docx` → texte
  - PPT → `python-pptx` → texte
  - .mmd / .excalidraw JSON → liste des éléments
- **Output**: `SourceItem(kind="file_text", content=texte, meta={...})`

#### **3. Diagram Agent** (`diagram_agent.py`)
- **Input**: Fichiers Mermaid ou Excalidraw extraits
- **Traitement**: Parse le JSON/texte → génère une prose lisible par LLM
- **Output**: `SourceItem(kind="context", content=description_prose)`
- **Exemple**:
  ```
  Mermaid: graph TD: A[Login] --> B[Dashboard]
  Devient: "This is a user flow diagram showing: 1. Users login to the system 2. After authentication they see the dashboard..."
  ```

#### **4. RAG Agent** (`rag_agent.py`) 🎯
- **Input**: Tous les `file_text` items
- **Traitement**:
  1. Découpe en chunks de 500 chars
  2. Embedding avec Google Gemini (`models/embedding-001`)
  3. Similarity search : retourne top-5 chunks similaires à la requête
  4. Remplace tous les file_text par UN seul `context` item
- **Output**: `SourceItem(kind="context", content=rag_contexte_compact)`
- **Avantage**: 20 000 chars → 2 000 chars pertinents

#### **5. Text Prep Agent** (`text_prep_agent.py`)
- **Input**: Tous les items du pack (prompt, context, file_text, file_ref)
- **Traitement**:
  - Désérialise file_refs → télécharge depuis MinIO
  - Limite les contextes trop longs
  - Consolide tout en 1-2 blocs cohérents
- **Output**: SourcePack plus propre et optimisé

---

### **PHASE 2 : PLANIFICATION (LLM)**

#### **6. Entity Extractor Agent** (`entity_extractor_agent.py`)
- **Input**: Prompt + document texte
- **LLM Call**:
  ```
  "Extract from this prompt the:
   - app name
   - features
   - style/aesthetic
   - user roles
   - data models"
  ```
- **Output**: Dict d'entités structurées
  ```python
  {
    "app_name": "AI Dashboard",
    "entities": ["User", "Project", "Analytics"],
    "features": ["Real-time updates", "Export"],
    "style": "Modern, dark theme"
  }
  ```
- **Usage**: Enrichit le contexte du planner

#### **7. Planner Agent** (`planner_agent.py`)
- **Input**: GenerateRequest + SourcePack
- **LLM Call**:
  ```
  "Based on this requirement and context, create a project plan:
   - Detect project type (dashboard, landing, app, ecommerce)
   - Define required files
   - For each file, write a detailed description
   - Return as JSON"
  ```
- **Output**: Plan JSON
  ```json
  {
    "summary": "Dashboard avec analytics",
    "project_type": "dashboard",
    "files": [
      {"path": "src/data/mockData.ts", "description": "Mock data for..."},
      {"path": "src/components/Header.tsx", "description": "Header with..."},
      {"path": "src/pages/Dashboard.tsx", "description": "Main dashboard page..."}
    ]
  }
  ```
- **Key function**: `_build_react_file_plan()` convertit le plan HTML en React TSX structure

**Détection du type** :
```python
def _detect_project_type(context):
    scores = {}
    for name, profile in PROJECT_PROFILES.items():
        scores[name] = sum(1 for kw in profile["keywords"] if kw in context.lower())
    return max(scores)  # "dashboard", "landing", "app", etc.
```

#### **8. Design System Agent** (`design_system_agent.py`)
- **Input**: Plan + contexte
- **LLM Call**:
  ```
  "Based on the project type and requirements, generate:
   - Color palette (primary, secondary, background, text)
   - Typography (heading font, body font)
   - Border radius (card, button)
   - Spacing scale"
  ```
- **Output**: Design tokens JSON
  ```json
  {
    "colors": {
      "primary": "#6366f1",
      "background": "#0f172a",
      "surface": "#1e293b",
      "text": "#f1f5f9"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter"
    }
  }
  ```

---

### **PHASE 3 : GÉNÉRATION DE CODE (LLM)**

#### **9. LLM Codegen Agent** (`codegen_agent.py`)
- **Input**: Plan + SourcePack + design_tokens
- **Traitement**: Pour CHAQUE fichier du plan, LLM appelle
  ```
  "Generate the complete file {path} for {project}:
   - Description: {file.description}
   - Use design tokens: {colors, fonts}
   - Dependencies: {autres fichiers}
   - Return ONLY raw code (no markdown)"
  ```
- **One file at a time** :
  - Fichier 1 → LLM → CodeFile
  - Fichier 2 → LLM → CodeFile
  - ...
  - Fichier N → LLM → CodeFile
- **Avantage**: Chaque call est petit, on peut tracker la progression

**Post-processing du code** :
1. `_clean_code_output()` → strip markdown fences
2. `_repair_truncated_jsx()` → ferme les balises non fermées
3. `_add_missing_imports()` → ajoute React/recharts/lucide-react imports
4. `_fix_lucide_imports()` → reécrit les imports d'icônes mal nommées

#### **10. Image Agent** (`image_agent.py`)
- **Input**: Code généré + tokens design
- **Traitement**:
  - Cherche les placeholders image : `![placeholder](placeholder.jpg)`
  - Appelle Pexels API pour trouver des vraies images
  - Remplace les URLs
- **Output**: Code avec images réelles

---

### **PHASE 4 : BUILD & EVALUATION (Non-LLM)**

#### **11. Build Stage** (Vite)
- **Input**: Code généré
- **Traitement**:
  ```bash
  cp vite-template/ project/
  write files to src/
  npm run build  # Vite compilation
  ```
- **Repair Logic**: Si build échoue
  1. Parse l'erreur Vite
  2. Envoie au Codegen LLM avec l'erreur spécifique
  3. Retry build jusqu'à max_retries

#### **12. UI Evaluator Agent** (`ui_evaluator_agent.py`)
- **Input**: Prompt + code généré + build_success
- **LLM Call**:
  ```
  "Evaluate this generated UI on 5 dimensions:
   - semantic_fidelity: Does it match the prompt?
   - code_quality: Is the code clean?
   - completeness: Are all features present?
   - accessibility: WCAG 2.1 AA compliant?
   - visual_richness: Is it visually polished?"
  ```
- **Output**: Scoring report
  ```json
  {
    "global_score": 85,
    "dimensions": {
      "semantic_fidelity": 90,
      "code_quality": 82,
      "completeness": 88,
      "accessibility": 78,
      "visual_richness": 85
    }
  }
  ```

---

## 🎭 FLOW RÉEL : Orchestrator.run()

```python
def run(self, req: GenerateRequest) -> GenerateResponse:
    # ─── SETUP ───
    pack = SourcePack(prompt + fileRefs)

    # ─── PHASE 1 : EXTRACTION ───
    pack = self.ocr.run(pack)           # Images → texte
    pack = self.doc.run(pack)           # PDFs/DOCX → texte
    pack = self.diagram.run(pack)       # Mermaid/Excalidraw → prose

    if req.fileRefs:
        pack = self.rag.run(pack)       # Textes → chunks pertinents

    pack = self.prep.run(pack)          # Consolide tout

    # ─── PHASE 2 : ANALYSE ───
    extracted = self.entity_extractor.extract(prompt, document_text)
    # → ajoute context block au pack

    # ─── PHASE 3 : PLANIFICATION ───
    plan = self.planner.plan(req, pack)
    # → returns JSON avec files[]

    # ─── PHASE 4 : DESIGN ───
    design_tokens = self.design_system.generate(plan, context)

    # ─── PHASE 5 : CODEGEN ───
    code = self.llm_codegen.generate(
        req, pack, plan, design_tokens,
        file_progress_cb=_file_progress_cb  # Progress tracking
    )
    # Pour chaque file in plan.files:
    #   LLM appel → CodeFile

    # ─── PHASE 6 : IMAGES ───
    code = self.image_agent.run(code, plan, design_tokens)

    # ─── PHASE 7 : BUILD ───
    build_success, retries = self._build_with_self_healing(project_path, code)

    # ─── PHASE 8 : EVALUATION ───
    ui_eval_result = self.ui_evaluator.evaluate(prompt, code, build_success)

    # ─── RETURN ───
    return GenerateResponse(
        generationId=req.generationId,
        codeBundle=code,
        aiReport=AiReport(score=ui_eval_result.score, ...)
    )
```

---

## 🔄 STREAMING (run_stream)

Pour afficher la progression en temps réel au frontend :

```python
def run_stream(self, req):
    q = queue.Queue()  # Thread-safe queue

    def worker():
        result = self.run(req, _progress_cb=lambda e: q.put(e))
        q.put({"type": "complete", "result": result.model_dump()})

    t = threading.Thread(target=worker)
    t.start()

    while True:
        event = q.get()
        yield event  # SSE → Frontend
        if event["type"] in ("complete", "error"):
            break

    t.join()
```

**Events envoyés**:
```json
{"type": "progress", "stage": "extract", "progress": 10, "message": "Extracting documents…"}
{"type": "progress", "stage": "rag", "progress": 16, "message": "Building knowledge base…"}
{"type": "progress", "stage": "planning", "progress": 28, "message": "AI planning project structure…"}
{"type": "progress", "stage": "codegen_file", "progress": 50, "filePath": "src/components/Header.tsx"}
{"type": "complete", "progress": 100, "result": {...}}
```

---

## 🔗 SourceItem & SourcePack

**SourceItem kinds** :
- `"prompt"` → texte du user
- `"file_ref"` → référence à un fichier MinIO
- `"file_text"` → texte extrait d'un document
- `"context"` → contexte consolidé (RAG output, entity extraction, etc.)

**Example flow** :
```
SourceItem(kind="prompt", content="Dashboard avec users")
SourceItem(kind="file_ref", minioPath="uploads/design.pdf")
    ↓ ocr_agent
SourceItem(kind="file_text", content="Logo should be blue...")
    ↓ rag_agent
SourceItem(kind="context", content="[RAG CONTEXT] Top 5 relevant excerpts...")
    ↓ planner_agent uses all items
plan = { files: [...] }
```

---

## 🚨 Error Handling

**Rate Limit (429)** :
```python
for attempt in range(4):
    try:
        plan = self.planner.plan(req, pack)
        break
    except Exception as e:
        if "429" in str(e) and attempt < 3:
            wait = 10 * (2 ** attempt)  # 10s, 20s, 40s
            time.sleep(wait)
        else:
            raise
```

**Build Failure** :
```python
def _build_with_self_healing(project_path, code, max_retries=2):
    for attempt in range(max_retries + 1):
        success, output = _build_vite_project(...)
        if success:
            return True

        # Parse error → ask LLM to fix
        error_type = _parse_vite_error(output)
        repaired = _repair_tsx_code(code, error_type)
        code = CodeBundle(repaired_files)
        # retry

    return False
```

---

## 📊 Summary Table

| Agent | Input | LLM? | Output | Phase |
|-------|-------|------|--------|-------|
| OCR | Images | ✅ Vision | file_text | Extract |
| DocExtract | Docs | ❌ | file_text | Extract |
| Diagram | Mermaid/Excalidraw | ❌ | context | Extract |
| RAG | file_text[] | ✅ Embedding | context | Extract |
| TextPrep | SourcePack | ❌ | cleaned pack | Extract |
| EntityExtractor | prompt + docs | ✅ Chat | entities dict | Plan |
| Planner | pack + request | ✅ Chat | plan JSON | Plan |
| DesignSystem | plan + context | ✅ Chat | tokens JSON | Design |
| Codegen | plan + tokens | ✅ Chat | code files | CodeGen |
| ImageAgent | code + plan | ✅ API | code + images | Polish |
| Build | code | ❌ Vite | dist/ | Build |
| UIEvaluator | code + prompt | ✅ Chat | score report | Eval |
