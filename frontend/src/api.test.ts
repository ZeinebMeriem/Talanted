import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, []))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── listGenerations ───────────────────────────────────────────────────────────

describe('listGenerations', () => {
  it('retourne un tableau de projets', async () => {
    const projects = [
      { generationId: 'gen-001', prompt: 'Landing page', status: 'COMPLETED' },
      { generationId: 'gen-002', prompt: 'Dashboard', status: 'PENDING' },
    ]
    vi.stubGlobal('fetch', mockFetch(200, projects))

    const { listGenerations } = await import('./api')
    const result = await listGenerations('token-abc')

    expect(result).toHaveLength(2)
    expect(result[0].generationId).toBe('gen-001')
    expect(result[1].status).toBe('PENDING')
  })

  it('retourne un tableau vide si réponse vide', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))

    const { listGenerations } = await import('./api')
    const result = await listGenerations()

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('lève une erreur si la réponse est 401', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { message: 'Authentication required' }))

    const { listGenerations } = await import('./api')

    await expect(listGenerations()).rejects.toThrow('Authentication required')
  })
})

// ── getGeneration ─────────────────────────────────────────────────────────────

describe('getGeneration', () => {
  it('retourne le projet correspondant à l\'id', async () => {
    const project = { generationId: 'gen-001', prompt: 'Hero section', status: 'COMPLETED' }
    vi.stubGlobal('fetch', mockFetch(200, project))

    const { getGeneration } = await import('./api')
    const result = await getGeneration('gen-001', 'token-abc')

    expect(result).toBeDefined()
    expect(result.generationId).toBe('gen-001')
  })

  it('lève une erreur si le projet n\'existe pas', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { message: 'generation not found' }))

    const { getGeneration } = await import('./api')

    await expect(getGeneration('missing')).rejects.toThrow('generation not found')
  })
})

// ── deleteGeneration ──────────────────────────────────────────────────────────

describe('deleteGeneration', () => {
  it('appelle DELETE avec le bon ID', async () => {
    const fakeFetch = mockFetch(204, null)
    vi.stubGlobal('fetch', fakeFetch)

    const { deleteGeneration } = await import('./api')
    await deleteGeneration('gen-001', 'token-abc')

    expect(fakeFetch).toHaveBeenCalledWith(
      expect.stringContaining('gen-001'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('lève une erreur si le serveur répond 500', async () => {
    vi.stubGlobal('fetch', mockFetch(500, {}))

    const { deleteGeneration } = await import('./api')

    await expect(deleteGeneration('gen-001')).rejects.toThrow()
  })
})

// ── rollbackGeneration ────────────────────────────────────────────────────────

describe('rollbackGeneration', () => {
  it('retourne le numéro de version actif après rollback', async () => {
    const response = { generationId: 'gen-001', previousActiveVersion: 3, activeVersion: 1 }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { rollbackGeneration } = await import('./api')
    const result = await rollbackGeneration('gen-001', 1, 'token-abc')

    expect(result.activeVersion).toBe(1)
    expect(result.previousActiveVersion).toBe(3)
  })
})

// ── deployProject ─────────────────────────────────────────────────────────────

describe('deployProject', () => {
  it('retourne l\'URL Netlify après deploy réussi', async () => {
    const response = { url: 'https://abc123.netlify.app', siteId: 'site-1' }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { deployProject } = await import('./api')
    const result = await deployProject('gen-001', 'nfp_token', 'netlify', 'token-abc')

    expect(result.url).toBe('https://abc123.netlify.app')
  })

  it('lève une erreur si le token Netlify est invalide', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { message: 'token is required' }))

    const { deployProject } = await import('./api')

    await expect(deployProject('gen-001', '', 'netlify')).rejects.toThrow('token is required')
  })
})

// ── repairGeneration ──────────────────────────────────────────────────────────

describe('repairGeneration', () => {
  it('retourne les scores mis à jour après réparation', async () => {
    const response = {
      repaired: true,
      globalScore: 88,
      semanticFidelity: 90,
      codeQuality: 85,
      completeness: 88,
      accessibility: 92,
      visualRichness: 78,
    }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { repairGeneration } = await import('./api')
    const result = await repairGeneration('gen-001', 'token-abc')

    expect(result.repaired).toBe(true)
    expect(result.globalScore).toBe(88)
    expect(result.globalScore).toBeGreaterThanOrEqual(0)
    expect(result.globalScore).toBeLessThanOrEqual(100)
  })
})

// ── generateDocs ──────────────────────────────────────────────────────────────

describe('generateDocs', () => {
  it('retourne le README généré', async () => {
    const response = { readme: '# My Project\n...', filesUpdated: 3 }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { generateDocs } = await import('./api')
    const result = await generateDocs('gen-001', 'token-abc')

    expect(result.readme).toContain('# My Project')
    expect(result.filesUpdated).toBe(3)
  })
})

// ── getGenerationVersions ─────────────────────────────────────────────────────

describe('getGenerationVersions', () => {
  it('retourne les versions du projet', async () => {
    const response = {
      generationId: 'gen-001',
      activeVersion: 2,
      codeVersions: [{ version: 1 }, { version: 2 }],
    }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { getGenerationVersions } = await import('./api')
    const result = await getGenerationVersions('gen-001', 'token-abc')

    expect(result.activeVersion).toBe(2)
    expect(result.codeVersions).toHaveLength(2)
  })
})

// ── duplicateGeneration ───────────────────────────────────────────────────────

describe('duplicateGeneration', () => {
  it('retourne le nouvel ID après duplication', async () => {
    const response = { newGenerationId: 'gen-copy-001', buildSuccess: true }
    vi.stubGlobal('fetch', mockFetch(200, response))

    const { duplicateGeneration } = await import('./api')
    const result = await duplicateGeneration('gen-001', 'token-abc')

    expect(result.newGenerationId).toBe('gen-copy-001')
    expect(result.buildSuccess).toBe(true)
  })
})
