import React, { useRef, useState, useCallback, useEffect } from 'react'

interface PreviewProps {
  deviceMode: 'desktop' | 'tablet' | 'mobile'
  setDeviceMode: (mode: 'desktop' | 'tablet' | 'mobile') => void
  previewScale: number
  setPreviewScale: (scale: number) => void
  previewSrcDoc: string | null
  builtProjectUrl: string | null
  buildPct: number
  isBuilding: boolean
  buildMsg: string
  buildError: string | null
  inspectMode: boolean
  setInspectMode: (enabled: boolean) => void
  selectedZone: { label: string; description: string } | null
  hoverZoneBox: { top: string; height: string; left: string; width: string } | null
  previewReloadCount: number
  onElementSelected?: (elementInfo: ElementInfo) => void
  onStyleChange?: (change: StyleChange) => void | Promise<void>
  previewOverrideCSS?: string | null
  onRepair?: () => void
  isRepairing?: boolean
}

export interface ElementInfo {
  tagName: string
  className: string
  id: string
  textContent: string
  path: string
  rect: { top: number; left: number; width: number; height: number }
  styles?: ElementStyles
}

export interface ElementStyles {
  color: string
  backgroundColor: string
  fontSize: string
  fontFamily: string
  fontWeight: string
  padding: string
  margin: string
  borderRadius: string
  textAlign: string
}

export interface StyleChange {
  element: ElementInfo
  property: string
  oldValue: string
  newValue: string
}

const DEVICE_SIZES: Record<string, { width: string; label: string }> = {
  desktop: { width: '100%', label: '🖥️ Desktop' },
  tablet: { width: '768px', label: '📱 Tablet' },
  mobile: { width: '375px', label: '📲 Mobile' },
}

