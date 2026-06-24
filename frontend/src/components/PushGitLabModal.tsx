import React, { useState } from 'react'
import { useToast } from '../hooks/useToast'
import { validators } from '../utils/validation'

export interface PushGitLabModalProps {
  isOpen: boolean
  onClose: () => void
  generationId: string
  accessToken?: string
}

export const PushGitLabModal: React.FC<PushGitLabModalProps> = ({
  isOpen, onClose, generationId, accessToken,
}) => {
  const toast = useToast()
  const [gitlabUrl,   setGitlabUrl]   = useState('https://gitlab.com')
  const [projectPath, setProjectPath] = useState('')
  const [token,       setToken]       = useState('')
  const [branch,      setBranch]      = useState('main')
  const [message,     setMessage]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  const clearErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!gitlabUrl.trim())   e.gitlabUrl   = 'GitLab URL is required'
    else if (validators.url(gitlabUrl)) e.gitlabUrl = 'Enter a valid GitLab URL'
    if (!projectPath.trim()) e.projectPath = 'Project path is required'
    if (!token.trim())       e.token       = 'Personal Access Token is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePush = async () => {
    if (!generationId) { toast.error('No project selected'); return }
    try {
      setLoading(true)
      setShowConfirm(false)
      toast.info('Pushing to GitLab...', { duration: -1 } as any)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      const res = await fetch(`/api/generations/${encodeURIComponent(generationId)}/push-to-gitlab`, {
        method: 'POST', headers,
        body: JSON.stringify({
          gitlabUrl: gitlabUrl.trim(), projectPath: projectPath.trim(),
          personalAccessToken: token.trim(), branch: branch.trim() || 'main',
          commitMessage: message.trim() || 'feat: AI-generated UI', forceOverwrite: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Pushed to ${data.projectUrl}!`, { title: '🚀 Push Complete' } as any)
        setTimeout(() => { reset(); onClose() }, 1500)
      } else {
        toast.error(data.message || 'Push failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error', { title: 'Push Failed' } as any)
    } finally { setLoading(false) }
  }

  const reset = () => {
    setGitlabUrl('https://gitlab.com'); setProjectPath(''); setToken('')
    setBranch('main'); setMessage(''); setErrors({})
  }
  const handleClose = () => { if (!loading) { reset(); onClose() } }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
          style={{ maxHeight: '92vh' }}>

          {/* ── Header ── */}
          <div className="flex items-start justify-between px-6 pt-6 pb-3 shrink-0">
            <div>
              <h2 className="text-base font-bold text-stone-900">Push to GitLab</h2>
              <p className="text-xs text-stone-400 font-medium mt-0.5">Sync and commit your code to GitLab repositories</p>
            </div>
            <button onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors text-base shrink-0 ml-4 mt-0.5">
              ✕
            </button>
          </div>

          {/* ── Form ── */}
          <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4 custom-scrollbar">

            {/* GitLab URL */}
            <div>
              <label className="text-sm font-bold text-stone-900 flex items-center gap-1 mb-1.5">
                GitLab URL <span className="text-stone-400 font-normal">•</span>
              </label>
              <input value={gitlabUrl} onChange={e => { setGitlabUrl(e.target.value); clearErr('gitlabUrl') }}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-stone-800 bg-white outline-none transition-colors ${errors.gitlabUrl ? 'border-red-300' : 'border-stone-200 focus:border-stone-400'}`}
                placeholder="https://gitlab.com"/>
              {errors.gitlabUrl && <p className="mt-1 text-xs text-red-500">{errors.gitlabUrl}</p>}
            </div>

            {/* Project Path */}
            <div>
              <label className="text-sm font-bold text-stone-900 flex items-center gap-1 mb-1.5">
                Project path <span className="text-stone-400 font-normal">•</span>
              </label>
              <input value={projectPath}
                onChange={e => {
                  let v = e.target.value
                  // Auto-extract path if user pastes a full URL (e.g. https://gitlab.com/user/repo)
                  const m = v.match(/^https?:\/\/[^/]+\/(.+?)(?:\.git)?$/)
                  if (m) v = m[1]
                  setProjectPath(v)
                  clearErr('projectPath')
                }}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-stone-800 bg-white outline-none transition-colors ${errors.projectPath ? 'border-red-300' : 'border-stone-200 focus:border-stone-400'}`}
                placeholder="username/project  (or paste the full repo URL)"/>
              {errors.projectPath
                ? <p className="mt-1 text-xs text-red-500">{errors.projectPath}</p>
                : <p className="mt-1 text-xs text-blue-400 font-medium">e.g. MeryemBoukraa/zaineb — or paste the full GitLab URL</p>}
            </div>

            {/* Personal Access Token */}
            <div>
              <label className="text-sm font-bold text-stone-900 flex items-center gap-1 mb-1.5">
                Personal Access Token <span className="text-stone-400 font-normal">•</span>
              </label>
              <input type="password" value={token} onChange={e => { setToken(e.target.value); clearErr('token') }}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-stone-800 bg-white outline-none transition-colors font-mono ${errors.token ? 'border-red-300' : 'border-stone-200 focus:border-stone-400'}`}
                placeholder="Paste your GitLab Personal Access Token"/>
              {errors.token
                ? <p className="mt-1 text-xs text-red-500">{errors.token}</p>
                : <p className="mt-1 text-xs text-blue-400 font-medium">Create a PAT at Settings — Access Tokens</p>}
            </div>

            {/* Branch + Commit Message — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-stone-900 flex items-center gap-1 mb-1.5">
                  Branch <span className="text-stone-400 font-normal">•</span>
                </label>
                <input value={branch} onChange={e => setBranch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 text-sm text-stone-800 bg-white outline-none transition-colors"
                  placeholder="main"/>
              </div>
              <div>
                <label className="text-sm font-bold text-stone-900 flex items-center gap-1 mb-1.5">
                  Commit Message <span className="text-stone-400 font-normal">•</span>
                </label>
                <input value={message} onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 text-sm text-stone-800 bg-white outline-none transition-colors"
                  placeholder="feat: AI-generated UI"/>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
            <button onClick={handleClose} disabled={loading}
              className="px-5 py-2.5 rounded-xl text-stone-500 hover:text-stone-800 text-sm font-semibold cursor-pointer disabled:opacity-40 transition-colors">
              Cancel
            </button>
            <button onClick={() => validate() && setShowConfirm(true)}
              disabled={loading || !projectPath.trim() || !token.trim()}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-all">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Pushing…</>
                : 'Push to GitLab'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Push to GitLab?</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Push code to <strong>{projectPath}</strong> on branch <strong>{branch || 'main'}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={handlePush}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold cursor-pointer">
                Yes, Push
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
