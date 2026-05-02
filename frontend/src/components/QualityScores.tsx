import React, { useState } from 'react'

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

const getScoreConfig = (score: number | undefined) => {
  if (score === undefined || score === null) return { color: '#94a3b8', bar: '#e2e8f0', label: '—' }
  if (score >= 80) return { color: '#10b981', bar: '#10b981', label: 'Good' }
  if (score >= 60) return { color: '#f59e0b', bar: '#f59e0b', label: 'Fair' }
  return { color: '#ef4444', bar: '#ef4444', label: 'Low' }
}

const getGrade = (score: number) => {
  if (score >= 90) return { grade: 'A+', label: 'Outstanding' }
  if (score >= 80) return { grade: 'A', label: 'Production Ready' }
  if (score >= 70) return { grade: 'B', label: 'Above Average' }
  if (score >= 60) return { grade: 'C', label: 'Acceptable' }
  if (score >= 50) return { grade: 'D', label: 'Needs Work' }
  return { grade: 'F', label: 'Requires Fix' }
}

const IconCode = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
)
const IconTarget = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconPalette = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
)
const IconZap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"
    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IconBarChart = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
  </svg>
)

const DIMENSIONS: Array<{
  key: keyof QualityScoresData
  reasoningKey: string
  label: string
  Icon: React.FC
  desc: string
  weight: number
}> = [
  { key: 'codeQuality',      reasoningKey: 'code_quality',      label: 'Code Quality',      Icon: IconCode,    desc: 'React structure, hooks, TypeScript correctness and best practices',         weight: 25 },
  { key: 'semanticFidelity', reasoningKey: 'semantic_fidelity', label: 'Semantic Fidelity', Icon: IconTarget,  desc: 'How accurately the generated UI reflects the intent of the original prompt', weight: 35 },
  { key: 'completeness',     reasoningKey: 'completeness',      label: 'Completeness',      Icon: IconCheck,   desc: 'All required sections, features and interactions are present',               weight: 20 },
  { key: 'accessibility',    reasoningKey: 'accessibility',     label: 'Accessibility',     Icon: IconShield,  desc: 'ARIA roles, semantic HTML, keyboard navigation, contrast and alt texts',     weight: 10 },
  { key: 'visualRichness',   reasoningKey: 'visual_richness',   label: 'Visual Richness',   Icon: IconPalette, desc: 'Color variety, icons, charts, layout complexity and aesthetic polish',       weight: 10 },
]

const GaugeRing: React.FC<{ score: number }> = ({ score }) => {
  const size = 104
  const sw = 10
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(score, 100) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="qGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#qGaugeGrad)" strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1, letterSpacing: '-0.04em' }}>{score}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
      </div>
    </div>
  )
}

const EmptyState: React.FC<{ message: string; sub: string; onAction?: () => void; actionLabel?: string; isLoading?: boolean }> = ({ message, sub, onAction, actionLabel, isLoading }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
    <div style={{ textAlign: 'center', maxWidth: 300, padding: 32 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><IconBarChart /></div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{message}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.65, marginBottom: onAction ? 20 : 0 }}>{sub}</div>
      {onAction && (
        <button
          onClick={onAction}
          disabled={isLoading}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: isLoading ? 'default' : 'pointer',
            background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7,
            opacity: isLoading ? 0.8 : 1, transition: 'opacity .2s',
          }}
        >
          {isLoading
            ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'qs-spin .75s linear infinite' }} /> Analyzing…</>
            : <><IconZap />{actionLabel ?? 'Run Analysis'}</>}
        </button>
      )}
    </div>
  </div>
)

