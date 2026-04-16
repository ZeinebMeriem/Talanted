import React, { useState } from 'react'

export interface PushGitLabModalProps {
  isOpen: boolean
  onClose: () => void
  onPush: (params: {
    gitlabUrl: string
    projectPath: string
    token: string
    branch: string
    commitMessage: string
    autoCreate: boolean
  }) => Promise<void>
  isLoading?: boolean
}

export const PushGitLabModal: React.FC<PushGitLabModalProps> = ({
  isOpen,
  onClose,
  onPush,
  isLoading = false,
}) => {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com')
  const [projectPath, setProjectPath] = useState('')
  const [token, setToken] = useState('')
  const [branch, setBranch] = useState('main')
  const [commitMessage, setCommitMessage] = useState(`feat: AI-generated UI (${new Date().toISOString().split('T')[0]})`)
  const [autoCreate, setAutoCreate] = useState(true)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handlePush = async () => {
    setError('')

    // Validation
    if (!gitlabUrl.trim()) {
      setError('GitLab URL is required')
      return
    }
    if (!projectPath.trim()) {
      setError('Project path is required (e.g., group/project)')
      return
    }
    if (!token.trim()) {
      setError('Personal Access Token is required')
      return
    }
    if (!branch.trim()) {
      setError('Branch name is required')
      return
    }

    try {
      await onPush({
        gitlabUrl: gitlabUrl.trim(),
        projectPath: projectPath.trim(),
        token: token.trim(),
        branch: branch.trim(),
        commitMessage: commitMessage.trim(),
        autoCreate,
      })

      // Reset form on success
      setGitlabUrl('https://gitlab.com')
      setProjectPath('')
      setToken('')
      setBranch('main')
      setCommitMessage(`feat: AI-generated UI (${new Date().toISOString().split('T')[0]})`)
      setAutoCreate(true)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to push to GitLab')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
            📤 Push to GitLab
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Push your generated code to a GitLab repository
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* GitLab Instance URL */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              GitLab Instance
            </label>
            <input
              type="text"
              placeholder="https://gitlab.com"
              value={gitlabUrl}
              onChange={(e) => setGitlabUrl(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Use https://gitlab.com or your self-hosted instance URL
            </p>
          </div>

          {/* Project Path */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Project Path
            </label>
            <input
              type="text"
              placeholder="group/project"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              E.g., "mygroup/myproject"
            </p>
          </div>

          {/* Personal Access Token */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Personal Access Token
            </label>
            <input
              type="password"
              placeholder="glpat-xxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              <a
                href="https://gitlab.com/-/profile/personal_access_tokens"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                Generate token
              </a>
              {' with api scope'}
            </p>
          </div>

          {/* Branch */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Branch Name
            </label>
            <input
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
          </div>

          {/* Commit Message */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Commit Message
            </label>
            <textarea
              placeholder="feat: Your commit message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isLoading}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Auto-create checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="checkbox"
              id="autoCreate"
              checked={autoCreate}
              onChange={(e) => setAutoCreate(e.target.checked)}
              disabled={isLoading}
              style={{
                width: '16px',
                height: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
            <label
              htmlFor="autoCreate"
              style={{
                fontSize: '14px',
                color: '#374151',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Auto-create project if it doesn't exist
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }}
          >
            {isLoading ? '⏳ Pushing...' : '🚀 Push'}
          </button>
        </div>
      </div>
    </div>
  )
}
