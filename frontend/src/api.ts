const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || 'http://localhost:8082'

function authHeaders(accessToken?: string): HeadersInit | undefined {
  if (!accessToken) return undefined
  return { Authorization: `Bearer ${accessToken}` }
}

async function readJsonOrNull(res: Response): Promise<unknown> {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>
  const m = record['message']
  const e = record['error']
  if (typeof m === 'string' && m) return m
  if (typeof e === 'string' && e) return e
  return null
}

export type UserProfile = {
  userId?: string
  username?: string
  email?: string
  emailVerified?: boolean
  firstName?: string
  lastName?: string
  roles?: string[]
}

export type UserStats = {
  totalGenerations?: number
  completedGenerations?: number
  successRate?: number
}

export async function getMe(accessToken?: string): Promise<UserProfile> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/me`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as UserProfile) : {})
}

export async function getUserStats(accessToken?: string): Promise<UserStats> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/stats`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as UserStats) : {})
}

export type GenerationListItem = {
  generationId?: string
  sessionId?: string
  status?: string
  prompt?: string
  activeVersion?: number
  createdAt?: string
  updatedAt?: string
}

export type JiraIssue = {
  key: string
  summary: string
  description?: string
  acceptanceCriteria?: string
  issueType?: string
  status?: string
  priority?: string
  webUrl?: string
  attachments?: { filename: string; mimeType: string; size: number; content: string }[]
}

export type JiraIssueListItem = {
  key: string
  summary: string
  issueType?: string
  status?: string
  priority?: string
  labels?: string[]
  updated?: string
  webUrl?: string
}

export async function getJiraIssue(issueKey: string, accessToken?: string): Promise<JiraIssue> {
  const res = await fetch(`${BFF_BASE_URL}/api/jira/issues/${encodeURIComponent(issueKey)}`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as JiraIssue
}

export async function listJiraFrontendTasks(
  urlOrProjectKey: string,
  accessToken?: string,
): Promise<JiraIssueListItem[]> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/jira/frontend-tasks?url=${encodeURIComponent(urlOrProjectKey)}`,
    {
      headers: authHeaders(accessToken),
    },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return Array.isArray(data) ? (data as JiraIssueListItem[]) : []
}

export type AuditEventListItem = {
  eventId?: string
  generationId?: string
  sessionId?: string
  type?: string
  correlationId?: string
  timestamp?: string
  durationMs?: number
  details?: unknown
}

export type GenerationVersionsResponse = {
  generationId?: string
  activeVersion?: number
  uiSpecVersions?: { version?: number; type?: string; createdAt?: string }[]
  codeVersions?: { version?: number; createdAt?: string }[]
  aiReportVersions?: { version?: number; score?: number; llmProvider?: string; createdAt?: string }[]
}

export type GenerationRollbackResponse = {
  generationId?: string
  previousActiveVersion?: number
  activeVersion?: number
  updatedAt?: string
}

// ─── SSE streaming types ────────────────────────────────────────────────────

export type SseProgressEvent = {
  type: 'progress'
  stage: string
  progress: number
  message: string
  totalFiles?: number
  fileIndex?: number
  filePath?: string
}

export type SseCompleteEvent = {
  type: 'complete'
  progress: 100
  result: {
    generationId?: string
    codeBundle?: { files?: { path: string; content: string }[] }
    uiSpec?: unknown
    aiReport?: unknown
  }
}

export type SseErrorEvent = {
  type: 'error'
  message: string
}

export type SseEvent = SseProgressEvent | SseCompleteEvent | SseErrorEvent

/**
 * Streaming generation — yields SSE events in real-time.
 *
 * Usage:
 *   for await (const event of streamGeneration(prompt, files, token, domain)) {
 *     if (event.type === 'progress') { ... }
 *     if (event.type === 'complete') { ... }
 *   }
 */
export async function* streamGeneration(
  prompt: string,
  files: File[],
  accessToken?: string,
  domain?: string | null,
  model?: string,
  jiraIssueKey?: string,
  jiraIssueKeys?: string[],
): AsyncGenerator<SseEvent, void, unknown> {
  const form = new FormData()
  form.append('prompt', prompt)
  for (const f of files) form.append('files', f)
  if (domain) form.append('domain', domain)
  if (model) form.append('model', model)

  const cleanKeys = (jiraIssueKeys || []).map((k) => (k || '').trim()).filter(Boolean)
  if (cleanKeys.length) {
    for (const k of cleanKeys) form.append('jiraIssueKeys', k)
  } else if (jiraIssueKey) {
    form.append('jiraIssueKey', jiraIssueKey)
  }

  const url = `${BFF_BASE_URL}/api/generations/stream`
  console.error('🔴 streamGeneration: Fetching from URL:', url, 'with auth:', !!accessToken)

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: authHeaders(accessToken) as Record<string, string>,
  })

  console.error('🔴 streamGeneration: Response status:', res.status)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ': ' + text : ''}`)
  }

  if (!res.body) throw new Error('Response body is null — streaming not supported')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (line.startsWith('data:')) {
            const raw = line.slice(5).trim()
            if (!raw) continue
            try {
              yield JSON.parse(raw) as SseEvent
            } catch {
              // malformed JSON — skip silently
            }
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

export async function createGeneration(
  prompt: string,
  files: File[],
  accessToken?: string,
  domain?: string | null,
  jiraIssueKey?: string,
  jiraIssueKeys?: string[],
): Promise<unknown> {
  const form = new FormData()
  form.append('prompt', prompt)
  for (const f of files) {
    form.append('files', f)
  }
  if (domain) {
    form.append('domain', domain)
  }

  const cleanKeys = (jiraIssueKeys || []).map((k) => (k || '').trim()).filter(Boolean)
  if (cleanKeys.length) {
    for (const k of cleanKeys) form.append('jiraIssueKeys', k)
  } else if (jiraIssueKey) {
    form.append('jiraIssueKey', jiraIssueKey)
  }

  // Avoid UI getting stuck forever if the request never returns (large PDFs, slow extraction/LLM, etc.).
  const controller = new AbortController()
  const timeoutMs = Number(import.meta.env.VITE_GENERATION_TIMEOUT_MS || 600000) // 10 minutes
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(`${BFF_BASE_URL}/api/generations`, {
      method: 'POST',
      body: form,
      headers: authHeaders(accessToken),
      signal: controller.signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)
    }
    throw e
  } finally {
    window.clearTimeout(timeoutId)
  }

  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return data
}

