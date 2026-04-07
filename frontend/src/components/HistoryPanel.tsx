import React from 'react'
import { type GenerationListItem } from '../api'

interface HistoryPanelProps {
  history: GenerationListItem[]
  historyLoading: boolean
  historyError: string | null
  selectedGenerationId: string | null
  loadingProjectId: string | null
  onRefresh: () => void
  onSelectGeneration: (generationId: string) => void
  onLoadGeneration: (generationId: string) => void
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  historyLoading,
  historyError,
  selectedGenerationId,
  loadingProjectId,
  onRefresh,
  onSelectGeneration,
  onLoadGeneration,
}) => {
  const latestActivity = (() => {
    const latest = history
      .map((g) => g.updatedAt || g.createdAt)
      .filter(Boolean)
      .map((s) => new Date(String(s)).getTime())
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return latest ? new Date(latest).toLocaleString() : '—'
  })()

  return (
    <div className="p-3">
      <div className="mb-3">
        <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
          Dashboard
        </div>
        <div className="text-sm text-slate-600">
          total generations: <span className="font-semibold text-slate-800">{history.length}</span>
        </div>
        <div className="text-sm text-slate-600">
          last activity: <span className="font-medium text-slate-700">{latestActivity}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Recent generations
        </div>
        <div className="flex-1" />
        <button
          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-medium transition-all"
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </button>
      </div>

      {historyLoading ? (
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <span className="animate-spin">⟳</span> Loading…
        </div>
      ) : null}

      {historyError ? (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">
          {historyError}
        </div>
      ) : null}

      {!historyLoading && !historyError && history.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">
          <div className="text-3xl mb-2">📭</div>
          No generations yet.
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {history.slice(0, 20).map((g) => (
          <div
            key={(g.generationId ?? '') + ':' + (g.createdAt ?? '')}
            className="rounded-xl p-3 transition-all duration-200 hover:shadow-md cursor-pointer group"
            style={{
              background:
                selectedGenerationId && g.generationId && selectedGenerationId === g.generationId
                  ? 'linear-gradient(135deg, rgba(84,128,186,.12) 0%, rgba(107,163,217,.08) 100%)'
                  : '#fff',
              border:
                selectedGenerationId && g.generationId && selectedGenerationId === g.generationId
                  ? '1px solid rgba(84,128,186,.3)'
                  : '1px solid #e2e8f0',
            }}
            title={g.prompt ?? ''}
            onClick={() => {
              if (!g.generationId) return
              onSelectGeneration(g.generationId)
            }}
          >
            <div className="text-xs text-slate-400 mb-1">
              {g.createdAt ? new Date(g.createdAt).toLocaleString() : ''}
            </div>
            <div className="text-sm text-slate-700 mb-2 line-clamp-2 font-medium">
              {g.prompt ?? ''}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : g.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {g.status ?? 'unknown'}
              </span>
              <div className="flex-1" />
              {g.generationId && g.status === 'COMPLETED' ? (
                <button
                  className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-semibold transition-all duration-200 hover:shadow-md"
                  style={{
                    background: loadingProjectId === g.generationId ? '#5480ba' : 'linear-gradient(135deg, #5480ba 0%, #6ba3d9 100%)',
                    border: 'none',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(84,128,186,.25)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onLoadGeneration(g.generationId!)
                  }}
                  type="button"
                  disabled={loadingProjectId === g.generationId}
                >
                  {loadingProjectId === g.generationId ? '⟳ Loading…' : '↗ Load'}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
