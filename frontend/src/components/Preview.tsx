import React, { useRef, useCallback, useMemo } from 'react'

interface PreviewProps {
  deviceMode: 'desktop' | 'tablet' | 'mobile'
  setDeviceMode: (mode: 'desktop' | 'tablet' | 'mobile') => void
  previewScale: number
  setPreviewScale: (scale: number) => void
  previewSrcDoc: string
  buildPct: number
  isBuilding: boolean
  buildMsg: string
  buildError: string | null
  inspectMode: boolean
  setInspectMode: (enabled: boolean) => void
  selectedZone: { label: string; description: string } | null
  hoverZoneBox: { top: string; height: string; left: string; width: string } | null
  previewReloadCount: number
}

const DEVICE_SIZES: Record<string, { width: string; label: string }> = {
  desktop: { width: '100%', label: '🖥️ Desktop' },
  tablet: { width: '768px', label: '📱 Tablet' },
  mobile: { width: '375px', label: '📲 Mobile' },
}

const INSPECT_ZONES = [
  { label: 'Header', color: '#3b82f6' },
  { label: 'Hero', color: '#8b5cf6' },
  { label: 'Features', color: '#ec4899' },
  { label: 'CTA', color: '#10b981' },
  { label: 'Footer', color: '#f59e0b' },
]

export const Preview: React.FC<PreviewProps> = ({
  deviceMode,
  setDeviceMode,
  previewScale,
  setPreviewScale,
  previewSrcDoc,
  buildPct,
  isBuilding,
  buildMsg,
  buildError,
  inspectMode,
  setInspectMode,
  selectedZone,
  hoverZoneBox,
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const deviceWidth = DEVICE_SIZES[deviceMode].width

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 space-y-2">
        {/* Device selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">VIEW:</span>
          {Object.entries(DEVICE_SIZES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setDeviceMode(key as 'desktop' | 'tablet' | 'mobile')}
              className={`px-3 py-1 text-xs rounded transition ${
                deviceMode === key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scale & Inspect */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ZOOM:</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={previewScale}
              onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
              className="w-24 h-2 bg-slate-700 rounded"
            />
            <span className="text-xs text-slate-400">{Math.round(previewScale * 100)}%</span>
          </div>

          <button
            onClick={() => setInspectMode(!inspectMode)}
            className={`px-3 py-1 text-xs rounded transition ${
              inspectMode ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {inspectMode ? '🎯 Inspect ON' : '🎯 Inspect'}
          </button>
        </div>
      </div>

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
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-950 p-4" ref={previewContainerRef}>
        <div className="flex justify-center items-start">
          <div
            style={{
              width: deviceWidth,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top center',
              transition: 'all 0.2s ease-out',
            }}
            className="bg-white rounded-lg shadow-2xl overflow-hidden relative"
          >
            {previewSrcDoc ? (
              <iframe
                key={`preview-${Math.random()}`}
                srcDoc={previewSrcDoc}
                className="w-full h-screen border-none bg-white"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="w-full h-screen flex items-center justify-center bg-slate-100 text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">🚀</div>
                  <p>No preview available</p>
                  <p className="text-xs mt-2">Generate a project to see the preview</p>
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

            {/* Zone labels */}
            {inspectMode && (
              <div className="absolute top-2 right-2 bg-slate-800 rounded p-2 text-xs text-slate-300 max-w-xs">
                <div className="font-semibold mb-2">Clickable zones:</div>
                {INSPECT_ZONES.map((zone, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: zone.color }}></div>
                    <span>{zone.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
