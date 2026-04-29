import React from 'react'

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
}

const getScoreColor = (score: number | undefined): string => {
  if (score === undefined || score === null) return '#ccc'
  if (score >= 80) return '#10b981' // green
  if (score >= 60) return '#f59e0b' // amber
  if (score >= 40) return '#ef5350' // red-orange
  return '#dc2626' // red
}

const getScoreLabel = (score: number | undefined): string => {
  if (score === undefined || score === null) return 'N/A'
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 50) return 'Adequate'
  return 'Poor'
}

const ScoreBar: React.FC<{ label: string; score: number | undefined; emoji: string }> = ({
  label,
  score,
  emoji,
}) => {
  const displayScore = score ?? 0
  const color = getScoreColor(score)

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{displayScore}/100</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(displayScore, 100)}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{getScoreLabel(score)}</div>
    </div>
  )
}

export const QualityScores: React.FC<QualityScoresProps> = ({ scores }) => {
  if (!scores) {
    return (
      <div style={{ padding: 16, backgroundColor: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#9ca3af' }}>
        ⏳ Generating quality assessment...
      </div>
    )
  }

  const hasAnyScore = Object.values(scores).some(v => v != null)
  if (!hasAnyScore) {
    return (
      <div style={{ padding: 20, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          No quality assessment available
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          This project was generated before quality scoring was introduced.<br />
          Regenerate it to get a full quality assessment.
        </div>
      </div>
    )
  }

  const { globalScore, semanticFidelity, codeQuality, completeness, accessibility, visualRichness } = scores
  const safeGlobalScore = globalScore ?? 0

  return (
    <div style={{ padding: 20, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      {/* Global Score */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>⭐</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Quality Assessment</h3>
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: getScoreColor(safeGlobalScore),
            marginBottom: 4,
          }}
        >
          {safeGlobalScore}/100
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{getScoreLabel(safeGlobalScore)} Overall Quality</div>
      </div>

      {/* Dimension Scores */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
          Scoring Breakdown
        </h4>

        <ScoreBar
          label="Code Quality"
          score={codeQuality}
          emoji="🛠️"
        />
        <ScoreBar
          label="Visual Richness"
          score={visualRichness}
          emoji="🎨"
        />
        <ScoreBar
          label="Completeness"
          score={completeness}
          emoji="✅"
        />
        <ScoreBar
          label="Accessibility"
          score={accessibility}
          emoji="♿"
        />
        <ScoreBar
          label="Semantic Fidelity"
          score={semanticFidelity}
          emoji="🧠"
        />
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: 6,
          fontSize: 12,
          color: '#1e40af',
        }}
      >
        <strong>Quality Dimensions:</strong>
        <ul style={{ margin: '8px 0 0 16px', paddingLeft: 0 }}>
          <li>
            <strong>Code Quality:</strong> React structure and best practices
          </li>
          <li>
            <strong>Visual Richness:</strong> Components, icons, charts, and complexity
          </li>
          <li>
            <strong>Completeness:</strong> Prompt requirements met in generated code
          </li>
          <li>
            <strong>Accessibility:</strong> ARIA attributes, semantic HTML, labels
          </li>
          <li>
            <strong>Semantic Fidelity:</strong> AI assessment of prompt adherence
          </li>
        </ul>
      </div>
    </div>
  )
}
