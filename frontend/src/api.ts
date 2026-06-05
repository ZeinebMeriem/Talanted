// Use relative URL so Vite proxy handles all /api requests
// The VITE_BFF_BASE_URL env var is only used for non-proxied setups
const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || ''

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

export type UserProfileResponse = {
  userId?: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  emailVerified?: boolean
  avatarUrl?: string
  bio?: string
  timezone?: string
  preferredLanguage?: string
  notifications?: Record<string, boolean>
  createdAt?: string
  updatedAt?: string
  projectCount?: number
  completedProjects?: number
}

export type UpdateProfileRequest = {
  avatarUrl?: string
  bio?: string
  timezone?: string
  preferredLanguage?: string
  notifications?: Record<string, boolean>
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

export async function getUserProfile(accessToken?: string): Promise<UserProfileResponse> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/profile`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as UserProfileResponse) : {})
}

export async function updateUserProfile(request: UpdateProfileRequest, accessToken?: string): Promise<UserProfileResponse> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/profile`, {
    method: 'PUT',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as UserProfileResponse) : {})
}

export async function sendVerificationEmail(accessToken?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/verify-email`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as { success: boolean; message: string }) : { success: false, message: 'Unknown error' })
}

export async function uploadAvatar(file: File, accessToken?: string): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BFF_BASE_URL}/api/user/avatar`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: formData,
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (typeof data === 'object' && data !== null ? (data as { avatarUrl: string }) : { avatarUrl: '' })
}

export async function deleteAvatar(accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/user/profile/avatar`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export type GenerationListItem = {
  generationId?: string
  sessionId?: string
  userId?: string
  status?: string
  prompt?: string
  name?: string
  activeVersion?: number
  createdAt?: string
  updatedAt?: string
  deployUrl?: string
  deployProvider?: string
  deployedAt?: string
  meetingAnalysis?: string
  jiraIssueKey?: string
  jiraIssueKeys?: string[]
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
  aiReportVersions?: {
    version?: number
    score?: number
    llmProvider?: string
    createdAt?: string
    semanticFidelity?: number
    codeQuality?: number
    completeness?: number
    accessibility?: number
    visualRichness?: number
  }[]
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
  themePreset?: string | null,
  meetingAnalysis?: object | null,
): AsyncGenerator<SseEvent, void, unknown> {
  const form = new FormData()
  form.append('prompt', prompt)
  for (const f of files) form.append('files', f)
  if (domain) form.append('domain', domain)
  if (model) form.append('model', model)
  if (themePreset) form.append('themePreset', themePreset)
  if (meetingAnalysis) form.append('meetingAnalysis', JSON.stringify(meetingAnalysis))

  const cleanKeys = (jiraIssueKeys || []).map((k) => (k || '').trim()).filter(Boolean)
  if (cleanKeys.length) {
    for (const k of cleanKeys) form.append('jiraIssueKeys', k)
  } else if (jiraIssueKey) {
    form.append('jiraIssueKey', jiraIssueKey)
  }

  const url = `${BFF_BASE_URL}/api/generations/stream`

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: authHeaders(accessToken) as Record<string, string>,
  })

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
    reader.cancel().catch(() => { })
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

export interface PaginatedGenerations {
  content: GenerationListItem[]
  page: number
  size: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export async function listGenerations(
  accessToken?: string,
  page = 0,
  size = 20,
): Promise<GenerationListItem[]> {
  const url = `${BFF_BASE_URL}/api/generations?page=${page}&size=${size}&sortBy=createdAt&direction=desc`
  const res = await fetch(url, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  // Handle both paginated response and legacy array response
  if (Array.isArray(data)) return data as GenerationListItem[]
  const paginated = data as PaginatedGenerations
  return Array.isArray(paginated?.content) ? paginated.content : []
}

export async function deleteGeneration(generationId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function renameGeneration(generationId: string, name: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/name`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function attachMeetingAnalysis(generationId: string, analysis: object, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/meeting-analysis`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingAnalysis: JSON.stringify(analysis) }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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

export type QualityScoresResponse = {
  globalScore?: number
  semanticFidelity?: number
  codeQuality?: number
  completeness?: number
  accessibility?: number
  visualRichness?: number
  reasoning?: Record<string, string>
  version?: number
  source?: string
}

export async function getGenerationQuality(
  generationId: string,
  version?: number,
  accessToken?: string,
): Promise<QualityScoresResponse> {
  const url = version != null
    ? `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/quality?version=${version}`
    : `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/quality`
  const res = await fetch(url, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) return {}
  return (typeof data === 'object' && data !== null ? (data as QualityScoresResponse) : {})
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

export async function getGeneration(generationId: string, accessToken?: string): Promise<any> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}`, {
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)

  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }

  return data
}

