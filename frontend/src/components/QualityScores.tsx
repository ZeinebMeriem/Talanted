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

const P = '#7c3aed'
const B = '#019cda'

const DIMS = [
  { key: 'codeQuality' as const,     rk: 'code_quality',     label: 'Code Quality',     w: 25,
    hint: (s: number) => s < 40
      ? `Critical (${s}/100): Component structure is broken — hooks misused, TypeScript errors, or major anti-patterns. AI will refactor the component tree.`
      : `Fair (${s}/100): React best practices partially met — possible prop drilling or inefficient renders. AI will apply structural improvements.` },
  { key: 'semanticFidelity' as const, rk: 'semantic_fidelity', label: 'Semantic Fidelity', w: 35,
    hint: (s: number) => s < 40
      ? `Critical (${s}/100): Generated UI diverges significantly from your prompt — key sections are missing. AI will re-read the prompt and rebuild misaligned parts.`
      : `Fair (${s}/100): Several prompt requirements are partially implemented. AI will cross-check every feature and complete the missing ones.` },
  { key: 'completeness' as const,    rk: 'completeness',    label: 'Completeness',    w: 20,
    hint: (s: number) => s < 40
      ? `Critical (${s}/100): Large sections of the UI are absent — routing, forms, or core pages missing. AI will scaffold the missing parts.`
      : `Fair (${s}/100): Some interactive elements or edge-case states missing. AI will add the incomplete flows.` },
  { key: 'accessibility' as const,   rk: 'accessibility',   label: 'Accessibility',   w: 10,
    hint: (s: number) => s < 40
      ? `Critical (${s}/100): Multiple WCAG 2.1 AA violations — missing alt text, broken focus order, no ARIA labels. AI will do a full accessibility pass.`
      : `Fair (${s}/100): Some inputs lack labels or buttons lack descriptive text. AI will add ARIA attributes and fix keyboard navigation.` },
  { key: 'visualRichness' as const,  rk: 'visual_richness', label: 'Visual Richness',  w: 10,
    hint: (s: number) => s < 40
      ? `Critical (${s}/100): UI is very sparse — minimal colour, no icons, flat layout. AI will add colour, iconography, and visual hierarchy.`
      : `Fair (${s}/100): Layout lacks depth. AI will enhance with gradients, shadows, and richer component styling.` },
]

const grade = (s: number) =>
  s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 50 ? 'D' : 'F'

function GaugeRing({ score, size = 96 }: { score: number; size?: number }) {
  const sw = 8, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(score, 100) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}

const SCAN_STEPS = [
  { agent: 'Code Analyzer',      msg: 'Parsing React component tree and TypeScript types' },
  { agent: 'Semantic Inspector', msg: 'Comparing generated UI against original prompt intent' },
  { agent: 'Coverage Checker',   msg: 'Verifying sections, interactions and routing coverage' },
  { agent: 'A11y Auditor',       msg: 'Running WCAG 2.1 AA accessibility rule checks' },
  { agent: 'Visual Scorer',      msg: 'Evaluating colour density and layout complexity' },
  { agent: 'Report Builder',     msg: 'Aggregating dimension scores and reasoning' },
]

