import React, { useCallback } from 'react'
import { type GenerationVersionsResponse } from './api'

interface VersionHistoryProps {
  versions: GenerationVersionsResponse | null
  versionsLoading: boolean
  versionsError: string | null
  selectedGenerationId: string | null
  onRollback: (generationId: string, version: number) => Promise<void>
  onClose?: () => void
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  versionsLoading,
  versionsError,
  selectedGenerationId,
  onRollback,
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
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">📚 Version History</h2>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {versionsLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400 text-center">
              <div className="flex space-x-1 justify-center mb-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-xs">Loading versions...</p>
            </div>
          </div>
        ) : versionsError ? (
          <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-3">
            <p className="text-xs text-red-300">
              <strong>Error:</strong> {versionsError}
            </p>
          </div>
        ) : versions && versions.versions && versions.versions.length > 0 ? (
          <div className="space-y-2">
            {versions.versions.map((v, idx) => (
              <div
                key={v.version}
                className={`p-3 rounded border transition ${
                  v.version === versions.activeVersion
                    ? 'bg-blue-900 bg-opacity-30 border-blue-600'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-white">v{v.version}</span>
                      {v.version === versions.activeVersion && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">Current</span>
                      )}
                      {v.type === 'EDIT' && <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Edit</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                    {v.message && <p className="text-xs text-slate-300 mt-1">{v.message}</p>}
                  </div>

                  {v.version !== versions.activeVersion && (
                    <button
                      onClick={() => handleRollback(v.version)}
                      className="ml-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition whitespace-nowrap"
                    >
                      Restore
                    </button>
                  )}
                </div>

                {/* Diff summary */}
                {v.filesChanged !== undefined && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 flex gap-3">
                      <span>📝 {v.filesChanged} files changed</span>
                      {v.linesAdded !== undefined && <span className="text-green-400">+{v.linesAdded}</span>}
                      {v.linesRemoved !== undefined && <span className="text-red-400">-{v.linesRemoved}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 mt-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-xs">No versions yet</p>
            <p className="text-xs text-slate-500 mt-1">Versions are created when you edit or regenerate</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {versions && (
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Total versions: {versions.versions?.length || 0}</span>
            <span>Active: v{versions.activeVersion}</span>
          </div>
        </div>
      )}
    </div>
  )
}
