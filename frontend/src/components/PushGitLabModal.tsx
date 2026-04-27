import React, { useState, useEffect } from 'react'
import { gitlabAuthorizeSendRequest, gitlabCredentialsGetRequest, gitlabDisconnectSendRequest, postGenerationPushGitlab } from '../api'

interface GitLabCredential {
  gitlabUrl: string
  gitlabUsername: string
  connectedAt: string
  isActive: boolean
}

export interface PushGitLabModalProps {
  isOpen: boolean
  onClose: () => void
  generationId: string
  accessToken?: string
  onFetchCredentials?: () => Promise<void>
}

export const PushGitLabModal: React.FC<PushGitLabModalProps> = ({
  isOpen,
  onClose,
  generationId,
  accessToken,
  onFetchCredentials,
}) => {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com')
  const [projectPath, setProjectPath] = useState('')
  const [branch, setBranch] = useState('main')
  const [commitMessage, setCommitMessage] = useState(`feat: AI-generated UI (${new Date().toISOString().split('T')[0]})`)
  const [autoCreate, setAutoCreate] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<GitLabCredential[]>([])
  const [fetchingCredentials, setFetchingCredentials] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)

  // Load credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCredentials()
    }
  }, [isOpen])

  const loadCredentials = async () => {
    try {
      setFetchingCredentials(true)
      const creds = await gitlabCredentialsGetRequest(accessToken)
      setCredentials(creds || [])
      if (creds && creds.length > 0 && !credentials.some(c => c.gitlabUrl === gitlabUrl)) {
        setGitlabUrl(creds[0].gitlabUrl)
      }
    } catch (err) {
      console.error('Failed to load credentials:', err)
      setError('Failed to load GitLab credentials')
    } finally {
      setFetchingCredentials(false)
    }
  }

  const handleConnectGitLab = async () => {
    try {
      setAuthorizing(true)
      setError('')
      const { authorizationUrl } = await gitlabAuthorizeSendRequest(gitlabUrl, accessToken)
      // Redirect user to GitLab OAuth login
      window.location.href = authorizationUrl
    } catch (err) {
      console.error('Failed to connect:', err)
      setError(`Failed to connect GitLab: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAuthorizing(false)
    }
  }

  const handleDisconnect = async (urlToDisconnect: string) => {
    try {
      setError('')
      await gitlabDisconnectSendRequest(urlToDisconnect, accessToken)
      await loadCredentials()
      setSuccess(`Disconnected from ${urlToDisconnect}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError(`Failed to disconnect: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handlePush = async () => {
    setError('')
    setSuccess('')

    if (!projectPath.trim()) {
      setError('Project path is required')
      return
    }

    const credExists = credentials.some(c => c.gitlabUrl === gitlabUrl && c.isActive)
    if (!credExists) {
      setError('GitLab not connected. Please connect first.')
      return
    }

    try {
      setLoading(true)
      const data = await postGenerationPushGitlab(
        generationId,
        {
          gitlabUrl,
          projectPath: projectPath.trim(),
          branch: branch.trim(),
          commitMessage: commitMessage.trim(),
          autoCreate,
        },
        accessToken
      )

      if (data.success) {
        setSuccess(`Successfully pushed to ${data.projectUrl}`)
        setProjectPath('')
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(data.message || 'Push failed')
      }
    } catch (err) {
      console.error('Push failed:', err)
      setError(`Push failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const connectedUrl = credentials.find(c => c.isActive && c.gitlabUrl === gitlabUrl)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📤</span>
            <h2 className="text-xl font-bold">Push to GitLab</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {connectedUrl ? 'Push your generated code to GitLab' : 'Connect to GitLab to push your code'}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">✗ {error}</p>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">✓ {success}</p>
          </div>
        )}

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {/* Connected Instances */}
          {credentials.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Connected GitLab Instances</label>
              <div className="space-y-2">
                {credentials.map(cred => (
                  <div key={cred.gitlabUrl + "_" + cred.connectedAt} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="radio"
                        name="gitlabUrl"
                        value={cred.gitlabUrl}
                        checked={gitlabUrl === cred.gitlabUrl}
                        onChange={e => setGitlabUrl(e.target.value)}
                      />
                      <div>
                        <div className="text-sm font-medium">{cred.gitlabUrl}</div>
                        <div className="text-xs text-slate-500">as {cred.gitlabUsername}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(cred.gitlabUrl)}
                      className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnectGitLab}
            disabled={authorizing || fetchingCredentials}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {authorizing ? '⏳ Authorizing...' : '🔗 Connect to GitLab'}
          </button>

          {/* Project Fields (only if connected) */}
          {credentials.length > 0 && connectedUrl && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Project Path</label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={e => setProjectPath(e.target.value)}
                  placeholder="username/project-name"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  E.g., "mygroup/myproject"
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Branch Name</label>
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Commit Message</label>
                <textarea
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="feat: AI-generated UI"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreate}
                  onChange={e => setAutoCreate(e.target.checked)}
                />
                <span className="text-sm">Auto-create project if it doesn't exist</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          {credentials.length > 0 && connectedUrl && (
            <button
              onClick={handlePush}
              disabled={loading || !projectPath.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg"
            >
              {loading ? '⏳ Pushing...' : '📤 Push'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

