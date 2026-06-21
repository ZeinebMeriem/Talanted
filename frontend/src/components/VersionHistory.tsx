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
  versions,
  versionsLoading,
  versionsError,
  selectedGenerationId,
  onRollback,
  onRefresh,
}) => {
  const [rollingBack, setRollingBack] = useState<number | null>(null)
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (!versionsError) { setDismissedError(null); return }
    const t = setTimeout(() => setDismissedError(versionsError), 6000)
    return () => clearTimeout(t)
  }, [versionsError])

  const visibleError = versionsError && versionsError !== dismissedError ? versionsError : null

  const handleRollback = useCallback(
    async (version: number) => {
      if (!selectedGenerationId) return
      setRollingBack(version)
      try {
        await onRollback(selectedGenerationId, version)
      } catch (e) {
        console.error('Rollback failed:', e)
      } finally {
        setRollingBack(null)
      }
    },
    [selectedGenerationId, onRollback],
  )

  const versionList = versions?.codeVersions ?? []
  const activeVersion = versions?.activeVersion
  // Build a quick lookup: version number → quality report
  const reportByVersion = new Map(
    (versions?.aiReportVersions ?? []).map(r => [r.version, r])
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 10px', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#019cda" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.02em' }}>Version History</span>
          {versionList.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'rgba(1,156,218,.1)', color: '#019cda' }}>
              {versionList.length}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {versionsLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 0 1-9 9" />
          </svg>
          Loading versions…
        </div>
      )}

      {/* Error */}
      {visibleError && !versionsLoading && (
        <div style={{
          borderRadius: 10, overflow: 'hidden',
          border: '1px solid #fecaca', background: '#fff5f5',
          boxShadow: '0 2px 8px rgba(220,38,38,.08)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: 'linear-gradient(135deg,#fef2f2,#fff5f5)',
            borderBottom: '1px solid #fecaca',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', flex: 1 }}>Restore failed</span>
            <button
              onClick={() => setDismissedError(visibleError)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2, lineHeight: 1 }}
              title="Dismiss"
            >✕</button>
          </div>
          <div style={{ padding: '10px 12px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
              {visibleError.includes('not found')
                ? 'This version snapshot is missing — it was created before version tracking was enabled.'
                : visibleError}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#b91c1c', fontStyle: 'italic' }}>
              Tip: every chat edit creates a new checkpoint you can restore.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!versionsLoading && !versionsError && versionList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
            </svg>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No versions yet</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Every edit you make via Chat creates a version you can restore here.</p>
        </div>
      )}

      {/* Version list — newest first */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...versionList].reverse().map((v) => {
          const ver = typeof v.version === 'number' ? v.version : null
          const isActive = ver !== null && ver === activeVersion
          const isRolling = rollingBack === ver
          const report = ver != null ? reportByVersion.get(ver) : undefined
          const qualityScore = report?.score ?? null
          const scoreColor = qualityScore == null ? '#94a3b8'
            : qualityScore >= 80 ? '#10b981'
            : qualityScore >= 60 ? '#f59e0b'
            : '#ef4444'

          return (
            <div
              key={`v-${v.version}-${v.createdAt}`}
              style={{
                borderRadius: 10, padding: '10px 12px',
                background: isActive ? 'linear-gradient(135deg, rgba(1,156,218,.06), rgba(3,105,161,.04))' : '#f8fafc',
                border: isActive ? '1px solid rgba(1,156,218,.25)' : '1px solid #e2e8f0',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                transition: 'border-color .2s',
              }}
            >
              {/* Version dot */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: isActive ? 'linear-gradient(135deg,#019cda,#0369a1)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : '#64748b' }}>
                  v{ver ?? '?'}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#019cda' : '#374151' }}>
                    Version {ver ?? '?'}
                  </span>
                  {isActive && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: 'rgba(1,156,218,.12)', color: '#019cda' }}>
                      Current
                    </span>
                  )}
                  {qualityScore != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                      background: `${scoreColor}18`, color: scoreColor, marginLeft: 'auto',
                    }}>
                      {qualityScore}/100
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {v.createdAt ? new Date(v.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>

              {/* Restore button */}
              {!isActive && ver !== null && (
                <button
                  onClick={() => void handleRollback(ver)}
                  disabled={isRolling}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(1,156,218,.3)',
                    background: isRolling ? '#f1f5f9' : 'rgba(1,156,218,.08)',
                    color: isRolling ? '#94a3b8' : '#019cda',
                    fontSize: 11, fontWeight: 600, cursor: isRolling ? 'not-allowed' : 'pointer',
                    transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (!isRolling) { e.currentTarget.style.background = 'rgba(1,156,218,.16)' } }}
                  onMouseLeave={e => { if (!isRolling) { e.currentTarget.style.background = 'rgba(1,156,218,.08)' } }}
                >
                  {isRolling ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 0 1-9 9"/>
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                    </svg>
                  )}
                  {isRolling ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
