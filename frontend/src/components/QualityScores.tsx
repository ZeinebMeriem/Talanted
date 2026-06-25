import React, { useState, useEffect, useRef } from 'react'

export interface QualityScoresData {
  globalScore?: number
  semanticFidelity?: number
  codeQuality?: number
  completeness?: number
  accessibility?: number
  visualRichness?: number
}

interface QualityScoresProps {
  scores?: QualityScoresData
  reasoning?: Record<string, string>
  generationId?: string
  accessToken?: string
  onRepair?: () => void
  isRepairing?: boolean
  onEvaluate?: () => void
}

const DIMS = [
  {
    key: 'codeQuality' as const, rk: 'code_quality', label: 'Code Quality', icon: '⌨', w: 25,
    repairHint: (s: number) => s < 40
      ? `Critical: score ${s}/100. Component structure is broken — hooks used incorrectly, TypeScript errors, or anti-patterns. AI will refactor the component tree and fix type safety issues.`
      : `Score ${s}/100. React best practices not fully met — possible prop drilling, missing memoisation, or inefficient re-renders. AI will apply structural improvements.`,
  },
  {
    key: 'semanticFidelity' as const, rk: 'semantic_fidelity', label: 'Semantic Fidelity', icon: '🎯', w: 35,
    repairHint: (s: number) => s < 40
      ? `Critical: score ${s}/100. The generated UI diverges significantly from your original prompt — key sections or interactions are missing. AI will re-read the prompt and rebuild misaligned parts.`
      : `Score ${s}/100. Several prompt requirements are partially implemented. AI will cross-check every feature described in the prompt and complete the missing ones.`,
  },
  {
    key: 'completeness' as const, rk: 'completeness', label: 'Completeness', icon: '✓', w: 20,
    repairHint: (s: number) => s < 40
      ? `Critical: score ${s}/100. Large sections of the UI are absent — routing, forms, or core pages are missing. AI will scaffold the missing parts.`
      : `Score ${s}/100. Some interactive elements or edge-case states (empty, loading, error) are missing. AI will add the incomplete flows.`,
  },
  {
    key: 'accessibility' as const, rk: 'accessibility', label: 'Accessibility', icon: '♿', w: 10,
    repairHint: (s: number) => s < 40
      ? `Critical: score ${s}/100. Multiple WCAG 2.1 AA violations — missing alt text, broken focus order, no ARIA labels. AI will apply a systematic accessibility pass.`
      : `Score ${s}/100. Some inputs lack labels or buttons lack descriptive text. AI will add ARIA attributes and fix keyboard navigation.`,
  },
  {
    key: 'visualRichness' as const, rk: 'visual_richness', label: 'Visual Richness', icon: '🎨', w: 10,
    repairHint: (s: number) => s < 40
      ? `Critical: score ${s}/100. The UI is very sparse — minimal colour, no icons, flat layout. AI will add a colour palette, iconography, cards, and visual hierarchy.`
      : `Score ${s}/100. Layout lacks depth. AI will enhance with gradients, shadows, data charts where appropriate, and richer component styling.`,
  },
]

const sc = (v?: number) =>
  v === undefined || v === null ? { color:'#94a3b8', bar:'#e2e8f0', bg:'#f8fafc', label:'—' }
  : v >= 80 ? { color:'#059669', bar:'#10b981', bg:'#f0fdf4', label:'Good' }
  : v >= 60 ? { color:'#d97706', bar:'#f59e0b', bg:'#fffbeb', label:'Fair' }
  : { color:'#dc2626', bar:'#ef4444', bg:'#fef2f2', label:'Low' }

const grade = (s: number) =>
  s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 50 ? 'D' : 'F'

function GaugeRing({ score, size = 100 }: { score: number; size?: number }) {
  const sw = 9, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(score, 100) / 100) * circ
  const col = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.04em', lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:9, color:'#94a3b8', fontWeight:600 }}>/100</span>
      </div>
    </div>
  )
}

// ── Pipeline scan animation ─────────────────────────────────────────────────
const SCAN_STEPS = [
  { agent:'Code Analyzer',      msg:'Parsing React component tree and TypeScript types…' },
  { agent:'Semantic Inspector', msg:'Comparing generated UI against original prompt intent…' },
  { agent:'Coverage Checker',   msg:'Verifying sections, interactions and routing coverage…' },
  { agent:'A11y Auditor',       msg:'Running WCAG 2.1 AA accessibility rule checks…' },
  { agent:'Visual Scorer',      msg:'Evaluating colour density, icons and layout complexity…' },
  { agent:'Report Builder',     msg:'Aggregating dimension scores and LLM reasoning…' },
]