function ScanningView({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    const t = setTimeout(() => {
      if (step < SCAN_STEPS.length - 1) setStep(s => s + 1)
      else if (!done.current) { done.current = true; setTimeout(() => onDone?.(), 400) }
    }, 860)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: P, animation: 'qPulse 1.2s infinite' }}/>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Quality Analysis Pipeline</span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }}>6 agents · 5 dimensions</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
        {SCAN_STEPS.map((s, i) => {
          const past = i < step, cur = i === step, fut = i > step
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, opacity: fut ? 0.28 : 1, transition: 'opacity .3s' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: past ? P : cur ? `${P}10` : '#f8fafc',
                border: `1.5px solid ${past || cur ? P : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: cur ? 'qSpin .9s linear infinite' : 'none',
              }}>
                {past && <span style={{ color: '#fff', fontWeight: 900, fontSize: 9 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: (past || cur) ? P : '#94a3b8' }}>{s.agent}</div>
                {(past || cur) && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{s.msg}…</div>}
              </div>
              {past && <span style={{ fontSize: 10, color: P, fontWeight: 700 }}>done</span>}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 18, padding: '9px 13px', background: `${P}08`, border: `1px solid ${P}20`, borderRadius: 7 }}>
        <span style={{ fontSize: 11, color: P, fontWeight: 600 }}>Step {Math.min(step + 1, SCAN_STEPS.length)} / {SCAN_STEPS.length}</span>
      </div>
      <style>{`
        @keyframes qSpin { to { transform: rotate(360deg); border-color: ${P} ${P}28 ${P}28 ${P}28; } }
        @keyframes qPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

interface RepairStep { dimension: string; score: number; reasoning: string; status: 'waiting'|'approved'|'rejected' }

function HITLQueue({ steps, onApprove, onReject, onApply }: {
  steps: RepairStep[]; onApprove: (i: number) => void; onReject: (i: number) => void; onApply: () => void
}) {
  const waiting  = steps.filter(s => s.status === 'waiting').length
  const approved = steps.filter(s => s.status === 'approved').length

  return (
    <div style={{ height: '100%', background: '#fafafa', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px 14px', gap: 10 }}>
      <div style={{ background: '#fff', border: `1px solid ${P}20`, borderLeft: `3px solid ${P}`, borderRadius: 8, padding: '13px 15px', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: P, marginBottom: 3 }}>Human Approval Required</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          The AI has paused. Review each repair before anything changes.
          {waiting > 0 && <span style={{ marginLeft: 8, background: P, color: '#fff', padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{waiting} pending</span>}
        </div>
      </div>

      {steps.map((step, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 8,
          border: `1px solid #f1f5f9`,
          borderLeft: `3px solid ${step.status === 'approved' ? P : step.status === 'rejected' ? '#e2e8f0' : B}`,
          padding: '13px 15px',
          opacity: step.status === 'rejected' ? 0.45 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{step.dimension}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Score {step.score}/100 · AI-proposed repair</div>
            </div>
            {step.status === 'waiting' && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onReject(i)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                <button onClick={() => onApprove(i)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: P, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
              </div>
            )}
            {step.status === 'approved' && <span style={{ fontSize: 10, fontWeight: 700, color: P, background: `${P}10`, padding: '3px 9px', borderRadius: 6 }}>Approved</span>}
            {step.status === 'rejected' && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '3px 9px', borderRadius: 6 }}>Rejected</span>}
          </div>
          <div style={{ padding: '8px 11px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>AI Analysis</div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.7 }}>{step.reasoning}</div>
          </div>
        </div>
      ))}

      {waiting === 0 && approved > 0 && (
        <button onClick={onApply} style={{ padding: '11px 0', borderRadius: 8, border: 'none', background: P, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 2 }}>
          Apply {approved} Approved Repair{approved > 1 ? 's' : ''}
        </button>
      )}
      {waiting === 0 && approved === 0 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', padding: '8px 0' }}>All rejected — no changes applied.</div>
      )}
    </div>
  )
}

export const QualityScores: React.FC<QualityScoresProps> = ({
  scores, reasoning, onRepair, isRepairing, onEvaluate
}) => {
  const [scanning, setScanning]       = useState(false)
  const [hitl, setHitl]               = useState(false)
  const [repairSteps, setRepairSteps] = useState<RepairStep[]>([])
  const [expanded, setExpanded]       = useState<string | null>(null)

  const hasScores = scores && Object.values(scores).some(v => v != null)
  const global    = scores?.globalScore ?? 0
  const needsFix  = hasScores && DIMS.some(d => (scores![d.key] ?? 0) < 70)

  const startRepair = () => {
    const weak = DIMS.filter(d => (scores?.[d.key] ?? 0) < 70)
    setRepairSteps(weak.map(d => {
      const score = scores?.[d.key] ?? 0
      const llm   = reasoning?.[d.rk]
      return { dimension: d.label, score, reasoning: (llm && llm.trim().length > 10) ? llm : d.hint(score), status: 'waiting' }
    }))
    setHitl(true)
  }

  const approveRepair = (i: number) => setRepairSteps(p => p.map((s, j) => j === i ? { ...s, status: 'approved' } : s))
  const rejectRepair  = (i: number) => setRepairSteps(p => p.map((s, j) => j === i ? { ...s, status: 'rejected' } : s))
  const applyApproved = () => { setHitl(false); onRepair?.() }

  if (isRepairing) return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${P}20`, borderTopColor: P, animation: 'qSpin .9s linear infinite' }}/>
      <div style={{ fontSize: 12, color: P, fontWeight: 700 }}>Applying approved repairs…</div>
      <style>{`@keyframes qSpin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )

  if (scanning) return <ScanningView onDone={() => setScanning(false)}/>
  if (hitl)     return <HITLQueue steps={repairSteps} onApprove={approveRepair} onReject={rejectRepair} onApply={applyApproved}/>

  if (!hasScores) return (
    <div style={{ height: '100%', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 13, background: `${P}08`, border: `1px solid ${P}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${P}40`, borderTopColor: P }}/>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 5 }}>No quality data yet</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.7, maxWidth: 260 }}>Run a 6-agent scan to score code quality, semantic fidelity, completeness, accessibility, and visual richness.</div>
      </div>
      <button onClick={() => { setScanning(true); onEvaluate?.() }} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: P, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Run Quality Analysis
      </button>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#fafafa' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <GaugeRing score={global}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: P, textTransform: 'uppercase', marginBottom: 3 }}>Quality Score</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 7 }}>
              {global >= 80 ? 'Production Ready' : global >= 70 ? 'Above Average' : global >= 60 ? 'Acceptable' : 'Needs Work'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 800, background: P, color: '#fff' }}>Grade {grade(global)}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{DIMS.filter(d => (scores[d.key] ?? 0) >= 70).length}/{DIMS.length} passing</span>
              <button onClick={() => { setScanning(true); onEvaluate?.() }} style={{ marginLeft: 'auto', padding: '3px 9px', borderRadius: 5, border: `1px solid ${P}25`, background: `${P}08`, color: P, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Re-scan</button>
            </div>
          </div>
        </div>
      </div>

      {/* HITL prompt */}
      {needsFix && (
        <div style={{ margin: '11px 13px 0', background: '#fff', border: `1px solid ${B}25`, borderLeft: `3px solid ${B}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B, marginBottom: 2 }}>Improvements available</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>AI found specific repairs. You review and approve each one before anything changes.</div>
          </div>
          <button onClick={startRepair} style={{ padding: '7px 13px', borderRadius: 7, border: 'none', background: B, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Review Repairs
          </button>
        </div>
      )}

      {/* Dimensions */}
      <div style={{ padding: '11px 13px 8px' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 7 }}>Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {DIMS.map(({ key, rk, label, w }) => {
            const v = scores[key], pct = v ?? 0, open = expanded === key
            const llm      = reasoning?.[rk]
            const barColor = pct >= 70 ? P : B
            return (
              <div key={key} onClick={() => setExpanded(open ? null : key)}
                style={{ background: '#fff', border: `1px solid ${open ? P + '22' : '#f1f5f9'}`, borderRadius: 7, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 22, borderRadius: 2, background: barColor, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{v ?? '—'}</span>
                    </div>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 2, transition: 'width .8s cubic-bezier(.4,0,.2,1)' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: '#cbd5e1', marginLeft: 4, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
                </div>
                {open && (
                  <div style={{ padding: '0 12px 11px 25px', borderTop: '1px solid #f8fafc' }}>
                    {llm
                      ? <div style={{ marginTop: 9, padding: '8px 10px', borderRadius: 5, background: '#f8fafc', border: '1px solid #f1f5f9', fontSize: 11, color: '#374151', lineHeight: 1.7 }}>{llm}</div>
                      : <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.7, margin: '9px 0 0' }}>Weight in global score: {w}%</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '5px 13px 18px' }}>
        <div style={{ padding: '8px 11px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>Weights — Semantic 35% · Code 25% · Completeness 20% · A11y 10% · Visual 10%</div>
        </div>
      </div>
    </div>
  )
}
