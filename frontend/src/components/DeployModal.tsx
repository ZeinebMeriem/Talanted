import React, { useState } from 'react'
import { deployProject } from '../api'

interface DeployModalProps {
  generationId: string
  accessToken?: string
  existingDeployUrl?: string
  onClose: () => void
  onDeployed?: (url: string) => void
}

const IconNetlify = () => (
  <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="#00AD9F" />
    <path d="M23.5 12.5l4 4-4 4M16.5 12.5l-4 4 4 4M22 20H18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 27h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".6" />
  </svg>
)

const IconExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

export const DeployModal: React.FC<DeployModalProps> = ({
  generationId, accessToken, existingDeployUrl, onClose, onDeployed,
}) => {
  const [token, setToken] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState(existingDeployUrl ?? '')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleDeploy = async () => {
    if (!token.trim() || deploying) return
    setDeploying(true)
    setError('')
    try {
      const result = await deployProject(generationId, token.trim(), 'netlify', accessToken)
      if (result.error) {
        setError(result.error)
      } else {
        setDeployedUrl(result.url)
        onDeployed?.(result.url)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(deployedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,15,20,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: 480, borderRadius: 16, background: '#fff',
        boxShadow: '0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08)',
        overflow: 'hidden', fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 18px',
          background: 'linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)',
          borderBottom: '1px solid #d1fae5',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <IconNetlify />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#064e3b' }}>Deploy to Netlify</div>
            <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>
              Publish to a public URL in one click — free hosting
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid #d1fae5',
            background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Success state */}
          {deployedUrl ? (
            <div>
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
                border: '1px solid #bbf7d0', marginBottom: 16,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Live on the internet!</div>
                  <div style={{
                    fontSize: 12, color: '#047857', wordBreak: 'break-all',
                    background: '#fff', border: '1px solid #bbf7d0', borderRadius: 6,
                    padding: '6px 10px', fontFamily: 'monospace',
                  }}>{deployedUrl}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyUrl} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #e2e8f0',
                  background: copied ? '#f0fdf4' : '#f8fafc', color: copied ? '#059669' : '#374151',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all .15s',
                }}>
                  <IconCopy />{copied ? 'Copied!' : 'Copy URL'}
                </button>
                <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg,#00AD9F,#059669)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none',
                }}>
                  <IconExternal />Open Site
                </a>
              </div>

              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button onClick={() => setDeployedUrl('')} style={{
                  background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer',
                }}>Deploy again with a different token</button>
              </div>
            </div>
          ) : (
            <div>
              {/* How to get token */}
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: '#f8fafc',
                border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 11, color: '#64748b', lineHeight: 1.7,
              }}>
                <strong style={{ color: '#374151' }}>How to get a free token:</strong>{' '}
                Go to <strong>app.netlify.com → User settings → Personal access tokens</strong> → "New access token". Paste it below.
              </div>

              {/* Token input */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Netlify Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => { setToken(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') void handleDeploy() }}
                  placeholder="nfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: error ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0',
                    fontSize: 12, color: '#374151', fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                    background: '#fafafa',
                  }}
                />
                {error && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', lineHeight: 1.5 }}>
                    {error}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={handleDeploy} disabled={!token.trim() || deploying} style={{
                  flex: 2, padding: '10px 0', borderRadius: 9, border: 'none',
                  cursor: !token.trim() || deploying ? 'default' : 'pointer',
                  background: !token.trim() || deploying
                    ? '#a7f3d0'
                    : 'linear-gradient(135deg,#00AD9F,#059669)',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity .2s', opacity: !token.trim() ? 0.6 : 1,
                }}>
                  {deploying ? (
                    <>
                      <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'dm-spin .75s linear infinite', display: 'inline-block' }} />
                      Deploying…
                    </>
                  ) : (
                    <>🚀 Deploy to Netlify</>
                  )}
                </button>
              </div>

              <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                Your token is sent directly to Netlify and never stored on our servers.
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
