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

const SEV = {
  critical: { color:'#ef4444', bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.25)',  dot:'#ef4444', rank:0 },
  serious:  { color:'#f97316', bg:'rgba(249,115,22,.08)', border:'rgba(249,115,22,.25)', dot:'#f97316', rank:1 },
  moderate: { color:'#f59e0b', bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.25)', dot:'#f59e0b', rank:2 },
  minor:    { color:'#64748b', bg:'rgba(100,116,139,.06)',border:'rgba(100,116,139,.2)', dot:'#64748b', rank:3 },
} as const

const WCAG: Record<string,string> = {
  '1.1.1':'Non-text Content','1.3.1':'Info & Relationships','1.4.3':'Contrast Minimum',
  '2.1.1':'Keyboard','2.4.3':'Focus Order','2.4.6':'Headings & Labels',
  '2.4.7':'Focus Visible','3.3.2':'Labels or Instructions','4.1.2':'Name, Role, Value',
}

const SCAN_AGENTS = [
  { id:'crawler',  name:'DOM Crawler',     msg:'Walking component tree, collecting rendered elements…'  },
  { id:'contrast', name:'Contrast Checker',msg:'Testing foreground/background color contrast ratios…'   },
  { id:'aria',     name:'ARIA Inspector',  msg:'Auditing role, label, and landmark attributes…'         },
  { id:'keyboard', name:'Keyboard Nav',    msg:'Simulating tab order and focus management paths…'        },
  { id:'wcag',     name:'WCAG 2.1 Mapper', msg:'Mapping violations to success criteria…'                },
  { id:'fixer',    name:'Fix Generator',   msg:'Generating minimal auto-fix patches for each issue…'    },
]