// Script to inject into iframe for element inspection
const INSPECT_SCRIPT = `
(function() {
  if (window.__inspectInitialized) return;
  window.__inspectInitialized = true;

  // ── API proxy: rewrite /api/* calls to /preview/{id}/api/* ────────────────────
  // Extract generation ID from URL path like /preview/ABC123DEF/dist/index.html
  const pathMatch = window.location.pathname.match(/\\/preview\\/([a-zA-Z0-9_-]+)/);
  const generationId = pathMatch ? pathMatch[1] : '';
  if (generationId) {
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
      if (typeof resource === 'string' && resource.startsWith('/api/')) {
        const newPath = '/preview/' + generationId + resource;
        console.log('\\u2705 API proxy: ' + resource + ' → ' + newPath);
        return originalFetch(newPath, init);
      }
      return originalFetch(resource, init);
    };
  }

  let hoverBox = null;
  let selectBox = null;
  let selectLabel = null;
  let cursorTip = null;
  let inspectEnabled = false;
  let selectedEl = null;

  // ── overlay helpers ────────────────────────────────────────────────────────
  function mkHoverBox() {
    const d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;pointer-events:none;display:none',
      'border:2px dashed #a78bfa',
      'background:rgba(167,139,250,0.08)',
      'box-shadow:0 0 0 1px rgba(167,139,250,0.4)',
      'border-radius:3px',
      'z-index:2147483645',
      'transition:top .07s,left .07s,width .07s,height .07s',
    ].join(';');
    document.documentElement.appendChild(d);
    return d;
  }

  function mkSelectBox() {
    const d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;pointer-events:none;display:none',
      'border:2px solid #019cda',
      'background:rgba(1,156,218,0.1)',
      'box-shadow:0 0 0 3px rgba(1,156,218,0.25),inset 0 0 0 1px rgba(1,156,218,0.3)',
      'border-radius:3px',
      'z-index:2147483646',
    ].join(';');
    document.documentElement.appendChild(d);
    return d;
  }

  function mkSelectLabel() {
    const d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;pointer-events:none;display:none',
      'background:#019cda;color:#fff',
      'font:600 11px/1 -apple-system,sans-serif',
      'padding:3px 7px;border-radius:4px',
      'white-space:nowrap',
      'box-shadow:0 2px 8px rgba(0,0,0,.35)',
      'z-index:2147483647',
    ].join(';');
    document.documentElement.appendChild(d);
    return d;
  }

  function mkCursorTip() {
    const d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;pointer-events:none;display:none',
      'background:rgba(15,15,20,0.88);color:#e2e8f0',
      'font:500 11px/1.4 -apple-system,sans-serif',
      'padding:4px 8px;border-radius:5px',
      'border:1px solid rgba(255,255,255,.1)',
      'white-space:nowrap',
      'box-shadow:0 4px 12px rgba(0,0,0,.4)',
      'z-index:2147483647',
      'max-width:260px;overflow:hidden;text-overflow:ellipsis',
    ].join(';');
    document.documentElement.appendChild(d);
    return d;
  }

  function shortClass(el) {
    if (!el.className || typeof el.className !== 'string') return '';
    const first = el.className.trim().split(/\\s+/)[0];
    return first ? '.' + first : '';
  }

  function labelFor(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else s += shortClass(el);
    return s;
  }

  function getFullPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement && parts.length < 4) {
      parts.unshift(labelFor(cur));
      cur = cur.parentElement;
    }
    return parts.join(' › ');
  }

  function placeBox(box, rect) {
    box.style.top    = rect.top  + window.scrollY + 'px';
    box.style.left   = rect.left + window.scrollX + 'px';
    box.style.width  = rect.width  + 'px';
    box.style.height = rect.height + 'px';
    box.style.display = 'block';
  }

  function placeSelectLabel(rect, text) {
    if (!selectLabel) return;
    selectLabel.textContent = text;
    const MARGIN = 4;
    let top = rect.top + window.scrollY - 22;
    if (top < 4) top = rect.top + window.scrollY + rect.height + MARGIN;
    selectLabel.style.top  = top + 'px';
    selectLabel.style.left = Math.max(4, rect.left + window.scrollX) + 'px';
    selectLabel.style.display = 'block';
  }

  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color, backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize, fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight, padding: cs.padding,
      margin: cs.margin, borderRadius: cs.borderRadius, textAlign: cs.textAlign
    };
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
    const m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!m) return rgb;
    return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
  }

  // ── event handlers ─────────────────────────────────────────────────────────
  function handleMouseMove(e) {
    if (!inspectEnabled) return;
    const el = e.target;
    if (el === hoverBox || el === selectBox || el === selectLabel || el === cursorTip) return;

    if (!hoverBox)   hoverBox   = mkHoverBox();
    if (!cursorTip)  cursorTip  = mkCursorTip();

    const rect = el.getBoundingClientRect();
    placeBox(hoverBox, rect);

    // cursor tooltip: tag + class + dimensions
    const dim = Math.round(rect.width) + ' × ' + Math.round(rect.height);
    cursorTip.textContent = labelFor(el) + '  ' + dim;
    cursorTip.style.display = 'block';
    // offset so it doesn't sit under the cursor
    const TX = e.clientX + 14, TY = e.clientY + 14;
    cursorTip.style.left = TX + 'px';
    cursorTip.style.top  = TY + 'px';
  }

  function handleClick(e) {
    if (!inspectEnabled) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (el === hoverBox || el === selectBox || el === selectLabel || el === cursorTip) return;

    selectedEl = el;
    if (!selectBox)   selectBox   = mkSelectBox();
    if (!selectLabel) selectLabel = mkSelectLabel();

    const rect = el.getBoundingClientRect();
    placeBox(selectBox, rect);
    placeSelectLabel(rect, labelFor(el));

    // Only send serializable data (no DOM elements, SVG objects, etc.)
    const styles = getComputedStyles(el);
    try {
      window.parent.postMessage({
        type: 'element-selected',
        payload: {
          tagName: el.tagName.toLowerCase(),
          className: el.className || '',
          id: el.id || '',
          textContent: (el.textContent || '').slice(0, 100).trim(),
          path: getFullPath(el),
          rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
          styles: {
            color: rgbToHex(styles.color),
            backgroundColor: rgbToHex(styles.backgroundColor),
            fontSize: styles.fontSize, fontFamily: styles.fontFamily,
            fontWeight: styles.fontWeight, padding: styles.padding,
            margin: styles.margin, borderRadius: styles.borderRadius, textAlign: styles.textAlign
          }
        }
      }, '*');
    } catch (err) {
      console.warn('Failed to send element-selected message:', err);
    }
  }

  function handleMouseLeave() {
    if (hoverBox)  hoverBox.style.display  = 'none';
    if (cursorTip) cursorTip.style.display = 'none';
  }

  // ── message bus ───────────────────────────────────────────────────────────
  window.addEventListener('message', function(e) {
    if (e.data.type === 'set-inspect-mode') {
      inspectEnabled = e.data.enabled;
      document.body.style.cursor = inspectEnabled ? 'crosshair' : '';
      if (!inspectEnabled) {
        [hoverBox, selectBox, selectLabel, cursorTip].forEach(function(n) {
          if (n) n.style.display = 'none';
        });
        selectedEl = null;
      }
    } else if (e.data.type === 'apply-style') {
      if (selectedEl) selectedEl.style[e.data.property] = e.data.value;
    } else if (e.data.type === 'inject-preview-css') {
      var existing = document.getElementById('__ai_preview_override');
      if (e.data.css) {
        if (!existing) {
          existing = document.createElement('style');
          existing.id = '__ai_preview_override';
          document.head.appendChild(existing);
        }
        existing.textContent = e.data.css;
      } else if (existing) {
        existing.parentNode.removeChild(existing);
      }
    }
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click',     handleClick,     true);
  document.addEventListener('mouseleave', handleMouseLeave, true);

  window.parent.postMessage({ type: 'inspect-ready' }, '*');
})();
`

