import React, { useState, useEffect } from 'react'
import type { AccessibilityIssue, AccessibilityReport as AccessibilityReportType } from '../api'
import { getAccessibilityHistory, applyAccessibilityFix } from '../api'
import { AccessibilityHistory } from './AccessibilityHistory'

interface Props {
  report?: AccessibilityReportType
  generationId?: string
  onGenerate?: () => void
  isGenerating?: boolean
  accessToken?: string
  onFixApplied?: () => void
}

const SEVERITY_CONFIG = {
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Critical', icon: '✕' },
  serious:  { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'Serious',  icon: '⚠' },
  moderate: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Moderate', icon: '◉' },
  minor:    { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Minor',    icon: '○' },
}

const WCAG_LABELS: Record<string, string> = {
  '1.1.1': 'Non-text Content',
  '1.3.1': 'Info and Relationships',
  '1.3.5': 'Identify Input Purpose',
  '1.4.1': 'Use of Color',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '2.1.1': 'Keyboard',
  '2.4.3': 'Focus Order',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '3.1.1': 'Language of Page',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value',
}

function ScoreRing({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 45 45)" />
      <text x={45} y={49} textAnchor="middle" fontSize={18} fontWeight={800} fill={color}>{score}</text>
      <text x={45} y={62} textAnchor="middle" fontSize={9} fill="#94a3b8">/100</text>
    </svg>
  )
}

