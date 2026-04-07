# Component Integration Guide

This document describes how to integrate the extracted components back into AiEditor.tsx to complete the refactoring.

## Current Status
✅ 4 components extracted and committed:
- ChatPanel.tsx
- CodeViewer.tsx
- Preview.tsx
- VersionHistory.tsx

## Integration Steps

### Step 1: ChatPanel Integration
**Location**: Lines 2546-2656 in AiEditor.tsx

**Current**: Inline chat UI with message history

**Action**:
```jsx
// BEFORE (current inline code)
{rightTab === 'chat' ? (
  <div className="flex flex-col flex-1 overflow-hidden">
    {/* 110 lines of chat UI... */}
  </div>
) : null}

// AFTER (using component)
{rightTab === 'chat' ? (
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
      setChatMessages(newMessages)
      setDiffEdits(edits)
      // Also update preview
    }}
  />
) : null}
```

**Props Needed**:
- All state: `chatMessages`, `chatInput`, `isChatLoading`, etc.
- All setters
- Callbacks: `onFileUpdated`

---

### Step 2: CodeViewer Integration
**Location**: Lines 2472-2486 in AiEditor.tsx

**Current**: Inline file tree + code display

**Action**:
```jsx
// BEFORE
{centerTab === 'code' ? (
  <div className="h-full flex flex-col">
    {/* 14 lines of code viewer... */}
  </div>
) : null}

// AFTER
{centerTab === 'code' ? (
  <CodeViewer
    tree={tree}
    setTree={setTree}
    activeFileId={activeFileId}
    setActiveFileId={setActiveFileId}
    effectiveFileContents={effectiveFileContents}
  />
) : null}
```

**Props Needed**:
- `tree`, `setTree` (already exist in AiEditor)
- `activeFileId`, `setActiveFileId` (already exist)
- `effectiveFileContents` (already computed with useMemo)

---

### Step 3: Preview Integration
**Location**: Lines 2271-2471 in AiEditor.tsx

**Current**: Inline iframe with device modes + inspect overlay

**Action**:
```jsx
// BEFORE
{centerTab === 'preview' ? (
  <div className="h-full flex flex-col">
    {/* 200 lines of preview UI... */}
  </div>
) : null}

// AFTER
{centerTab === 'preview' ? (
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
) : null}
```

**Props Needed**:
- All state: `deviceMode`, `previewScale`, `buildPct`, etc.
- All setters
- All already exist in AiEditor

---

### Step 4: VersionHistory Integration
**Location**: Create new sidebar or modal

**Current**: No dedicated UI

**Action**: Add as a collapsible sidebar or modal
```jsx
{showVersionHistory && (
  <VersionHistory
    versions={versions}
    versionsLoading={versionsLoading}
    versionsError={versionsError}
    selectedGenerationId={selectedGenerationId}
    onRollback={doRollback}
    onClose={() => setShowVersionHistory(false)}
  />
)}
```

**New State Needed**:
- `showVersionHistory` (boolean toggle)

---

## Integration Checklist

### Before You Start
- [ ] Create a new branch (`git checkout -b refactor/aieditor-components`)
- [ ] Run tests to ensure current AiEditor works
- [ ] Have a rollback plan

###Integration Process
1. [ ] **ChatPanel**: Replace lines 2546-2656
   - Test: Chat messages appear, can send messages
   - Test: Diff display works

2. [ ] **CodeViewer**: Replace lines 2472-2486
   - Test: File tree renders
   - Test: Code syntax highlighting works
   - Test: File selection changes preview

3. [ ] **Preview**: Replace lines 2271-2471
   - Test: Device modes switch (desktop/tablet/mobile)
   - Test: Zoom slider works
   - Test: Inspect mode toggles
   - Test: iframe updates

4. [ ] **VersionHistory**: Add new panel
   - Test: Versions display
   - Test: Rollback button works
   - Test: Can close panel

### After Integration
- [ ] Run full test suite
- [ ] Test all tabs (preview, code, terminal, chat, console, logs)
- [ ] Test with multiple devices
- [ ] Check responsive design
- [ ] Commit: `git commit -m "refactor: integrate extracted components into AiEditor"`

---

## Size Reduction Summary

| Component | Lines Removed | Component Size |
|-----------|---------------|-----------------|
| ChatPanel | ~110          | ~100 LOC        |
| CodeViewer | ~14           | ~120 LOC        |
| Preview | ~200           | ~130 LOC        |
| Total reduction | **~324** | **~350 total** |

**Result**: AiEditor: 2,950 → ~2,600 LOC (13% reduction) ✅
Components: Reusable, testable, maintainable ✅

---

## FAQs

**Q: Why not integrate all at once?**
A: Large refactors risk breaking production. This lists steps that integrate components one-at-a-time with testability at each step.

**Q: Do I need to change AiEditor state management?**
A: No. All state stays in AiEditor. Components are "dumb" (receive props, call callbacks). This is the simplest, safest approach.

**Q: What if a component doesn't work?**
A: The component implementations are independent. Test each component separately in isolation first, then integrate.

**Q: Can I revert easily?**
A: Yes. Each component replaces a specific inline section. If something breaks, revert the specific section or the whole commit.

---

## Next Steps

1. Complete ChatPanel integration (lines 2546-2656)
2. Complete CodeViewer integration (lines 2472-2486)
3. Complete Preview integration (lines 2271-2471)
4. Add VersionHistory sidebar
5. Run full E2E tests
6. Commit & celebrate! 🎉
