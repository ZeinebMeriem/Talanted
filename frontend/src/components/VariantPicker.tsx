import React, { useState } from 'react'
import type { VariantItem } from '../api'

interface VariantPickerProps {
  variants: VariantItem[]
  variantGroupId: string
  onSelect: (variant: VariantItem) => void
  onClose: () => void
}

const THEME_ICONS: Record<string, string> = {
  minimal:   '✦',
  vibrant:   '◈',
  corporate: '▣',
}

const THEME_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  minimal:   { bg: '#f8fafc', border: '#e2e8f0', badge: '#64748b' },
  vibrant:   { bg: '#fdf4ff', border: '#e879f9', badge: '#a21caf' },
  corporate: { bg: '#eff6ff', border: '#3b82f6', badge: '#1d4ed8' },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#f1f5f9' }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: 2, background: color, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function VariantCard({ variant, selected, onSelect }: {
  variant: VariantItem
  selected: boolean
  onSelect: () => void
}) {
  const colors = THEME_COLORS[variant.theme] || THEME_COLORS.minimal
  const icon   = THEME_ICONS[variant.theme] || '◆'

  return (
    <div style={{
      border: `2px solid ${selected ? '#6366f1' : colors.border}`,
      borderRadius: 14,
      background: selected ? '#f5f3ff' : colors.bg,
      padding: 18,
      cursor: variant.buildSuccess ? 'pointer' : 'default',
      transition: 'all .2s',
      boxShadow: selected ? '0 0 0 3px rgba(99,102,241,.2)' : '0 1px 4px rgba(0,0,0,.06)',
      position: 'relative',
      opacity: variant.buildSuccess ? 1 : 0.5,
    }} onClick={() => variant.buildSuccess && onSelect()}>

      {selected && (
        <div style={{
          position: 'absolute', top: -10, right: 12,
          background: '#6366f1', color: '#fff',
          borderRadius: 20, fontSize: 10, fontWeight: 700,
          padding: '2px 10px',
        }}>✓ Sélectionné</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: selected ? '#6366f1' : colors.badge,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 700,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{variant.themeLabel}</div>
          <div style={{ fontSize: 10, color: colors.badge, textTransform: 'uppercase', letterSpacing: 1 }}>
            {variant.theme}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{
            fontSize: 22, fontWeight: 800,
            color: variant.globalScore >= 80 ? '#10b981' : variant.globalScore >= 60 ? '#f59e0b' : '#ef4444',
          }}>{variant.buildSuccess ? variant.globalScore : '—'}</div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>SCORE GLOBAL</div>
        </div>
      </div>

      {variant.error ? (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '8px 10px', background: '#fef2f2', borderRadius: 6 }}>
          Erreur : {variant.error}
        </div>
      ) : (
        <>
          <ScoreBar label="Fidélité sémantique" value={variant.semanticFidelity} />
          <ScoreBar label="Qualité du code"     value={variant.codeQuality} />
          <ScoreBar label="Complétude"          value={variant.completeness} />
          <ScoreBar label="Accessibilité"       value={variant.accessibility} />
          <ScoreBar label="Richesse visuelle"   value={variant.visualRichness} />
        </>
      )}

      {variant.buildSuccess && (
        <button style={{
          width: '100%', marginTop: 14, padding: '8px 0', borderRadius: 8, border: 'none',
          background: selected ? '#6366f1' : '#f1f5f9',
          color: selected ? '#fff' : '#475569',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all .2s',
        }} onClick={e => { e.stopPropagation(); onSelect() }}>
          {selected ? '✓ Variante sélectionnée' : 'Choisir cette variante'}
        </button>
      )}
    </div>
  )
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
  variants, onSelect, onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    // Pre-select the variant with the highest global score
    variants.length > 0
      ? variants.filter(v => v.buildSuccess).sort((a, b) => b.globalScore - a.globalScore)[0]?.variantId ?? null
      : null
  )

  const handleConfirm = () => {
    const chosen = variants.find(v => v.variantId === selectedId)
    if (chosen) onSelect(chosen)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,15,20,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 960,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px 18px',
          background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
          borderBottom: '1px solid #ddd6fe',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3730a3' }}>
              ✦ Choisir une variante A/B
            </div>
            <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 2 }}>
              3 variantes générées — sélectionnez la meilleure pour continuer
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #ddd6fe',
            background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 16,
          }}>✕</button>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16, padding: 24,
        }}>
          {variants.map(v => (
            <VariantCard
              key={v.variantId}
              variant={v}
              selected={selectedId === v.variantId}
              onSelect={() => setSelectedId(v.variantId)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0',
            background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Annuler</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            style={{
              padding: '9px 24px', borderRadius: 9, border: 'none',
              background: selectedId ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0',
              color: selectedId ? '#fff' : '#94a3b8',
              fontSize: 13, fontWeight: 700, cursor: selectedId ? 'pointer' : 'default',
            }}>
            Utiliser cette variante →
          </button>
        </div>
      </div>
    </div>
  )
}