// ── Pipeline scanning animation ────────────────────────────────────────────
function ScanningView({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState('.')
  const doneRef = useRef(false)

  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '.' : p + '.'), 380)
    return () => clearInterval(d)
  }, [])

  useEffect(() => {
    if (doneRef.current) return
    const t = setTimeout(() => {
      if (step < SCAN_AGENTS.length - 1) {
        setStep(s => s + 1)
      } else if (!doneRef.current) {
        doneRef.current = true
        setTimeout(() => onDone?.(), 700)
      }
    }, 950)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div style={{ height:'100%', background:'#0d1117', display:'flex', flexDirection:'column', padding:'24px 20px', fontFamily:'monospace' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>♿</div>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.05em' }}>WCAG 2.1 AA AUDIT</div>
          <div style={{ fontSize:10, color:'#64748b' }}>6-agent accessibility pipeline</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'aPulse 1s infinite' }}/>
          <span style={{ fontSize:10, color:'#10b981', fontWeight:700 }}>SCANNING</span>
        </div>
      </div>

      {/* Agents */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
        {SCAN_AGENTS.map((ag, i) => {
          const past    = i < step
          const current = i === step
          const future  = i > step
          return (
            <div key={ag.id} style={{ display:'flex', alignItems:'flex-start', gap:12, opacity:future ? 0.25 : 1, transition:'opacity .3s' }}>
              <div style={{
                width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1,
                background: past ? '#10b981' : current ? 'transparent' : 'rgba(255,255,255,.08)',
                border: current ? '2px solid #10b981' : past ? 'none' : '1px solid rgba(255,255,255,.12)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,
                animation: current ? 'aSpin .8s linear infinite' : 'none',
                boxShadow: past ? '0 0 6px #10b981aa' : 'none',
              }}>
                {past && <span style={{ color:'#fff', fontWeight:900 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color: past ? '#10b981' : current ? '#34d399' : '#475569', marginBottom:2 }}>
                  {ag.name}{current && <span style={{ color:'#475569', fontWeight:400 }}>{dots}</span>}
                </div>
                {(past || current) && (
                  <div style={{ fontSize:10, color:'#475569', lineHeight:1.5 }}>{ag.msg}</div>
                )}
              </div>
              {past && <span style={{ fontSize:10, color:'#10b981', fontWeight:700, marginLeft:'auto' }}>done</span>}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8 }}>
        <div style={{ fontSize:10, color:'#34d399', fontWeight:600 }}>
          Agent {Math.min(step+1, SCAN_AGENTS.length)} / {SCAN_AGENTS.length} · Reading your source files…
        </div>
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); border-color:#10b981 transparent #10b981 transparent; } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score:number }) {
  const r = 36, circ = 2*Math.PI*r, col = score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444'
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" style={{ flexShrink:0 }}>
      <defs>
        <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={col} stopOpacity=".6"/>
          <stop offset="100%" stopColor={col}/>
        </linearGradient>
        <filter id="aglow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={8}/>
      <circle cx={45} cy={45} r={r} fill="none" stroke="url(#ag)" strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={circ*(1-Math.min(score,100)/100)}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{ filter:`drop-shadow(0 0 6px ${col}88)` }}/>
      <text x={45} y={49} textAnchor="middle" fontSize={20} fontWeight={900} fill={col} filter="url(#aglow)">{score}</text>
      <text x={45} y={62} textAnchor="middle" fontSize={9} fill="#475569" fontWeight={600}>/100</text>
    </svg>
  )
}

// ── HITL fix card ──────────────────────────────────────────────────────────
type FixStatus = 'waiting' | 'approved' | 'rejected' | 'applying' | 'done' | 'failed'

interface HITLFix {
  issue: AccessibilityIssue & { filePath?:string; autoFixCode?:string; currentCode?:string }
  status: FixStatus
  error?: string
}

function HITLFixCard({
  fix, idx, onApprove, onReject
}: { fix:HITLFix; idx:number; onApprove:(i:number)=>void; onReject:(i:number)=>void }) {
  const [open, setOpen] = useState(false)
  const sev  = (fix.issue.severity as keyof typeof SEV) ?? 'minor'
  const cfg  = SEV[sev]
  const wcag = WCAG[fix.issue.wcag] ?? fix.issue.wcag

  return (
    <div style={{
      background: fix.status==='approved'?'rgba(16,185,129,.06)':fix.status==='rejected'?'rgba(239,68,68,.04)':'rgba(255,255,255,.03)',
      border:`1px solid ${fix.status==='approved'?'rgba(16,185,129,.3)':fix.status==='rejected'?'rgba(239,68,68,.2)':cfg.border}`,
      borderRadius:10, overflow:'hidden',
    }}>
      {/* Header row */}
      <div style={{ padding:'11px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        {/* Severity dot */}
        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0, boxShadow:`0 0 6px ${cfg.dot}88` }}/>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:3 }}>{fix.issue.title}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em' }}>
              {sev}
            </span>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(255,255,255,.05)', color:'#64748b', fontFamily:'monospace' }}>
              WCAG {fix.issue.wcag} — {wcag}
            </span>
            {fix.issue.filePath && (
              <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(16,185,129,.08)', color:'#34d399', fontFamily:'monospace' }}>
                {fix.issue.filePath.split('/').pop()}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {fix.status === 'waiting' && (
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={e=>{e.stopPropagation();onReject(idx)}}
              style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'#f87171', fontSize:10, fontWeight:700, cursor:'pointer' }}>
              ✕
            </button>
            <button onClick={e=>{e.stopPropagation();onApprove(idx)}}
              style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>
              ✓
            </button>
          </div>
        )}
        {fix.status === 'approved' && (
          <span style={{ fontSize:10, fontWeight:700, color:'#10b981', background:'rgba(16,185,129,.1)', padding:'3px 9px', borderRadius:6, flexShrink:0 }}>✓ Approved</span>
        )}
        {fix.status === 'rejected' && (
          <span style={{ fontSize:10, fontWeight:700, color:'#f87171', background:'rgba(239,68,68,.08)', padding:'3px 9px', borderRadius:6, flexShrink:0 }}>✕ Skipped</span>
        )}
        {fix.status === 'applying' && (
          <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(16,185,129,.3)', borderTopColor:'#10b981', animation:'aSpin .7s linear infinite', flexShrink:0 }}/>
        )}
        {fix.status === 'done' && (
          <span style={{ fontSize:10, fontWeight:700, color:'#10b981', flexShrink:0 }}>Applied ✓</span>
        )}
        {fix.status === 'failed' && (
          <span style={{ fontSize:10, fontWeight:700, color:'#ef4444', flexShrink:0 }}>Failed</span>
        )}

        <div style={{ color:'#334155', fontSize:10, transform:open?'rotate(90deg)':'none', transition:'transform .2s', flexShrink:0, marginLeft:2 }}>▶</div>
      </div>

      {/* Expanded diff view */}
      {open && (
        <div style={{ borderTop:`1px solid ${cfg.border}`, padding:'12px 14px', background:'rgba(0,0,0,.2)' }}>
          <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.65, marginBottom:10 }}>{fix.issue.description}</div>

          {fix.issue.currentCode && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Before (current code)</div>
              <div style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, padding:'8px 10px', overflow:'auto' }}>
                <pre style={{ margin:0, fontSize:10, color:'#fca5a5', lineHeight:1.5, fontFamily:'monospace' }}>{fix.issue.currentCode}</pre>
              </div>
            </div>
          )}

          {fix.issue.autoFixCode && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#10b981', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>After (proposed fix)</div>
              <div style={{ background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:6, padding:'8px 10px', overflow:'auto' }}>
                <pre style={{ margin:0, fontSize:10, color:'#6ee7b7', lineHeight:1.5, fontFamily:'monospace' }}>{fix.issue.autoFixCode}</pre>
              </div>
            </div>
          )}

          {fix.status === 'failed' && fix.error && (
            <div style={{ padding:'8px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, fontSize:11, color:'#f87171' }}>
              {fix.error}
            </div>
          )}

          {fix.status === 'waiting' && (
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={()=>onReject(idx)}
                style={{ flex:1, padding:'8px 0', borderRadius:7, border:'1px solid rgba(239,68,68,.25)', background:'rgba(239,68,68,.06)', color:'#f87171', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                ✕ Reject this fix
              </button>
              <button onClick={()=>onApprove(idx)}
                style={{ flex:1, padding:'8px 0', borderRadius:7, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                ✓ Approve this fix
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── HITL review queue ──────────────────────────────────────────────────────
function HITLQueue({
  fixes, onApprove, onReject, onApplyApproved, applyingCount
}: {
  fixes: HITLFix[]
  onApprove: (i:number)=>void
  onReject: (i:number)=>void
  onApplyApproved: ()=>void
  applyingCount: number
}) {
  const waiting  = fixes.filter(f=>f.status==='waiting').length
  const approved = fixes.filter(f=>f.status==='approved').length
  const done     = fixes.filter(f=>f.status==='done').length
  const allReviewed = waiting === 0 && applyingCount === 0

  const byPriority = [...fixes].sort((a,b)=>{
    const r = SEV[(a.issue.severity as keyof typeof SEV)]?.rank ?? 3
    const s = SEV[(b.issue.severity as keyof typeof SEV)]?.rank ?? 3
    return r - s
  })

  return (
    <div style={{ height:'100%', background:'#0d1117', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* HITL top bar */}
      <div style={{ flexShrink:0, background:'linear-gradient(135deg,rgba(234,179,8,.12),rgba(234,179,8,.06))', borderBottom:'1px solid rgba(234,179,8,.2)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:26 }}>🧑‍💼</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:'#fbbf24', marginBottom:3 }}>
              Human-in-the-Loop Review
            </div>
            <div style={{ fontSize:11, color:'#92400e', lineHeight:1.5 }}>
              The AI has <strong style={{ color:'#fbbf24' }}>paused</strong> and is waiting for you to approve or reject each fix before anything is applied to your code.
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
          {waiting > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6, background:'rgba(234,179,8,.1)', border:'1px solid rgba(234,179,8,.2)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', animation:'aPulse 1s infinite' }}/>
              <span style={{ fontSize:10, fontWeight:700, color:'#fbbf24' }}>{waiting} awaiting review</span>
            </div>
          )}
          {approved > 0 && (
            <div style={{ padding:'4px 10px', borderRadius:6, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', fontSize:10, fontWeight:700, color:'#10b981' }}>
              ✓ {approved} approved
            </div>
          )}
          {done > 0 && (
            <div style={{ padding:'4px 10px', borderRadius:6, background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.15)', fontSize:10, fontWeight:700, color:'#34d399' }}>
              Applied: {done}
            </div>
          )}
        </div>
      </div>

      {/* Fix cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {byPriority.map((fix, i) => (
          <HITLFixCard key={fix.issue.id ?? i} fix={fix} idx={fixes.indexOf(fix)}
            onApprove={onApprove} onReject={onReject}/>
        ))}
      </div>

      {/* Apply bar */}
      <div style={{ flexShrink:0, padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,.06)', background:'rgba(0,0,0,.3)' }}>
        {!allReviewed ? (
          <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>
            Review all fixes above to enable Apply
            {approved > 0 && <span style={{ color:'#10b981', fontWeight:700 }}> · {approved} ready</span>}
          </div>
        ) : approved > 0 ? (
          <button onClick={onApplyApproved}
            style={{ width:'100%', padding:'11px 0', borderRadius:9, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,.3)' }}>
            ⚡ Apply {approved} Approved Fix{approved>1?'es':''}
          </button>
        ) : (
          <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>All fixes rejected — no changes will be made.</div>
        )}
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── History view ───────────────────────────────────────────────────────────
function HistoryView({ generationId, accessToken }: { generationId?:string; accessToken?:string }) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!generationId) { setLoading(false); return }
    getAccessibilityHistory(generationId, accessToken)
      .then(setHistory).catch(()=>{}).finally(()=>setLoading(false))
  }, [generationId, accessToken])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, gap:10 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(16,185,129,.3)', borderTopColor:'#10b981', animation:'aSpin .7s linear infinite' }}/>
      <span style={{ fontSize:12, color:'#475569' }}>Loading history…</span>
    </div>
  )
  if (!history.length) return (
    <div style={{ textAlign:'center', padding:40, fontSize:12, color:'#475569' }}>No audit history yet.</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {history.map((h: any, i) => {
        const col = (h.score??0)>=80?'#10b981':(h.score??0)>=60?'#f59e0b':'#ef4444'
        return (
          <div key={i} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:9, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:900, color:col }}>{h.score??'—'}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:2 }}>
                WCAG {h.wcagLevel??'AA'} · {h.issueCount??0} issues · {h.filesAnalyzed??0} files
              </div>
              <div style={{ fontSize:10, color:'#475569' }}>
                {h.timestamp ? new Date(h.timestamp).toLocaleString() : '—'}
              </div>
            </div>
            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:`${col}22`, color:col, fontWeight:700 }}>
              {(h.score??0)>=80?'Pass':(h.score??0)>=60?'Fair':'Fail'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export const AccessibilityReport: React.FC<Props> = ({
  report, generationId, onGenerate, isGenerating, accessToken, onFixApplied
}) => {
  const [tab, setTab]             = useState<'issues'|'passed'|'history'>('issues')
  const [scanning, setScanning]   = useState(false)
  const [hitlMode, setHitlMode]   = useState(false)
  const [hitlFixes, setHitlFixes] = useState<HITLFix[]>([])
  const [applyingCount, setApplyingCount] = useState(0)

  const startAudit = () => { setScanning(true); onGenerate?.() }

  const onScanDone = () => {
    setScanning(false)
    // Build HITL queue from report issues if available
    if (report?.issues?.length) {
      const issues = (report.issues as (AccessibilityIssue & { filePath?:string; autoFixCode?:string; currentCode?:string })[])
        .filter(i => i.autoFixCode || i.fix)
      if (issues.length > 0) {
        setHitlFixes(issues.map(i => ({ issue:i, status:'waiting' })))
        setHitlMode(true)
      }
    }
  }

  // When a new report arrives while scanning, also attempt to build HITL queue
  useEffect(() => {
    if (!scanning && !hitlMode && report?.generated && report?.issues?.length) {
      // fresh report not yet reviewed
    }
  }, [report, scanning, hitlMode])

  const openHITL = () => {
    const issues = ((report?.issues ?? []) as (AccessibilityIssue & { filePath?:string; autoFixCode?:string; currentCode?:string })[])
      .filter(i => i.autoFixCode || i.fix)
    if (!issues.length) return
    setHitlFixes(issues.map(i => ({ issue:i, status:'waiting' })))
    setHitlMode(true)
  }

  const approveHITL  = (i:number) => setHitlFixes(p => p.map((f,j) => j===i ? {...f, status:'approved'} : f))
  const rejectHITL   = (i:number) => setHitlFixes(p => p.map((f,j) => j===i ? {...f, status:'rejected'} : f))

  const applyApproved = async () => {
    const approved = hitlFixes.map((f,i) => ({...f, _i:i})).filter(f => f.status==='approved')
    setApplyingCount(approved.length)

    for (const fix of approved) {
      setHitlFixes(p => p.map((f,j) => j===fix._i ? {...f, status:'applying'} : f))
      try {
        const targetPath = fix.issue.filePath || fix.issue.element || ''
        const fixCode    = fix.issue.autoFixCode || fix.issue.fix || ''
        if (!targetPath || !fixCode || !generationId) throw new Error('Missing data')
        const res = await applyAccessibilityFix(generationId, fix.issue.id, targetPath, fixCode, accessToken, fix.issue.currentCode)
        setHitlFixes(p => p.map((f,j) => j===fix._i ? {...f, status: res.success ? 'done' : 'failed', error: res.success ? undefined : res.message } : f))
        if (res.success) onFixApplied?.()
      } catch(e:any) {
        setHitlFixes(p => p.map((f,j) => j===fix._i ? {...f, status:'failed', error:e.message} : f))
      }
      setApplyingCount(c => c - 1)
    }
  }

  // ── Empty state ──
  if (!report?.generated && !isGenerating && !scanning) {
    return (
      <div style={{ height:'100%', background:'#0d1117', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:32, textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.08))', border:'1px solid rgba(16,185,129,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>♿</div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>No accessibility audit yet</div>
          <div style={{ fontSize:12, color:'#64748b', maxWidth:300, lineHeight:1.7 }}>
            Run a 6-agent WCAG 2.1 AA scan. The system will pause after analysis and ask for your approval before applying any fix to your code.
          </div>
        </div>
        <button onClick={startAudit}
          style={{ padding:'11px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,.3)', display:'flex', alignItems:'center', gap:8 }}>
          <span>♿</span> Run WCAG Audit
        </button>
      </div>
    )
  }

  if (isGenerating || scanning) return <ScanningView onDone={onScanDone}/>

  if (hitlMode) return (
    <HITLQueue fixes={hitlFixes} onApprove={approveHITL} onReject={rejectHITL}
      onApplyApproved={applyApproved} applyingCount={applyingCount}/>
  )

  // ── Error state ──
  if (report?.error) {
    return (
      <div style={{ height:'100%', background:'#0d1117', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:32 }}>
        <div style={{ fontSize:11, color:'#f87171', textAlign:'center', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:9, padding:'12px 20px' }}>
          Audit failed: {report.error}
        </div>
        <button onClick={startAudit}
          style={{ padding:'9px 22px', borderRadius:8, border:'1px solid rgba(16,185,129,.3)', background:'rgba(16,185,129,.08)', color:'#10b981', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          ↺ Retry
        </button>
      </div>
    )
  }

  const issues = ((report?.issues ?? []) as (AccessibilityIssue & { filePath?:string; autoFixCode?:string })[])
    .sort((a,b) => (SEV[(a.severity as keyof typeof SEV)]?.rank??3) - (SEV[(b.severity as keyof typeof SEV)]?.rank??3))
  const score   = report?.score ?? 0
  const critical= issues.filter(i=>i.severity==='critical').length
  const serious = issues.filter(i=>i.severity==='serious').length
  const fixable = issues.filter(i=>i.autoFixCode||i.fix).length
  const col     = score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444'

  const TAB = (id: typeof tab, label: string) => (
    <div onClick={()=>setTab(id)} style={{
      fontSize:11, fontWeight:700, color:tab===id?'#10b981':'#475569',
      borderBottom:`2px solid ${tab===id?'#10b981':'transparent'}`,
      paddingBottom:10, cursor:'pointer', transition:'color .15s',
    }}>{label}</div>
  )

  return (
    <div style={{ height:'100%', background:'#0d1117', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'inherit' }}>

      {/* ── Score header ── */}
      <div style={{ background:'linear-gradient(135deg,#0d1117,#0a1a14)', borderBottom:'1px solid rgba(16,185,129,.12)', padding:'16px 16px 0', flexShrink:0 }}>
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14, background:'rgba(255,255,255,.02)', borderRadius:12, border:'1px solid rgba(255,255,255,.05)', padding:'14px 14px' }}>
          <ScoreRing score={score}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:800, color:'#059669', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>WCAG 2.1 {report?.wcagLevel??'AA'}</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>
              {score>=80?'Compliant':'Non-compliant'} — {issues.length} issue{issues.length!==1?'s':''}
            </div>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:8, lineHeight:1.5 }}>{report?.summary}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {critical>0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(239,68,68,.1)', color:'#f87171', fontWeight:700, border:'1px solid rgba(239,68,68,.2)' }}>{critical} Critical</span>}
              {serious>0  && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(249,115,22,.1)', color:'#fb923c', fontWeight:700, border:'1px solid rgba(249,115,22,.2)' }}>{serious} Serious</span>}
              {issues.length===0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(16,185,129,.1)', color:'#10b981', fontWeight:700 }}>✓ Fully compliant</span>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7, flexShrink:0 }}>
            {fixable > 0 && (
              <button onClick={openHITL}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap', boxShadow:`0 3px 10px rgba(16,185,129,.3)` }}>
                🧑‍💼 Review Fixes ({fixable})
              </button>
            )}
            <button onClick={startAudit}
              style={{ padding:'6px 12px', borderRadius:8, border:`1px solid rgba(16,185,129,.25)`, background:'rgba(16,185,129,.08)', color:'#34d399', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              ↺ Re-scan
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:20, paddingLeft:2 }}>
          {TAB('issues', `Issues (${issues.length})`)}
          {TAB('passed', `Passed (${(report?.passed??[]).length})`)}
          {TAB('history', 'History')}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 20px' }}>

        {tab === 'issues' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {issues.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', fontSize:12, color:'#475569' }}>
                No issues found — your code is WCAG 2.1 AA compliant! 🎉
              </div>
            )}
            {issues.map((issue, i) => {
              const sev = (issue.severity as keyof typeof SEV) ?? 'minor'
              const cfg = SEV[sev]
              const wcag = WCAG[issue.wcag] ?? issue.wcag
              const [open, setOpen] = React.useState(false)
              return (
                <div key={issue.id ?? i} style={{ background:'rgba(255,255,255,.03)', border:`1px solid ${cfg.border}`, borderRadius:9, overflow:'hidden' }}>
                  <div style={{ padding:'10px 13px', display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, flexShrink:0, boxShadow:`0 0 5px ${cfg.dot}88` }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:3 }}>{issue.title}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontWeight:700, textTransform:'uppercase' }}>{sev}</span>
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(255,255,255,.04)', color:'#64748b' }}>WCAG {issue.wcag} — {wcag}</span>
                        {issue.filePath && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(16,185,129,.07)', color:'#34d399', fontFamily:'monospace' }}>{issue.filePath.split('/').pop()}</span>}
                      </div>
                    </div>
                    {(issue.autoFixCode || issue.fix) && (
                      <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(16,185,129,.1)', color:'#10b981', fontWeight:700, flexShrink:0 }}>fixable</span>
                    )}
                    <div style={{ color:'#334155', fontSize:10, transform:open?'rotate(90deg)':'none', transition:'transform .2s', flexShrink:0 }}>▶</div>
                  </div>
                  {open && (
                    <div style={{ borderTop:`1px solid ${cfg.border}`, padding:'10px 13px', background:'rgba(0,0,0,.15)' }}>
                      <p style={{ fontSize:11, color:'#94a3b8', lineHeight:1.65, marginBottom:8 }}>{issue.description}</p>
                      {issue.fix && (
                        <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5, background:'rgba(255,255,255,.03)', borderRadius:6, padding:'8px 10px', marginBottom:8 }}>
                          <strong style={{ color:'#475569' }}>Fix:</strong> {issue.fix}
                        </div>
                      )}
                      {(issue.autoFixCode || issue.fix) && fixable > 0 && (
                        <button onClick={openHITL}
                          style={{ padding:'7px 14px', borderRadius:7, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', width:'100%' }}>
                          🧑‍💼 Review All Fixes in HITL Queue
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'passed' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(report?.passed??[]).length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', fontSize:12, color:'#475569' }}>No passing checks recorded.</div>
            )}
            {(report?.passed??[]).map((p,i)=>(
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 12px', borderRadius:8, background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.15)' }}>
                <span style={{ color:'#10b981', fontWeight:900, fontSize:12 }}>✓</span>
                <span style={{ fontSize:12, color:'#6ee7b7', lineHeight:1.5 }}>{p}</span>
              </div>
            ))}
            {(report?.recommendations??[]).length > 0 && (
              <>
                <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'.1em', marginTop:12, marginBottom:6 }}>Recommendations</div>
                {(report?.recommendations??[]).map((r,i)=>(
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 12px', borderRadius:8, background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.15)' }}>
                    <span style={{ color:'#818cf8', fontWeight:700, flexShrink:0 }}>→</span>
                    <span style={{ fontSize:11, color:'#a5b4fc', lineHeight:1.55 }}>{r}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'history' && <HistoryView generationId={generationId} accessToken={accessToken}/>}
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}
