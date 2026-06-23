# Qualité & Accessibilité - Explication Complète

## 📊 Les 5 Dimensions de la Qualité

Le système évalue le code généré sur **5 dimensions**, chacune impactant le score global :

```
Global Score = (fidelity × 35%) + (quality × 25%) + (completeness × 20%)
             + (accessibility × 10%) + (richness × 10%)
```

---

## 1️⃣ **SEMANTIC FIDELITY** (35% du score) - Fidélité Sémantique

### Qu'est-ce qu'on mesure ?
**Est-ce que l'UI générée match vraiment le prompt de l'utilisateur ?**

### Critères d'Évaluation

✅ **Excellent (90-100)** :
- L'UI captive exactement le domaine demandé
- Tous les éléments clés du prompt sont présents
- L'interface "ressent" ce que l'utilisateur a demandé
- Pas de template générique détaché du contexte

❌ **Mauvais (0-39)** :
- Template générique qui ignore le prompt
- Domaine/contexte complètement décalé
- Éléments clés manquants ou mal placés

### Examples

```
User: "Créer un dashboard de ventes immobilières"

Score 95 (Excellent):
  ✓ Interface avec propriétés immobilières
  ✓ Maps/localisation
  ✓ Prix, surface, descriptions de biens
  ✓ Filtrages par région/prix
  ✓ KPI: revenus, propriétés vendues

Score 40 (Mauvais):
  ✗ Dashboard générique avec "sales data"
  ✗ Pas de contexte immobilier spécifique
  ✗ Table génériques au lieu de fiches propriétés
```

**LLM Check** :
```
"Does the UI feel like what the user asked for?
 Is this clearly a real-estate dashboard or could it be anything?"
```

---

## 2️⃣ **CODE QUALITY** (25% du score) - Qualité du Code

### Qu'est-ce qu'on mesure ?
**Est-ce que le code React/TypeScript est bien écrit ?**

### Critères d'Évaluation

✅ **Excellent (90-100)** :
- ✓ Composants bien décomposés (pas de 500-liners)
- ✓ Hooks utilisés correctement (`useState`, `useEffect`, `useCallback`)
- ✓ TypeScript avec types explicites (pas `any` partout)
- ✓ Tailwind CSS (pas de styles inline)
- ✓ Imports nommés et organisés
- ✓ Pas de `console.log`, `TODO` comments
- ✓ Pas de `dangerouslySetInnerHTML` sans raison
- ✓ Patterns React modernes

❌ **Mauvais (0-39)** :
- ✗ Une seule grosse composante de 500 lignes
- ✗ Styles inline partout `style={{ color: 'red' }}`
- ✗ `useState` mal utilisé (state mutant, pas de cleanup)
- ✗ Imports manquants ou circulaires
- ✗ TypeScript ignoré (`any` everywhere)

### Examples

#### ✅ BON Code (Score 90)
```typescript
// Component bien décomposé
function Dashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, []) // Dependency array ✓

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const data = await api.getUsers()
    setUsers(data)
    setLoading(false)
  }, [])

  return (
    <div className="p-6 bg-slate-50">  {/* Tailwind ✓ */}
      <Header title="Dashboard" />
      <UserTable users={users} loading={loading} />
    </div>
  )
}

export default Dashboard  // Named export ✓
```

#### ❌ MAUVAIS Code (Score 30)
```typescript
// Tout dans une composante
function Dashboard() {
  let users = []  // Pas useState ✗

  function render() {  // Pas React pattern ✗
    return `
      <div style="padding: 24px; background: #f8f9fa;">
        ${users.map(u => `<div style="color: red">${u.name}</div>`)}
      </div>
    `
  }

  return <div dangerouslySetInnerHTML={{ __html: render() }} />  // ✗✗✗
}
```

---

## 3️⃣ **COMPLETENESS** (20% du score) - Complétude

### Qu'est-ce qu'on mesure ?
**Est-ce que TOUS les éléments du prompt sont implémentés ?**

### Critères d'Évaluation

✅ **Excellent (90-100)** :
- ✓ Chaque feature demandée est là
- ✓ Chaque section mentionnée existe
- ✓ Aucune fonctionnalité manquante majeure

❌ **Mauvais (0-39)** :
- ✗ Fonctionnalités demandées absentes ou partielles
- ✗ Sections manquantes
- ✗ 30% ou plus du prompt ignoré

### Examples

