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
  onStyleChange?: (change: StyleChange) => void
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
  
  let highlight = null;
  let selectedHighlight = null;
  let inspectEnabled = false;
  let selectedEl = null;
  
  function createHighlight(color, zIndex) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;pointer-events:none;border:2px solid ' + color + ';background:' + color + '20;z-index:' + zIndex + ';transition:all 0.1s ease;';
    document.body.appendChild(el);
    return el;
  }
  
  function getSelector(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    if (el === document.body) return 'body';
    let path = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      path += '.' + el.className.trim().split(/\\s+/).join('.');
    }
    return path;
  }
  
  function getFullPath(el) {
    const parts = [];
    while (el && el !== document.body && parts.length < 5) {
      parts.unshift(getSelector(el));
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  
  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      margin: cs.margin,
      borderRadius: cs.borderRadius,
      textAlign: cs.textAlign
    };
  }
  
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
    const match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!match) return rgb;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  }
  
  function updateHighlight(el, box) {
    if (!box) return;
    const rect = el.getBoundingClientRect();
    box.style.top = rect.top + 'px';
    box.style.left = rect.left + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    box.style.display = 'block';
  }
  
  function handleMouseMove(e) {
    if (!inspectEnabled) return;
    if (!highlight) highlight = createHighlight('#8b5cf6', 99998);
    
    const el = e.target;
    if (el === highlight || el === selectedHighlight) return;
    
    updateHighlight(el, highlight);
  }
  
  function handleClick(e) {
    if (!inspectEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const el = e.target;
    if (el === highlight || el === selectedHighlight) return;
    
    selectedEl = el;
    if (!selectedHighlight) selectedHighlight = createHighlight('#10b981', 99999);
    updateHighlight(el, selectedHighlight);
    
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyles(el);
    
    const info = {
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      id: el.id || '',
      textContent: (el.textContent || '').slice(0, 100).trim(),
      path: getFullPath(el),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      styles: {
        color: rgbToHex(styles.color),
        backgroundColor: rgbToHex(styles.backgroundColor),
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily,
        fontWeight: styles.fontWeight,
        padding: styles.padding,
        margin: styles.margin,
        borderRadius: styles.borderRadius,
        textAlign: styles.textAlign
      }
    };
    
    window.parent.postMessage({ type: 'element-selected', payload: info }, '*');
  }
  
  function handleMouseLeave() {
    if (highlight) highlight.style.display = 'none';
  }
  
  window.addEventListener('message', function(e) {
    if (e.data.type === 'set-inspect-mode') {
      inspectEnabled = e.data.enabled;
      document.body.style.cursor = inspectEnabled ? 'crosshair' : '';
      if (!inspectEnabled) {
        if (highlight) highlight.style.display = 'none';
        if (selectedHighlight) selectedHighlight.style.display = 'none';
        selectedEl = null;
      }
    } else if (e.data.type === 'apply-style') {
      // Live preview style changes
      if (selectedEl) {
        const { property, value } = e.data;
        selectedEl.style[property] = value;
      }
    }
  });
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);
  
  // Notify parent that inspect script is ready
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
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeError, setIframeError] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [inspectReady, setInspectReady] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [editedStyles, setEditedStyles] = useState<Partial<ElementStyles>>({})
  const [activeTab, setActiveTab] = useState<'style' | 'layout'>('style')

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

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'inspect-ready') {
        setInspectReady(true)
        // Send current inspect mode state
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'set-inspect-mode', enabled: inspectMode },
          '*'
        )
      } else if (e.data.type === 'element-selected') {
        const info = e.data.payload as ElementInfo
        setSelectedElement(info)
        setEditedStyles({})  // Reset edited styles for new element
        onElementSelected?.(info)
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

  // Inject inspect script when iframe loads
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
    setInspectReady(false)
    
    try {
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        // Inject the inspect script
        const script = iframe.contentDocument?.createElement('script')
        if (script) {
          script.textContent = INSPECT_SCRIPT
          iframe.contentDocument?.body?.appendChild(script)
        }
      }
    } catch (err) {
      console.log('Could not inject inspect script (cross-origin):', err)
    }
  }, [])

  const handleIframeError = () => {
    setIframeError(true)
    setIframeLoading(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#e8edf2' }}>
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
        <div className="bg-red-900 bg-opacity-30 px-4 py-2 border-b border-red-700">
          <div className="text-xs text-red-300">
            <strong>Build Error:</strong> {buildError}
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-4" style={{ background: '#e8edf2' }} ref={previewContainerRef}>
        <div className="flex justify-center items-start h-full">
          <div
            style={{
              width: deviceWidth,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top center',
              transition: 'all 0.2s ease-out',
            }}
            className="bg-white rounded-lg shadow-2xl overflow-hidden relative"
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
                  src={builtProjectUrl}
                  className="w-full h-screen border-none bg-white"
                  sandbox="allow-same-origin allow-scripts allow-forms"
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
                  <div className="text-4xl mb-4">🚀</div>
                  <p className="font-medium mb-2">No preview available</p>
                  <p className="text-xs text-slate-400 mb-4">
                    {iframeError 
                      ? `Failed to load: ${builtProjectUrl}` 
                      : 'Generate a project to see the preview'}
                  </p>
                  {iframeError && builtProjectUrl && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                      The project files may not be built yet. Try clicking the refresh button or use the CODE tab to view files.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Inspect overlay */}
            {inspectMode && hoverZoneBox && (
              <div
                className="absolute border-2 border-purple-500 bg-purple-500 bg-opacity-10 pointer-events-none"
                style={{
                  top: hoverZoneBox.top,
                  height: hoverZoneBox.height,
                  left: hoverZoneBox.left,
                  width: hoverZoneBox.width,
                }}
              />
            )}

            {/* Visual Style Editor Panel */}
            {inspectMode && selectedElement && (
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 max-h-80 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-600 rounded text-xs font-mono text-white">{selectedElement.tagName}</span>
                    {selectedElement.id && (
                      <span className="px-2 py-0.5 bg-blue-600 rounded text-xs font-mono text-white">#{selectedElement.id}</span>
                    )}
                    {selectedElement.className && (
                      <span className="px-2 py-0.5 bg-green-600 rounded text-xs font-mono text-white truncate max-w-32">
                        .{selectedElement.className.split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Tabs */}
                    <div className="flex bg-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setActiveTab('style')}
                        className={`px-3 py-1 text-xs rounded-md transition ${activeTab === 'style' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        🎨 Style
                      </button>
                      <button
                        onClick={() => setActiveTab('layout')}
                        className={`px-3 py-1 text-xs rounded-md transition ${activeTab === 'layout' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        📐 Layout
                      </button>
                    </div>
                    <button
                      onClick={() => { setSelectedElement(null); setEditedStyles({}) }}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Style Tab */}
                {activeTab === 'style' && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Text Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editedStyles.color || selectedElement.styles?.color || '#000000'}
                          onChange={(e) => handleStyleChange('color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={editedStyles.color || selectedElement.styles?.color || ''}
                          onChange={(e) => handleStyleChange('color', e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white w-20"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editedStyles.backgroundColor || selectedElement.styles?.backgroundColor || '#ffffff'}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={editedStyles.backgroundColor || selectedElement.styles?.backgroundColor || ''}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white w-20"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Font Size</label>
                      <select
                        value={editedStyles.fontSize || selectedElement.styles?.fontSize || '16px'}
                        onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                      >
                        {fontSizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Weight */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Font Weight</label>
                      <select
                        value={editedStyles.fontWeight || selectedElement.styles?.fontWeight || '400'}
                        onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                      </select>
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs text-slate-400 block">Font Family</label>
                      <select
                        value={editedStyles.fontFamily || selectedElement.styles?.fontFamily?.split(',')[0] || 'Inter'}
                        onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                      >
                        {fontFamilies.map(font => (
                          <option key={font} value={font}>{font.split(',')[0]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Text Align */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Text Align</label>
                      <div className="flex bg-slate-800 rounded border border-slate-600 overflow-hidden">
                        {['left', 'center', 'right', 'justify'].map(align => (
                          <button
                            key={align}
                            onClick={() => handleStyleChange('textAlign', align)}
                            className={`flex-1 px-2 py-1.5 text-xs transition ${
                              (editedStyles.textAlign || selectedElement.styles?.textAlign) === align 
                                ? 'bg-purple-600 text-white' 
                                : 'text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {align === 'left' ? '⬅' : align === 'center' ? '⬌' : align === 'right' ? '➡' : '⬌⬌'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Border Radius */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block">Border Radius</label>
                      <input
                        type="text"
                        value={editedStyles.borderRadius || selectedElement.styles?.borderRadius || '0px'}
                        onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                        placeholder="0px"
                      />
                    </div>
                  </div>
                )}

                {/* Layout Tab */}
                {activeTab === 'layout' && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Padding */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs text-slate-400 block">Padding</label>
                      <input
                        type="text"
                        value={editedStyles.padding || selectedElement.styles?.padding || '0px'}
                        onChange={(e) => handleStyleChange('padding', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                        placeholder="0px or 10px 20px"
                      />
                    </div>

                    {/* Margin */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs text-slate-400 block">Margin</label>
                      <input
                        type="text"
                        value={editedStyles.margin || selectedElement.styles?.margin || '0px'}
                        onChange={(e) => handleStyleChange('margin', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                        placeholder="0px or 10px 20px"
                      />
                    </div>

                    {/* Quick Padding Presets */}
                    <div className="col-span-4">
                      <label className="text-xs text-slate-400 block mb-2">Quick Padding</label>
                      <div className="flex flex-wrap gap-2">
                        {['0px', '4px', '8px', '12px', '16px', '24px', '32px'].map(val => (
                          <button
                            key={val}
                            onClick={() => handleStyleChange('padding', val)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white"
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer with Apply button */}
                <div className="px-4 py-3 border-t border-slate-700 bg-slate-800 flex items-center justify-between">
                  <p className="text-slate-400 text-xs flex items-center gap-2">
                    <span>💡</span>
                    <span>Changes preview live. Click Apply to update your code.</span>
                  </p>
                  {Object.keys(editedStyles).length > 0 && (
                    <button
                      onClick={() => {
                        // Generate a summary of all changes and send to chat
                        const changes = Object.entries(editedStyles).map(([prop, value]) => {
                          const propNames: Record<string, string> = {
                            color: 'text color',
                            backgroundColor: 'background color',
                            fontSize: 'font size',
                            fontFamily: 'font',
                            fontWeight: 'font weight',
                            padding: 'padding',
                            margin: 'margin',
                            borderRadius: 'border radius',
                            textAlign: 'text alignment'
                          };
                          return `${propNames[prop] || prop} to ${value}`;
                        });
                        
                        const elementDesc = selectedElement?.textContent 
                          ? `the ${selectedElement.tagName} with text "${selectedElement.textContent.slice(0, 30)}..."`
                          : `the ${selectedElement?.tagName}${selectedElement?.className ? `.${selectedElement.className.split(' ')[0]}` : ''}`;
                        
                        if (onStyleChange && selectedElement) {
                          onStyleChange({
                            element: selectedElement,
                            property: 'multiple',
                            oldValue: '',
                            newValue: changes.join(', ')
                          });
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium rounded-lg shadow-lg transition-all hover:scale-105"
                    >
                      ✨ Apply to Code
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inspect mode indicator */}
            {inspectMode && !selectedElement && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Click any element to select it
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
