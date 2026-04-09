# 🎯 UI Generator - Complete Structured Plan

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Phase 4: Component Integration (Week 15-16)](#phase-4-component-integration)
4. [Phase 4: Testing & Stabilization (Week 17-18)](#phase-4-testing--stabilization)
5. [Phase 4: Benchmarking (Week 18-19)](#phase-4-benchmarking)
6. [Phase 5: Report & Deployment (Week 21-24)](#phase-5-report--deployment)
7. [Risk Management](#risk-management)
8. [Success Criteria](#success-criteria)

---

## PROJECT OVERVIEW

### What is UI Generator?

A full-stack application that generates functional React UI code from natural language prompts or uploaded documents.

### From Wireframe to Code

```
User Input                Pipeline                Output
  ↓                          ↓                          ↓
"Create a landing page" → [10 Processing Stages] → Working React UI
+ PDF specs                   (orchestrator)         + HTML/CSS
+ Images                                            + Color palette
                                                    + Design system
```

### Tech Stack

| Layer               | Technology                               |
| ------------------- | ---------------------------------------- |
| Frontend            | React 18 + TypeScript + Vite             |
| Backend BFF         | Spring Boot 3 (Java 17)                  |
| Processing Pipeline | FastAPI (Python 3.11)                    |
| LLM                 | Google Gemini, OpenAI, Anthropic, Ollama |
| Auth                | Keycloak 25 (OAuth2/OIDC)                |
| Database            | MongoDB 7                                |
| Storage             | MinIO (S3-compatible)                    |
| Deployment          | Docker Compose                           |

---

## CURRENT STATUS

### ✅ Completed (Weeks 1-14)

**Phase 1-2: Foundation & Core Features**

- ✅ Full Docker Compose infrastructure (6 services)
- ✅ Keycloak OAuth2/OIDC authentication
- ✅ 11 specialized processing stages (10-stage pipeline)
- ✅ Multi-provider LLM support (Gemini, OpenAI, Claude, Ollama)
- ✅ Code generation (HTML/CSS/React)
- ✅ Live preview with iframe
- ✅ File explorer with syntax highlighting
- ✅ Version control & rollback
- ✅ Admin dashboard
- ✅ Chat-based editing
- ✅ Streaming SSE for progress updates

**Phase 3: Added Value**

- ✅ Streaming generation with progress events
- ✅ Multi-domain support (8 domains: ecommerce, dashboard, medical, etc.)
- ✅ Fork/duplicate projects
- ✅ Comprehensive documentation

**Phase 4: Quality & Tests (THIS WEEK - WEEK 14)**

- ✅ 5 pytest tests for FastAPI agents
- ✅ 3 JUnit tests for Spring BFF
- ✅ 4 reusable React components extracted from monolith
- ✅ Component integration guide

### 📊 Code Metrics

| Metric                  | Value                          |
| ----------------------- | ------------------------------ |
| Total Lines of Code     | ~15,000+                       |
| FastAPI AI Pipeline     | ~1,840 LOC                     |
| Spring BFF Service      | ~800 LOC                       |
| React Frontend          | ~3,000 LOC (after refactoring) |
| Tests Created This Week | 15+ tests                      |
| Components Extracted    | 4 components                   |
| Documentation           | Comprehensive                  |

---

## PHASE 4: COMPONENT INTEGRATION

**Timeline**: Week 15-16 (4-5 days)
**Goal**: Integrate 4 extracted components back into AiEditor
**Deliverable**: Modular, testable code with zero breaking changes

### Step 1: ChatPanel Integration

**Time Estimate**: 2 hours
**Difficulty**: Easy
**Files Modified**: `frontend/src/AiEditor.tsx`

#### What This Does

Replaces inline chat UI (~110 lines) with ChatPanel component (~100 lines)

#### Before Integration

```jsx
// Lines 2546-2656 in AiEditor.tsx
{
  rightTab === "chat" ? (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
        {chatMessages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}
          >
            {/* Inline message rendering... */}
          </div>
        ))}
      </div>
      <div className="shrink-0 p-4">{/* Text input, send button... */}</div>
    </div>
  ) : null;
}
```

#### After Integration

```jsx
// Same location, lines 2546-2560
{
  rightTab === "chat" ? (
    <ChatPanel
      chatMessages={chatMessages}
      chatInput={chatInput}
      setChatInput={setChatInput}
      isChatLoading={isChatLoading}
      selectedGenerationId={selectedGenerationId}
      selectedZone={selectedZone}
      diffVisible={diffVisible}
      setDiffVisible={setDiffVisible}
      diffEdits={diffEdits}
      setDiffEdits={setDiffEdits}
      accessToken={accessToken}
      selectedModel={selectedModel}
      onFileUpdated={(newMessages, edits) => {
        setChatMessages(newMessages);
        // Update preview after file edits
      }}
    />
  ) : null;
}
```

#### Integration Steps

1. **Import the component** (add to top of AiEditor.tsx):

```jsx
import { ChatPanel } from "./components";
```

2. **Find the old code** (search for `rightTab === 'chat'`):

- Located around line 2546
- Look for the large JSX block with chat messages

3. **Replace with component**:

- Delete lines 2546-2656 (old inline code)
- Replace with the component JSX above

4. **Test**:

```bash
# Open browser, navigate to app
# Click "Chat" tab
# Verify:
  ✓ Messages appear
  ✓ Can type in input
  ✓ Send button works
  ✓ AI responses show loading spinner
  ✓ Diff display shows file changes
```

5. **Verify no errors**:

- Open browser console (F12)
- Run `/api/generations` to load a project
- Click chat tab and send a message
- Check console for errors

---

### Step 2: CodeViewer Integration

**Time Estimate**: 1.5 hours
**Difficulty**: Easy
**Files Modified**: `frontend/src/AiEditor.tsx`

#### What This Does

Replaces inline code viewer (~14 lines) with CodeViewer component (~120 lines)

#### Before Integration

```jsx
// Lines 2472-2486 in AiEditor.tsx
{
  centerTab === "code" ? (
    <div className="h-full flex flex-col">
      <div
        style={{
          padding: "8px 20px",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 12, color: "#5480ba", fontWeight: 600 }}
        >
          {activeFileName}
        </span>
      </div>
      <div
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ background: "#ffffff" }}
      >
        <pre
          className="mono leading-relaxed"
          style={{
            fontSize: 13,
            color: "#334155",
            padding: "20px 24px",
            margin: 0,
          }}
        >
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  ) : null;
}
```

#### After Integration

```jsx
// Same location, lines 2472-2486
{
  centerTab === "code" ? (
    <CodeViewer
      tree={tree}
      setTree={setTree}
      activeFileId={activeFileId}
      setActiveFileId={setActiveFileId}
      effectiveFileContents={effectiveFileContents}
    />
  ) : null;
}
```

#### Integration Steps

1. **Import the component** (add to top of AiEditor.tsx):

```jsx
import { ChatPanel, CodeViewer } from "./components";
```

2. **Find the old code** (search for `centerTab === 'code'`):

- Located around line 2472
- Look for the div with code display

3. **Replace with component**:

- Delete lines 2472-2486 (old inline code)
- Replace with CodeViewer component JSX

4. **Test**:

```bash
# In browser:
# Click "Code" tab
# Verify:
  ✓ File tree appears on left
  ✓ Can click files to select
  ✓ Code displays in editor
  ✓ Folder expand/collapse works
  ✓ Syntax highlighting colors appear
  ✓ Line count shows at bottom
```

5. **Verify interactions**:

- Load a project
- Switch to Code tab
- Click different files in tree
- Verify code updates correctly

---

### Step 3: Preview Integration

**Time Estimate**: 2 hours
**Difficulty**: Medium (largest component)
**Files Modified**: `frontend/src/AiEditor.tsx`

#### What This Does

Replaces inline preview code (~200 lines) with Preview component (~130 lines)

#### Before Integration

```jsx
// Lines 2271-2471 in AiEditor.tsx
{
  centerTab === "preview" ? (
    <div className="h-full flex flex-col">
      {/* 200 lines of preview UI, device modes, inspect overlay */}
    </div>
  ) : null;
}
```

#### After Integration

```jsx
// Same location, lines 2271-2290
{
  centerTab === "preview" ? (
    <Preview
      deviceMode={deviceMode}
      setDeviceMode={setDeviceMode}
      previewScale={previewScale}
      setPreviewScale={setPreviewScale}
      previewSrcDoc={previewSrcDoc}
      buildPct={buildPct}
      isBuilding={isBuilding}
      buildMsg={buildMsg}
      buildError={buildError}
      inspectMode={inspectMode}
      setInspectMode={setInspectMode}
      selectedZone={selectedZone}
      hoverZoneBox={hoverZoneBox}
      previewReloadCount={previewReloadCount}
    />
  ) : null;
}
```

#### Integration Steps

1. **Import the component** (add to top of AiEditor.tsx):

```jsx
import { ChatPanel, CodeViewer, Preview } from "./components";
```

2. **Find the old code** (search for `centerTab === 'preview'`):

- Located around line 2271
- Look for the large preview section with iframe

3. **Replace with component**:

- Delete lines 2271-2471 (old inline code)
- Replace with Preview component JSX

4. **Test**:

```bash
# In browser:
# Click "Preview" tab
# Verify:
  ✓ Live preview iframe shows
  ✓ Device buttons work (🖥️ Desktop, 📱 Tablet, 📲 Mobile)
  ✓ Zoom slider changes preview size
  ✓ Build progress bar appears during generation
  ✓ Inspect button toggles on/off
  ✓ Hover shows element highlights
  ✓ Error display shows if build fails
```

5. **Test device modes**:

- Click each device button
- Verify preview size changes
- Verify layout adapts
- Check responsive design

6. **Test inspect mode**:

- Click "Inspect" button
- Hover over elements in preview
- Verify blue highlight box appears
- Click an element
- Verify it's selectable for editing

---

### Step 4: VersionHistory Integration

**Time Estimate**: 1.5 hours
**Difficulty**: Easy (new feature, not replacement)
**Files Modified**: `frontend/src/AiEditor.tsx`

#### What This Does

Adds VersionHistory component as new sidebar panel (currently no version UI)

#### Where to Add

```jsx
// Add after the right sidebar chat panel (around line 2880)
{
  rightTab === "versions" && (
    <VersionHistory
      versions={versions}
      versionsLoading={versionsLoading}
      versionsError={versionsError}
      selectedGenerationId={selectedGenerationId}
      onRollback={doRollback}
      onClose={() => setRightTab("chat")}
    />
  );
}
```

#### Also Update Tab Navigation

```jsx
// Around line 2518, update the tab list:
{([
  { id: 'chat', label: 'Chat' },
  { id: 'console', label: 'Console' },
  { id: 'logs', label: 'History' },
  { id: 'versions', label: 'Versions' },  // ← ADD THIS
] as const).map((t) => {
  // ... existing tab button code
})}
```

#### Integration Steps

1. **Import the component** (add to top of AiEditor.tsx):

```jsx
import { ChatPanel, CodeViewer, Preview, VersionHistory } from "./components";
```

2. **Add the component** at line 2880:

```jsx
{
  rightTab === "versions" && (
    <VersionHistory
      versions={versions}
      versionsLoading={versionsLoading}
      versionsError={versionsError}
      selectedGenerationId={selectedGenerationId}
      onRollback={doRollback}
      onClose={() => setRightTab("chat")}
    />
  );
}
```

3. **Update tab navigation** (around line 2518):

- Add `{ id: 'versions', label: 'Versions' }` to the tab list

4. **Test**:

```bash
# In browser:
# Generate a project
# Make some edits (chat)
# Click "Versions" tab
# Verify:
  ✓ Version list appears
  ✓ Shows v1, v2, v3, etc.
  ✓ Shows timestamps for each
  ✓ Shows file changes (+lines/-lines)
  ✓ "Restore" button appears for older versions
  ✓ Current version marked as "Active"
  ✓ Clicking restore rollback works
```

---

### Integration Testing Checklist

After completing all 4 integrations:

**Functional Tests**

- [ ] Preview tab works (device modes, zoom, inspect)
- [ ] Code tab works (file tree, syntax highlighting)
- [ ] Chat tab works (messages, sending, diffs)
- [ ] Versions tab works (list, rollback, restore)
- [ ] Can switch between tabs without errors
- [ ] Console has no errors (F12)

**Cross-Component Tests**

- [ ] Edit in chat → Code viewer updates
- [ ] Edit in chat → Preview refreshes
- [ ] Edit in chat → New version created
- [ ] Rollback in versions → Code and preview both update
- [ ] All state stays in sync

**Browser Compatibility**

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)

**Responsive Design**

- [ ] Works on 1920px (desktop)
- [ ] Works on 1440px (laptop)
- [ ] Works on 1024px (tablet)

---

## PHASE 4: TESTING & STABILIZATION

**Timeline**: Week 17-18 (3-4 days)
**Goal**: Ensure all components work correctly, tests pass
**Deliverable**: Production-ready code

### Step 1: Run Test Suite

**FastAPI Tests**

```bash
cd fastapi-ai
pip install -r requirements.txt
pytest tests/ -v

# Expected output:
# test_llm_provider.py::test_provider_has_required_methods PASSED
# test_llm_provider.py::test_chat_json_extracts_json_from_text PASSED
# test_planner_agent.py::test_planner_agent_initializes PASSED
# ... (all tests should pass)
```

**Spring BFF Tests**

```bash
cd spring-bff
mvn clean test

# Expected output:
# [INFO] BUILD SUCCESS
# [INFO] Tests run: 23, Failures: 0, Errors: 0
```

**Frontend Tests** (Manual E2E)

```bash
cd frontend
npm run dev

# Open http://localhost:5173
# Manually test:
  ✓ Generate a project
  ✓ Switch between all tabs
  ✓ Edit via chat
  ✓ Check version history
  ✓ Rollback to older version
  ✓ Export as ZIP
  ✓ Fork project
```

### Step 2: Stabilization Tasks

**If Tests Fail**

| Error                   | Solution                                  |
| ----------------------- | ----------------------------------------- |
| Component not rendering | Check props are passed correctly          |
| State not updating      | Verify callback is called                 |
| Styling issues          | Use browser DevTools to inspect CSS       |
| API errors              | Check network tab, verify backend running |

**Performance Optimization**

```jsx
// Wrap components with React.memo for performance
export const ChatPanel = React.memo(function ChatPanel(props) {
  return (/* component JSX */)
})
```

**Add Error Boundaries** (optional)

```jsx
class ErrorBoundary extends React.Component {
  render() {
    if (this.state.hasError) {
      return <p>Component error. Check console.</p>;
    }
    return this.props.children;
  }
}
```

---

## PHASE 4: BENCHMARKING

**Timeline**: Week 18-19 (4-5 days)
**Goal**: Measure performance and quality
**Deliverable**: Benchmark report + feature comparison

### Benchmark Test Suite

Create 10 standard prompts to test:

```javascript
const BENCHMARK_PROMPTS = [
  {
    name: "Landing Page",
    prompt:
      "Create a modern landing page for a SaaS product with hero section, features, pricing, and CTA",
    domain: "landing",
    expectedTime: "60-90 seconds",
    qualityMetrics: ["hero_section", "pricing_table", "cta_button"],
  },
  {
    name: "Dashboard",
    prompt:
      "Build an analytics dashboard with charts, KPI cards, data tables, and user management",
    domain: "dashboard",
    expectedTime: "90-120 seconds",
    qualityMetrics: ["chart_renders", "kpi_cards", "data_table"],
  },
  {
    name: "E-commerce Store",
    prompt:
      "Create an e-commerce site with product grid, filters, shopping cart, and checkout",
    domain: "ecommerce",
    expectedTime: "120-180 seconds",
    qualityMetrics: ["product_grid", "filters", "cart_functionality"],
  },
  // ... 7 more prompts
];
```

### Measurement Framework

**Time Metrics**

- Generation time (seconds)
- Per-agent timing breakdown
- Frontend rendering time

**Quality Metrics**

- HTML validity (w3c validator)
- CSS validity
- JavaScript errors (0 expected)
- Accessibility score (WCAG)
- Visual similarity to human design

**User Experience**

- Can user easily understand the UI?
- Does generated code follow best practices?
- Is component reusability high?
- Are colors/typography professional?

### Comparison Table: vs Competitors

Create a feature matrix comparing:

| Feature           | Your Project   | Lovable       | v0.dev  |
| ----------------- | -------------- | ------------- | ------- |
| Self-hosted       | ✅ Yes         | ❌ No         | ❌ No   |
| Document input    | ✅ PDF/Image   | ❌ No         | ❌ No   |
| Multi-LLM support | ✅ 7 providers | ❌ No         | ❌ No   |
| Offline mode      | ✅ Ollama      | ❌ No         | ❌ No   |
| Cost              | ✅ Free        | ❌ $20/mo     | ❌ Paid |
| Versioning        | ✅ Rollback    | ⚠️ Paid users | ✅ Yes  |
| Code export       | ✅ ZIP         | ✅ Yes        | ✅ Yes  |
| Admin controls    | ✅ Full        | ❌ No         | ❌ No   |
| Audit logs        | ✅ Yes         | ❌ No         | ❌ No   |

---

## PHASE 5: REPORT & DEPLOYMENT

**Timeline**: Week 21-24 (4 weeks)
**Goal**: Finalize project, prepare for defense
**Deliverable**: Live deployment + technical report

### Step 1: Deployment (Week 21)

**Option A: Deploy on VPS (Recommended)**

```bash
# 1. Get a VPS (DigitalOcean, Linode, AWS, etc.)
# 2. SSH into server
ssh root@your-vps-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 4. Clone repo
git clone https://github.com/your-org/ai-ui-generator.git
cd ai-ui-generator

# 5. Set environment variables
cp .env.example .env
# Edit .env with production values

# 6. Start all services
docker compose up -d

# 7. Verify services
docker compose ps
# All 6 containers should be running

# 8. Access application
# Frontend: http://your-vps-ip:5173
# API: http://your-vps-ip:8081
# FastAPI: http://your-vps-ip:8000
```

**Option B: Deploy on University Server**

Contact your university IT to:

- Allocate server space
- Configure domain name (optional)
- Set up SSL certificate (https://)
- Open firewall ports

**Option C: Deploy on Render**

```bash
# 1. Create Render account
# 2. Connect repo to Render
# 3. Add environment variables
# 4. Deploy with one click
```

### Step 2: Write Technical Report (Week 22-23)

**Report Structure** (~20-30 pages)

```
1. Introduction (2 pages)
   - Project context (AI code generation market)
   - Problem statement
   - Solution overview

2. Architecture (4 pages)
   - System design (diagram)
   - Component interactions
   - Tech stack justification
   - Database schema

3. Implementation (8 pages)
   - Multi-agent pipeline (10 agents)
   - Code generation algorithm
   - Streaming architecture
   - Error recovery mechanism
   - LLM provider abstraction

4. Evaluation (5 pages)
   - Benchmark results (10 prompts)
   - Quality metrics
   - Comparison with Lovable/v0.dev
   - User testing results (if available)

5. Conclusion (2 pages)
   - Key achievements
   - Limitations
   - Future work
```

### Step 3: Create Defense Presentation (Week 23)

**Slides**

- 15-20 slides maximum
- Slide 1: Title + team
- Slide 2: Problem & motivation
- Slide 3-5: Architecture overview
- Slide 6-10: Live demo (pre-recorded or live)
- Slide 11-14: Results & evaluation
- Slide 15: Future work
- Slide 16: Questions?

**Demo Video** (3-5 minutes)

- Show landing page
- Create a project with a prompt
- Show live preview updating
- Edit via chat
- Show rollback feature
- Export as ZIP

### Step 4: Final Polish (Week 24)

**Code Quality**

- [ ] All tests pass (`pytest tests/`, `mvn test`)
- [ ] No console errors or warnings
- [ ] All components documented
- [ ] Code follows style guide

**Documentation**

- [ ] README.md complete and clear
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component documentation (Storybook optional)
- [ ] Deployment guide
- [ ] Configuration guide

**Performance**

- [ ] Frontend loads in < 3 seconds
- [ ] Generation completes in < 5 minutes
- [ ] No memory leaks
- [ ] Responsive on mobile

---

## RISK MANAGEMENT

### Known Risks & Mitigation

| Risk                                 | Impact | Probability | Mitigation                                |
| ------------------------------------ | ------ | ----------- | ----------------------------------------- |
| Component integration breaks UI      | High   | Medium      | Test each component separately first      |
| LLM API quota exceeded               | High   | Low         | Use local Ollama as fallback              |
| Database migration issues            | High   | Low         | Regular backups, test migrations          |
| Deployment fails                     | Medium | Low         | Use Docker, test locally first            |
| Performance bottleneck in generation | Medium | Medium      | Monitor agent timings, optimize LLM calls |
| Streaming SSE compatibility          | Low    | Low         | Already implemented, tested               |

### Rollback Plan

**If something breaks**:

1. Identify which component caused the issue
2. Revert to previous Git commit
3. Fix the issue locally
4. Test thoroughly
5. Re-commit

```bash
# Example: Rollback last commit
git reset --soft HEAD~1
git restore frontend/src/AiEditor.tsx
# Fix the issue
git commit -m "fix: resolve component integration issue"
```

---

## SUCCESS CRITERIA

### Phase 4 Success (Component Integration)

✅ All 4 components integrated into AiEditor
✅ Zero breaking changes to existing functionality
✅ All tabs work (preview, code, chat, versions, console, logs)
✅ Test suite passes (15+ tests)
✅ No console errors
✅ Browser DevTools shows clean performance
✅ Can handle complex projects without crashes

### Phase 4 Success (Benchmarking)

✅ 10 benchmark prompts tested
✅ Average generation time measured
✅ Quality metrics documented
✅ Feature comparison created
✅ Report draft written

### Phase 5 Success (Deployment)

✅ Application deployed and accessible
✅ All services online (Frontend, BFF, FastAPI, DB, etc.)
✅ HTTPS certificate installed (bonus)
✅ Domain points to server (bonus)
✅ Technical report completed
✅ Defense presentation ready
✅ Demo video recorded

### PFE Evaluation Success

✅ Solves real problem (AI code generation)
✅ Significant technical complexity (multi-agent, LLM, DevOps)
✅ Professional implementation (tests, documentation, deployment)
✅ Unique value vs competitors (self-hosted, multi-LLM, offline)
✅ Clear evaluation & benchmarking
✅ Well-presented report & defense
✅ Code is maintainable & extensible

---

## TIMELINE SUMMARY

```
Week 14: ✅ Tests + Components Extracted
├─ Priority 1: Verify Streaming SSE (DONE)
├─ Priority 2: Add Test Suite (DONE)
└─ Priority 3: Extract Components (DONE)

Week 15-16: 🔄 Component Integration
├─ Step 1: ChatPanel (2h)
├─ Step 2: CodeViewer (1.5h)
├─ Step 3: Preview (2h)
└─ Step 4: VersionHistory (1.5h)

Week 17-18: 🔄 Testing & Stabilization
├─ Run test suite
├─ Fix any issues
├─ Performance optimization
└─ E2E manual testing

Week 18-19: 📊 Benchmarking
├─ Run 10 benchmark prompts
├─ Create comparison matrix
└─ Write evaluation report

Week 21-24: 📦 Deployment & Report
├─ Week 21: Deploy to VPS
├─ Week 22: Write technical report
├─ Week 23: Create presentation + demo
└─ Week 24: Final polish & defense
```

---

## HOW TO USE THIS PLAN

1. **Print it out** (optional) and keep nearby
2. **Follow each section in order**
3. **Check off items** as you complete them
4. **Update timeline** if needed (adjust weeks if falling behind)
5. **Report blockers** immediately (don't let them pile up)
6. **Test thoroughly** at each phase (don't skip testing)
7. **Document everything** as you go (makes report writing easier)

---

## QUESTIONS?

If you're stuck, check:

1. **COMPONENT_INTEGRATION.md** — Detailed integration guide
2. **MEMORY.md** — Project context & history
3. **Chrome DevTools** — Check console for errors (F12)
4. **Git log** — See what changed (`git log --oneline`)
5. **Docker logs** — Check if backend services are running (`docker compose logs`)

Good luck! 🚀
