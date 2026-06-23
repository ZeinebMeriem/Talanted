import React from 'react'
import { type AuditEventListItem } from '../api'

interface AuditEventsPanelProps {
  selectedGenerationId: string | null
  auditEvents: AuditEventListItem[]
  auditLoading: boolean
  auditError: string | null
  onRefresh: (generationId: string) => void
}

export const AuditEventsPanel: React.FC<AuditEventsPanelProps> = ({
  selectedGenerationId,
  auditEvents,
  auditLoading,
  auditError,
  onRefresh,
}) => {
  if (!selectedGenerationId) return null

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Audit events
        </div>
        <div className="text-[10px] text-slate-400 truncate max-w-[100px]">
          {selectedGenerationId}
        </div>
        <div className="flex-1" />
        <button
          className="text-[10px] px-2.5 py-1 rounded-md cursor-pointer font-medium transition-all bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
          onClick={() => onRefresh(selectedGenerationId)}
          type="button"
        >
          Refresh
        </button>
      </div>

      {auditLoading ? (
        <div className="text-xs text-slate-400">
          Loading…
        </div>
      ) : null}

      {auditError ? (
        <div className="text-xs text-rose-600 font-medium">
          {auditError}
        </div>
      ) : null}

      {!auditLoading && !auditError && auditEvents.length === 0 ? (
        <div className="text-xs text-slate-400 italic">
          No audit events.
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {auditEvents.map((e) => {
          let detailsText = ''
          try {
            const s = e.details ? JSON.stringify(e.details) : ''
            detailsText = s.length > 160 ? s.slice(0, 160) + '…' : s
          } catch {
            detailsText = ''
          }

          return (
            <div
              key={(e.eventId ?? '') + ':' + (e.timestamp ?? '')}
              className="rounded-lg p-3 bg-slate-50 border border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="text-[10px] text-slate-400 mb-1">
                {e.timestamp ? new Date(e.timestamp).toLocaleString() : ''}
              </div>
              <div className="text-xs font-semibold text-violet-600">
                {e.type ?? 'EVENT'}
                {typeof e.durationMs === 'number' ? (
                  <span className="text-slate-400 font-normal"> · {e.durationMs}ms</span>
                ) : null}
              </div>
              {detailsText ? (
                <div className="text-[10px] text-slate-500 mt-1 break-words">
                  {detailsText}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
