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
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 640, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(1,156,218,.1)' }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="none"/>
                <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" fill="#0052CC" opacity=".15"/>
                <path d="M16 4L4 16h8l4-12z" fill="#2684FF"/>
                <path d="M16 4l12 12h-8L16 4z" fill="#0052CC"/>
                <path d="M4 16l12 12V20L4 16z" fill="#2684FF" opacity=".7"/>
                <path d="M28 16L16 28v-8l12-4z" fill="#0052CC" opacity=".7"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-stone-900 leading-tight">Import from Jira</h2>
              <p className="text-xs text-stone-400 mt-0.5">Fetch → Select tasks → Generate UI</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors text-sm mt-0.5">
            ✕
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="shrink-0 flex items-center gap-2 px-6 pb-4">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-stone-200 rounded-xl bg-white">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={jiraInput}
              onChange={e => setJiraInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void doFetch()}
              placeholder="Paste your Jira board URL or issue key (e.g., ABC-123)"
              className="flex-1 min-w-0 text-sm text-stone-700 outline-none bg-transparent placeholder-stone-300"
            />
            {issueKey && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#e0f2fe] text-[#0369a1]">
                {issueKey}
              </span>
            )}
            {!issueKey && selectedKeys.length > 0 && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#e0f2fe] text-[#0369a1]">
                {selectedKeys.length} selected
              </span>
            )}
          </div>
          <button
            onClick={() => void doFetch()}
            disabled={fetching || !jiraInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #15395e, #019cda)', boxShadow: '0 2px 8px rgba(1,156,218,.25)' }}
          >
            {fetching
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Fetch'}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mx-6 mb-3 shrink-0 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* ── Progress ── */}
        {progress && (
          <div className="mx-6 mb-3 shrink-0 p-3.5 border border-stone-200 rounded-xl bg-stone-50">
            <div className="text-xs font-bold text-stone-700 mb-1">{progress.stage || 'Processing'}</div>
            <div className="text-xs text-stone-400 mb-2">{progress.message || 'Building your UI with Talanted…'}</div>
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, progress.pct ?? 0)}%`, background: 'linear-gradient(135deg,#15395e,#019cda)' }} />
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* Empty / ready state card */}
          {!hasContent && !fetching && !error && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-3 shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-stone-600 mb-1">Paste a Jira URL or issue key</p>
              <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                Fetch your board to see frontend tasks, or paste an issue URL directly to generate its UI instantly.
              </p>
            </div>
          )}

          {/* Fetching spinner */}
          {fetching && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 flex flex-col items-center text-center">
              <span className="w-9 h-9 border-4 border-stone-200 border-t-[#019cda] rounded-full animate-spin mb-3" />
              <p className="text-sm text-stone-500">Fetching from Jira…</p>
            </div>
          )}

          {/* ── Task list ── */}
          {taskList && taskList.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-2">
                Frontend Tasks — {taskList.length}
              </p>
              <div className="space-y-2">
                {taskList.map(t => {
                  const selected = selectedKeys.includes(t.key)
                  const active   = previewKey === t.key
                  return (
                    <div
                      key={t.key}
                      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        active   ? 'border-[#019cda] bg-[#e0f2fe]/30' :
                        selected ? 'border-[#019cda]/40 bg-[#e0f2fe]/20' :
                        'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setSelectedKeys(prev => prev.includes(t.key) ? prev.filter(k => k !== t.key) : [...prev, t.key])}
                        className="mt-0.5 cursor-pointer shrink-0"
                        style={{ accentColor: '#019cda' }}
                        aria-label={`Select ${t.key}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <span className="text-[11px] font-bold text-[#0369a1] mr-2">{t.key}</span>
                            <span className="text-sm text-stone-700 leading-snug">{t.summary}</span>
                          </div>
                          <button
                            onClick={async e => {
                              e.stopPropagation()
                              setPreviewKey(t.key); setError(null); setIssue(null)
                              try { setIssue(await getJiraIssue(t.key, accessToken)) }
                              catch (err: any) { setError(err?.message || String(err)) }
                            }}
                            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 transition-colors"
                          >
                            View
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[t.status, t.issueType, t.priority].filter(Boolean).map((s, i) => (
                            <span key={i} className="text-[10px] text-stone-400">{s}</span>
                          ))}
                          {t.labels?.slice(0, 3).map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#e0f2fe] border border-[#bae6fd] rounded-md text-[#0369a1] font-medium">{l}</span>
                          ))}
                          {(t.labels?.length ?? 0) > 3 && <span className="text-[10px] text-stone-400">+{t.labels!.length - 3}</span>}
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
            <div className={taskList && taskList.length > 0 ? 'mt-4' : ''}>
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1">Task Details</p>
                    <h3 className="text-sm font-bold text-stone-800">{issue.key}: {issue.summary}</h3>
                  </div>
                  {issue.webUrl && (
                    <a href={issue.webUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-[#0369a1] px-3 py-1.5 bg-[#e0f2fe] border border-[#bae6fd] rounded-lg hover:bg-[#bae6fd] transition-colors">
                      View in Jira →
                    </a>
                  )}
                </div>
                {(issue.description || issue.acceptanceCriteria) && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-white border border-stone-200 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1.5">Description</p>
                      <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{issue.description || '—'}</p>
                    </div>
                    <div className="p-3 bg-white border border-stone-200 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1.5">Acceptance Criteria</p>
                      <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{issue.acceptanceCriteria || '—'}</p>
                    </div>
                  </div>
                )}
                {issue.attachments && issue.attachments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-2">Mockups ({issue.attachments.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {issue.attachments.map(a => (
                        <div key={a.filename} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                          <p className="text-[10px] font-semibold text-stone-500 px-2 py-1.5 border-b border-stone-100 truncate">{a.filename}</p>
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

        {/* ── Info note (empty state only) ── */}
        {!hasContent && !fetching && !error && (
          <div className="mx-6 mt-3 mb-1 p-3.5 rounded-xl border border-stone-200 bg-stone-50">
            <p className="text-xs text-stone-500 leading-relaxed">
              Paste a Jira board URL or issue key. The AI will extract functional requirements and generate an optimized UI prompt for instant generation.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-4 flex items-center justify-between">
          <button onClick={handleClose}
            className="text-sm text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition-colors bg-transparent border-none">
            Cancel
          </button>
          <button
            onClick={() => void doGenerate()}
            disabled={!canGenerate}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all cursor-pointer disabled:cursor-not-allowed"
            style={canGenerate
              ? { background: 'linear-gradient(135deg,#15395e,#019cda)', color: '#fff', boxShadow: '0 2px 10px rgba(1,156,218,.3)' }
              : { background: '#f1f5f9', color: '#94a3b8' }}
          >
            {generating
              ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
              : <>Generate UI <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
          </button>
        </div>
      </div>
    </div>
  )
}