export const Preview: React.FC<PreviewProps> = ({
  deviceMode,
  setDeviceMode,
  previewScale,
  setPreviewScale,
  previewSrcDoc,
  builtProjectUrl,
  buildPct,
  isBuilding,
  buildMsg,
  buildError,
  inspectMode,
  setInspectMode,
  selectedZone,
  hoverZoneBox,
  previewReloadCount,
  onElementSelected,
  onStyleChange,
  previewOverrideCSS,
  onRepair,
  isRepairing,
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeError, setIframeError] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [inspectReady, setInspectReady] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [editedStyles, setEditedStyles] = useState<Partial<ElementStyles>>({})
  const [activeTab, setActiveTab] = useState<'style' | 'layout'>('style')
  const [isApplying, setIsApplying] = useState(false)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !previewContainerRef.current) return
      const cr = previewContainerRef.current.getBoundingClientRect()
      setPanelPos({
        x: Math.max(0, Math.min(e.clientX - cr.left - dragOffset.current.x, cr.width - 310)),
        y: Math.max(0, Math.min(e.clientY - cr.top  - dragOffset.current.y, cr.height - 80)),
      })
    }
    const onUp = () => { isDragging.current = false; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const deviceWidth = DEVICE_SIZES[deviceMode].width

  // Common font families
  const fontFamilies = [
    'Inter, sans-serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Roboto, sans-serif',
    'Open Sans, sans-serif',
  ]

  // Common font sizes
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px']

  // Apply style change to iframe (live preview)
  const applyStyleToIframe = useCallback((property: string, value: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'apply-style', property, value },
        '*'
      )
    }
  }, [])

  // Handle style property change
  const handleStyleChange = useCallback((property: keyof ElementStyles, value: string) => {
    setEditedStyles(prev => ({ ...prev, [property]: value }))
    
    // Apply live preview
    const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase()
    applyStyleToIframe(property, value)
    
    // Notify parent for AI code update
    if (selectedElement && onStyleChange) {
      onStyleChange({
        element: selectedElement,
        property: cssProp,
        oldValue: selectedElement.styles?.[property] || '',
        newValue: value
      })
    }
  }, [selectedElement, onStyleChange, applyStyleToIframe])

  // Listen for messages from iframe (with error handling)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        // Ignore cross-origin messages and extension messages
        if (!e.data || typeof e.data !== 'object') return

        if (e.data.type === 'inspect-ready') {
          setInspectReady(true)
          // Send current inspect mode state
          try {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'set-inspect-mode', enabled: inspectMode },
              '*'
            )
          } catch (err) {
            console.warn('Could not send inspect mode to iframe:', err)
          }
        } else if (e.data.type === 'element-selected' && e.data.payload) {
          const info = e.data.payload as ElementInfo
          setSelectedElement(info)
          setEditedStyles({})  // Reset edited styles for new element
          onElementSelected?.(info)
        }
      } catch (err) {
        console.warn('Error handling iframe message:', err)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [inspectMode, onElementSelected])

  // Send inspect mode changes to iframe
  useEffect(() => {
    if (inspectReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'set-inspect-mode', enabled: inspectMode },
        '*'
      )
    }
    if (!inspectMode) {
      setSelectedElement(null)
      setEditedStyles({})
    }
  }, [inspectMode, inspectReady])

  // Send preview CSS override to iframe when suggestion is hovered
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'inject-preview-css', css: previewOverrideCSS ?? '' },
        '*'
      )
    }
  }, [previewOverrideCSS])

  // Inject inspect script when iframe loads
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
    setInspectReady(false)

    try {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow || !iframe?.contentDocument) {
        console.error('✗ Iframe contentWindow/contentDocument not available (cross-origin?)')
        return
      }

      console.log('✓ Iframe loaded, waiting for DOM ready...')

      // Wait for the iframe document to be fully ready
      const injectScript = () => {
        try {
          const doc = iframe.contentDocument
          if (!doc?.body) {
            console.warn('⏳ Document body not ready yet, retrying...')
            setTimeout(injectScript, 100)
            return
          }

          console.log('✓ iframe DOM ready, injecting inspect script...')
          const script = doc.createElement('script')
          script.textContent = INSPECT_SCRIPT
          doc.body.appendChild(script)
          console.log('✓ Inspect script injected successfully')
        } catch (err) {
          console.error('✗ Error injecting script:', err)
        }
      }

      injectScript()
    } catch (err) {
      console.error('✗ Error in handleIframeLoad:', err)
    }
  }, [])

  const handleIframeError = () => {
    setIframeError(true)
    setIframeLoading(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#f1f5f9' }}>
      {/* Build Status / Error */}
      {isBuilding && (
        <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-slate-300">{buildMsg}</span>
            <div className="ml-auto w-32 bg-slate-600 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${buildPct}%` }}></div>
            </div>
            <span className="text-xs text-slate-300">{buildPct}%</span>
          </div>
        </div>
      )}

      {buildError && (
        <div style={{ background: 'rgba(127,29,29,.25)', borderBottom: '1px solid rgba(185,28,28,.4)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12, color: '#fca5a5' }}>
            <strong>Build Error:</strong> {buildError}
          </div>
          {onRepair && (
            <button
              onClick={onRepair}
              disabled={isRepairing}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: isRepairing ? 'rgba(1,156,218,.4)' : 'linear-gradient(135deg,#019cda,#0369a1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: isRepairing ? 'not-allowed' : 'pointer' }}
            >
              {isRepairing ? '⟳ Fixing…' : '🔧 Fix with AI'}
            </button>
          )}
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto" style={{ background: '#ffffff' }} ref={previewContainerRef}>
        <div style={{ width: deviceWidth, transform: previewScale !== 1 ? `scale(${previewScale})` : 'none', transformOrigin: 'top left', transition: 'all 0.2s ease-out' }}
            className="bg-white overflow-hidden relative"
          >
            {builtProjectUrl && !iframeError ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-slate-500 text-sm">Loading preview...</p>
                      <p className="text-slate-400 text-xs mt-1">{builtProjectUrl}</p>
                    </div>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  key={`preview-built-${previewReloadCount}`}
                  src={previewReloadCount > 0 ? `${builtProjectUrl}?t=${previewReloadCount}` : builtProjectUrl!}
                  className="w-full h-screen border-none bg-white"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-pointer-lock"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </>
            ) : previewSrcDoc ? (
              <iframe
                ref={iframeRef}
                key={`preview-srcdoc-${previewReloadCount}`}
                srcDoc={previewSrcDoc}
                className="w-full h-screen border-none bg-white"
                sandbox="allow-same-origin allow-scripts"
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="w-full h-screen flex items-center justify-center bg-slate-100 text-slate-500">
                <div className="text-center max-w-md px-6">
                  <div className="text-4xl mb-4">{iframeError ? '⚠️' : '🚀'}</div>
                  <p className="font-medium mb-2">{iframeError ? 'Preview failed to load' : 'No preview available'}</p>
                  <p className="text-xs text-slate-400 mb-5">
                    {iframeError
                      ? 'The project build may have errors or is not ready yet.'
                      : 'Generate a project to see the preview'}
                  </p>
                  {(iframeError || buildError) && onRepair && (
                    <button
                      onClick={onRepair}
                      disabled={isRepairing}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: isRepairing ? 'rgba(1,156,218,.5)' : 'linear-gradient(135deg,#019cda,#0369a1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: isRepairing ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(1,156,218,.35)', marginBottom: 12 }}
                    >
                      {isRepairing ? '⟳ AI is fixing the build…' : '🔧 Fix Build Errors with AI'}
                    </button>
                  )}
                  {iframeError && !onRepair && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                      Try clicking the refresh button or use the CODE tab to view files.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Inspect: idle hint */}
            {inspectMode && !selectedElement && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                color: '#fff', padding: '8px 16px', borderRadius: 12,
                fontSize: 11, fontWeight: 600,
                boxShadow: '0 4px 20px rgba(124,58,237,.4)',
                display: 'flex', alignItems: 'center', gap: 8, zIndex: 50,
                pointerEvents: 'none',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', opacity: 0.9, animation: 'pulse 1.5s ease-in-out infinite' }} />
                Click any element to inspect &amp; edit
              </div>
            )}

            {/* Inspect: floating draggable style editor */}
            {inspectMode && selectedElement && (
              <div style={{
                position: 'absolute',
                ...(panelPos ? { left: panelPos.x, top: panelPos.y } : { top: 16, right: 16 }),
                width: 300,
                maxHeight: 'calc(100% - 32px)',
                display: 'flex', flexDirection: 'column',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)',
                zIndex: 50,
                overflow: 'hidden',
                fontFamily: 'inherit',
              }} data-inspect-panel>
                {/* ── Header (drag handle) ── */}
                <div
                  onMouseDown={(e) => {
                    isDragging.current = true
                    document.body.style.userSelect = 'none'
                    const panelEl = (e.currentTarget as HTMLElement).closest('[data-inspect-panel]') as HTMLElement
                    const cr = previewContainerRef.current!.getBoundingClientRect()
                    const pr = panelEl.getBoundingClientRect()
                    dragOffset.current = { x: e.clientX - (pr.left - cr.left), y: e.clientY - (pr.top - cr.top) }
                    if (!panelPos) setPanelPos({ x: pr.left - cr.left, y: pr.top - cr.top })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'grab',
                  }}>
                  {/* Element badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 5, background: '#019cda', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                      {selectedElement.tagName}
                    </span>
                    {selectedElement.id && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
                        #{selectedElement.id}
                      </span>
                    )}
                    {selectedElement.className && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        .{selectedElement.className.split(' ')[0]}
                      </span>
                    )}
                    {selectedElement.path && (
                      <span style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {selectedElement.path}
                      </span>
                    )}
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 2, gap: 2 }}>
                    {(['style', 'layout'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: activeTab === tab ? '#019cda' : 'transparent',
                        color: activeTab === tab ? '#fff' : '#64748b',
                        transition: 'all .15s',
                      }}>
                        {tab === 'style' ? '🎨 Style' : '📐 Layout'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setSelectedElement(null); setEditedStyles({}) }} style={{
                    width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>✕</button>
                </div>

                {/* ── Style Tab ── */}
                {activeTab === 'style' && (
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flexGrow: 1 }}>
                    {/* Text Color */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <input type="color" value={editedStyles.color || selectedElement.styles?.color || '#000000'}
                          onChange={(e) => handleStyleChange('color', e.target.value)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                        <input type="text" value={editedStyles.color || selectedElement.styles?.color || ''}
                          onChange={(e) => handleStyleChange('color', e.target.value)}
                          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', minWidth: 0 }}
                          placeholder="#000" />
                      </div>
                    </div>
                    {/* Background */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>BG</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <input type="color" value={editedStyles.backgroundColor || selectedElement.styles?.backgroundColor || '#ffffff'}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                        <input type="text" value={editedStyles.backgroundColor || selectedElement.styles?.backgroundColor || ''}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', minWidth: 0 }}
                          placeholder="#fff" />
                      </div>
                    </div>
                    {/* Size + Weight row */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</label>
                        <select value={editedStyles.fontSize || selectedElement.styles?.fontSize || '16px'}
                          onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', background: '#fff', width: '100%' }}>
                          {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weight</label>
                        <select value={editedStyles.fontWeight || selectedElement.styles?.fontWeight || '400'}
                          onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', background: '#fff', width: '100%' }}>
                          {[['300','Light'],['400','Regular'],['500','Medium'],['600','SemiBold'],['700','Bold'],['800','ExtraBold']].map(([v,l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {/* Font Family */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Font</label>
                      <select value={editedStyles.fontFamily || selectedElement.styles?.fontFamily?.split(',')[0] || 'Inter'}
                        onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', background: '#fff' }}>
                        {fontFamilies.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                      </select>
                    </div>
                    {/* Align + Radius row */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Align</label>
                        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                          {[['left','←'],['center','↔'],['right','→']].map(([a,ic]) => (
                            <button key={a} onClick={() => handleStyleChange('textAlign', a)} style={{
                              flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer', fontSize: 12,
                              background: (editedStyles.textAlign || selectedElement.styles?.textAlign) === a ? '#7c3aed' : '#fff',
                              color: (editedStyles.textAlign || selectedElement.styles?.textAlign) === a ? '#fff' : '#64748b',
                            }}>{ic}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 80 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Radius</label>
                        <input type="text" value={editedStyles.borderRadius || selectedElement.styles?.borderRadius || '0px'}
                          onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#374151', width: '100%' }}
                          placeholder="0px" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Layout Tab ── */}
                {activeTab === 'layout' && (
                  <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', flexGrow: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Padding</label>
                      <input type="text" value={editedStyles.padding || selectedElement.styles?.padding || '0px'}
                        onChange={(e) => handleStyleChange('padding', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#374151' }}
                        placeholder="0px or 8px 16px" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Margin</label>
                      <input type="text" value={editedStyles.margin || selectedElement.styles?.margin || '0px'}
                        onChange={(e) => handleStyleChange('margin', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#374151' }}
                        placeholder="0px or 8px 16px" />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Quick Padding</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {['0px','4px','8px','12px','16px','24px','32px'].map(v => (
                          <button key={v} onClick={() => handleStyleChange('padding', v)} style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                            background: '#f8fafc', color: '#475569', fontSize: 11, cursor: 'pointer',
                          }}>{v}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Footer ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: '#f8fafc', borderTop: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>
                    {Object.keys(editedStyles).length > 0
                      ? `${Object.keys(editedStyles).length} change(s) previewing live`
                      : 'Changes preview live in the iframe'}
                  </span>
                  <button onClick={() => { setSelectedElement(null); setEditedStyles({}) }} style={{
                    padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
                    background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Discard</button>
                  {Object.keys(editedStyles).length > 0 && (
                    <button disabled={isApplying} onClick={async () => {
                      if (!selectedElement || !onStyleChange) return
                      const propNames: Record<string, string> = {
                        color:'text color', backgroundColor:'background color', fontSize:'font size',
                        fontFamily:'font', fontWeight:'font weight', padding:'padding',
                        margin:'margin', borderRadius:'border radius', textAlign:'text alignment',
                      }
                      const changes = Object.entries(editedStyles).map(([p,v]) => `${propNames[p]||p} to ${v}`)
                      setIsApplying(true)
                      await Promise.resolve(onStyleChange({ element: selectedElement, property: 'multiple', oldValue: '', newValue: changes.join(', ') }))
                      setIsApplying(false)
                      setSelectedElement(null)
                      setEditedStyles({})
                    }} style={{
                      padding: '5px 14px', borderRadius: 7, border: 'none', cursor: isApplying ? 'default' : 'pointer',
                      background: isApplying ? '#7dd3fc' : 'linear-gradient(135deg,#019cda,#0369a1)',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6, opacity: isApplying ? 0.75 : 1,
                    }}>
                      {isApplying ? 'Applying…' : '✨ Apply to Code'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
