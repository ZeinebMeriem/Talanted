import React, { useState } from 'react'
import { deployProject } from '../api'

interface DeployModalProps {
  generationId: string
  accessToken?: string
  existingDeployUrl?: string
  onClose: () => void
  onDeployed?: (url: string) => void
}

const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const IconExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

export const DeployModal: React.FC<DeployModalProps> = ({
  generationId, accessToken, existingDeployUrl, onClose, onDeployed,
}) => {
  const [token, setToken]           = useState('')
  const [deploying, setDeploying]   = useState(false)
  const [deployedUrl, setDeployedUrl] = useState(existingDeployUrl ?? '')
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)

  const handleDeploy = async () => {
    if (!token.trim() || deploying) return
    setDeploying(true)
    setError('')
    try {
      const result = await deployProject(generationId, token.trim(), 'netlify', accessToken)
      if (result.error) { setError(result.error) }
      else { setDeployedUrl(result.url); onDeployed?.(result.url) }
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5">
          <div>
            <h2 className="text-[17px] font-bold text-stone-900 leading-tight">Deploy to Netlify</h2>
            <p className="text-xs text-stone-400 font-medium mt-1">
              Publish to a public URL in one Click — free hosting
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer text-sm transition-colors shrink-0 ml-4">
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* ── Success state ── */}
          {deployedUrl ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-800 mb-1">Live on the internet!</p>
                  <p className="text-[11px] font-mono text-emerald-700 bg-white border border-emerald-100 rounded-lg px-3 py-1.5 break-all">{deployedUrl}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyUrl}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}>
                  <IconCopy/>{copied ? 'Copied!' : 'Copy URL'}
                </button>
                <a href={deployedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors no-underline">
                  <IconExternal/>Open Site
                </a>
              </div>
              <button onClick={() => setDeployedUrl('')}
                className="w-full text-center text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-none py-1">
                Deploy again with a different token
              </button>
            </div>
          ) : (
            <>
              {/* ── How to get token info box ── */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 leading-relaxed">
                <strong className="text-stone-800">How to get a token:</strong>
                {' '}Go to{' '}
                <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-stone-800 underline underline-offset-2">
                  app.netlify.com
                </a>
                {' '}• New access token • Paste it below to trigger instantaneous deployment.
              </div>

              {/* ── Token input ── */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  Netlify Access Token <span className="text-stone-900">•</span>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => { setToken(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') void handleDeploy() }}
                  placeholder="Paste your Netlify Access Token"
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-mono text-stone-700 bg-white outline-none transition-colors placeholder-stone-300 ${error ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-stone-400'}`}
                />
                {error && (
                  <p className="text-[11px] text-red-600 font-medium">{error}</p>
                )}
              </div>

              {/* ── Buttons ── */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-semibold hover:bg-stone-50 cursor-pointer transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeploy} disabled={!token.trim() || deploying}
                  className={`flex-[2] py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${!token.trim() || deploying ? 'bg-stone-300 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800'}`}>
                  {deploying ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Deploying…
                    </>
                  ) : (
                    'Deploy to Netlify'
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
      <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