```
User: "Créer une page produit avec:
  - Galerie d'images
  - Description détaillée
  - Section avis clients (min 3 avis)
  - Bouton 'Ajouter au panier'
  - Section produits similaires (min 4)"

Score 95 (Complète):
  ✓ Galerie avec zoom
  ✓ Description complète avec spécifications
  ✓ 5 avis clients avec étoiles
  ✓ Bouton 'Ajouter au panier' (+ quantity selector)
  ✓ 6 produits similaires

Score 50 (Partielle):
  ✗ Galerie d'images OK
  ✓ Description OK
  ✗ Juste 1 avis client (pas 3)
  ✓ Bouton 'Ajouter au panier' OK
  ✗ Pas de section produits similaires
```

**Note**: Si le user demande 5 features et tu en as 3, c'est 60% = score ~60.

---

## 4️⃣ **ACCESSIBILITY** (10% du score) - Accessibilité WCAG 2.1

### Qu'est-ce qu'on mesure ?
**Est-ce que l'interface est accessible aux personnes en situation de handicap ?**

C'est la partie **WCAG 2.1 Level AA** (standard web international).

### Critères WCAG 2.1 AA Essentiels

#### ✅ Images Accessibles
```tsx
// BON ✓
<img src="chart.png" alt="Revenue trend 2024: $50K to $120K" />

// MAUVAIS ✗
<img src="chart.png" />                    // Alt manquant
<img src="chart.png" alt="chart" />        // Alt trop vague
```

#### ✅ Formulaires Accessibles
```tsx
// BON ✓
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-label="Email address" />

// MAUVAIS ✗
<input type="email" />                     // Pas de label
<input type="email" aria-label="Email" /> // Label implicite OK, mais mieux avec <label>
```

#### ✅ Contraste de Couleurs
```scss
// BON ✓ (ratio 4.5:1 min pour texte normal)
background: #0f172a;  // Dark
color: #f1f5f9;       // Light
// Ratio ≈ 13:1 ✓

// MAUVAIS ✗ (ratio < 3:1)
background: #ffffff;
color: #f0f0f0;       // Gris trop clair
// Ratio ≈ 1.1:1 ✗
```

#### ✅ Éléments Interactifs Accessibles
```tsx
// BON ✓ (sémantique native)
<button>Delete</button>
<a href="/about">About</a>
<input type="checkbox" />

// MAUVAIS ✗ (div non-sémantique)
<div onClick={handleClick}>Delete</div>  // Pas accessible au clavier
<span role="button" onClick={...}>Delete</span>  // Faux role
```

#### ✅ Landmarks Sémantiques
```tsx
// BON ✓
<header>Logo + Navigation</header>
<nav>Main Navigation</nav>
<main>Page Content</main>
<aside>Sidebar</aside>
<footer>Footer Links</footer>

// MAUVAIS ✗
<div className="header">...</div>
<div className="nav">...</div>
<div className="main">...</div>
```

#### ✅ ARIA (Accessible Rich Internet Applications)
```tsx
// BON ✓
<div role="alert" aria-live="polite">Error: Invalid email</div>
<button aria-expanded={isOpen}>Menu</button>
<div aria-label="Loading..." role="status" aria-busy="true"></div>

// MAUVAIS ✗
<div>Error: Invalid email</div>  // Pas annoncé aux lecteurs d'écran
<button>Menu</button>             // Pas d'aria-expanded pour état
```

#### ✅ Navigation au Clavier
```tsx
// BON ✓
<button tabIndex={0}>Click me</button>  // Focusable
<a href="#">Link</a>                    // Focusable par défaut

// MAUVAIS ✗
<div onClick={handleClick}>Click</div>  // Pas focusable (tabIndex manquant)
<div tabIndex={-1}>Hidden</div>         // Focusable mais ne pas devrait
```

### Checklist WCAG 2.1 AA

```
Perception (Visible & Audible)
  ☐ Toutes les <img> ont un alt significatif
  ☐ Contraste texte/background ≥ 4.5:1
  ☐ Pas de dépendance uniquement sur la couleur
  ☐ Texte redimensionnable au 200% sans perte

Opérabilité (Navigation & Input)
  ☐ Tous les boutons/liens obtiennent le focus au Tab
  ☐ Ordre de focus logique (top → bottom, left → right)
  ☐ Timeouts ≥ 20 secondes avant auto-close
  ☐ Pas de contenu qui clignote > 3 fois/sec

Compréhensibilité (Sens clair)
  ☐ Langage clair et lisible
  ☐ Abréviation expliquées ("PDF = Portable Document Format")
  ☐ Erreurs d'input indiquées clairement
  ☐ Labels clarifiés avec aria-label si besoin

Robustesse (Compatibilité)
  ☐ HTML sémantique (<nav>, <header>, <main>, <button> vs <div>)
  ☐ Pas d'erreurs HTML graves (balises non fermées)
  ☐ ARIA utilisé correctement (pas de role="button" sur un <button>)
```