export async function repairGeneration(
  generationId: string,
  accessToken?: string,
): Promise<{ globalScore: number; semanticFidelity: number; codeQuality: number; completeness: number; accessibility: number; visualRichness: number; repaired: boolean; reasoning?: Record<string, string> }> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/repair`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as any
}

export async function deployProject(
  generationId: string,
  token: string,
  provider: 'netlify' = 'netlify',
  accessToken?: string,
): Promise<{ url: string; siteId?: string; siteName?: string; error?: string }> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify({ provider, token }),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as any
}

export type AccessibilityIssue = {
  id: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  wcag: string
  title: string
  description: string
  element: string
  filePath?: string
  fix: string
  currentCode?: string
  autoFixCode?: string
}

export type AccessibilityReport = {
  generated?: boolean
  score?: number
  wcagLevel?: string
  summary?: string
  issues?: AccessibilityIssue[]
  passed?: string[]
  recommendations?: string[]
  filesAnalyzed?: number
  error?: string
}

export async function generateAccessibilityReport(
  generationId: string,
  accessToken?: string,
): Promise<AccessibilityReport> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/accessibility`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) } },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (data as AccessibilityReport) ?? {}
}

export async function getAccessibilityHistory(
  generationId: string,
  accessToken?: string,
): Promise<any[]> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/accessibility/history`,
    { headers: authHeaders(accessToken) },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (data as any[]) ?? []
}

export async function applyAccessibilityFix(
  generationId: string,
  issueId: string,
  filePath: string,
  fixCode: string,
  accessToken?: string,
  currentCode?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/accessibility/apply-fix`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ issueId, filePath, fixCode, currentCode }),
    },
  )
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return (data as any) ?? { success: false, message: 'Unknown error' }
}

export async function generateDocs(
  generationId: string,
  accessToken?: string,
): Promise<{ readme: string; filesUpdated: number }> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/docs`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as any
}

export async function downloadCleanZip(generationId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/export/clean`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${generationId.toLowerCase()}-clean-stack.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
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
  roles?: string[]
  lastLoginAt?: number | null
  lastProjectAt?: number | null
}

export type AdminStats = {
  totalUsers?: number
  totalProjects?: number
  completedProjects?: number
  processingProjects?: number
  failedProjects?: number
  successRate?: number
  avgGenerationSeconds?: number | null
  avgQualityScore?: number | null
  deployedCount?: number
  gitlabCount?: number
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

export async function getAdminDailyChart(accessToken?: string, days = 30): Promise<DailyChartItem[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/chart/daily?days=${days}`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Array.isArray(data) ? (data as DailyChartItem[]) : []
}

export async function retryAdminGeneration(generationId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/generations/${encodeURIComponent(generationId)}/retry`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function setAdminUserRole(userId: string, role: string, assign: boolean, accessToken?: string): Promise<void> {
  const res = await fetch(
    `${BFF_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/role?role=${encodeURIComponent(role)}&assign=${assign}`,
    { method: 'PUT', headers: authHeaders(accessToken) },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export type ServiceHealthEntry = { status: string; responseMs: number }
export type ServiceHealth = { fastapi: ServiceHealthEntry; keycloak: ServiceHealthEntry; minio: ServiceHealthEntry; mongodb: ServiceHealthEntry }

export async function getAdminServiceHealth(accessToken?: string): Promise<ServiceHealth> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/health`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const down: ServiceHealthEntry = { status: 'DOWN', responseMs: 0 }
  return (typeof data === 'object' && data !== null ? (data as ServiceHealth) : { fastapi: down, keycloak: down, minio: down, mongodb: down })
}

export type AdminAuditEvent = {
  eventId?: string
  generationId?: string
  sessionId?: string
  type?: string
  correlationId?: string
  timestamp?: string
  durationMs?: number
  details?: Record<string, unknown>
}

export async function getAdminAuditLog(accessToken?: string): Promise<AdminAuditEvent[]> {
  const res = await fetch(`${BFF_BASE_URL}/api/admin/audit`, { headers: authHeaders(accessToken) })
  const data: unknown = await readJsonOrNull(res)
  return Array.isArray(data) ? (data as AdminAuditEvent[]) : []
}

export type PublicShareInfo = {
  generationId: string
  name: string
  prompt: string
  status: string
  createdAt: string
  shareToken: string
}

export async function shareProject(generationId: string, accessToken?: string): Promise<{ shareToken: string }> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/share`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as { shareToken: string }
}

export async function unshareProject(generationId: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BFF_BASE_URL}/api/generations/${encodeURIComponent(generationId)}/share`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function getPublicShare(token: string): Promise<PublicShareInfo> {
  const res = await fetch(`${BFF_BASE_URL}/api/public/share/${encodeURIComponent(token)}`)
  const data: unknown = await readJsonOrNull(res)
  if (!res.ok) {
    const message = extractErrorMessage(data)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return data as PublicShareInfo
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
  file?: string         // target file path for auto-apply
  instruction?: string  // edit instruction for auto-apply
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

