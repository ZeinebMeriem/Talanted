import React, { useState } from 'react'
import { postGenerationPushGitlab, verifyGitLabToken } from '../api'

export interface PushGitLabModalProps {
  isOpen: boolean
  onClose: () => void
  generationId: string
  accessToken?: string
}

export const PushGitLabModal: React.FC<PushGitLabModalProps> = ({
  isOpen,
  onClose,
  generationId,
  accessToken,
}) => {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com')
  const [token, setToken] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [branch, setBranch] = useState('main')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!token) {
      setResult('❌ Please enter a GitLab token')
      return
    }

    try {
      setLoading(true)
      const user = await verifyGitLabToken(gitlabUrl, token, accessToken)
      setResult(`✅ Verified as: ${user.username}`)
    } catch (err) {
      setResult(`❌ Verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    if (!generationId) {
      setResult('❌ No project selected. Please open a project first.')
      return
    }
    if (!token) {
      setResult('❌ Please verify token first')
      return
    }
    if (!projectPath) {
      setResult('❌ Please enter project path')
      return
    }

    try {
      setLoading(true)
      setResult('⏳ Pushing to GitLab...')

      const response = await postGenerationPushGitlab(
        generationId,
        {
          gitlabUrl,
          projectPath,
          branch,
          commitMessage: message || 'feat: AI-generated UI',
          autoCreate: true,
          personalAccessToken: token,
        },
        accessToken,
      )

      if (response.success) {
        setResult(`✅ Success! Pushed to ${response.projectUrl}`)
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setResult(`❌ ${response.message}`)
      }
    } catch (err) {
      setResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 24, fontSize: 22, fontWeight: 700 }}>Push to GitLab</h2>

        {result && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: result.includes('✅') ? '#efe' : '#fee',
              color: result.includes('✅') ? '#080' : '#c00',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {result}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
            GitLab URL
          </label>
          <input
            type="url"
            value={gitlabUrl}
            onChange={(e) => setGitlabUrl(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
            Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="glpat-..."
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 8,
              padding: 8,
              background: '#5480ba',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Verify Token'}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
            Project Path (e.g., username/project)
          </label>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="MeryemBoukraa/test-push"
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
            Commit Message (optional)
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="feat: AI-generated UI"
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 10,
              background: '#f0f0f0',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={loading || !token || !projectPath}
            style={{
              flex: 1,
              padding: 10,
              background: token && projectPath && !loading ? '#5480ba' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: token && projectPath && !loading ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Pushing...' : '🚀 Push to GitLab'}
          </button>
        </div>
      </div>
    </div>
  )
}