export async function listGenerations(accessToken?: string): Promise<GenerationListItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return Array.isArray(data) ? (data as GenerationListItem[]) : []
}

export async function listAuditEvents(generationId: string, accessToken?: string): Promise<AuditEventListItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/audit`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return Array.isArray(data) ? (data as AuditEventListItem[]) : []
}

export async function getGenerationVersions(generationId: string, accessToken?: string): Promise<GenerationVersionsResponse> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/versions`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as GenerationVersionsResponse) : {})
}

export type CodeBundleResponse = {
  files?: { path: string; content: string }[]
}

export async function getGenerationCode(generationId: string, accessToken?: string): Promise<CodeBundleResponse> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/code`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as CodeBundleResponse) : {})
}

export async function downloadGenerationZip(generationId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/export`, {
    headers: authHeaders(accessToken),
  })

  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `project-${generationId.toLowerCase()}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export type AdminUser = {
  userId?: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  emailVerified?: boolean
  enabled?: boolean
  createdTimestamp?: number
  projectCount?: number
}

export type AdminStats = {
  totalUsers?: number
  totalProjects?: number
  completedProjects?: number
  successRate?: number
}

export async function getAdminUsers(accessToken?: string): Promise<AdminUser[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/users`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return Array.isArray(data) ? (data as AdminUser[]) : []
}

export async function getAdminUserProjects(userId: string, accessToken?: string): Promise<GenerationListItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/projects`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return Array.isArray(data) ? (data as GenerationListItem[]) : []
}

export async function getAdminStats(accessToken?: string): Promise<AdminStats> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/stats`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as AdminStats) : {})
}

export async function deleteAdminUser(userId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function setAdminUserEnabled(userId: string, enabled: boolean, accessToken?: string): Promise<void> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/enabled?enabled=${enabled}`,
    { method: 'PUT', headers: authHeaders(accessToken) },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function getAdminActivity(accessToken?: string): Promise<GenerationListItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/activity`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Array.isArray(data) ? (data as GenerationListItem[]) : []
}

export async function getAdminFailed(accessToken?: string): Promise<GenerationListItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/failed`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Array.isArray(data) ? (data as GenerationListItem[]) : []
}

export type DailyChartItem = { date: string; count: number }

export async function getAdminDailyChart(accessToken?: string): Promise<DailyChartItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/chart/daily`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Array.isArray(data) ? (data as DailyChartItem[]) : []
}

export type ServiceHealth = { fastapi: string; keycloak: string; minio: string; mongodb: string }

export async function getAdminServiceHealth(accessToken?: string): Promise<ServiceHealth> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/health`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (typeof data === 'object' && data !== null ? (data as ServiceHealth) : { fastapi: 'DOWN', keycloak: 'DOWN', minio: 'DOWN', mongodb: 'DOWN' })
}

export type EditFileResponse = {
  filePath?: string
  content?: string
  buildSuccess?: boolean
  buildOutput?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  versionCreated: number
  createdAt: string
}

export async function getChatHistory(
  generationId: string,
  accessToken?: string,
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/chat`,
    { headers: { ...authHeaders(accessToken) } },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Array.isArray(data) ? (data as ChatMessage[]) : []
}

