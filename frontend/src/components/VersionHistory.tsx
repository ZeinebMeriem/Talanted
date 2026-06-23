import React, { useCallback, useEffect, useState } from 'react'
import { type GenerationVersionsResponse } from '../api'

interface VersionHistoryProps {
  versions: GenerationVersionsResponse | null
  versionsLoading: boolean
  versionsError: string | null
  selectedGenerationId: string | null
  onRollback: (generationId: string, version: number) => Promise<void>
  onRefresh?: () => void
  onClose?: () => void
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions, versionsLoading, versionsError, selectedGenerationId, onRollback, onRefresh,
}) => {
  const [rollingBack,    setRollingBack]    = useState<number | null>(null)
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  useEffect(() => {
    if (!versionsError) { setDismissedError(null); return }
    const t = setTimeout(() => setDismissedError(versionsError), 6000)
    return () => clearTimeout(t)
  }, [versionsError])

  const visibleError = versionsError && versionsError !== dismissedError ? versionsError : null

  const handleRollback = useCallback(async (version: number) => {
    if (!selectedGenerationId) return
    setRollingBack(version)
    try { await onRollback(selectedGenerationId, version) }
    catch (e) { console.error('Rollback failed:', e) }
    finally { setRollingBack(null) }
  }, [selectedGenerationId, onRollback])

  const versionList   = versions?.codeVersions ?? []
  const activeVersion = versions?.activeVersion
  const reportByVersion = new Map((versions?.aiReportVersions ?? []).map(r => [r.version, r]))
  const sorted = [...versionList].reverse()

  return (
    <div className="flex flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 shrink-0">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400">Versions Timeline</span>
        <div className="flex items-center gap-2">
          {versionList.length > 0 && (
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400">
              {versionList.length} Build{versionList.length !== 1 ? 's' : ''} Synced
            </span>
          )}
          {onRefresh && (
            <button onClick={onRefresh}
              className="text-[10px] font-semibold text-stone-400 hover:text-stone-700 cursor-pointer bg-transparent border-none px-1">
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {versionsLoading && (
        <div className="flex items-center gap-2 px-4 py-8 text-stone-400 text-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 0 1-9 9"/>
          </svg>
          Loading versions…
        </div>
      )}

      {/* Error */}
      {visibleError && !versionsLoading && (
        <div className="mx-3 mt-3 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-red-100">
            <span className="text-xs font-bold text-red-600 flex-1">Restore failed</span>
            <button onClick={() => setDismissedError(visibleError)}
              className="text-red-400 hover:text-red-600 text-sm cursor-pointer bg-transparent border-none">✕</button>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-xs text-red-700 leading-relaxed m-0">
              {visibleError.includes('not found')
                ? 'This version snapshot is missing — it was created before version tracking was enabled.'
                : visibleError}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!versionsLoading && !versionsError && versionList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-600 mb-1">No versions yet</p>
          <p className="text-xs text-stone-400 leading-relaxed max-w-[200px]">
            Every edit you make via Chat creates a version you can restore here.
          </p>
        </div>
      )}

      {/* Version list */}
      <div className="p-3 space-y-2.5">
        {sorted.map((v) => {
          const ver      = typeof v.version === 'number' ? v.version : null
          const isActive = ver !== null && ver === activeVersion
          const isRolling = rollingBack === ver
          const report    = ver != null ? reportByVersion.get(ver) : undefined
          const qualityScore = report?.score ?? null
          const scoreColor   = qualityScore == null ? '#94a3b8'
            : qualityScore >= 80 ? '#10b981'
            : qualityScore >= 60 ? '#f59e0b'
            : '#ef4444'
          const dateStr = v.createdAt
            ? new Date(v.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : ''

          if (isActive) {
            return (
              <div key={`v-${ver}-${v.createdAt}`}
                className="p-3 rounded-xl border-2 border-dashed border-blue-400 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-extrabold text-stone-900">
                    v{ver ?? '?'} <span className="text-blue-600">[Active branch]</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {qualityScore != null && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${scoreColor}18`, color: scoreColor }}>
                        {qualityScore}/100
                      </span>
                    )}
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200">LIVE</span>
                  </div>
                </div>
                {dateStr && <p className="text-[10px] text-stone-400 font-medium">{dateStr}</p>}
              </div>
            )
          }

          return (
            <div key={`v-${ver}-${v.createdAt}`}
              className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-mono font-extrabold text-stone-800">v{ver ?? '?'}</span>
                  {qualityScore != null && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${scoreColor}18`, color: scoreColor }}>
                      {qualityScore}/100
                    </span>
                  )}
                </div>
                {dateStr && <span className="text-[10px] text-stone-400 font-medium">{dateStr}</span>}
              </div>
              {ver !== null && (
                <button onClick={() => void handleRollback(ver)} disabled={isRolling}
                  className="text-[11px] font-bold text-blue-500 hover:text-blue-700 disabled:text-stone-300 cursor-pointer whitespace-nowrap bg-transparent border-none">
                  {isRolling ? 'Restoring…' : 'Rollback'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
