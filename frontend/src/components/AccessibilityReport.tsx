import React, { useState, useEffect, useRef } from 'react'
import type { AccessibilityIssue, AccessibilityReport as AccessibilityReportType } from '../api'
import { getAccessibilityHistory, applyAccessibilityFix } from '../api'

interface Props {
  report?: AccessibilityReportType
  generationId?: string
  onGenerate?: () => void
  isGenerating?: boolean
  accessToken?: string
  onFixApplied?: () => void
}

const P = '#7c3aed'
const B = '#019cda'

const SEV_COLOR: Record<string, string> = {
  critical: P,
  serious:  P,
  moderate: B,
  minor:    B,
}

const SEV_RANK: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }

const WCAG: Record<string, string> = {
  '1.1.1': 'Non-text Content', '1.3.1': 'Info & Relationships', '1.4.3': 'Contrast Minimum',
  '2.1.1': 'Keyboard', '2.4.3': 'Focus Order', '2.4.6': 'Headings & Labels',
  '2.4.7': 'Focus Visible', '3.3.2': 'Labels or Instructions', '4.1.2': 'Name, Role, Value',
}

const SCAN_AGENTS = [
  { name: 'DOM Crawler',      msg: 'Walking the component tree, cataloguing all elements' },
  { name: 'Contrast Checker', msg: 'Testing foreground/background colour contrast ratios' },
  { name: 'ARIA Inspector',   msg: 'Auditing role, label, and landmark attributes' },
  { name: 'Keyboard Nav',     msg: 'Simulating tab order and focus management paths' },
  { name: 'WCAG 2.1 Mapper',  msg: 'Mapping violations to WCAG success criteria' },
  { name: 'Fix Generator',    msg: 'Generating minimal auto-fix patches for each issue' },
]

// ── Scan animation ─────────────────────────────────────────────────────────
function ScanningView({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    const t = setTimeout(() => {
      if (step < SCAN_AGENTS.length - 1) setStep(s => s + 1)
      else if (!done.current) { done.current = true; setTimeout(() => onDone?.(), 500) }
    }, 900)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: B, animation: 'aPulse 1.2s infinite' }}/>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>WCAG 2.1 AA Audit Pipeline</span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }}>6 specialist agents</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
        {SCAN_AGENTS.map((ag, i) => {
          const past = i < step, cur = i === step, fut = i > step
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, opacity: fut ? 0.28 : 1, transition: 'opacity .3s' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: past ? B : cur ? `${B}10` : '#f8fafc',
                border: `1.5px solid ${past || cur ? B : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: cur ? 'aSpin .9s linear infinite' : 'none',
              }}>
                {past && <span style={{ color: '#fff', fontWeight: 900, fontSize: 9 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: (past || cur) ? B : '#94a3b8' }}>{ag.name}</div>
                {(past || cur) && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{ag.msg}…</div>}
              </div>
              {past && <span style={{ fontSize: 10, color: B, fontWeight: 700 }}>done</span>}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 18, padding: '9px 13px', background: `${B}08`, border: `1px solid ${B}20`, borderRadius: 7 }}>
        <span style={{ fontSize: 11, color: B, fontWeight: 600 }}>Agent {Math.min(step + 1, SCAN_AGENTS.length)} / {SCAN_AGENTS.length}</span>
      </div>
      <style>{`
        @keyframes aSpin { to { transform: rotate(360deg); border-color: ${B} ${B}28 ${B}28 ${B}28; } }
        @keyframes aPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 34, sw = 7, circ = 2 * Math.PI * r
  return (
    <svg width={86} height={86} viewBox="0 0 86 86" style={{ flexShrink: 0 }}>
      <circle cx={43} cy={43} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}/>
      <circle cx={43} cy={43} r={r} fill="none" stroke={B} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(score, 100) / 100)}
        strokeLinecap="round" transform="rotate(-90 43 43)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x={43} y={47} textAnchor="middle" fontSize={18} fontWeight={900} fill="#0f172a">{score}</text>
      <text x={43} y={59} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600}>/100</text>
    </svg>
  )
}

