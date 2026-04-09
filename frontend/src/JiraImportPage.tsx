import React, { useMemo, useState } from 'react'
import { getJiraIssue, listJiraFrontendTasks, streamGeneration, type JiraIssue, type JiraIssueListItem, type SseEvent } from './api'

function extractIssueKey(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null

  // Accept raw key: ABC-123
  const direct = s.match(/\b([A-Z][A-Z0-9]+-\d+)\b/)
  if (direct) return direct[1]

  // Try parse URL
  try {
    const u = new URL(s)
    const m = u.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/)
    if (m) return m[1]
  } catch {
    // ignore
  }

  return null
}

export function JiraImportPage({
  accessToken,
}: {
  accessToken?: string
}) {
  const [jiraInput, setJiraInput] = useState('')
  const issueKey = useMemo(() => extractIssueKey(jiraInput), [jiraInput])

  const [issue, setIssue] = useState<JiraIssue | null>(null)
  const [taskList, setTaskList] = useState<JiraIssueListItem[] | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [previewKey, setPreviewKey] = useState<string | null>(null)

  const [fetching, setFetching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ stage?: string; message?: string; progress?: number } | null>(null)

  const doFetch = async () => {
    setError(null)
    setIssue(null)
    setTaskList(null)
    setSelectedKeys([])
    setPreviewKey(null)
    setProgress(null)

    setFetching(true)
    try {
      if (issueKey) {
        const data = await getJiraIssue(issueKey, accessToken)
        setIssue(data)
        return
      }

      // Not an issue URL — treat input as a project/board URL and list frontend tasks
      const list = await listJiraFrontendTasks(jiraInput, accessToken)
      setTaskList(list)
      if (!list.length) {
        setError(
          'No frontend tasks found for this URL. Ensure tasks are labeled with: ui, interface, or ux (see JIRA_FRONTEND_LABELS config)'
        )
      }
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setFetching(false)
    }
  }

  const doGenerate = async () => {
    setError(null)
    setProgress(null)

    const keysToGenerate = issueKey ? [issueKey] : selectedKeys
    if (!keysToGenerate.length) {
      setError('Select one or more Jira issues from the list, or paste an issue URL.')
      return
    }

    setGenerating(true)
    try {
      for await (const ev of streamGeneration('', [], accessToken, null, undefined, undefined, keysToGenerate)) {
        const e = ev as SseEvent
        if (e.type === 'progress') {
          setProgress({ stage: e.stage, message: e.message, progress: e.progress })
        }
        if (e.type === 'error') {
          throw new Error(e.message)
        }
        if (e.type === 'complete') {
          const gid = e.result?.generationId
          if (gid) {
            window.location.assign(`/?gen=${encodeURIComponent(gid)}`)
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 0, fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4f9 100%)' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(255,255,255,.5)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(84,128,186,.1)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#5480ba' }}>📋 Import from Jira</div>
        <a href='/?mode=create' style={{ color: '#5480ba', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s', fontSize: 13, padding: '8px 12px', borderRadius: 8, hover: 'background: rgba(84,128,186,.08)' }} onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.background = 'rgba(84,128,186,.08)' }} onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.background = 'transparent' }}>← Back to editor</a>
      </div>

      <div style={{ padding: '32px 24px 40px 24px', maxWidth: 1260, margin: '0 auto' }}>

        {/* ── Hero Section ── */}
        <div style={{ marginBottom: 36, animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ display: 'inline-block', marginBottom: 12, padding: '6px 12px', background: 'linear-gradient(135deg, rgba(84,128,186,.12) 0%, rgba(84,128,186,.06) 100%)', border: '1px solid rgba(84,128,186,.2)', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#5480ba', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Jira Integration
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.1 }}>
            Import from <span style={{ background: 'linear-gradient(135deg, #5480ba 0%, #3d6494 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Jira</span>
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 0, maxWidth: 600, lineHeight: 1.6 }}>
            Connect your Jira project and automatically generate beautiful UIs from frontend task descriptions and mockups.
          </p>
        </div>

        {/* ── Input Card ── */}
        <div style={{ background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(84,128,186,.08)', border: '1px solid rgba(255,255,255,.95)', marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jira Project URL or Board</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              value={jiraInput}
              onChange={(e) => setJiraInput(e.target.value)}
              placeholder='Paste your Jira board URL (e.g., testetvalidation.atlassian.net/jira/...)'
              style={{
                flex: 1,
                padding: '14px 16px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(249,250,251,.8)',
                transition: 'all 0.25s',
                outline: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onFocus={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = '#5480ba'
                ;(e.target as HTMLInputElement).style.boxShadow = '0 0 0 4px rgba(84,128,186,.12)'
              }}
              onBlur={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = '#e5e7eb'
                ;(e.target as HTMLInputElement).style.boxShadow = 'none'
              }}
            />
            <button
              onClick={() => void doFetch()}
              disabled={fetching}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: fetching ? '#cbd5e1' : 'linear-gradient(135deg, #5480ba 0%, #3d6494 100%)',
                color: '#fff',
                fontWeight: 800,
                cursor: fetching ? 'not-allowed' : 'pointer',
                boxShadow: fetching ? 'none' : '0 4px 15px -3px rgba(84,128,186,.4)',
                transition: 'all 0.2s',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!fetching) {
                  ;(e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'
                  ;(e.target as HTMLButtonElement).style.boxShadow = '0 10px 30px -8px rgba(84,128,186,.3)'
                }
              }}
              onMouseLeave={(e) => {
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.target as HTMLButtonElement).style.boxShadow = fetching ? 'none' : '0 4px 15px -3px rgba(84,128,186,.4)'
              }}
            >
              {fetching ? '⟳ Fetching…' : '🔍 Fetch'}
            </button>
            <button
              onClick={() => void doGenerate()}
              disabled={!(selectedKeys.length || issueKey) || generating}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: '1.5px solid #e5e7eb',
                background: !(selectedKeys.length || issueKey) || generating ? '#f3f4f6' : '#fff',
                color: !(selectedKeys.length || issueKey) || generating ? '#9ca3af' : '#5480ba',
                fontWeight: 800,
                cursor: !(selectedKeys.length || issueKey) || generating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
              title={!(selectedKeys.length || issueKey) ? 'Fetch a list and select one or more tickets, or paste an issue URL' : 'Generate UI'}
              onMouseEnter={(e) => {
                if (selectedKeys.length || issueKey && !generating) {
                  ;(e.target as HTMLButtonElement).style.background = 'rgba(84,128,186,.05)'
                  ;(e.target as HTMLButtonElement).style.borderColor = '#5480ba'
                }
              }}
              onMouseLeave={(e) => {
                ;(e.target as HTMLButtonElement).style.background = '#fff'
                ;(e.target as HTMLButtonElement).style.borderColor = '#e5e7eb'
              }}
            >
              {generating ? '⚡ Generating…' : '✨ Generate UI'}
            </button>
          </div>

          {issueKey && (
            <div style={{ marginTop: 12, padding: 10, background: 'linear-gradient(135deg, rgba(84,128,186,.06) 0%, rgba(84,128,186,.02) 100%)', borderRadius: 10, fontSize: 12, color: '#5480ba', fontWeight: 600 }}>
              ✓ Detected: <b>{issueKey}</b>
            </div>
          )}
          {!issueKey && selectedKeys.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: 'linear-gradient(135deg, rgba(84,128,186,.06) 0%, rgba(84,128,186,.02) 100%)', borderRadius: 10, fontSize: 12, color: '#5480ba', fontWeight: 600 }}>
              ✓ Selected: <b>{selectedKeys.length} task{selectedKeys.length !== 1 ? 's' : ''}</b> {selectedKeys.length <= 4 ? `(${selectedKeys.join(', ')})` : ''}
            </div>
          )}

          {progress && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid #e5e7eb', background: 'linear-gradient(135deg, rgba(84,128,186,.05) 0%, rgba(84,128,186,.02) 100%)' }}>
              <div style={{ fontWeight: 800, marginBottom: 8, color: '#1a1a2e', fontSize: 13 }}>⚙️ {progress.stage || 'Processing'}</div>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{progress.message || 'Building your UI…'}</div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(0, Math.min(100, progress.progress ?? 0))}%`, height: '100%', background: 'linear-gradient(135deg, #5480ba 0%, #3d6494 100%)', borderRadius: 999, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#fff5f5', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

      </div>

      {/* ── Task List Section ── */}
      {taskList && taskList.length > 0 && (
        <div style={{ padding: '0 24px 40px 24px', maxWidth: 1260, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', marginBottom: 8 }}>Available Frontend Tasks</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Select one or more tasks to generate their UI. Only tasks with UI/frontend labels (ui, interface, ux, design, etc.) are shown.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {taskList.map((t, idx) => {
              const selected = selectedKeys.includes(t.key)
              const active = previewKey === t.key

              return (
                <div
                  key={t.key}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border: active ? '2px solid #5480ba' : '1.5px solid #e5e7eb',
                    background: active ? 'linear-gradient(135deg, rgba(84,128,186,.08) 0%, rgba(84,128,186,.04) 100%)' : 'rgba(255,255,255,.8)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    animation: `fadeUp 0.5s ease ${idx * 0.05}s both`,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = '#5480ba'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 15px -3px rgba(84,128,186,.2)'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = active ? '#5480ba' : '#e5e7eb'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                  }}
                >
                  <input
                    type='checkbox'
                    checked={selected}
                    onChange={() => {
                      setSelectedKeys((prev) => (prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]))
                    }}
                    style={{ marginTop: 4, cursor: 'pointer' }}
                    aria-label={`Select ${t.key}`}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>
                          {t.key}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2 }}>
                          {t.summary}
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setPreviewKey(t.key)
                          setError(null)
                          setIssue(null)
                          try {
                            const data = await getJiraIssue(t.key, accessToken)
                            setIssue(data)
                          } catch (e: any) {
                            setError(e?.message || String(e))
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          fontWeight: 700,
                          color: '#5480ba',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          fontSize: 12,
                        }}
                        onMouseEnter={(e) => {
                          ;(e.target as HTMLButtonElement).style.borderColor = '#5480ba'
                          ;(e.target as HTMLButtonElement).style.backgroundColor = 'rgba(84,128,186,.05)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.target as HTMLButtonElement).style.borderColor = '#e5e7eb'
                          ;(e.target as HTMLButtonElement).style.backgroundColor = '#fff'
                        }}
                      >
                        👁️ View
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                      {(t.status ? `Status: ${t.status}` : '')}{t.issueType ? ` • ${t.issueType}` : ''}{t.priority ? ` • ${t.priority}` : ''}
                    </div>
                    {t.labels && t.labels.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.labels.slice(0, 3).map(label => (
                          <span key={label} style={{ fontSize: 10, padding: '3px 8px', background: 'linear-gradient(135deg, rgba(84,128,186,.1) 0%, rgba(84,128,186,.05) 100%)', border: '1px solid rgba(84,128,186,.2)', borderRadius: 6, color: '#5480ba', fontWeight: 600 }}>
                            {label}
                          </span>
                        ))}
                        {t.labels.length > 3 && (
                          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>+{t.labels.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Issue Detail Section ── */}
      {issue && (
        <div style={{ padding: '0 24px 40px 24px', maxWidth: 1260, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(84,128,186,.08)', border: '1px solid rgba(255,255,255,.95)' }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5480ba', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Task Details</div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: 0, marginBottom: 6 }}>
                  {issue.key}: {issue.summary}
                </h2>
              </div>
              {issue.webUrl && (
                <a href={issue.webUrl} target='_blank' rel='noreferrer' style={{ fontWeight: 700, textDecoration: 'none', color: '#5480ba', fontSize: 13, padding: '8px 14px', background: 'linear-gradient(135deg, rgba(84,128,186,.1) 0%, rgba(84,128,186,.05) 100%)', border: '1px solid rgba(84,128,186,.2)', borderRadius: 10, whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(84,128,186,.15) 0%, rgba(84,128,186,.1) 100%)' }} onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(84,128,186,.1) 0%, rgba(84,128,186,.05) 100%)' }}>→ View in Jira</a>
              )}
            </div>

            {(issue.description || issue.acceptanceCriteria) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '16px', background: 'linear-gradient(135deg, rgba(84,128,186,.04) 0%, rgba(84,128,186,.02) 100%)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 12, color: '#1a1a2e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📝 Description
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>{issue.description || '—'}</div>
                </div>
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '16px', background: 'linear-gradient(135deg, rgba(84,128,186,.04) 0%, rgba(84,128,186,.02) 100%)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 12, color: '#1a1a2e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✓ Acceptance Criteria
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>{issue.acceptanceCriteria || '—'}</div>
                </div>
              </div>
            )}

            {issue.attachments && issue.attachments.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, marginBottom: 14, color: '#1a1a2e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎨 Mockups & Designs ({issue.attachments.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {issue.attachments.map((a, idx) => (
                    <div key={a.filename} style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(84,128,186,.06) 0%, rgba(84,128,186,.02) 100%)', transition: 'all 0.2s', animation: `fadeUp 0.5s ease ${idx * 0.1}s both` }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 15px -3px rgba(84,128,186,.2)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>
                      <div style={{ padding: 12, fontSize: 12, fontWeight: 800, borderBottom: '1px solid #e5e7eb', color: '#5480ba', background: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {a.filename}</div>
                      <img
                        alt={a.filename}
                        src={`data:${a.mimeType};base64,${a.content}`}
                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
