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
    <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4f9 100%)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Import from Jira</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Fetch a frontend task and generate the UI from its description + mockups.</div>
          </div>
          <a href='/?mode=create' style={{ color: '#5480ba', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>← Back to editor</a>
        </div>

        <div style={{ background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(24px)', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(84,128,186,.08)', border: '1px solid rgba(255,255,255,.95)', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={jiraInput}
              onChange={(e) => setJiraInput(e.target.value)}
              placeholder='Paste Jira issue URL (…/browse/KEY-123) or a project/board URL to list frontend tasks'
              style={{
                flex: 1,
                minWidth: 320,
                padding: '12px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(249,250,251,.8)',
                transition: 'all 0.2s',
                outline: 'none',
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
                padding: '12px 14px',
                borderRadius: 12,
                border: 'none',
                background: fetching ? '#cbd5e1' : 'linear-gradient(135deg, #5480ba 0%, #3d6494 100%)',
                color: '#fff',
                fontWeight: 800,
                cursor: fetching ? 'not-allowed' : 'pointer',
                boxShadow: fetching ? 'none' : '0 4px 15px -3px rgba(84,128,186,.4)',
                transition: 'all 0.2s',
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
              {fetching ? 'Fetching…' : 'Fetch task'}
            </button>
            <button
              onClick={() => void doGenerate()}
              disabled={!(selectedKeys.length || issueKey) || generating}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: !(selectedKeys.length || issueKey) || generating ? '#f3f4f6' : '#fff',
                color: !(selectedKeys.length || issueKey) || generating ? '#9ca3af' : '#1a1a2e',
                fontWeight: 800,
                cursor: !(selectedKeys.length || issueKey) || generating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              title={!(selectedKeys.length || issueKey) ? 'Fetch a list and select one or more tickets, or paste an issue URL' : 'Generate UI'}
            >
              {generating ? 'Generating…' : 'Generate UI'}
            </button>
          </div>

          {issueKey && (
            <div style={{ marginTop: 10, color: '#6b7280', fontSize: 12 }}>Detected issue key: <b style={{ color: '#5480ba' }}>{issueKey}</b></div>
          )}
          {!issueKey && selectedKeys.length > 0 && (
            <div style={{ marginTop: 10, color: '#6b7280', fontSize: 12 }}>
              Selected issues: <b style={{ color: '#5480ba' }}>{selectedKeys.length}</b>
              {selectedKeys.length <= 4 ? (
                <span style={{ marginLeft: 8, color: '#5480ba', fontWeight: 700 }}>{selectedKeys.join(', ')}</span>
              ) : null}
            </div>
          )}

          {progress && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', background: 'linear-gradient(135deg, rgba(84,128,186,.05) 0%, rgba(84,128,186,.02) 100%)' }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: '#1a1a2e' }}>{progress.stage || 'Progress'}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{progress.message || ''}</div>
              <div style={{ marginTop: 8, height: 8, background: '#e5e7eb', borderRadius: 999 }}>
                <div style={{ width: `${Math.max(0, Math.min(100, progress.progress ?? 0))}%`, height: '100%', background: 'linear-gradient(135deg, #5480ba 0%, #3d6494 100%)', borderRadius: 999, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#fff5f5', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          )}
        </div>

        {taskList && taskList.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(24px)', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(84,128,186,.08)', border: '1px solid rgba(255,255,255,.95)', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10, color: '#1a1a2e' }}>
              Frontend tasks (labels: ui / interface / ux)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {taskList.map((t) => {
                const selected = selectedKeys.includes(t.key)
                const active = previewKey === t.key

                return (
                  <div
                    key={t.key}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      borderRadius: 12,
                      border: active ? '2px solid #5480ba' : '1px solid #e5e7eb',
                      background: active ? 'linear-gradient(135deg, rgba(84,128,186,.08) 0%, rgba(84,128,186,.04) 100%)' : 'rgba(255,255,255,.8)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = '#5480ba'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 15px -3px rgba(84,128,186,.2)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = active ? '#5480ba' : '#e5e7eb'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={selected}
                      onChange={() => {
                        setSelectedKeys((prev) => (prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]))
                      }}
                      style={{ marginTop: 3 }}
                      aria-label={`Select ${t.key}`}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a2e' }}>
                          {t.key}: {t.summary}
                        </div>
                        <button
                          onClick={async () => {
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
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            fontWeight: 800,
                            color: '#5480ba',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s',
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
                          Preview
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {(t.status ? `Status: ${t.status}` : '')}{t.issueType ? ` • ${t.issueType}` : ''}{t.priority ? ` • ${t.priority}` : ''}
                      </div>
                      {t.labels && t.labels.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
                          Labels: {t.labels.slice(0, 5).join(', ')}{t.labels.length > 5 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {issue && (
          <div style={{ background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(24px)', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(84,128,186,.08)', border: '1px solid rgba(255,255,255,.95)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a2e' }}>{issue.key}: {issue.summary}</div>
              {issue.webUrl && (
                <a href={issue.webUrl} target='_blank' rel='noreferrer' style={{ fontWeight: 800, textDecoration: 'none', color: '#5480ba', transition: 'color 0.2s' }}>Open in Jira ↗</a>
              )}
            </div>

            {(issue.description || issue.acceptanceCriteria) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'rgba(84,128,186,.03)' }}>
                  <div style={{ fontWeight: 900, marginBottom: 6, color: '#1a1a2e' }}>Description</div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 13 }}>{issue.description || '—'}</div>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'rgba(84,128,186,.03)' }}>
                  <div style={{ fontWeight: 900, marginBottom: 6, color: '#1a1a2e' }}>Acceptance Criteria</div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 13 }}>{issue.acceptanceCriteria || '—'}</div>
                </div>
              </div>
            )}

            {issue.attachments && issue.attachments.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8, color: '#1a1a2e' }}>Mockups / Attachments</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {issue.attachments.map((a) => (
                    <div key={a.filename} style={{ width: 220, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(84,128,186,.05) 0%, rgba(84,128,186,.02) 100%)' }}>
                      <div style={{ padding: 10, fontSize: 12, fontWeight: 800, borderBottom: '1px solid #e5e7eb', color: '#5480ba' }}>{a.filename}</div>
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
        )}
      </div>
    </div>
  )
}