### Scoring a11y

```
Score 90-100 (Excellent):
  → Toutes les images ont alt pertinent
  → Contraste bon partout
  → Navigation clavier complète
  → Landmarks sémantiques
  → Aucune erreur ARIA

Score 75-89 (Good):
  → Plupart des images ont alt
  → Contraste généralement bon
  → Navigation clavier fonctionelle
  → Quelques avertissements ARIA

Score 60-74 (Acceptable):
  → ~70% des images ont alt
  → Contraste parfois insuffisant
  → Quelques problèmes de clavier
  → Landmarks manquants

Score 40-59 (Weak):
  → Beaucoup d'images sans alt
  → Contraste mauvais
  → Navigation clavier cassée
  → Pas de landmarks

Score 0-39 (Poor):
  → Pas d'alt images
  → Contraste très mauvais
  → Pas accessible au clavier
  → HTML non-sémantique
```

---

## 5️⃣ **VISUAL RICHNESS** (10% du score) - Richesse Visuelle

### Qu'est-ce qu'on mesure ?
**Est-ce que l'interface est visuellement riche, complexe et bien organisée ?**

### Critères d'Évaluation

✅ **Excellent (90-100)** :
- Variété de composants (cards, tables, charts, modals, forms)
- Plusieurs sections/pages
- Icônes utilisées stratégiquement
- Palette de couleurs cohérente
- Densité informationnelle bonne (pas vide, pas surchargé)
- Animations/transitions subtiles

❌ **Mauvais (0-39)** :
- Un seul formulaire centré
- Pas d'icônes
- Couleur unique ou palette chaotique
- Peu de composants différents
- Très basique/minimaliste

### Examples

#### ✅ BON (Score 95)
```
Dashboard avec:
  - Sidebar navigation (6 sections)
  - Header avec logo + profil user
  - 12 KPI cards (revenue, users, engagement, etc.)
  - Chart (Line chart + Bar chart)
  - Data table (10 colonnes, filtrable)
  - Modal pour les détails
  - Footer avec liens
  - 8+ icônes Lucide
  - Palette: bleu/gris/blanc cohérente
```

#### ❌ MAUVAIS (Score 20)
```
Login page minimaliste:
  - Un champ email
  - Un champ password
  - Un bouton "Login"
  - White background
  - Black text
  - Aucun icon
  - Aucune animation
```

---

## 🔧 Comment on Calcule les Scores

### Phase 1: LLM Judge
```python
def evaluate(prompt: str, code: str) -> dict:
    llm_prompt = """
    Score this UI on 5 dimensions (0-100):
    1. semantic_fidelity: Does it match the prompt?
    2. code_quality: Is the code clean?
    3. completeness: Are all features built?
    4. accessibility: WCAG 2.1 AA compliant?
    5. visual_richness: Visually rich?

    Code: {code}
    Prompt: {prompt}
    """

    scores = llm.chat(llm_prompt)  # Returns JSON
    # {
    #   "semantic_fidelity": 92,
    #   "code_quality": 88,
    #   "completeness": 95,
    #   "accessibility": 90,
    #   "visual_richness": 90
    # }

    return scores
```

### Phase 2: Calcul du Global Score (Moyenne Pondérée)
```
global_score = (fidelity × 0.35) + (quality × 0.25) + (completeness × 0.20)
             + (accessibility × 0.10) + (richness × 0.10)

Example:
  fidelity: 92 × 0.35 = 32.2
  quality: 88 × 0.25 = 22.0
  completeness: 95 × 0.20 = 19.0
  accessibility: 90 × 0.10 = 9.0
  richness: 90 × 0.10 = 9.0
  ─────────────────────────────
  Global: 91.2 → rounds to 91
```

### Phase 3: Grading
```
90-100  → Grade A+  : Outstanding
75-89   → Grade A   : Good
60-74   → Grade B   : Acceptable
40-59   → Grade C   : Weak
0-39    → Grade F   : Poor
```

---

## 🎯 Accessibility Audit Détaillé (WCAG)

Pendant la génération, on peut aussi lancer un **audit d'accessibilité détaillé** qui va plus loin que le scoring simple.

### What's Checked (Axe-like)