function IssueCard({
  issue,
  generationId,
  accessToken,
  fixed,
  onFixApplied
}: {
  issue: AccessibilityIssue & { filePath?: string; autoFixCode?: string }
  generationId?: string
  accessToken?: string
  fixed?: boolean
  onFixApplied?: (issueId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const cfg = SEVERITY_CONFIG[(issue.severity as keyof typeof SEVERITY_CONFIG)] ?? SEVERITY_CONFIG.minor
  const wcagLabel = WCAG_LABELS[issue.wcag] ?? issue.wcag

  const handleApplyFix = async () => {
    console.log('[ApplyFix] Starting...', {
      generationId,
      filePath: issue.filePath,
      element: issue.element,
      id: issue.id,
      autoFixCode: !!issue.autoFixCode,
      fix: !!issue.fix
    })

    if (!generationId) {
      setApplyError('Missing generationId. Please reload the page and try again.')
      console.error('[ApplyFix] Missing generationId')
      return
    }

    // Use filePath, fallback to element, or show error
    const targetPath = issue.filePath || issue.element
    if (!targetPath) {
      setApplyError('Missing file path information. Cannot determine which file to fix.')
      console.error('[ApplyFix] Missing filePath and element')
      return
    }

    // Use autoFixCode if available, otherwise use fix suggestion
    const fixCode = issue.autoFixCode || issue.fix
    if (!fixCode) {
      setApplyError('No fix code available for this issue')
      console.error('[ApplyFix] Missing fixCode and fix')
      return
    }

    setApplying(true)
    setApplyError('')
    try {
      console.log('[ApplyFix] Sending request...', { generationId, id: issue.id, targetPath })
      const result = await applyAccessibilityFix(
        generationId,
        issue.id,
        targetPath,
        fixCode,
        accessToken,
        issue.currentCode
      )
      console.log('[ApplyFix] Response:', result)
      if (result.success) {
        setShowModal(false)
        setOpen(false)
        onFixApplied?.(issue.id)
      } else {
        setApplyError(result.message || 'Failed to apply fix')
      }
    } catch (err: any) {
      console.error('[ApplyFix] Error:', err)
      setApplyError(err.message || 'Failed to apply fix')
    } finally {
      setApplying(false)
    }
  }

  if (fixed) {
    return (
      <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 8, padding: '10px 14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 2, textDecoration: 'line-through', opacity: 0.7 }}>{issue.title}</div>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Fix applied — preview reloading…</div>
        </div>
        {issue.filePath && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontFamily: 'monospace', flexShrink: 0 }}>{issue.filePath}</span>}
      </div>
    )
  }

  return (
    <>
      <div style={{ border: `1px solid ${cfg.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>
            {cfg.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{issue.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>WCAG {issue.wcag} — {wcagLabel}</span>
              {issue.filePath && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f0fdf4', color: '#166534', fontFamily: 'monospace' }}>{issue.filePath}</span>}
              {issue.element && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f0fdf4', color: '#166534', fontFamily: 'monospace' }}>{issue.element}</span>}
            </div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</div>
        </div>
        {open && (
          <div style={{ padding: '10px 14px', background: cfg.bg, borderTop: `1px solid ${cfg.border}` }}>
            <p style={{ fontSize: 12, color: '#374151', marginBottom: 8, lineHeight: 1.6 }}>{issue.description}</p>
            <div style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Fix Suggestion</div>
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, margin: 0 }}>{issue.fix}</p>
            </div>
            {issue.autoFixCode && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Auto-Fix Code</div>
                <pre style={{ margin: 0, fontSize: 11, color: '#e2e8f0', overflow: 'auto', maxHeight: 150, lineHeight: 1.4 }}>{issue.autoFixCode}</pre>
              </div>
            )}
            {(issue.autoFixCode || issue.fix) && (
              <button onClick={() => { console.log('Issue:', issue); setShowModal(true) }} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                ✨ Apply Fix to File
              </button>
            )}
          </div>
        )}
      </div>

      {/* Apply Fix Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Apply Fix: {issue.title}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This will update: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', color: '#0f172a' }}>{issue.filePath || issue.element || 'unknown file'}</code>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Code Change</div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12, overflow: 'hidden' }}>
                <pre style={{ margin: 0, fontSize: 11, color: '#e2e8f0', overflow: 'auto', maxHeight: 200, lineHeight: 1.4 }}>{issue.autoFixCode || issue.fix}</pre>
              </div>
              {!issue.autoFixCode && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: 8, borderRadius: 4 }}>
                  💡 Using fix suggestion since auto-fix code is not available. You may need to apply this manually.
                </div>
              )}
            </div>

            {applyError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 6 }}>{applyError}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(issue.autoFixCode || issue.fix || '')}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                >
                  Copy fix code to clipboard
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} disabled={applying} style={{ flex: 1, padding: '10px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: applying ? 'not-allowed' : 'pointer', opacity: applying ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={handleApplyFix} disabled={applying} style={{ flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: applying ? 'not-allowed' : 'pointer', opacity: applying ? 0.5 : 1 }}>
                {applying ? '⏳ Applying...' : '✨ Apply Fix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const AccessibilityReport: React.FC<Props> = ({ report, generationId, onGenerate, isGenerating, accessToken, onFixApplied }) => {
  const [tab, setTab] = useState<'current' | 'history' | 'components'>('current')
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pendingFixCount, setPendingFixCount] = useState(0)
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())

  const handleFixApplied = (issueId: string) => {
    setFixedIds(prev => new Set([...prev, issueId]))
    setPendingFixCount(c => c + 1)
    onFixApplied?.()
  }

  const handleRerun = () => {
    setFixedIds(new Set())
    setPendingFixCount(0)
    onGenerate?.()
  }

  // Log props for debugging
  useEffect(() => {
    console.log('[AccessibilityReport] Props received:', {
      generationId,
      hasReport: !!report,
      accessToken: !!accessToken,
      issues: report?.issues?.length ?? 0
    })
  }, [generationId, report, accessToken])

  // Load history when tab changes to history
  useEffect(() => {
    if (tab === 'history' && generationId && history.length === 0) {
      setHistoryLoading(true)
      getAccessibilityHistory(generationId, accessToken)
        .then(setHistory)
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setHistoryLoading(false))
    }
  }, [tab, generationId, accessToken, history.length])

  if (!report?.generated && !isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>♿</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No accessibility audit yet</div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 300, lineHeight: 1.6 }}>
            Run a WCAG 2.1 AA audit to get detailed accessibility issues, fix suggestions, and compliance score.
          </div>
        </div>
        <button onClick={handleRerun} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ♿ Run Accessibility Audit
        </button>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #d1fae5', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 14, color: '#64748b' }}>Analyzing WCAG 2.1 AA compliance…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (report?.error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#dc2626' }}>Audit failed: {report.error}</div>
        <button onClick={handleRerun} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  const issues = (report?.issues ?? []) as (AccessibilityIssue & { filePath?: string; autoFixCode?: string })[]
  const critical = issues.filter(i => i.severity === 'critical').length
  const serious  = issues.filter(i => i.severity === 'serious').length
  const moderate = issues.filter(i => i.severity === 'moderate').length
  const minor    = issues.filter(i => i.severity === 'minor').length
  const score    = report?.score ?? 0

  // Group issues by component/file
  const componentIssues: Record<string, typeof issues> = {}
  issues.forEach(issue => {
    const component = issue.filePath || issue.element || 'Unknown'
    if (!componentIssues[component]) componentIssues[component] = []
    componentIssues[component].push(issue)
  })

  const TAB_STYLE_ACTIVE = { fontSize: 13, fontWeight: 700, color: '#10b981', borderBottom: '2px solid #10b981', paddingBottom: 12, cursor: 'pointer' }
  const TAB_STYLE_INACTIVE = { fontSize: 13, fontWeight: 700, color: '#94a3b8', borderBottom: '2px solid transparent', paddingBottom: 12, cursor: 'pointer' }

  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Score header */}
      <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, alignItems: 'center' }}>
          <ScoreRing score={score} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>WCAG 2.1 {report?.wcagLevel ?? 'AA'} Compliance</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>{report?.summary}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {critical > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>{critical} Critical</span>}
              {serious  > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fff7ed', color: '#ea580c', fontWeight: 700 }}>{serious} Serious</span>}
              {moderate > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fffbeb', color: '#d97706', fontWeight: 700 }}>{moderate} Moderate</span>}
              {minor    > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f9fafb', color: '#6b7280', fontWeight: 700 }}>{minor} Minor</span>}
              {issues.length === 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', color: '#10b981', fontWeight: 700 }}>✓ No issues found</span>}
            </div>
          </div>
          <button onClick={handleRerun} title="Re-run audit" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1fae5', background: pendingFixCount > 0 ? '#10b981' : '#f0fdf4', color: pendingFixCount > 0 ? '#fff' : '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ↺ Re-run{pendingFixCount > 0 ? ` (${pendingFixCount} fix${pendingFixCount > 1 ? 'es' : ''} applied)` : ''}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
          <div onClick={() => setTab('current')} style={tab === 'current' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}>
            Issues
          </div>
          <div onClick={() => setTab('components')} style={tab === 'components' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}>
            Components
          </div>
          <div onClick={() => setTab('history')} style={tab === 'history' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}>
            History
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {tab === 'current' && (
          <>
            {/* Issues */}
            {issues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Issues ({issues.length})
                </div>
                {['critical','serious','moderate','minor'].map(sev =>
                  issues.filter(i => i.severity === sev).map(issue =>
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      generationId={generationId}
                      accessToken={accessToken}
                      fixed={fixedIds.has(issue.id)}
                      onFixApplied={handleFixApplied}
                    />
                  )
                )}
              </div>
            )}

            {/* Passed checks */}
            {(report?.passed ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Passed ({report!.passed!.length})
                </div>
                {report!.passed!.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 6 }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#166534' }}>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {(report?.recommendations ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Recommendations
                </div>
                {report!.recommendations!.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 6 }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'components' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Affected Components
            </div>
            {Object.entries(componentIssues).map(([component, componentIssuesList]) => (
              <div key={component} style={{ marginBottom: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{component}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(componentIssuesList as any[]).reduce((counts, issue: any) => {
                    const sev = issue.severity
                    counts[sev] = (counts[sev] || 0) + 1
                    return counts
                  }, {} as Record<string, number>).critical > 0 && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>
                      {Object.entries(componentIssues).filter(c => (c[1] as any[]).some(i => i.severity === 'critical')).length} Critical
                    </span>
                  )}
                  <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                    {componentIssuesList.length} issue{componentIssuesList.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <AccessibilityHistory history={history} loading={historyLoading} />
        )}
      </div>
    </div>
  )
}
