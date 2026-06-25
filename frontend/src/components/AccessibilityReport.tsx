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
  critical: { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', dot:'#ef4444', rank:0, label:'Critical' },
  serious:  { color:'#c2410c', bg:'#fff7ed', border:'#fed7aa', dot:'#f97316', rank:1, label:'Serious'  },
  moderate: { color:'#b45309', bg:'#fffbeb', border:'#fde68a', dot:'#f59e0b', rank:2, label:'Moderate' },
  minor:    { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0', dot:'#94a3b8', rank:3, label:'Minor'    },
} as const

const WCAG: Record<string,string> = {
  '1.1.1':'Non-text Content','1.3.1':'Info & Relationships','1.4.3':'Contrast Minimum',
  '2.1.1':'Keyboard','2.4.3':'Focus Order','2.4.6':'Headings & Labels',
  '2.4.7':'Focus Visible','3.3.2':'Labels or Instructions','4.1.2':'Name, Role, Value',
}

const SCAN_AGENTS = [
  { name:'DOM Crawler',      msg:'Walking the component tree, cataloguing all elements…'  },
  { name:'Contrast Checker', msg:'Testing foreground/background colour contrast ratios…'   },
  { name:'ARIA Inspector',   msg:'Auditing role, label, and landmark attributes…'          },
  { name:'Keyboard Nav',     msg:'Simulating tab order and focus management paths…'         },
  { name:'WCAG 2.1 Mapper',  msg:'Mapping violations to WCAG success criteria…'            },
  { name:'Fix Generator',    msg:'Generating minimal auto-fix patches for each issue…'     },
]

// ── Scan animation ─────────────────────────────────────────────────────────
function ScanningView({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState('.')
  const done = useRef(false)

  useEffect(() => { const d = setInterval(() => setDots(p => p.length>=3?'.':p+'.'),380); return()=>clearInterval(d) }, [])
  useEffect(() => {
    if (done.current) return
    const t = setTimeout(() => {
      if (step < SCAN_AGENTS.length - 1) setStep(s=>s+1)
      else if (!done.current) { done.current=true; setTimeout(()=>onDone?.(), 600) }
    }, 920)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div style={{ height:'100%', background:'#fff', display:'flex', flexDirection:'column', padding:'28px 24px', fontFamily:'inherit' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>♿</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>WCAG 2.1 AA Audit Pipeline</div>
          <div style={{ fontSize:11, color:'#94a3b8' }}>6 specialist accessibility agents</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'aPulse 1s infinite' }}/>
          <span style={{ fontSize:10, color:'#059669', fontWeight:700 }}>SCANNING</span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12, flex:1 }}>
        {SCAN_AGENTS.map((ag, i) => {
          const past=i<step, cur=i===step, fut=i>step
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, opacity:fut?.3:1, transition:'opacity .3s' }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background: past?'linear-gradient(135deg,#059669,#10b981)':cur?'rgba(16,185,129,.08)':'#f8fafc',
                border: past?'none':cur?'2px solid #10b981':'1px solid #e2e8f0',
                display:'flex',alignItems:'center',justifyContent:'center', fontSize:11,
                animation: cur?'aSpin .9s linear infinite':'none',
                boxShadow: past?'0 2px 8px rgba(16,185,129,.25)':cur?'0 0 0 3px rgba(16,185,129,.1)':'none',
              }}>
                {past&&<span style={{ color:'#fff', fontWeight:900, fontSize:12 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:past?'#059669':cur?'#10b981':'#94a3b8', marginBottom:2 }}>
                  {ag.name}{cur&&<span style={{ color:'#94a3b8', fontWeight:400 }}>{dots}</span>}
                </div>
                {(past||cur)&&<div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4 }}>{ag.msg}</div>}
              </div>
              {past&&<span style={{ fontSize:10, color:'#059669', fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#f0fdf4' }}>done</span>}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:20, padding:'10px 16px', background:'linear-gradient(135deg,rgba(16,185,129,.06),rgba(5,150,105,.03))', border:'1px solid rgba(16,185,129,.2)', borderRadius:10 }}>
        <div style={{ fontSize:11, color:'#059669', fontWeight:600 }}>Agent {Math.min(step+1,SCAN_AGENTS.length)}/{SCAN_AGENTS.length} · Reading your source files…</div>
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); border-color:#10b981 rgba(16,185,129,.2) rgba(16,185,129,.2) rgba(16,185,129,.2); } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score:number }) {
  const r=36, circ=2*Math.PI*r, col=score>=80?'#059669':score>=60?'#d97706':'#dc2626'
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" style={{ flexShrink:0 }}>
      <circle cx={45} cy={45} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8}/>
      <circle cx={45} cy={45} r={r} fill="none" stroke={col} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={circ*(1-Math.min(score,100)/100)}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{ transition:'stroke-dashoffset 1s ease' }}/>
      <text x={45} y={49} textAnchor="middle" fontSize={20} fontWeight={900} fill={col}>{score}</text>
      <text x={45} y={62} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600}>/100</text>
    </svg>
  )
}