export async function editFile(
  generationId: string,
  filePath: string,
  instruction: string,
  accessToken?: string,
  model?: string,
): Promise<EditFileResponse> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/edit-file`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ generationId, filePath, instruction, model }),
    },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as EditFileResponse) : {})
}

export async function rollbackGeneration(
  generationId: string,
  version: number,
  accessToken?: string,
): Promise<GenerationRollbackResponse> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/rollback?version=${encodeURIComponent(String(version))}`,
    { method: 'POST', headers: authHeaders(accessToken) },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as GenerationRollbackResponse) : {})
}

export type DuplicateResponse = {
  newGenerationId?: string
  buildSuccess?: boolean
  buildOutput?: string
}

export async function duplicateGeneration(
  generationId: string,
  accessToken?: string,
): Promise<DuplicateResponse> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/duplicate`,
    { method: 'POST', headers: authHeaders(accessToken) },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as DuplicateResponse) : {})
}

// ─── GitLab Push types ──────────────────────────────────────────────────

export type PushToGitLabRequest = {
  gitlabUrl: string
  projectPath: string
  token: string
  branch: string
  commitMessage: string
  autoCreate: boolean
}

export type PushToGitLabResponse = {
  success: boolean
  projectUrl?: string
  branch?: string
  commitHash?: string
  message: string
}

export async function postGenerationPushGitlab(
  generationId: string,
  request: PushToGitLabRequest,
  accessToken?: string,
): Promise<PushToGitLabResponse> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/push-gitlab`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify(request),
    },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as PushToGitLabResponse) : { success: false, message: 'Unknown error' })
}

// ══════════════════════════════════════════════════════════════
// GITLAB OAUTH2 API
// ══════════════════════════════════════════════════════════════

export type GitLabCredential = {
  gitlabUrl: string
  gitlabUsername: string
  connectedAt: string
  isActive: boolean
  scope: string
}

export async function gitlabAuthorizeSendRequest(
  gitlabUrl: string = 'https://gitlab.com',
  accessToken?: string,
): Promise<{ authorizationUrl: string; state: string }> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/gitlab/auth/authorize?gitlabUrl=${encodeURIComponent(gitlabUrl)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
    },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return data as { authorizationUrl: string; state: string }
}

export async function gitlabCredentialsGetRequest(
  accessToken?: string,
): Promise<GitLabCredential[]> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/gitlab/credentials`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
    },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return Array.isArray(data) ? data : []
}

export async function gitlabDisconnectSendRequest(
  gitlabUrl: string,
  accessToken?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/gitlab/disconnect?gitlabUrl=${encodeURIComponent(gitlabUrl)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken),
      },
    },
  )
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null ? (data as { success: boolean; message: string }) : { success: false, message: 'Unknown error' })
}

// ══════════════════════════════════════════════════════════════
// TED CHATBOT API
// ══════════════════════════════════════════════════════════════

export type TedContext = {
  generationId?: string
  currentFile?: string
  fileContent?: string
  allFiles?: Array<{ path: string; content: string }>
  editedLines?: number
  action?: 'editing' | 'previewing' | 'testing' | 'uploading'
  lastChange?: string
  fileCount?: number
  totalLines?: number
  userMessage?: string
}

export type TedMessage = {
  id: string
  type: 'user' | 'bot'
  text: string
  timestamp: Date
  suggestion?: string
  actionSteps?: string[]
}

export type TedSuggestion = {
  id: string
  title: string
  description: string
  icon: string
  action: string
  steps?: string[]
}

export type TedChatResponse = {
  response: string
  suggestions?: TedSuggestion[]
  contextUsed?: string[]
  actionSteps?: string[]
}

/**
 * Send a message to TED and get a response
 */
export async function tedSendMessage(
  message: string,
  context?: TedContext,
  accessToken?: string,
  conversationHistory?: Array<{ type: 'user' | 'bot'; text: string }>,
): Promise<TedChatResponse> {
  const res = await fetch(`${BFF_BASE_URL}/api/ted/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify({
      message,
      context: context || {},
      conversationHistory: conversationHistory || [],
    }),
  })

  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return (typeof data === 'object' && data !== null
    ? (data as TedChatResponse)
    : { response: 'Sorry, I could not process that.', suggestions: [] })
}

/**
 * Get smart suggestions based on current context
 */
export async function tedGetSuggestions(
  context: TedContext,
  accessToken?: string,
): Promise<TedSuggestion[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/ted/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(context),
  })

  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    return []
  }

  return Array.isArray(data) ? (data as TedSuggestion[]) : []
}

