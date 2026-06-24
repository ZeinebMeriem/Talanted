import React, { useState } from 'react'

interface FigmaImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (figmaUrl: string, figmaToken: string, fileName: string) => void
  accessToken?: string
}

interface ValidationResult {
  valid: boolean
  fileKey: string | null
  fileName: string | null
  message: string
}

// Use relative URL so both Vite dev proxy and nginx handle /api/* routing
const API_BASE = ''

/* Figma logo mark (the F node icon) */
const FigmaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 28.5C19 25.6 21.4 23.25 24.5 23.25C27.6 23.25 30 25.6 30 28.5C30 31.4 27.6 33.75 24.5 33.75C21.4 33.75 19 31.4 19 28.5Z" fill="#1ABCFE"/>
    <path d="M8 38C8 35.1 10.4 32.75 13.5 32.75H19V38C19 40.9 16.6 43.25 13.5 43.25C10.4 43.25 8 40.9 8 38Z" fill="#0ACF83"/>
    <path d="M19 9V23.25H24.5C27.6 23.25 30 20.9 30 18C30 15.1 27.6 12.75 24.5 12.75L19 9Z" fill="#FF7262"/>
    <path d="M8 18C8 20.9 10.4 23.25 13.5 23.25H19V12.75H13.5C10.4 12.75 8 15.1 8 18Z" fill="#F24E1E"/>
    <path d="M8 28.5C8 31.4 10.4 33.75 13.5 33.75H19V23.25H13.5C10.4 23.25 8 25.6 8 28.5Z" fill="#A259FF"/>
  </svg>
)

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export const FigmaImportModal: React.FC<FigmaImportModalProps> = ({ isOpen, onClose, onImport, accessToken }) => {
  const [figmaUrl,   setFigmaUrl]   = useState('')
  const [figmaToken, setFigmaToken] = useState('')
  const [validating, setValidating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [validated,  setValidated]  = useState<ValidationResult | null>(null)
  const [showToken,  setShowToken]  = useState(false)
  const [tipOpen,    setTipOpen]    = useState(false)

  const step = validated ? 3 : figmaToken.trim() ? 2 : figmaUrl.trim() ? 1 : 0

  const reset = () => {
    setFigmaUrl(''); setFigmaToken(''); setError(null)
    setValidated(null); setValidating(false); setShowToken(false); setTipOpen(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleValidate = async () => {
    setError(null); setValidated(null)
    if (!figmaUrl.trim())   { setError('Please paste a Figma file URL.'); return }
    if (!figmaToken.trim()) { setError('Your Figma personal access token is required.'); return }
    setValidating(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      const res = await fetch(`${API_BASE}/api/figma/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ figmaUrl: figmaUrl.trim(), figmaToken: figmaToken.trim() }),
      })

      if (res.status === 401) {
        setError('Session expired — please log out and log back in.')
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setError(`Server error (${res.status})${text ? ': ' + text.slice(0, 120) : ''}`)
        return
      }

      const data: ValidationResult = await res.json()
      if (data.valid) { setValidated(data) }
      else            { setError(data.message ?? 'Invalid URL or token.') }
    } catch (err) {
      setError('Cannot reach the server. Check your connection.')
    } finally {
      setValidating(false)
    }
  }

  const handleImport = () => {
    if (!validated) return
    onImport(figmaUrl.trim(), figmaToken.trim(), validated.fileName ?? 'Figma File')
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 520 }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(162,89,255,.1)' }}>
              <FigmaIcon />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-stone-900 leading-tight">Import from Figma</h2>
              <p className="text-xs text-stone-400 mt-0.5">Paste URL → Add token → Generate UI</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors text-sm mt-0.5">
            ✕
          </button>
        </div>

        {/* ── Step dots ── */}
        <div className="flex items-center gap-2 px-6 py-3">
          {['Figma URL', 'Token', 'Ready'].map((label, i) => {
            const active  = step === i + 1
            const done    = step > i + 1
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{
                      background: done ? '#0ACF83' : active ? 'linear-gradient(135deg,#a259ff,#1abcfe)' : '#f1f5f9',
                      color: (done || active) ? '#fff' : '#94a3b8',
                    }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-[10px] font-semibold hidden sm:block"
                    style={{ color: done ? '#0ACF83' : active ? '#a259ff' : '#94a3b8' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px" style={{ background: step > i + 1 ? '#0ACF83' : '#e5e7eb' }} />}
              </React.Fragment>
            )
          })}
        </div>

        <div className="px-6 pb-5 space-y-3.5">

          {/* ── How to get token tip ── */}
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <button
              onClick={() => setTipOpen(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a259ff" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                </svg>
                <span className="text-xs font-semibold text-stone-600">How to get your Figma token?</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: tipOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {tipOpen && (
              <div className="px-4 py-3 border-t border-stone-100 bg-white space-y-1.5">
                {[
                  'Open Figma → click your avatar → Settings',
                  'Go to Security → Personal access tokens',
                  'Click Generate new token, copy it below',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
                      style={{ background: 'rgba(162,89,255,.12)', color: '#a259ff' }}>
                      {i + 1}
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Figma URL ── */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1.5">
              Figma File URL
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-stone-200 rounded-xl bg-white focus-within:border-[#a259ff] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <input
                type="url"
                value={figmaUrl}
                onChange={e => { setFigmaUrl(e.target.value); setValidated(null); setError(null) }}
                placeholder="https://www.figma.com/design/..."
                className="flex-1 text-sm text-stone-700 outline-none bg-transparent placeholder-stone-300"
              />
              {figmaUrl.trim() && (
                <button onClick={() => { setFigmaUrl(''); setValidated(null); setError(null) }}
                  className="text-stone-300 hover:text-stone-500 cursor-pointer text-base leading-none">×</button>
              )}
            </div>
          </div>

          {/* ── Token ── */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1.5">
              Personal Access Token
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-stone-200 rounded-xl bg-white focus-within:border-[#a259ff] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showToken ? 'text' : 'password'}
                value={figmaToken}
                onChange={e => { setFigmaToken(e.target.value); setValidated(null); setError(null) }}
                placeholder="figd_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 text-sm text-stone-700 outline-none bg-transparent placeholder-stone-300 font-mono"
              />
              <button onClick={() => setShowToken(p => !p)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer transition-colors">
                <EyeIcon open={showToken} />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Your token is never stored — used only for this generation.
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Validated success card ── */}
          {validated && (
            <div className="rounded-xl overflow-hidden border border-[#0ACF83]/30"
              style={{ background: 'linear-gradient(135deg, rgba(10,207,131,.07) 0%, rgba(26,188,254,.07) 100%)' }}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#a259ff22,#1abcfe22)', border: '1px solid rgba(162,89,255,.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a259ff" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0ACF83] mb-0.5">File found ✓</p>
                  <p className="text-sm font-bold text-stone-800 truncate">"{validated.fileName}"</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#0ACF83', boxShadow: '0 2px 8px rgba(10,207,131,.4)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              </div>
              <div className="px-4 pb-3">
                <p className="text-xs text-stone-500">
                  Talanted will analyze this file's frames and components to generate your UI.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
          <button onClick={handleClose}
            className="text-sm text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition-colors bg-transparent border-none">
            Cancel
          </button>
          {!validated ? (
            <button
              onClick={handleValidate}
              disabled={validating || !figmaUrl.trim() || !figmaToken.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              style={(!figmaUrl.trim() || !figmaToken.trim())
                ? { background: '#f1f5f9', color: '#94a3b8' }
                : { background: 'linear-gradient(135deg,#a259ff,#1abcfe)', boxShadow: '0 2px 10px rgba(162,89,255,.3)' }}
            >
              {validating
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying…</>
                : <>Validate <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
            </button>
          ) : (
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full text-white transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#15395e,#019cda)', boxShadow: '0 2px 10px rgba(1,156,218,.3)' }}
            >
              Import to Talanted
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
