import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AuditRecord {
  id: string
  timestamp: string
  score: number
  wcagLevel: string
  issues?: { severity: string }[]
}

interface Props {
  history?: AuditRecord[]
  loading?: boolean
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  serious: '#ea580c',
  moderate: '#d97706',
  minor: '#6b7280',
}

export const AccessibilityHistory: React.FC<Props> = ({ history = [], loading = false }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <div style={{ fontSize: 14, color: '#64748b' }}>Loading history...</div>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#94a3b8' }}>
        No audit history yet. Run an audit to start tracking score progress.
      </div>
    )
  }

  const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const chartData = sorted.map((audit) => ({
    date: new Date(audit.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: audit.score,
    timestamp: new Date(audit.timestamp).getTime(),
  }))

  const latestScore = history[0]?.score ?? 0
  const firstScore = sorted[0]?.score ?? 0
  const improvement = latestScore - firstScore
  const improvementPercent = firstScore > 0 ? Math.round((improvement / firstScore) * 100) : 0

  // Severity breakdown for latest audit
  const latestIssues = history[0]?.issues ?? []
  const severitionCounts = {
    critical: latestIssues.filter((i: any) => i.severity === 'critical').length,
    serious: latestIssues.filter((i: any) => i.severity === 'serious').length,
    moderate: latestIssues.filter((i: any) => i.severity === 'moderate').length,
    minor: latestIssues.filter((i: any) => i.severity === 'minor').length,
  }

  const severityData = Object.entries(severitionCounts)
    .filter(([_, count]) => count > 0)
    .map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      fill: SEVERITY_COLORS[severity],
    }))

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Improvement badge */}
      {improvement !== 0 && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: improvement > 0 ? '#f0fdf4' : '#fef2f2' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: improvement > 0 ? '#10b981' : '#dc2626' }}>
            {improvement > 0 ? '↗' : '↘'} {Math.abs(improvementPercent)}% {improvement > 0 ? 'Improvement' : 'Decline'}
          </div>
          <div style={{ fontSize: 11, color: improvement > 0 ? '#059669' : '#991b1b', marginTop: 2 }}>
            From {firstScore} to {latestScore} over {sorted.length} audits
          </div>
        </div>
      )}

      {/* Score trend chart */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Score Trend
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Severity breakdown */}
      {severityData.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Issues by Severity (Latest)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audit history table */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Audit History
        </div>
        <div style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 11, fontWeight: 700, background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
            <div>Date</div>
            <div>Score</div>
            <div>Issues</div>
          </div>
          {sorted.map((audit, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '10px 12px', borderBottom: idx < sorted.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: 11, color: '#374151' }}>{new Date(audit.timestamp).toLocaleDateString()}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: audit.score >= 80 ? '#10b981' : audit.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                {audit.score}/100
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{audit.issues?.length ?? 0} issue(s)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