function ScanningView({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState('.')
  const done = useRef(false)

  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '.' : p + '.'), 400)
    return () => clearInterval(d)
  }, [])

  useEffect(() => {
    if (done.current) return
    const t = setTimeout(() => {
      if (step < SCAN_STEPS.length - 1) setStep(s => s + 1)
      else if (!done.current) { done.current = true; setTimeout(() => onDone?.(), 500) }
    }, 880)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div style={{ height:'100%', background:'#fff', display:'flex', flexDirection:'column', padding:'28px 24px', fontFamily:'inherit' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>📊</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', letterSpacing:'.01em' }}>Quality Analysis Pipeline</div>
          <div style={{ fontSize:11, color:'#94a3b8' }}>6 specialist agents · 5 dimensions</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'qPulse 1s infinite' }}/>
          <span style={{ fontSize:10, color:'#059669', fontWeight:700 }}>RUNNING</span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12, flex:1 }}>
        {SCAN_STEPS.map((s, i) => {
          const past = i < step, current = i === step, future = i > step
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, opacity: future ? 0.35 : 1, transition:'opacity .3s' }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background: past ? 'linear-gradient(135deg,#059669,#10b981)' : current ? 'rgba(124,58,237,.08)' : '#f8fafc',
                border: past ? 'none' : current ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
                animation: current ? 'qSpin .9s linear infinite' : 'none',
                boxShadow: past ? '0 2px 8px rgba(16,185,129,.25)' : current ? '0 0 0 3px rgba(124,58,237,.1)' : 'none',
              }}>
                {past && <span style={{ color:'#fff', fontWeight:900, fontSize:12 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color: past ? '#059669' : current ? '#7c3aed' : '#94a3b8', marginBottom:2 }}>
                  {s.agent}{current && <span style={{ color:'#94a3b8', fontWeight:400 }}>{dots}</span>}
                </div>
                {(past || current) && (
                  <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4 }}>{s.msg}</div>
                )}
              </div>
              {past && <span style={{ fontSize:10, color:'#10b981', fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#f0fdf4' }}>done</span>}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:20, padding:'10px 16px', background:'linear-gradient(135deg,rgba(124,58,237,.06),rgba(168,85,247,.03))', border:'1px solid rgba(124,58,237,.15)', borderRadius:10 }}>
        <div style={{ fontSize:11, color:'#7c3aed', fontWeight:600 }}>
          Step {Math.min(step + 1, SCAN_STEPS.length)} of {SCAN_STEPS.length} · Analysing your project…
        </div>
      </div>

      <style>{`
        @keyframes qSpin { to { transform:rotate(360deg); border-color:#7c3aed rgba(124,58,237,.2) rgba(124,58,237,.2) rgba(124,58,237,.2); } }
        @keyframes qPulse { 0%,100%{opacity:1}50%{opacity:.35} }
      `}</style>
    </div>
  )
}

// ── HITL repair queue ──────────────────────────────────────────────────────
interface RepairStep { dimension: string; icon: string; score: number; reasoning: string; status: 'waiting'|'approved'|'rejected' }

function HITLRepairQueue({ steps, onApprove, onReject, onApplyAll }: {
  steps: RepairStep[]; onApprove:(i:number)=>void; onReject:(i:number)=>void; onApplyAll:()=>void
}) {
  const waiting  = steps.filter(s => s.status === 'waiting').length
  const approved = steps.filter(s => s.status === 'approved').length

  return (
    <div style={{ height:'100%', background:'#fafafa', overflowY:'auto', display:'flex', flexDirection:'column', padding:'20px 18px', gap:14, fontFamily:'inherit' }}>

      {/* HITL banner */}
      <div style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fde68a', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:14, flexShrink:0 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#fef9c3', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🧑‍💼</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'#92400e', marginBottom:4 }}>Human Approval Required</div>
          <div style={{ fontSize:12, color:'#a16207', lineHeight:1.6 }}>
            The AI has <strong>paused</strong> and is waiting for you to review each proposed repair.
            Nothing changes until you approve.
            {waiting > 0 && <span style={{ marginLeft:6, background:'#fcd34d', color:'#78350f', padding:'1px 7px', borderRadius:10, fontSize:11, fontWeight:700 }}>{waiting} pending</span>}
          </div>
        </div>
      </div>

      {/* Repair cards */}
      {steps.map((step, i) => (
        <div key={i} style={{
          background: step.status==='approved' ? '#f0fdf4' : step.status==='rejected' ? '#fef2f2' : '#fff',
          border: `1px solid ${step.status==='approved' ? '#bbf7d0' : step.status==='rejected' ? '#fecaca' : '#e2e8f0'}`,
          borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,rgba(124,58,237,.12),rgba(168,85,247,.08))', border:'1px solid rgba(124,58,237,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
              {step.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{step.dimension}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                Scored <strong style={{ color: step.score<40?'#dc2626':step.score<70?'#d97706':'#059669' }}>{step.score}/100</strong> · AI-proposed repair
              </div>
            </div>
            {step.status === 'waiting' && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => onReject(i)} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕ Reject</button>
                <button onClick={() => onApprove(i)} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.25)' }}>✓ Approve</button>
              </div>
            )}
            {step.status === 'approved' && <span style={{ fontSize:12, fontWeight:700, color:'#059669', background:'#dcfce7', padding:'4px 12px', borderRadius:8 }}>✓ Approved</span>}
            {step.status === 'rejected' && <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'4px 12px', borderRadius:8 }}>✕ Rejected</span>}
          </div>

          {/* LLM reasoning */}
          <div style={{ background: step.status==='approved' ? 'rgba(16,185,129,.06)' : step.status==='rejected' ? 'rgba(239,68,68,.04)' : 'rgba(124,58,237,.04)', border:`1px solid ${step.status==='approved'?'rgba(16,185,129,.2)':step.status==='rejected'?'rgba(239,68,68,.12)':'rgba(124,58,237,.1)'}`, borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>AI Analysis</div>
            <div style={{ fontSize:12, color:'#374151', lineHeight:1.7 }}>{step.reasoning}</div>
          </div>
        </div>
      ))}

      {/* Apply button */}
      {waiting === 0 && approved > 0 && (
        <button onClick={onApplyAll} style={{ padding:'13px 0', borderRadius:11, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(124,58,237,.3)', marginTop:4 }}>
          ⚡ Apply {approved} Approved Repair{approved > 1 ? 's' : ''}
        </button>
      )}
      {waiting === 0 && approved === 0 && (
        <div style={{ textAlign:'center', fontSize:12, color:'#94a3b8', padding:'12px 0' }}>All repairs rejected — no changes will be made.</div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export const QualityScores: React.FC<QualityScoresProps> = ({
  scores, reasoning, onRepair, isRepairing, onEvaluate
}) => {
  const [scanning, setScanning] = useState(false)
  const [hitl, setHitl]         = useState(false)
  const [repairSteps, setRepairSteps] = useState<RepairStep[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const hasScores = scores && Object.values(scores).some(v => v != null)
  const global    = scores?.globalScore ?? 0
  const needsFix  = hasScores && DIMS.some(d => (scores![d.key] ?? 0) < 70)

  const startEvaluate = () => { setScanning(true); onEvaluate?.() }
  const onScanDone    = () => setScanning(false)

  const startRepair = () => {
    const weak = DIMS.filter(d => (scores?.[d.key] ?? 0) < 70)
    setRepairSteps(weak.map(d => {
      const score  = scores?.[d.key] ?? 0
      // Use LLM reasoning if available, otherwise use the dimension-specific hint
      const llmReason = reasoning?.[d.rk]
      const reasoning_ = llmReason && llmReason.trim().length > 10
        ? llmReason
        : d.repairHint(score)
      return { dimension: d.label, icon: d.icon, score, reasoning: reasoning_, status: 'waiting' }
    }))
    setHitl(true)
  }

  const approveRepair = (i: number) => setRepairSteps(p => p.map((s,j) => j===i ? {...s, status:'approved'} : s))
  const rejectRepair  = (i: number) => setRepairSteps(p => p.map((s,j) => j===i ? {...s, status:'rejected'} : s))
  const applyApproved = () => { setHitl(false); onRepair?.() }

  if (isRepairing) return (
    <div style={{ height:'100%', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:32 }}>
      <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(124,58,237,.15)', borderTopColor:'#7c3aed', animation:'qSpin .9s linear infinite' }}/>
      <div style={{ fontSize:13, color:'#7c3aed', fontWeight:700 }}>Applying approved repairs…</div>
      <div style={{ fontSize:11, color:'#94a3b8' }}>AI is rewriting low-scoring dimensions</div>
      <style>{`@keyframes qSpin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )

  if (scanning) return <ScanningView onDone={onScanDone}/>
  if (hitl) return <HITLRepairQueue steps={repairSteps} onApprove={approveRepair} onReject={rejectRepair} onApplyAll={applyApproved}/>

  if (!hasScores) return (
    <div style={{ height:'100%', background:'#fafafa', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:32, textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'1px solid #ddd6fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>📊</div>
      <div>
        <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:6 }}>No quality data yet</div>
        <div style={{ fontSize:12, color:'#64748b', lineHeight:1.7, maxWidth:280 }}>
          Run a 6-agent quality scan to score code quality, semantic fidelity, completeness, accessibility, and visual richness.
        </div>
      </div>
      <button onClick={startEvaluate} style={{ padding:'11px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(124,58,237,.25)', display:'flex', alignItems:'center', gap:8 }}>
        <span>📊</span> Run Quality Analysis
      </button>
    </div>
  )

  const g = grade(global)

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#fafafa', fontFamily:'inherit' }}>

      {/* ── Header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f1f5f9', padding:'20px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <GaugeRing score={global} size={96}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.12em', color:'#7c3aed', textTransform:'uppercase', marginBottom:4 }}>Quality Score</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', letterSpacing:'-0.02em', lineHeight:1.1, marginBottom:8 }}>
              {global>=80?'Production Ready':global>=70?'Above Average':global>=60?'Acceptable':'Needs Work'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:800, background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff' }}>Grade {g}</span>
              <span style={{ fontSize:11, color:'#94a3b8' }}>{DIMS.filter(d => (scores[d.key]??0)>=70).length}/{DIMS.length} passing</span>
              <button onClick={startEvaluate} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6, border:'1px solid #e0e7ff', background:'#f5f3ff', color:'#7c3aed', fontSize:10, fontWeight:700, cursor:'pointer' }}>↺ Re-scan</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── HITL banner ── */}
      {needsFix && (
        <div style={{ margin:'14px 16px 0', background:'linear-gradient(135deg,#fffbeb,#fef9c3)', border:'1px solid #fde68a', borderRadius:11, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:22, flexShrink:0 }}>🧑‍💼</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#92400e', marginBottom:2 }}>Improvements available</div>
            <div style={{ fontSize:11, color:'#a16207', lineHeight:1.5 }}>AI found specific repairs for low-scoring dimensions. You'll review and approve each one before anything changes.</div>
          </div>
          <button onClick={startRepair} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(245,158,11,.3)' }}>
            Review Repairs
          </button>
        </div>
      )}

      {/* ── Dimensions ── */}
      <div style={{ padding:'14px 16px 8px' }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.12em', color:'#94a3b8', textTransform:'uppercase', marginBottom:10 }}>Breakdown</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {DIMS.map(({ key, rk, label, icon, w }) => {
            const v = scores[key], cfg = sc(v), pct = v ?? 0, open = expanded === key, llm = reasoning?.[rk]
            return (
              <div key={key} onClick={()=>setExpanded(open?null:key)}
                style={{ background:'#fff', border:`1px solid ${open?'#e0e7ff':'#f1f5f9'}`, borderRadius:9, overflow:'hidden', cursor:'pointer', transition:'border-color .15s', boxShadow: open?'0 2px 8px rgba(124,58,237,.07)':'none' }}>
                <div style={{ padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:3, height:28, borderRadius:2, background:cfg.bar, flexShrink:0 }}/>
                  <div style={{ width:26, height:26, borderRadius:7, background:cfg.bg, border:`1px solid ${cfg.bar}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:cfg.color }}>{v??'—'}</span>
                        <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bar}44` }}>{cfg.label}</span>
                      </div>
                    </div>
                    <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:cfg.bar, borderRadius:2, transition:'width .8s cubic-bezier(.4,0,.2,1)' }}/>
                    </div>
                  </div>
                  <div style={{ color:'#cbd5e1', fontSize:10, transform:open?'rotate(90deg)':'none', transition:'transform .2s' }}>▶</div>
                </div>
                {open && (
                  <div style={{ padding:'0 14px 12px 53px', borderTop:'1px solid #f8fafc' }}>
                    {llm ? (
                      <div style={{ margin:'10px 0 8px', padding:'9px 12px', borderRadius:7, background:'rgba(124,58,237,.04)', border:'1px solid rgba(124,58,237,.12)', fontSize:12, color:'#374151', lineHeight:1.7 }}>
                        {llm}
                      </div>
                    ) : (
                      <p style={{ fontSize:11, color:'#64748b', lineHeight:1.7, margin:'10px 0 6px' }}>Weight: {w}% of global score</p>
                    )}
                    {pct < 60 && (
                      <div style={{ padding:'6px 10px', borderRadius:6, background:'#fff7ed', border:'1px solid #fed7aa', fontSize:11, color:'#c2410c' }}>
                        Below threshold — click "Review Repairs" to improve this dimension
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding:'6px 16px 24px' }}>
        <div style={{ padding:'10px 14px', background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:8 }}>
          <div style={{ fontSize:10, color:'#94a3b8', lineHeight:1.8 }}>
            <span style={{ fontWeight:700, color:'#64748b' }}>Weights</span>{' — '}Semantic 35% · Code 25% · Completeness 20% · A11y 10% · Visual 10%
          </div>
        </div>
      </div>
    </div>
  )
}