```
Category: Images & Text Alternatives
  ☐ Images have meaningful alt text
  ☐ SVG icons have aria-label or title
  ☐ Decorative images have empty alt=""
  ☐ Form inputs have associated labels
  ☐ Required fields marked with aria-required

Category: Keyboard Navigation
  ☐ All interactive elements are focusable
  ☐ Focus order is logical
  ☐ No keyboard trap (can Tab out of modal)
  ☐ Skip links present (if needed)

Category: Color & Contrast
  ☐ Text: foreground/background ≥ 4.5:1 (normal text)
  ☐ Text: foreground/background ≥ 3:1 (large text 18pt+)
  ☐ UI components contrast ≥ 3:1
  ☐ No information conveyed by color alone

Category: Structure & Semantics
  ☐ Proper heading hierarchy (h1 → h2 → h3, no h1 → h3)
  ☐ Page has exactly 1 <h1>
  ☐ <main>, <nav>, <header>, <footer> used correctly
  ☐ Lists use <ul>/<ol>/<li> (not <div>)
  ☐ Buttons are <button> not <div onClick>

Category: Forms
  ☐ All inputs have <label> or aria-label
  ☐ Required inputs marked with * and aria-required
  ☐ Form validation errors are announced
  ☐ Submit button has clear label

Category: Dynamic Content & ARIA
  ☐ aria-live="polite" on status updates
  ☐ aria-expanded indicates menu state
  ☐ aria-current on active nav item
  ☐ aria-disabled on disabled buttons (if not using <button disabled>)
  ☐ ARIA roles are not overused (prefer semantic HTML)

Category: Performance
  ☐ Page load time < 3s
  ☐ Animations < 3 times/second (seizure risk)
```

### Report Format

```json
{
  "wcagLevel": "AA",
  "score": 87,
  "issueCount": 5,
  "issues": [
    {
      "severity": "error",
      "type": "image-alt-missing",
      "element": "<img src='product.jpg'>",
      "line": 42,
      "message": "Image missing alt text",
      "wcagCriteria": "1.1.1 Non-text Content (A)",
      "fix": "Add alt='Product thumbnail'"
    },
    {
      "severity": "warning",
      "type": "contrast-insufficient",
      "element": ".secondary-text",
      "color": "#888888",
      "background": "#f5f5f5",
      "ratio": 2.1,
      "required": 4.5,
      "wcagCriteria": "1.4.3 Contrast (Minimum) (AA)",
      "fix": "Use darker color: #333333 (ratio 5.2)"
    },
    {
      "severity": "error",
      "type": "keyboard-trap",
      "element": "<Modal>",
      "message": "User can Tab into modal but not out",
      "wcagCriteria": "2.1.2 No Keyboard Trap (A)",
      "fix": "Add focus management with useRef + useEffect"
    }
  ]
}
```

---

## 📈 Frontend Display

Cette screenshot montre comment le système présente les scores :

```
┌─────────────────────────────────────────────────────┐
│ QUALITY SCORE: 90/100            Grade A+           │
│ Outstanding — 5/5 dimensions passing                │
│─────────────────────────────────────────────────────│
│ BREAKDOWN:                                          │
│                                                     │
│ Code Quality              88    Good  ▓▓▓▓▓▓░░    │
│ Semantic Fidelity         92    Good  ▓▓▓▓▓▓░░    │
│ Completeness              95    Good  ▓▓▓▓▓▓▓░    │
│ Accessibility             90    Good  ▓▓▓▓▓▓░░    │
│ Visual Richness           90    Good  ▓▓▓▓▓▓░░    │
│─────────────────────────────────────────────────────│
│ ✓ Production ready                                  │
│   All dimensions pass the production threshold      │
│   (≥ 80/100)                                        │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Production Threshold

Une application est considérée **"Production Ready"** si :
- **Global Score ≥ 80/100** ET
- **TOUTES les dimensions ≥ 80/100**

```
Example:
  ✅ 92, 88, 95, 90, 90  → Toutes ≥ 80 → PRODUCTION READY
  ❌ 92, 78, 95, 90, 90  → Une < 80 → NEEDS REVIEW
```

---

## 🚀 Comment Améliorer les Scores

### Si Semantic Fidelity est basse (< 80)
- ❌ Prompt trop vague → Ajout de détails
- ❌ LLM a mal compris → Rewrite/regen
- ❌ Code généré = template générique → Demander+ contexte

### Si Code Quality est basse
- ❌ Composants trop gros → Demander decomposition
- ❌ Styles inline → Demander Tailwind
- ❌ TypeScript absent → Demander types explicites

### Si Completeness est basse
- ❌ Prompt ask 5 features, 2 missing → Regen avec prompt plus détaillé
- ❌ LLM a oublié → Ask to regenerate missing part

### Si Accessibility est basse
- ❌ Images sans alt → Add alt texts (Strategy 4 patch)
- ❌ Contraste mauvais → Change colors
- ❌ Pas de labels → Add aria-label/htmlFor

### Si Visual Richness est basse
- ❌ Juste un formulaire → Ajouter components/sections
- ❌ Pas d'icônes → Importer lucide-react
- ❌ Palette mono → Ajouter couleurs cohérentes