// ── HITL types & card ──────────────────────────────────────────────────────
type FixStatus = 'waiting'|'approved'|'rejected'|'applying'|'done'|'failed'
interface HITLFix {
  issue: AccessibilityIssue & { filePath?:string; autoFixCode?:string; currentCode?:string }
  status: FixStatus; error?: string
}

function HITLFixCard({ fix, idx, onApprove, onReject }: {
  fix:HITLFix; idx:number; onApprove:(i:number)=>void; onReject:(i:number)=>void
}) {
  const [open, setOpen] = useState(false)
  const sev = (fix.issue.severity as keyof typeof SEV) ?? 'minor'
  const cfg = SEV[sev]
  const wcag = WCAG[fix.issue.wcag] ?? fix.issue.wcag
  const waiting = fix.status === 'waiting'

  return (
    <div style={{
      background: fix.status==='approved'?'#f0fdf4':fix.status==='rejected'?'#fef2f2':fix.status==='done'?'#f0fdf4':'#fff',
      border:`1px solid ${fix.status==='approved'?'#bbf7d0':fix.status==='rejected'?'#fecaca':fix.status==='done'?'#86efac':cfg.border}`,
      borderRadius:11, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
    }}>
      {/* Header */}
      <div style={{ padding:'12px 15px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:3 }}>{fix.issue.title}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontWeight:700, textTransform:'uppercase' }}>{cfg.label}</span>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'#f8fafc', color:'#64748b' }}>WCAG {fix.issue.wcag} — {wcag}</span>
            {fix.issue.filePath&&<span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'#f0fdf4', color:'#059669', fontFamily:'monospace' }}>{fix.issue.filePath.split('/').pop()}</span>}
          </div>
        </div>
        {waiting&&(
          <div style={{ display:'flex', gap:7, flexShrink:0 }}>
            <button onClick={e=>{e.stopPropagation();onReject(idx)}} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>✕</button>
            <button onClick={e=>{e.stopPropagation();onApprove(idx)}} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>✓</button>
          </div>
        )}
        {fix.status==='approved'&&<span style={{ fontSize:10, fontWeight:700, color:'#059669', background:'#dcfce7', padding:'3px 9px', borderRadius:6, flexShrink:0 }}>✓ Approved</span>}
        {fix.status==='rejected'&&<span style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'3px 9px', borderRadius:6, flexShrink:0 }}>✕ Skipped</span>}
        {fix.status==='applying'&&<div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #bbf7d0', borderTopColor:'#10b981', animation:'aSpin .7s linear infinite', flexShrink:0 }}/>}
        {fix.status==='done'&&<span style={{ fontSize:10, fontWeight:700, color:'#059669', flexShrink:0 }}>Applied ✓</span>}
        {fix.status==='failed'&&<span style={{ fontSize:10, fontWeight:700, color:'#dc2626', flexShrink:0 }}>Failed</span>}
        <div style={{ color:'#cbd5e1', fontSize:10, transform:open?'rotate(90deg)':'none', transition:'transform .2s', marginLeft:2 }}>▶</div>
      </div>

      {/* Diff view */}
      {open&&(
        <div style={{ borderTop:`1px solid ${cfg.border}`, padding:'12px 15px', background:'#fafafa' }}>
          <p style={{ fontSize:11, color:'#64748b', lineHeight:1.65, marginBottom:10 }}>{fix.issue.description}</p>

          {fix.issue.currentCode&&(
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#dc2626', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#dc2626', display:'inline-block' }}/> Before — current code
              </div>
              <div style={{ background:'#fff', border:'1px solid #fecaca', borderRadius:7, padding:'8px 12px', overflow:'auto' }}>
                <pre style={{ margin:0, fontSize:10, color:'#991b1b', lineHeight:1.55, fontFamily:'monospace' }}>{fix.issue.currentCode}</pre>
              </div>
            </div>
          )}

          {fix.issue.autoFixCode&&(
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#059669', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block' }}/> After — proposed fix
              </div>
              <div style={{ background:'#fff', border:'1px solid #bbf7d0', borderRadius:7, padding:'8px 12px', overflow:'auto' }}>
                <pre style={{ margin:0, fontSize:10, color:'#14532d', lineHeight:1.55, fontFamily:'monospace' }}>{fix.issue.autoFixCode}</pre>
              </div>
            </div>
          )}

          {fix.status==='failed'&&fix.error&&(
            <div style={{ padding:'8px 10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, fontSize:11, color:'#dc2626' }}>{fix.error}</div>
          )}

          {waiting&&(
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={()=>onReject(idx)} style={{ flex:1, padding:'9px 0', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>✕ Reject fix</button>
              <button onClick={()=>onApprove(idx)} style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.2)' }}>✓ Approve fix</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Issue card (needs own state for open/closed) ───────────────────────────
type IssueExt = AccessibilityIssue & { filePath?:string; autoFixCode?:string; currentCode?:string }
function IssueCard({ issue, showHITL, onOpenHITL }: { issue:IssueExt; showHITL:boolean; onOpenHITL:()=>void }) {
  const [open, setOpen] = useState(false)
  const sev = (issue.severity as keyof typeof SEV) ?? 'minor'
  const cfg = SEV[sev]
  const wcag = WCAG[issue.wcag] ?? issue.wcag
  return (
    <div style={{ background:'#fff', border:`1px solid ${cfg.border}`, borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ padding:'11px 14px', display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:3 }}>{issue.title}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontWeight:700, textTransform:'uppercase' }}>{cfg.label}</span>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'#f8fafc', color:'#64748b' }}>WCAG {issue.wcag} — {wcag}</span>
            {issue.filePath&&<span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'#f0fdf4', color:'#059669', fontFamily:'monospace' }}>{issue.filePath.split('/').pop()}</span>}
          </div>
        </div>
        {(issue.autoFixCode||issue.fix)&&<span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'#f0fdf4', color:'#059669', fontWeight:700, flexShrink:0 }}>fixable</span>}
        <div style={{ color:'#cbd5e1', fontSize:10, transform:open?'rotate(90deg)':'none', transition:'transform .2s' }}>▶</div>
      </div>
      {open&&(
        <div style={{ borderTop:`1px solid ${cfg.border}`, padding:'10px 14px', background:'#fafafa' }}>
          <p style={{ fontSize:11, color:'#64748b', lineHeight:1.65, marginBottom:8 }}>{issue.description}</p>
          {issue.fix&&<div style={{ fontSize:11, color:'#374151', background:'#fff', border:'1px solid #e2e8f0', borderRadius:7, padding:'8px 10px', marginBottom:8 }}><strong style={{ color:'#374151' }}>Fix: </strong>{issue.fix}</div>}
          {showHITL&&<button onClick={onOpenHITL} style={{ width:'100%', padding:'8px 0', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>🧑‍💼 Open HITL Fix Queue</button>}
        </div>
      )}
    </div>
  )
}

// ── HITL queue panel ───────────────────────────────────────────────────────
function HITLQueue({ fixes, onApprove, onReject, onApply, applyingCount }: {
  fixes:HITLFix[]; onApprove:(i:number)=>void; onReject:(i:number)=>void; onApply:()=>void; applyingCount:number
}) {
  const waiting  = fixes.filter(f=>f.status==='waiting').length
  const approved = fixes.filter(f=>f.status==='approved').length
  const done     = fixes.filter(f=>f.status==='done').length
  const allReviewed = waiting===0 && applyingCount===0

  const sorted = [...fixes.entries()].sort(([,a],[,b])=>
    (SEV[(a.issue.severity as keyof typeof SEV)]?.rank??3) - (SEV[(b.issue.severity as keyof typeof SEV)]?.rank??3)
  )

  return (
    <div style={{ height:'100%', background:'#fafafa', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'inherit' }}>

      {/* HITL banner */}
      <div style={{ flexShrink:0, background:'linear-gradient(135deg,#fffbeb,#fef9c3)', borderBottom:'1px solid #fde68a', padding:'14px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'#fef9c3', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🧑‍💼</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:'#92400e', marginBottom:3 }}>Human-in-the-Loop Review</div>
            <div style={{ fontSize:11, color:'#a16207', lineHeight:1.6 }}>
              The AI has <strong>paused</strong>. Review each proposed fix before any code changes.
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
          {waiting>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:'#fef3c7', border:'1px solid #fde68a' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', animation:'aPulse 1s infinite' }}/>
              <span style={{ fontSize:10, fontWeight:700, color:'#92400e' }}>{waiting} awaiting review</span>
            </div>
          )}
          {approved>0&&<span style={{ fontSize:10, fontWeight:700, color:'#059669', background:'#dcfce7', padding:'3px 9px', borderRadius:20, border:'1px solid #bbf7d0' }}>✓ {approved} approved</span>}
          {done>0&&<span style={{ fontSize:10, fontWeight:700, color:'#0369a1', background:'#e0f2fe', padding:'3px 9px', borderRadius:20, border:'1px solid #bae6fd' }}>Applied: {done}</span>}
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.map(([origIdx, fix]) => (
          <HITLFixCard key={fix.issue.id??origIdx} fix={fix} idx={origIdx} onApprove={onApprove} onReject={onReject}/>
        ))}
      </div>

      {/* Apply bar */}
      <div style={{ flexShrink:0, padding:'12px 14px', borderTop:'1px solid #f1f5f9', background:'#fff' }}>
        {!allReviewed ? (
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center' }}>
            Review all fixes to enable Apply{approved>0&&<span style={{ color:'#10b981', fontWeight:700 }}> · {approved} ready</span>}
          </div>
        ) : approved>0 ? (
          <button onClick={onApply} style={{ width:'100%', padding:'12px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,.25)' }}>
            ⚡ Apply {approved} Approved Fix{approved>1?'es':''}
          </button>
        ) : (
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center' }}>All fixes rejected — no changes will be made.</div>
        )}
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export const AccessibilityReport: React.FC<Props> = ({
  report, generationId, onGenerate, isGenerating, accessToken, onFixApplied
}) => {
  const [tab, setTab]           = useState<'issues'|'passed'|'history'>('issues')
  const [scanning, setScanning] = useState(false)
  const [hitlMode, setHitlMode] = useState(false)
  const [hitlFixes, setHitlFixes]       = useState<HITLFix[]>([])
  const [applyingCount, setApplyingCount] = useState(0)
  const [history, setHistory]   = useState<any[]>([])
  const [histLoading, setHistLoading] = useState(false)

  const startAudit = () => { setScanning(true); setHitlMode(false); onGenerate?.() }

  const buildHITL = (src?: AccessibilityReportType) => {
    const r = src ?? report
    const issues = ((r?.issues??[]) as (AccessibilityIssue&{filePath?:string;autoFixCode?:string;currentCode?:string})[])
      .filter(i=>i.autoFixCode||i.fix)
    if (!issues.length) return
    setHitlFixes(issues.map(i=>({issue:i, status:'waiting'})))
    setHitlMode(true)
  }

  const onScanDone = () => { setScanning(false) }

  useEffect(() => {
    if (tab==='history' && generationId && !history.length) {
      setHistLoading(true)
      getAccessibilityHistory(generationId, accessToken)
        .then(setHistory).catch(()=>{}).finally(()=>setHistLoading(false))
    }
  }, [tab, generationId, accessToken])

  const approveHITL = (i:number) => setHitlFixes(p=>p.map((f,j)=>j===i?{...f,status:'approved'}:f))
  const rejectHITL  = (i:number) => setHitlFixes(p=>p.map((f,j)=>j===i?{...f,status:'rejected'}:f))

  const applyApproved = async () => {
    const toApply = hitlFixes.map((f,i)=>({...f,_i:i})).filter(f=>f.status==='approved')
    setApplyingCount(toApply.length)
    for (const fix of toApply) {
      setHitlFixes(p=>p.map((f,j)=>j===fix._i?{...f,status:'applying'}:f))
      try {
        const path = fix.issue.filePath||fix.issue.element||''
        const code = fix.issue.autoFixCode||fix.issue.fix||''
        if (!path||!code||!generationId) throw new Error('Missing data')
        const res = await applyAccessibilityFix(generationId, fix.issue.id, path, code, accessToken, fix.issue.currentCode)
        setHitlFixes(p=>p.map((f,j)=>j===fix._i?{...f,status:res.success?'done':'failed',error:res.success?undefined:res.message}:f))
        if (res.success) onFixApplied?.()
      } catch(e:any) {
        setHitlFixes(p=>p.map((f,j)=>j===fix._i?{...f,status:'failed',error:e.message}:f))
      }
      setApplyingCount(c=>c-1)
    }
  }

  // ── States ──
  if (!report?.generated && !isGenerating && !scanning) return (
    <div style={{ height:'100%', background:'#fafafa', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:32, textAlign:'center', fontFamily:'inherit' }}>
      <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>♿</div>
      <div>
        <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:6 }}>No accessibility audit yet</div>
        <div style={{ fontSize:12, color:'#64748b', maxWidth:300, lineHeight:1.7 }}>
          Run a 6-agent WCAG 2.1 AA scan. The AI pauses after analysis and waits for your approval before touching any file.
        </div>
      </div>
      <button onClick={startAudit} style={{ padding:'11px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,.25)', display:'flex', alignItems:'center', gap:8 }}>
        <span>♿</span> Run WCAG Audit
      </button>
    </div>
  )

  if (isGenerating || scanning) return <ScanningView onDone={onScanDone}/>
  if (hitlMode) return <HITLQueue fixes={hitlFixes} onApprove={approveHITL} onReject={rejectHITL} onApply={applyApproved} applyingCount={applyingCount}/>

  if (report?.error) return (
    <div style={{ height:'100%', background:'#fafafa', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:32, fontFamily:'inherit' }}>
      <div style={{ fontSize:12, color:'#dc2626', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 20px', textAlign:'center' }}>Audit failed: {report.error}</div>
      <button onClick={startAudit} style={{ padding:'9px 22px', borderRadius:8, border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#059669', fontSize:12, fontWeight:700, cursor:'pointer' }}>↺ Retry</button>
    </div>
  )

  const issues = ((report?.issues??[]) as (AccessibilityIssue&{filePath?:string;autoFixCode?:string})[])
    .sort((a,b)=>(SEV[(a.severity as keyof typeof SEV)]?.rank??3)-(SEV[(b.severity as keyof typeof SEV)]?.rank??3))
  const score    = report?.score??0
  const critical = issues.filter(i=>i.severity==='critical').length
  const serious  = issues.filter(i=>i.severity==='serious').length
  const fixable  = issues.filter(i=>i.autoFixCode||i.fix).length
  const scoreCol = score>=80?'#059669':score>=60?'#d97706':'#dc2626'

  const TAB = (id: typeof tab, lbl: string) => (
    <div onClick={()=>setTab(id)} style={{ fontSize:12, fontWeight:700, color:tab===id?'#059669':'#94a3b8', borderBottom:`2px solid ${tab===id?'#10b981':'transparent'}`, paddingBottom:10, cursor:'pointer', transition:'color .15s' }}>{lbl}</div>
  )

  return (
    <div style={{ height:'100%', background:'#fafafa', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'inherit' }}>

      {/* ── Score header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f1f5f9', padding:'16px 16px 0', flexShrink:0 }}>
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14, background:'#fafafa', borderRadius:12, border:'1px solid #f1f5f9', padding:'14px 14px' }}>
          <ScoreRing score={score}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:800, color:'#059669', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>WCAG 2.1 {report?.wcagLevel??'AA'}</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:6 }}>
              {score>=80?'Compliant ✓':'Non-compliant'} · {issues.length} issue{issues.length!==1?'s':''}
            </div>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:8, lineHeight:1.5 }}>{report?.summary}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {critical>0&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'#fef2f2', color:'#dc2626', fontWeight:700, border:'1px solid #fecaca' }}>{critical} Critical</span>}
              {serious>0&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'#fff7ed', color:'#c2410c', fontWeight:700, border:'1px solid #fed7aa' }}>{serious} Serious</span>}
              {issues.length===0&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'#f0fdf4', color:'#059669', fontWeight:700, border:'1px solid #bbf7d0' }}>✓ Fully compliant</span>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7, flexShrink:0 }}>
            {fixable>0&&(
              <button onClick={()=>buildHITL()} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 3px 10px rgba(16,185,129,.25)' }}>
                🧑‍💼 Review Fixes ({fixable})
              </button>
            )}
            <button onClick={startAudit} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#059669', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              ↺ Re-scan
            </button>
          </div>
        </div>

        <div style={{ display:'flex', gap:20, paddingLeft:2 }}>
          {TAB('issues',`Issues (${issues.length})`)}
          {TAB('passed',`Passed (${(report?.passed??[]).length})`)}
          {TAB('history','History')}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 20px' }}>

        {tab==='issues'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {issues.length===0&&(
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#059669', marginBottom:4 }}>Fully compliant!</div>
                <div style={{ fontSize:12, color:'#64748b' }}>No WCAG 2.1 AA violations found in your project.</div>
              </div>
            )}
            {issues.map((issue, i) => (
              <IssueCard key={(issue as any).id??i} issue={issue as IssueExt} showHITL={fixable>0} onOpenHITL={()=>buildHITL()}/>
            ))}
          </div>
        )}

        {tab==='passed'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(report?.passed??[]).length===0&&<div style={{ textAlign:'center', padding:'30px 20px', fontSize:12, color:'#94a3b8' }}>No passing checks recorded.</div>}
            {(report?.passed??[]).map((p,i)=>(
              <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 12px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                <span style={{ color:'#059669', fontWeight:900 }}>✓</span>
                <span style={{ fontSize:12, color:'#166534', lineHeight:1.5 }}>{p}</span>
              </div>
            ))}
            {(report?.recommendations??[]).length>0&&(
              <>
                <div style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.1em', marginTop:12, marginBottom:6 }}>Recommendations</div>
                {(report?.recommendations??[]).map((r,i)=>(
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 12px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe' }}>
                    <span style={{ color:'#3b82f6', fontWeight:700, flexShrink:0 }}>→</span>
                    <span style={{ fontSize:11, color:'#1e40af', lineHeight:1.55 }}>{r}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab==='history'&&(
          histLoading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, gap:8 }}>
              <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #bbf7d0', borderTopColor:'#10b981', animation:'aSpin .7s linear infinite' }}/>
              <span style={{ fontSize:12, color:'#94a3b8' }}>Loading history…</span>
            </div>
          ) : history.length===0 ? (
            <div style={{ textAlign:'center', padding:'30px 20px', fontSize:12, color:'#94a3b8' }}>No audit history yet.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {history.map((h:any,i)=>{
                const col=(h.score??0)>=80?'#059669':(h.score??0)>=60?'#d97706':'#dc2626'
                return (
                  <div key={i} style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background: (h.score??0)>=80?'#f0fdf4':'#fef2f2', border:`1px solid ${(h.score??0)>=80?'#bbf7d0':'#fecaca'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:900, color:col }}>{h.score??'—'}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1e293b', marginBottom:2 }}>WCAG {h.wcagLevel??'AA'} · {h.issueCount??0} issues · {h.filesAnalyzed??0} files</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>{h.timestamp?new Date(h.timestamp).toLocaleString():'—'}</div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:(h.score??0)>=80?'#f0fdf4':(h.score??0)>=60?'#fffbeb':'#fef2f2', color:col, fontWeight:700, border:`1px solid ${(h.score??0)>=80?'#bbf7d0':(h.score??0)>=60?'#fde68a':'#fecaca'}` }}>
                      {(h.score??0)>=80?'Pass':(h.score??0)>=60?'Fair':'Fail'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      <style>{`
        @keyframes aSpin { to { transform:rotate(360deg); } }
        @keyframes aPulse { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}
