import { useEffect, useState } from 'react'
import { getPublicShare, PublicShareInfo } from '../api'

interface SharePageProps {
  token: string
}

export default function SharePage({ token }: SharePageProps) {
  const [info, setInfo] = useState<PublicShareInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicShare(token)
      .then(setInfo)
      .catch(() => setError('This shared project link is invalid or has been revoked.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ color: '#f87171', fontSize: 15, textAlign: 'center', maxWidth: 400 }}>
          {error || 'Project not found.'}
        </div>
        <a href="/" style={{ marginTop: 8, color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>
          ← Go to Talanted
        </a>
      </div>
    )
  }

  const previewUrl = `/preview/${info.generationId}/dist/index.html`

  return (
    <div style={{ height: '100vh', background: '#0f0f10', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 52, background: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#6366f1,#a855f7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 14 }}>Talanted</span>
          <span style={{ color: '#52525b', fontSize: 13, margin: '0 4px' }}>/</span>
          <span style={{ color: '#a1a1aa', fontSize: 13, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {info.name || 'Shared Project'}
          </span>
        </div>
        <a
          href="/"
          style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 500, padding: '6px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)' }}
        >
          Create your own →
        </a>
      </div>

      {/* Meta bar */}
      <div style={{ background: '#18181b', borderBottom: '1px solid #27272a', padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
        <span
          title={info.prompt}
          style={{ fontSize: 12, color: '#a1a1aa', flex: 1, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'default' }}
        >
          {info.prompt}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
          background: info.status === 'COMPLETED' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
          color: info.status === 'COMPLETED' ? '#4ade80' : '#facc15',
          border: `1px solid ${info.status === 'COMPLETED' ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`,
          flexShrink: 0,
        }}>
          {info.status}
        </span>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <iframe
          src={previewUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          title={info.name || 'Shared Project Preview'}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Footer */}
      <div style={{ height: 36, background: '#18181b', borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>
          Made with{' '}
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Talanted</a>
          {' '}· AI UI Generator
        </span>
      </div>
    </div>
  )
}
