import React, { useCallback } from 'react'
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
  onClose,
}) => {
  const handleRollback = useCallback(
    async (version: number) => {
      if (!selectedGenerationId) return
      try {
        await onRollback(selectedGenerationId, version)
      } catch (e) {
        console.error('Rollback failed:', e)
      }
    },
    [selectedGenerationId, onRollback],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 mt-3">
        <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
          Versions
        </div>
        <div className="flex-1" />
        {onRefresh && (
          <button
            className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }}
            onClick={onRefresh}
            type="button"
          >
            Refresh
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {versionsLoading ? (
          <div className="mono text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
            Loading…
          </div>
        ) : versionsError ? (
          <div className="mono text-xs" style={{ color: '#e04580' }}>
            {versionsError}
          </div>
        ) : null}

        {!versionsLoading && !versionsError && versions ? (
          <div className="mono text-[10px] mb-2" style={{ color: 'rgba(255,255,255,.4)' }}>
            activeVersion: {typeof versions.activeVersion === 'number' ? versions.activeVersion : 'unknown'}
          </div>
        ) : null}

        {!versionsLoading && !versionsError && (!versions || !versions.codeVersions || versions.codeVersions.length === 0) ? (
          <div className="mono text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
            No versions.
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          {(versions?.codeVersions ?? []).map((v) => {
            const ver = typeof v.version === 'number' ? v.version : null
            const isActive = ver !== null && ver === versions?.activeVersion
            return (
              <div
                key={`code-v-${String(v.version)}-${String(v.createdAt ?? '')}`}
                className="rounded-md p-2 flex items-start gap-2"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}
              >
                <div className="flex-1">
                  <div className="mono text-xs" style={{ color: '#60a5fa' }}>
                    code v{ver ?? '?'}{isActive ? ' (active)' : ''}
                  </div>
                  <div className="mono text-[10px]" style={{ color: 'rgba(255,255,255,.35)' }}>
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                {!isActive && ver !== null ? (
                  <button
                    className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'rgba(84,128,186,.08)', border: '1px solid rgba(99,102,241,.25)', color: '#5480ba' }}
                    onClick={() => handleRollback(ver)}
                    type="button"
                  >
                    Set active
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
