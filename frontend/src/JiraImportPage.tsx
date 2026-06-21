import { useMemo, useState } from 'react'
import { getJiraIssue, listJiraFrontendTasks, streamGeneration, type JiraIssue, type JiraIssueListItem, type SseEvent } from './api'

function extractIssueKey(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null
  const direct = s.match(/\b([A-Z][A-Z0-9]+-\d+)\b/)
  if (direct) return direct[1]
  try {
    const u = new URL(s)
    const m = u.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/)
    if (m) return m[1]
  } catch { /* ignore */ }
  return null
}

interface JiraImportModalProps {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
}

export function JiraImportPage({ isOpen, onClose, accessToken }: JiraImportModalProps) {
  const [jiraInput, setJiraInput]       = useState('')
  const issueKey = useMemo(() => extractIssueKey(jiraInput), [jiraInput])
  const [issue, setIssue]               = useState<JiraIssue | null>(null)
  const [taskList, setTaskList]         = useState<JiraIssueListItem[] | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [previewKey, setPreviewKey]     = useState<string | null>(null)
  const [fetching, setFetching]         = useState(false)
  const [generating, setGenerating]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [progress, setProgress]         = useState<{ stage?: string; message?: string; pct?: number } | null>(null)

  if (!isOpen) return null

  const reset = () => {
    setJiraInput(''); setIssue(null); setTaskList(null)
    setSelectedKeys([]); setPreviewKey(null); setError(null); setProgress(null)
  }

  const handleClose = () => { reset(); onClose() }

  const doFetch = async () => {
    setError(null); setIssue(null); setTaskList(null)
    setSelectedKeys([]); setPreviewKey(null); setProgress(null)
    setFetching(true)
    try {
      if (issueKey) { setIssue(await getJiraIssue(issueKey, accessToken)); return }
      const list = await listJiraFrontendTasks(jiraInput, accessToken)
      setTaskList(list)
      if (!list.length) setError('No frontend tasks found. Ensure tasks are labeled with: ui, interface, or ux.')
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setFetching(false) }
  }

  const doGenerate = async () => {
    setError(null); setProgress(null)
    const keys = issueKey ? [issueKey] : selectedKeys
    if (!keys.length) { setError('Select one or more Jira issues, or paste an issue URL.'); return }
    setGenerating(true)
    try {
      for await (const ev of streamGeneration('', [], accessToken, null, undefined, undefined, keys)) {
        const e = ev as SseEvent
        if (e.type === 'progress') setProgress({ stage: e.stage, message: e.message, pct: e.progress })
        if (e.type === 'error') throw new Error(e.message)
        if (e.type === 'complete') {
          const gid = e.result?.generationId
          if (gid) window.location.assign(`/?gen=${encodeURIComponent(gid)}`)
        }
      }
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setGenerating(false) }
  }

  const canGenerate = !!(selectedKeys.length || issueKey) && !generating
  const hasContent  = !!(taskList || issue)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 780, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #15395e 0%, #019cda 100%)' }}>
          <div>
            <h2 className="text-base font-bold">📋 Import from Jira</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(186,230,253,.85)' }}>Fetch → Select tasks → Generate UI</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors">✕</button>
        </div>

        {/* ── Controls bar ── */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
          <input
            value={jiraInput}
            onChange={e => setJiraInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void doFetch()}
            placeholder="Paste your Jira board URL or issue key (e.g., ABC-123)"
            className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700"
            style={{ minWidth: 220 }}
          />
          <button
            onClick={() => void doFetch()}
            disabled={fetching || !jiraInput.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #15395e, #019cda)', boxShadow: '0 2px 8px rgba(1,156,218,.3)' }}
          >
            {fetching
              ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Fetching…</>
              : '🔍 Fetch'}
          </button>
          {issueKey && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
              ✓ <b>{issueKey}</b> detected
            </div>
          )}
          {!issueKey && selectedKeys.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
              ✓ {selectedKeys.length} task{selectedKeys.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mx-5 mt-3 shrink-0 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ── Progress ── */}
        {progress && (
          <div className="mx-5 mt-3 shrink-0 p-3 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="text-xs font-bold text-violet-700 mb-1">⚙️ {progress.stage || 'Processing'}</div>
            <div className="text-xs text-slate-500 mb-2">{progress.message || 'Building your UI…'}</div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, progress.pct ?? 0)}%`, background: 'linear-gradient(135deg,#15395e,#019cda)' }} />
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty state */}
          {!hasContent && !fetching && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-sm font-semibold text-slate-500">Paste a Jira URL or issue key above</p>
              <p className="text-xs mt-1 text-slate-400">Fetch your board to see frontend tasks, or paste an issue URL directly</p>
            </div>
          )}

          {/* Fetching spinner */}
          {fetching && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-500">Fetching from Jira…</p>
            </div>
          )}

          {/* ── Task list ── */}
          {taskList && taskList.length > 0 && (
            <div className="p-5">
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Frontend Tasks ({taskList.length})</h3>
                <p className="text-xs text-slate-400">Select tasks to generate their UI. Only tasks with UI/frontend labels are shown.</p>
              </div>
              <div className="space-y-2">
                {taskList.map(t => {
                  const selected = selectedKeys.includes(t.key)
                  const active   = previewKey === t.key
                  return (
                    <div
                      key={t.key}
                      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${active ? 'border-violet-400 bg-violet-50' : selected ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 bg-white hover:border-violet-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setSelectedKeys(prev => prev.includes(t.key) ? prev.filter(k => k !== t.key) : [...prev, t.key])}
                        className="mt-1 cursor-pointer accent-violet-600 shrink-0"
                        aria-label={`Select ${t.key}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-violet-700 mr-2">{t.key}</span>
                            <span className="text-sm text-slate-700 leading-snug">{t.summary}</span>
                          </div>
                          <button
                            onClick={async e => {
                              e.stopPropagation()
                              setPreviewKey(t.key); setError(null); setIssue(null)
                              try { setIssue(await getJiraIssue(t.key, accessToken)) }
                              catch (err: any) { setError(err?.message || String(err)) }
                            }}
                            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-violet-600 hover:border-violet-400 hover:bg-violet-50 transition-colors"
                          >
                            👁 View
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[t.status && `${t.status}`, t.issueType, t.priority].filter(Boolean).map((s, i) => (
                            <span key={i} className="text-xs text-slate-400">{s}</span>
                          ))}
                          {t.labels?.slice(0, 3).map(l => (
                            <span key={l} className="text-xs px-2 py-0.5 bg-violet-100 border border-violet-200 rounded-full text-violet-600 font-medium">{l}</span>
                          ))}
                          {(t.labels?.length ?? 0) > 3 && <span className="text-xs text-slate-400">+{t.labels!.length - 3} more</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Issue detail ── */}
          {issue && (
            <div className="p-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">Task Details</p>
                    <h3 className="text-sm font-bold text-slate-800">{issue.key}: {issue.summary}</h3>
                  </div>
                  {issue.webUrl && (
                    <a href={issue.webUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-violet-600 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                      → View in Jira
                    </a>
                  )}
                </div>
                {(issue.description || issue.acceptanceCriteria) && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs font-bold text-slate-500 mb-1.5">📝 Description</p>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.description || '—'}</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs font-bold text-slate-500 mb-1.5">✓ Acceptance Criteria</p>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.acceptanceCriteria || '—'}</p>
                    </div>
                  </div>
                )}
                {issue.attachments && issue.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">🎨 Mockups ({issue.attachments.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {issue.attachments.map(a => (
                        <div key={a.filename} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <p className="text-xs font-semibold text-violet-600 px-2 py-1 border-b border-slate-200 truncate">📄 {a.filename}</p>
                          <img alt={a.filename} src={`data:${a.mimeType};base64,${a.content}`} className="w-full h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-400">
            {selectedKeys.length > 0
              ? `${selectedKeys.length} task${selectedKeys.length !== 1 ? 's' : ''} selected`
              : issueKey
              ? `Issue ${issueKey} ready`
              : 'Paste a Jira URL or issue key'}
          </span>
          <div className="flex gap-2">
            <button onClick={handleClose} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => void doGenerate()}
              disabled={!canGenerate}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              style={canGenerate ? { background: 'linear-gradient(135deg,#15395e,#019cda)' } : {}}
            >
              {generating
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                : '✨ Generate UI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
