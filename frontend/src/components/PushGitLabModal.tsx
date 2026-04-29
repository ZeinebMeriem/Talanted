import React, { useState } from 'react'
import { Modal, FormField, Button, ConfirmDialog } from './index'
import { useToast } from '../hooks/useToast'
import { validators } from '../utils/validation'

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
  const toast = useToast()
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com')
  const [projectPath, setProjectPath] = useState('')
  const [token, setToken] = useState('')
  const [branch, setBranch] = useState('main')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation rules
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!gitlabUrl.trim()) {
      newErrors.gitlabUrl = 'GitLab URL is required'
    } else if (validators.url(gitlabUrl)) {
      newErrors.gitlabUrl = 'Please enter a valid GitLab URL'
    }

    if (!projectPath.trim()) {
      newErrors.projectPath = 'Project path is required (e.g., username/project)'
    }

    if (!token.trim()) {
      newErrors.token = 'Personal Access Token is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePushClick = () => {
    if (validateForm()) {
      setShowConfirm(true)
    }
  }

  const handleConfirmedPush = async () => {
    if (!generationId) {
      toast.error('No project selected')
      return
    }

    try {
      setLoading(true)
      toast.info('Pushing to GitLab...', { duration: -1 })

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      const res = await fetch(`/api/generations/${encodeURIComponent(generationId)}/push-to-gitlab`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gitlabUrl: gitlabUrl.trim(),
          projectPath: projectPath.trim(),
          personalAccessToken: token.trim(),
          branch: branch.trim() || 'main',
          commitMessage: message.trim() || 'feat: AI-generated UI',
          forceOverwrite: true,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(`Successfully pushed to ${data.projectUrl}!`, {
          title: '🚀 Push Complete',
        })

        // Reset form and close after success
        setTimeout(() => {
          resetForm()
          onClose()
        }, 1500)
      } else {
        toast.error(data.message || 'Failed to push to GitLab')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      toast.error(errorMsg, { title: 'Push Failed' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setGitlabUrl('https://gitlab.com')
    setProjectPath('')
    setToken('')
    setBranch('main')
    setMessage('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const footer = (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
      <Button
        variant="ghost"
        onClick={handleClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handlePushClick}
        loading={loading}
        disabled={loading || !projectPath.trim() || !token.trim()}
      >
        🚀 Push to GitLab
      </Button>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="🚀 Push to GitLab"
        size="md"
        footer={footer}
        closeOnBackdropClick={!loading}
        closeOnEscape={!loading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            id="gitlab-url"
            label="GitLab URL"
            type="text"
            value={gitlabUrl}
            onChange={(e) => {
              setGitlabUrl(e.target.value)
              if (errors.gitlabUrl) {
                setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors.gitlabUrl
                  return newErrors
                })
              }
            }}
            placeholder="https://gitlab.com"
            error={errors.gitlabUrl}
            required
          />

          <FormField
            id="project-path"
            label="Project Path"
            type="text"
            value={projectPath}
            onChange={(e) => {
              setProjectPath(e.target.value)
              if (errors.projectPath) {
                setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors.projectPath
                  return newErrors
                })
              }
            }}
            placeholder="username/project"
            hint="The path to your GitLab project"
            error={errors.projectPath}
            required
          />

          <FormField
            id="token"
            label="Personal Access Token"
            type="password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              if (errors.token) {
                setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors.token
                  return newErrors
                })
              }
            }}
            placeholder="glpat-xxxxx"
            hint="Create a PAT at: Settings → Access Tokens"
            error={errors.token}
            required
          />

          <FormField
            id="branch"
            label="Branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            hint="The branch to push to (defaults to 'main')"
          />

          <FormField
            id="message"
            label="Commit Message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="feat: AI-generated UI"
            hint="Optional. Defaults to 'feat: AI-generated UI'"
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Push to GitLab?"
        message={`This will push the code to GitLab project "${projectPath}" on branch "${branch || 'main'}". This action cannot be undone.`}
        confirmText="Yes, Push"
        cancelText="Cancel"
        isDangerous={false}
        isLoading={loading}
        onConfirm={handleConfirmedPush}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