// ── Issue card ─────────────────────────────────────────────────────────────
type IssueExt = AccessibilityIssue & { filePath?: string; autoFixCode?: string; currentCode?: string }

function IssueCard({ issue, showHITL, onOpenHITL }: { issue: IssueExt; showHITL: boolean; onOpenHITL: () => void }) {
  const [open, setOpen] = useState(false)
  const sev   = issue.severity ?? 'minor'
  const col   = SEV_COLOR[sev] ?? B
  const wcag  = WCAG[issue.wcag] ?? issue.wcag

  return (
    <div style={{ background: '#fff', borderRadius: 7, border: '1px solid #f1f5f9', borderLeft: `3px solid ${col}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>{issue.title}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${col}10`, color: col, fontWeight: 700, textTransform: 'uppercase' }}>{sev}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#f8fafc', color: '#64748b' }}>WCAG {issue.wcag} — {wcag}</span>
            {issue.filePath && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#f8fafc', color: '#94a3b8', fontFamily: 'monospace' }}>{issue.filePath.split('/').pop()}</span>}
          </div>
        </div>
        {(issue.autoFixCode || issue.fix) && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${B}10`, color: B, fontWeight: 700, flexShrink: 0 }}>fixable</span>}
        <span style={{ fontSize: 9, color: '#cbd5e1', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #f8fafc', padding: '10px 13px', background: '#fafafa' }}>
          <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>{issue.description}</p>
          {issue.fix && <div style={{ fontSize: 11, color: '#374151', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 6, padding: '7px 10px', marginBottom: 8 }}><strong>Suggested fix: </strong>{issue.fix}</div>}
          {showHITL && <button onClick={onOpenHITL} style={{ width: '100%', padding: '7px 0', borderRadius: 7, border: 'none', background: B, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Open Fix Review Queue</button>}
        </div>
      )}
    </div>
  )
}

// ── HITL fix card ──────────────────────────────────────────────────────────
type FixStatus = 'waiting'|'approved'|'rejected'|'applying'|'done'|'failed'
interface HITLFix { issue: IssueExt; status: FixStatus; error?: string }

function HITLFixCard({ fix, idx, onApprove, onReject }: {
  fix: HITLFix; idx: number; onApprove: (i: number) => void; onReject: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const col     = SEV_COLOR[fix.issue.severity ?? 'minor'] ?? B
  const waiting = fix.status === 'waiting'

  return (
    <div style={{
      background: '#fff', borderRadius: 7,
      border: '1px solid #f1f5f9',
      borderLeft: `3px solid ${fix.status === 'approved' || fix.status === 'done' ? P : fix.status === 'rejected' ? '#e2e8f0' : col}`,
      opacity: fix.status === 'rejected' ? 0.45 : 1,
    }}>
      <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>{fix.issue.title}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${col}10`, color: col, fontWeight: 700, textTransform: 'uppercase' }}>{fix.issue.severity ?? 'minor'}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#f8fafc', color: '#64748b' }}>WCAG {fix.issue.wcag}</span>
          </div>
        </div>
        {waiting && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onReject(idx) }} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
            <button onClick={e => { e.stopPropagation(); onApprove(idx) }} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: P, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
          </div>
        )}
        {(fix.status === 'approved') && <span style={{ fontSize: 10, fontWeight: 700, color: P, background: `${P}10`, padding: '3px 8px', borderRadius: 5 }}>Approved</span>}
        {(fix.status === 'rejected') && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '3px 8px', borderRadius: 5 }}>Rejected</span>}
        {(fix.status === 'applying') && <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${B}30`, borderTopColor: B, animation: 'aSpin .7s linear infinite' }}/>}
        {(fix.status === 'done')     && <span style={{ fontSize: 10, fontWeight: 700, color: B }}>Applied</span>}
        {(fix.status === 'failed')   && <span style={{ fontSize: 10, fontWeight: 700, color: P }}>Failed</span>}
        <span style={{ fontSize: 9, color: '#cbd5e1', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', marginLeft: 4 }}>▶</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f8fafc', padding: '10px 13px', background: '#fafafa' }}>
          <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>{fix.issue.description}</p>

          {fix.issue.currentCode && (
            <div style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Current code</div>
              <div style={{ background: '#fff', border: `1px solid ${P}20`, borderRadius: 5, padding: '7px 10px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: 10, color: '#7c3aed', lineHeight: 1.5, fontFamily: 'monospace' }}>{fix.issue.currentCode}</pre>
              </div>
            </div>
          )}
          {fix.issue.autoFixCode && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: B, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Proposed fix</div>
              <div style={{ background: '#fff', border: `1px solid ${B}25`, borderRadius: 5, padding: '7px 10px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: 10, color: B, lineHeight: 1.5, fontFamily: 'monospace' }}>{fix.issue.autoFixCode}</pre>
              </div>
            </div>
          )}
          {fix.status === 'failed' && fix.error && (
            <div style={{ padding: '7px 10px', background: `${P}08`, border: `1px solid ${P}20`, borderRadius: 5, fontSize: 11, color: P }}>{fix.error}</div>
          )}
          {waiting && (
            <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
              <button onClick={() => onReject(idx)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject fix</button>
              <button onClick={() => onApprove(idx)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: P, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve fix</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── HITL queue ─────────────────────────────────────────────────────────────
function HITLQueue({ fixes, onApprove, onReject, onApply, applyingCount }: {
  fixes: HITLFix[]; onApprove: (i: number) => void; onReject: (i: number) => void; onApply: () => void; applyingCount: number
}) {
  const waiting  = fixes.filter(f => f.status === 'waiting').length
  const approved = fixes.filter(f => f.status === 'approved').length
  const done     = fixes.filter(f => f.status === 'done').length
  const allReviewed = waiting === 0 && applyingCount === 0

  const sorted = [...fixes.entries()].sort(([, a], [, b]) =>
    (SEV_RANK[a.issue.severity ?? 'minor'] ?? 3) - (SEV_RANK[b.issue.severity ?? 'minor'] ?? 3)
  )

  return (
    <div style={{ height: '100%', background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Banner */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '13px 15px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: P, marginBottom: 3 }}>Human-in-the-Loop Review</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>
          The AI has paused. Review each proposed fix — no code changes without your approval.
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {waiting > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: P, background: `${P}10`, padding: '2px 8px', borderRadius: 8 }}>{waiting} awaiting review</span>}
          {approved > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: B, background: `${B}10`, padding: '2px 8px', borderRadius: 8 }}>{approved} approved</span>}
          {done > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 8 }}>Applied: {done}</span>}
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sorted.map(([origIdx, fix]) => (
          <HITLFixCard key={(fix.issue as any).id ?? origIdx} fix={fix} idx={origIdx} onApprove={onApprove} onReject={onReject}/>
        ))}
      </div>

      {/* Apply bar */}
      <div style={{ flexShrink: 0, padding: '10px 13px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
        {!allReviewed
          ? <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Review all fixes to enable Apply{approved > 0 && <span style={{ color: B, fontWeight: 700 }}> · {approved} ready</span>}</div>
          : approved > 0
            ? <button onClick={onApply} style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: P, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Apply {approved} Approved Fix{approved > 1 ? 'es' : ''}</button>
            : <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>All rejected — no changes applied.</div>
        }
      </div>

      <style>{`
        @keyframes aSpin { to { transform: rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export const AccessibilityReport: React.FC<Props> = ({
  report, generationId, onGenerate, isGenerating, accessToken, onFixApplied
}) => {
  const [tab, setTab]                   = useState<'issues'|'passed'|'history'>('issues')
  const [scanning, setScanning]         = useState(false)
  const [hitlMode, setHitlMode]         = useState(false)
  const [hitlFixes, setHitlFixes]       = useState<HITLFix[]>([])
  const [applyingCount, setApplyingCount] = useState(0)
  const [history, setHistory]           = useState<any[]>([])
  const [histLoading, setHistLoading]   = useState(false)

  const startAudit = () => { setScanning(true); setHitlMode(false); onGenerate?.() }

  const buildHITL = (src?: AccessibilityReportType) => {
    const r      = src ?? report
    const issues = ((r?.issues ?? []) as IssueExt[]).filter(i => i.autoFixCode || i.fix)
    if (!issues.length) return
    setHitlFixes(issues.map(i => ({ issue: i, status: 'waiting' })))
    setHitlMode(true)
  }

  useEffect(() => {
    if (tab === 'history' && generationId && !history.length) {
      setHistLoading(true)
      getAccessibilityHistory(generationId, accessToken)
        .then(setHistory).catch(() => {}).finally(() => setHistLoading(false))
    }
  }, [tab, generationId, accessToken])

  const approveHITL = (i: number) => setHitlFixes(p => p.map((f, j) => j === i ? { ...f, status: 'approved' } : f))
  const rejectHITL  = (i: number) => setHitlFixes(p => p.map((f, j) => j === i ? { ...f, status: 'rejected' } : f))

  const applyApproved = async () => {
    const toApply = hitlFixes.map((f, i) => ({ ...f, _i: i })).filter(f => f.status === 'approved')
    setApplyingCount(toApply.length)
    for (const fix of toApply) {
      setHitlFixes(p => p.map((f, j) => j === fix._i ? { ...f, status: 'applying' } : f))
      try {
        const path = fix.issue.filePath || fix.issue.element || ''
        const code = fix.issue.autoFixCode || fix.issue.fix || ''
        if (!path || !code || !generationId) throw new Error('Missing data')
        const res = await applyAccessibilityFix(generationId, fix.issue.id, path, code, accessToken, fix.issue.currentCode)
        setHitlFixes(p => p.map((f, j) => j === fix._i ? { ...f, status: res.success ? 'done' : 'failed', error: res.success ? undefined : res.message } : f))
        if (res.success) onFixApplied?.()
      } catch (e: any) {
        setHitlFixes(p => p.map((f, j) => j === fix._i ? { ...f, status: 'failed', error: e.message } : f))
      }
      setApplyingCount(c => c - 1)
    }
  }

  if (!report?.generated && !isGenerating && !scanning) return (
    <div style={{ height: '100%', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 13, background: `${B}08`, border: `1px solid ${B}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${B}40`, borderTopColor: B }}/>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 5 }}>No accessibility audit yet</div>
        <div style={{ fontSize: 11, color: '#64748b', maxWidth: 280, lineHeight: 1.7 }}>Run a 6-agent WCAG 2.1 AA scan. The AI pauses after analysis and waits for your approval before touching any file.</div>
      </div>
      <button onClick={startAudit} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: B, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Run WCAG Audit
      </button>
    </div>
  )

  if (isGenerating || scanning) return <ScanningView onDone={() => setScanning(false)}/>
  if (hitlMode) return <HITLQueue fixes={hitlFixes} onApprove={approveHITL} onReject={rejectHITL} onApply={applyApproved} applyingCount={applyingCount}/>

  if (report?.error) return (
    <div style={{ height: '100%', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
      <div style={{ fontSize: 12, color: P, background: `${P}08`, border: `1px solid ${P}20`, borderRadius: 8, padding: '10px 18px', textAlign: 'center' }}>Audit failed: {report.error}</div>
      <button onClick={startAudit} style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${B}25`, background: `${B}08`, color: B, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  )

  const issues  = ((report?.issues ?? []) as IssueExt[]).sort((a, b) => (SEV_RANK[a.severity ?? 'minor'] ?? 3) - (SEV_RANK[b.severity ?? 'minor'] ?? 3))
  const score   = report?.score ?? 0
  const fixable = issues.filter(i => i.autoFixCode || i.fix).length
  const critical = issues.filter(i => i.severity === 'critical').length
  const serious  = issues.filter(i => i.severity === 'serious').length

  const TAB = (id: typeof tab, lbl: string) => (
    <div onClick={() => setTab(id)} style={{ fontSize: 12, fontWeight: 700, color: tab === id ? B : '#94a3b8', borderBottom: `2px solid ${tab === id ? B : 'transparent'}`, paddingBottom: 10, cursor: 'pointer', transition: 'color .15s' }}>{lbl}</div>
  )

  return (
    <div style={{ height: '100%', background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Score header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '14px 15px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 13, padding: '12px', background: '#fafafa', borderRadius: 10, border: '1px solid #f1f5f9' }}>
          <ScoreRing score={score}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: B, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>WCAG 2.1 {report?.wcagLevel ?? 'AA'}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 5 }}>
              {score >= 80 ? 'Compliant' : 'Non-compliant'} · {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 7, lineHeight: 1.5 }}>{report?.summary}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {critical > 0 && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${P}10`, color: P, fontWeight: 700 }}>{critical} Critical</span>}
              {serious  > 0 && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${P}08`, color: P, fontWeight: 700 }}>{serious} Serious</span>}
              {issues.length === 0 && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${B}10`, color: B, fontWeight: 700 }}>Fully compliant</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {fixable > 0 && (
              <button onClick={() => buildHITL()} style={{ padding: '7px 13px', borderRadius: 7, border: 'none', background: P, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Review Fixes ({fixable})
              </button>
            )}
            <button onClick={startAudit} style={{ padding: '5px 11px', borderRadius: 6, border: `1px solid ${B}25`, background: `${B}08`, color: B, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Re-scan
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, paddingLeft: 2 }}>
          {TAB('issues', `Issues (${issues.length})`)}
          {TAB('passed', `Passed (${(report?.passed ?? []).length})`)}
          {TAB('history', 'History')}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 13px 18px' }}>

        {tab === 'issues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {issues.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: B, marginBottom: 4 }}>Fully compliant</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>No WCAG 2.1 AA violations found.</div>
              </div>
            )}
            {issues.map((issue, i) => (
              <IssueCard key={(issue as any).id ?? i} issue={issue} showHITL={fixable > 0} onOpenHITL={() => buildHITL()}/>
            ))}
          </div>
        )}

        {tab === 'passed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(report?.passed ?? []).length === 0 && <div style={{ textAlign: 'center', padding: '28px 20px', fontSize: 12, color: '#94a3b8' }}>No passing checks recorded.</div>}
            {(report?.passed ?? []).map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 11px', borderRadius: 7, background: '#fff', border: '1px solid #f1f5f9', borderLeft: `3px solid ${B}` }}>
                <span style={{ color: B, fontWeight: 900, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
            {(report?.recommendations ?? []).length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 10, marginBottom: 5 }}>Recommendations</div>
                {(report?.recommendations ?? []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 11px', borderRadius: 7, background: '#fff', border: '1px solid #f1f5f9', borderLeft: `3px solid ${P}` }}>
                    <span style={{ color: P, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.55 }}>{r}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'history' && (
          histLoading
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${B}30`, borderTopColor: B, animation: 'aSpin .7s linear infinite' }}/>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</span>
              </div>
            : history.length === 0
              ? <div style={{ textAlign: 'center', padding: '28px 20px', fontSize: 12, color: '#94a3b8' }}>No audit history yet.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {history.map((h: any, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #f1f5f9', borderLeft: `3px solid ${(h.score ?? 0) >= 80 ? B : P}`, borderRadius: 7, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: (h.score ?? 0) >= 80 ? B : P, flexShrink: 0 }}>{h.score ?? '—'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 1 }}>WCAG {h.wcagLevel ?? 'AA'} · {h.issueCount ?? 0} issues</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{h.timestamp ? new Date(h.timestamp).toLocaleString() : '—'}</div>
                      </div>
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: (h.score ?? 0) >= 80 ? `${B}10` : `${P}10`, color: (h.score ?? 0) >= 80 ? B : P, fontWeight: 700 }}>
                        {(h.score ?? 0) >= 80 ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                  ))}
                </div>
        )}
      </div>

      <style>{`
        @keyframes aSpin { to { transform: rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}