export const QualityScores: React.FC<QualityScoresProps> = ({ scores, reasoning, generationId, onRepair, isRepairing, onEvaluate }) => {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!scores) {
    return (
      <EmptyState
        message="Awaiting analysis"
        sub="Run a generation to see the quality report."
        onAction={onEvaluate}
        actionLabel="Evaluate Now"
        isLoading={isRepairing}
      />
    )
  }

  const hasAnyScore = Object.values(scores).some(v => v != null)
  if (!hasAnyScore) {
    return (
      <EmptyState
        message="No quality data yet"
        sub="This project hasn't been scored yet. Run a quality analysis to see how your UI performs across code quality, accessibility, and visual richness."
        onAction={onEvaluate}
        actionLabel="Run Analysis"
        isLoading={isRepairing}
      />
    )
  }

  const { globalScore = 0 } = scores
  const { grade, label: gradeLabel } = getGrade(globalScore)
  const passing = DIMENSIONS.filter(d => (scores[d.key] ?? 0) >= 70).length
  const needsFix = DIMENSIONS.some(d => (scores[d.key] ?? 0) < 60)
  const allGood = globalScore >= 80

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', fontFamily: 'inherit' }}>

      {/* ── Score overview ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '22px 22px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <GaugeRing score={globalScore} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 }}>
              Quality Score
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              {gradeLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                background: allGood ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#f1f5f9',
                color: allGood ? '#fff' : '#475569',
              }}>
                Grade {grade}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {passing} / {DIMENSIONS.length} dimensions passing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Auto-Fix card ── */}
      {needsFix && generationId && onRepair && (
        <div style={{ margin: '12px 14px 0', borderRadius: 9, border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <IconZap />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#312e81', marginBottom: 1 }}>
              Improvements available
            </div>
            <div style={{ fontSize: 11, color: '#6366f1' }}>
              AI will re-analyze and repair low-scoring dimensions
            </div>
          </div>
          <button
            onClick={onRepair}
            disabled={isRepairing}
            style={{
              padding: '7px 13px', borderRadius: 7, border: 'none', flexShrink: 0,
              cursor: isRepairing ? 'default' : 'pointer',
              background: isRepairing ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'opacity .2s', opacity: isRepairing ? 0.75 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isRepairing
              ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'qs-spin .75s linear infinite' }} /> Repairing…</>
              : 'Auto-Fix'}
          </button>
        </div>
      )}

      {/* ── Dimension rows ── */}
      <div style={{ padding: '14px 14px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
          Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {DIMENSIONS.map(({ key, reasoningKey, label, Icon, desc, weight }) => {
            const s = scores[key]
            const cfg = getScoreConfig(s)
            const pct = s ?? 0
            const isOpen = expanded === key
            const llmReason = reasoning?.[reasoningKey]

            return (
              <div
                key={key}
                onClick={() => setExpanded(isOpen ? null : key)}
                style={{
                  background: '#fff', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  border: `1px solid ${isOpen ? '#e0e7ff' : '#f1f5f9'}`,
                  transition: 'border-color .15s',
                }}
              >
                <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Left accent */}
                  <div style={{ width: 3, height: 30, borderRadius: 2, background: cfg.bar, flexShrink: 0 }} />
                  {/* Icon */}
                  <div style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}>
                    <Icon />
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{pct}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: `${cfg.bar}1a`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: cfg.bar, borderRadius: 2, transition: 'width .75s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                  <IconChevron open={isOpen} />
                </div>

                {isOpen && (
                  <div style={{ padding: '0 13px 12px 30px', borderTop: '1px solid #f8fafc' }}>
                    {llmReason ? (
                      <div style={{ margin: '10px 0 8px', padding: '8px 11px', borderRadius: 6, background: 'rgba(99,102,241,.05)', border: '1px solid rgba(99,102,241,.15)', fontSize: 12, color: '#374151', lineHeight: 1.65, fontStyle: 'italic' }}>
                        {llmReason}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, margin: '10px 0 6px' }}>{desc}</p>
                    )}
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Weight: <strong style={{ color: '#475569' }}>{weight}%</strong> of global score
                    </span>
                    {pct < 60 && (
                      <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 11, color: '#991b1b' }}>
                        Score below threshold — use Auto-Fix to repair this dimension
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
      <div style={{ padding: '4px 14px 20px' }}>
        <div style={{
          borderRadius: 8, padding: '12px 14px',
          background: allGood ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#f8fafc',
          border: `1px solid ${allGood ? '#e0e7ff' : '#f1f5f9'}`,
        }}>
          {allGood ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#312e81', marginBottom: 2 }}>Production ready</div>
                <div style={{ fontSize: 11, color: '#6366f1', lineHeight: 1.55 }}>
                  All dimensions pass the production threshold (≥ 80 / 100).
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Scoring weights</span>
              {' — '}Semantic Fidelity 35% · Code Quality 25% · Completeness 20% · Accessibility 10% · Visual Richness 10%
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes qs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
