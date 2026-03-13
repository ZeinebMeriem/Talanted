const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || 'http://localhost:8081'

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

export type GenerationListItem = {
  generationId?: string
  sessionId?: string
  status?: string
  prompt?: string
  activeVersion?: number
  createdAt?: string
  updatedAt?: string
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

export async function createGeneration(prompt: string, files: File[], accessToken?: string): Promise<unknown> {
  const form = new FormData()
  form.append('prompt', prompt)
  for (const f of files) {
    form.append('files', f)
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
