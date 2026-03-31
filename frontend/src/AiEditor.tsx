import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createGeneration,
  downloadGenerationZip,
  getAdminActivity,
  getAdminDailyChart,
  getAdminFailed,
  getAdminServiceHealth,
  getAdminStats,
  getAdminUserProjects,
  getAdminUsers,
  getGenerationCode,
  getGenerationVersions,
  getMe,
  getUserStats,
  listAuditEvents,
  listGenerations,
  deleteAdminUser,
  editFile,
  rollbackGeneration,
  setAdminUserEnabled,
  getChatHistory,
  type AdminStats,
  type AdminUser,
  type AuditEventListItem,
  type ChatMessage as ApiChatMessage,
  type DailyChartItem,
  type GenerationListItem,
  type GenerationVersionsResponse,
  type ServiceHealth,
  type UserProfile,
  type UserStats,
} from './api'

type Framework =
  | 'HTML/CSS'
  | 'React'

type CenterTab = 'preview' | 'code' | 'terminal'

type RightTab = 'chat' | 'console' | 'logs' | 'component'

type FileNode =
  | { id: string; type: 'file'; name: string }
  | { id: string; type: 'folder'; name: string; open: boolean; children: FileNode[] }

type ChatMsg = {
  role: 'ai' | 'user'
  text: string
  edits?: { file: string; added: number; removed: number }[]
}

type CodeFile = { path: string; content: string }

type GenerationApiResponse = {
  generationId?: string
  codeBundle?: { files?: CodeFile[] }
  uiSpec?: unknown
  aiReport?: unknown
}

function fileTreeFromPaths(files: CodeFile[]): { tree: FileNode[]; byId: Map<string, CodeFile> } {
  const root: { children: Map<string, any> } = { children: new Map() }
  const byId = new Map<string, CodeFile>()

  const ensureFolder = (parent: any, folderName: string) => {
    if (!parent.children.has(folderName)) {
      parent.children.set(folderName, { type: 'folder', name: folderName, children: new Map() })
    }
    return parent.children.get(folderName)
  }

  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean)
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      if (isLast) {
        const id = f.path
        cur.children.set(part, { type: 'file', name: part, id })
        byId.set(id, f)
      } else {
        cur = ensureFolder(cur, part)
      }
    }
  }

  const toNodes = (folder: any, prefix: string): FileNode[] => {
    const entries = Array.from(folder.children.entries()) as [string, any][]
    entries.sort((a, b) => a[0].localeCompare(b[0]))

    const folders: FileNode[] = []
    const leafFiles: FileNode[] = []

    for (const [name, node] of entries) {
      if (node.type === 'folder') {
        const id = prefix ? `${prefix}/${name}` : name
        folders.push({
          id,
          type: 'folder',
          name,
          open: true,
          children: toNodes(node, id),
        })
      } else {
        leafFiles.push({ id: node.id, type: 'file', name: node.name })
      }
    }

    return [...folders, ...leafFiles]
  }

  return { tree: toNodes(root, ''), byId }
}

function countFiles(nodes: FileNode[]): number {
  let total = 0
  for (const n of nodes) {
    if (n.type === 'file') total += 1
    else total += countFiles(n.children)
  }
  return total
}

function findNode(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.type === 'folder') {
      const hit = findNode(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

export function AiEditor({ accessToken, username = 'there', email, firstName, lastName, userSub, roles = [], onLogout }: { accessToken?: string; username?: string; email?: string; firstName?: string; lastName?: string; userSub?: string; roles?: string[]; onLogout?: () => void }) {
  const [selectedFw, setSelectedFw] = useState<Framework | null>(null)
  const [projectName, setProjectName] = useState('my-awesome-app')
  const [customPrompt, setCustomPrompt] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

  // Auto-detect domain from prompt keywords (mirrors Python detect_domain())
  const autoDetectedDomain = useMemo(() => {
    const p = customPrompt.toLowerCase()
    const keywords: Record<string, string[]> = {
      ecommerce:  ['shop', 'store', 'product', 'cart', 'checkout', 'price', 'buy', 'boutique', 'catalogue', 'panier'],
      medical:    ['patient', 'doctor', 'appointment', 'medical', 'health', 'clinic', 'hospital', 'médecin', 'santé'],
      dashboard:  ['dashboard', 'analytics', 'metrics', 'chart', 'graph', 'stats', 'kpi', 'tableau de bord'],
      education:  ['course', 'lesson', 'student', 'teacher', 'quiz', 'learning', 'cours', 'formation', 'élève'],
      saas:       ['saas', 'subscription', 'plan', 'api', 'integration', 'enterprise', 'abonnement', 'plateforme'],
      portfolio:  ['portfolio', 'skill', 'designer', 'developer', 'creative', 'réalisation', 'compétence'],
      restaurant: ['restaurant', 'menu', 'food', 'reservation', 'chef', 'dish', 'cuisine', 'repas'],
      real_estate:['property', 'house', 'apartment', 'rent', 'immobilier', 'appartement', 'maison', 'agence'],
    }
    let best: string | null = null
    let bestScore = 0
    for (const [domain, kws] of Object.entries(keywords)) {
      const score = kws.filter(kw => p.includes(kw)).length
      if (score > bestScore) { bestScore = score; best = domain }
    }
    return bestScore > 0 ? best : null
  }, [customPrompt])

  const DOMAINS = [
    { value: 'ecommerce',  emoji: '🛒', label: 'E-commerce' },
    { value: 'dashboard',  emoji: '📊', label: 'Dashboard' },
    { value: 'medical',    emoji: '🏥', label: 'Médical' },
    { value: 'education',  emoji: '🎓', label: 'Éducation' },
    { value: 'saas',       emoji: '💼', label: 'SaaS' },
    { value: 'portfolio',  emoji: '🎨', label: 'Portfolio' },
    { value: 'restaurant', emoji: '🍽️', label: 'Restaurant' },
    { value: 'real_estate',emoji: '🏠', label: 'Immobilier' },
  ]

  const activeDomain = selectedDomain ?? autoDetectedDomain

  const isAdmin = roles.includes('admin')

  // Navigation — admin lands directly on admin dashboard
  const [homeTab, setHomeTab] = useState<'create' | 'projects' | 'profile' | 'admin'>(isAdmin ? 'admin' : 'create')

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Admin dashboard
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [selectedAdminUser, setSelectedAdminUser] = useState<AdminUser | null>(null)
  const [selectedUserProjects, setSelectedUserProjects] = useState<GenerationListItem[]>([])
  const [userProjectsLoading, setUserProjectsLoading] = useState(false)
  const [adminActivity, setAdminActivity] = useState<GenerationListItem[]>([])
  const [adminFailed, setAdminFailed] = useState<GenerationListItem[]>([])
  const [adminDailyChart, setAdminDailyChart] = useState<DailyChartItem[]>([])
  const [adminHealth, setAdminHealth] = useState<ServiceHealth | null>(null)
  const [adminActiveTab, setAdminActiveTab] = useState<'overview' | 'users' | 'activity' | 'failed' | 'health'>('overview')

  // IDE
  const [ideVisible, setIdeVisible] = useState(false)
  const [centerTab, setCenterTab] = useState<CenterTab>('preview')
  const [rightTab, setRightTab] = useState<RightTab>('chat')
  const [isMobile, setIsMobile] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedEl, setSelectedEl] = useState<string | null>(null)

  const [chatInput, setChatInput] = useState('')
  const [diffVisible, setDiffVisible] = useState(false)
  const [diffEdits, setDiffEdits] = useState<{ file: string; added: number; removed: number }[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewReloadCount, setPreviewReloadCount] = useState(0)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.7)

  const [buildMsg, setBuildMsg] = useState('Scaffolding project…')
  const [buildPct, setBuildPct] = useState(0)
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  const [apiResult, setApiResult] = useState<GenerationApiResponse | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [history, setHistory] = useState<GenerationListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)

  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const [auditEvents, setAuditEvents] = useState<AuditEventListItem[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const [versions, setVersions] = useState<GenerationVersionsResponse | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null)
      setHistoryLoading(true)
      const items = await listGenerations(accessToken)
      setHistory(items)
    } catch (e: any) {
      setHistoryError(e?.message ?? 'Unable to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [accessToken])

  const loadGeneration = useCallback(async (generationId: string) => {
    try {
      setLoadingProjectId(generationId)
      const [bundle, history] = await Promise.all([
        getGenerationCode(generationId, accessToken),
        getChatHistory(generationId, accessToken),
      ])
      setApiResult({ generationId, codeBundle: bundle, uiSpec: undefined, aiReport: undefined })
      setChatMessages(history.map((m: ApiChatMessage) => ({
        role: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
      })))
      setShowSuccessOverlay(false)
      setIdeVisible(true)
      setCenterTab('preview')
    } catch (e: any) {
      setHistoryError(e?.message ?? 'Failed to load project')
    } finally {
      setLoadingProjectId(null)
    }
  }, [accessToken])

  const loadAudit = useCallback(
    async (generationId: string) => {
      try {
        setAuditError(null)
        setAuditLoading(true)
        const items = await listAuditEvents(generationId, accessToken)
        setAuditEvents(items)
      } catch (e: any) {
        setAuditError(e?.message ?? 'Unable to load audit')
        setAuditEvents([])
      } finally {
        setAuditLoading(false)
      }
    },
    [accessToken],
  )

  const loadVersions = useCallback(
    async (generationId: string) => {
      try {
        setVersionsError(null)
        setVersionsLoading(true)
        const v = await getGenerationVersions(generationId, accessToken)
        setVersions(v)
      } catch (e: any) {
        setVersionsError(e?.message ?? 'Unable to load versions')
        setVersions(null)
      } finally {
        setVersionsLoading(false)
      }
    },
    [accessToken],
  )

  const doRollback = useCallback(
    async (generationId: string, version: number) => {
      try {
        setVersionsError(null)
        await rollbackGeneration(generationId, version, accessToken)
        await Promise.all([loadHistory(), loadAudit(generationId), loadVersions(generationId)])
      } catch (e: any) {
        setVersionsError(e?.message ?? 'Rollback failed')
      }
    },
    [accessToken, loadAudit, loadHistory, loadVersions],
  )

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true)
      const [profile, stats] = await Promise.all([getMe(accessToken), getUserStats(accessToken)])
      setUserProfile(profile)
      setUserStats(stats)
    } catch {
      // non-critical — profile enrichment only
    } finally {
      setProfileLoading(false)
    }
  }, [accessToken])

  const loadAdminDashboard = useCallback(async () => {
    try {
      setAdminError(null)
      setAdminLoading(true)
      const [users, stats, activity, failed, chart, health] = await Promise.all([
        getAdminUsers(accessToken),
        getAdminStats(accessToken),
        getAdminActivity(accessToken),
        getAdminFailed(accessToken),
        getAdminDailyChart(accessToken),
        getAdminServiceHealth(accessToken),
      ])
      setAdminUsers(users)
      setAdminStats(stats)
      setAdminActivity(activity)
      setAdminFailed(failed)
      setAdminDailyChart(chart)
      setAdminHealth(health)
    } catch (e: any) {
      setAdminError(e?.message ?? 'Failed to load admin data')
    } finally {
      setAdminLoading(false)
    }
  }, [accessToken])

  const openUserProjects = useCallback(async (user: AdminUser) => {
    setSelectedAdminUser(user)
    setSelectedUserProjects([])
    if (!user.userId) return
    try {
      setUserProjectsLoading(true)
      const projects = await getAdminUserProjects(user.userId, accessToken)
      setSelectedUserProjects(projects)
    } catch {
      setSelectedUserProjects([])
    } finally {
      setUserProjectsLoading(false)
    }
  }, [accessToken])

  // Load history on mount so Recent Projects appear immediately
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // Load profile when tab is first opened
  useEffect(() => {
    if (homeTab === 'profile' && !userProfile && !profileLoading) {
      void loadProfile()
    }
  }, [homeTab, userProfile, profileLoading, loadProfile])

  // Load admin dashboard when tab is opened
  useEffect(() => {
    if (homeTab === 'admin' && adminUsers.length === 0 && !adminLoading) {
      void loadAdminDashboard()
    }
  }, [homeTab, adminUsers.length, adminLoading, loadAdminDashboard])

  useEffect(() => {
    if (ideVisible && rightTab === 'logs') {
      void loadHistory()
    }
  }, [ideVisible, rightTab, loadHistory])

  const defaultTree = useMemo<FileNode[]>(
    () => [
      {
        id: 'src',
        type: 'folder',
        name: 'src',
        open: true,
        children: [
          { id: 'src/App.jsx', type: 'file', name: 'App.jsx' },
          { id: 'src/main.jsx', type: 'file', name: 'main.jsx' },
          { id: 'src/index.css', type: 'file', name: 'index.css' },
          {
            id: 'src/components',
            type: 'folder',
            name: 'components',
            open: true,
            children: [
              { id: 'src/components/Hero.jsx', type: 'file', name: 'Hero.jsx' },
              { id: 'src/components/Navbar.jsx', type: 'file', name: 'Navbar.jsx' },
            ],
          },
        ],
      },
      {
        id: 'public',
        type: 'folder',
        name: 'public',
        open: false,
        children: [{ id: 'public/logo.svg', type: 'file', name: 'logo.svg' }],
      },
      { id: 'package.json', type: 'file', name: 'package.json' },
      { id: 'vite.config.js', type: 'file', name: 'vite.config.js' },
    ],
    [],
  )

  const [tree, setTree] = useState<FileNode[]>(defaultTree)
  const [activeFileId, setActiveFileId] = useState<string>('src/components/Hero.jsx')

  const codeFiles = useMemo(() => {
    const files = apiResult?.codeBundle?.files
    if (!files || files.length === 0) return null
    return fileTreeFromPaths(files)
  }, [apiResult])

  // Keep a single stateful tree so folder toggles work for both mock and API-driven files.
  const effectiveTree = tree

  const effectiveFileContents = useMemo(() => {
    if (codeFiles) return codeFiles.byId
    const map = new Map<string, CodeFile>()
    map.set('src/App.jsx', {
      path: 'src/App.jsx',
      content:
        "import { useState, useMemo } from 'react'\nimport Navbar from './components/Navbar'\nimport Hero from './components/Hero'\nimport './index.css'\n\nfunction App() {\n  const [count, setCount] = useState(0)\n\n  return (\n    <div className=\"app\">\n      <Navbar />\n      <Hero\n        count={count}\n        onCount={() => setCount(c => c + 1)}\n      />\n    </div>\n  )\n}\n\nexport default App",
    })
    map.set('src/main.jsx', {
      path: 'src/main.jsx',
      content:
        "import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\n\nReactDOM.createRoot(\n  document.getElementById('root')\n).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n)",
    })
    map.set('src/index.css', {
      path: 'src/index.css',
      content:
        ":root {\n  --primary: #a5b4fc;\n  --bg: #0f172a;\n  --surface: #1e293b;\n}\n\nbody {\n  background: var(--bg);\n  color: #f1f5f9;\n  font-family: sans-serif;\n}\n\n.navbar {\n  display: flex;\n  justify-content: space-between;\n  padding: 1rem 2rem;\n  background: var(--surface);\n}\n\n.hero {\n  text-align: center;\n  padding: 5rem 2rem;\n}\n\n.btn-primary {\n  background: var(--primary);\n  color: #000;\n  padding: .6rem 1.4rem;\n  border: none;\n  border-radius: 6px;\n  cursor: pointer;\n}",
    })
    map.set('src/components/Hero.jsx', {
      path: 'src/components/Hero.jsx',
      content:
        'export default function Hero({ count, onCount }) {\n  return (\n    <section className="hero">\n      <h1>Welcome to My App</h1>\n      <p>Built with React + Vite</p>\n      <button\n        onClick={onCount}\n        className="btn-primary"\n      >\n        Count: {count}\n      </button>\n    </section>\n  )\n}',
    })
    map.set('src/components/Navbar.jsx', {
      path: 'src/components/Navbar.jsx',
      content:
        'export default function Navbar() {\n  return (\n    <nav className="navbar">\n      <span className="logo">MyApp</span>\n      <ul>\n        <li><a href="#">Home</a></li>\n        <li><a href="#">About</a></li>\n        <li><a href="#">Contact</a></li>\n      </ul>\n    </nav>\n  )\n}',
    })
    map.set('public/logo.svg', {
      path: 'public/logo.svg',
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#a5b4fc"/>\n  <text x="50" y="58" text-anchor="middle"\n    font-size="28" fill="#000">M</text>\n</svg>',
    })
    map.set('package.json', {
      path: 'package.json',
      content:
        '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "vite": "^5.0.0"\n  }\n}',
    })
    map.set('vite.config.js', {
      path: 'vite.config.js',
      content:
        "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 3000 }\n})",
    })
    return map
  }, [codeFiles])

  useEffect(() => {
    // When an API result arrives, swap the explorer to the generated file tree and select a sensible default.
    if (codeFiles) {
      setTree(codeFiles.tree)

      const prefer = ['index.html', 'styles.css', 'src/App.tsx', 'src/App.jsx']
      const allKeys = Array.from(codeFiles.byId.keys())
      // Prefer first HTML file for preview
      const firstHtml = allKeys.find((k) => k.endsWith('.html'))
      const next = firstHtml ?? prefer.find((id) => codeFiles.byId.has(id)) ?? allKeys[0]
      if (next && !codeFiles.byId.has(activeFileId)) {
        setActiveFileId(next)
        setCenterTab('code')
      }
      return
    }

    // No API result yet (or cleared): show the built-in demo tree.
    setTree(defaultTree)
  }, [codeFiles, defaultTree, activeFileId])

  const previewSrcDoc = useMemo(() => {
    // Multi-file support: preview the active HTML file (or index.html), inlining all CSS.
    const activeContent = effectiveFileContents.get(activeFileId)
    const activeIsHtml = activeFileId.endsWith('.html') && activeContent
    const htmlFile = activeIsHtml
      ? activeContent
      : effectiveFileContents.get('index.html')

    const html = htmlFile?.content
    if (!html) return null

    // Only inline CSS/JS files that are explicitly referenced in the HTML.
    // This prevents scripts from one page (e.g. analytics chart) bleeding into another.
    const parseRefs = (src: string, re: RegExp): string[] => {
      const refs: string[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) !== null) refs.push(m[1].replace(/^\.\//, ''))
      return refs
    }
    const cssRefs = [
      ...parseRefs(html, /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi),
      ...parseRefs(html, /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi),
    ]
    const jsRefs = parseRefs(html, /<script[^>]+src=["']([^"']+)["'][^>]*>/gi)

    const cssBlocks: string[] = cssRefs.length > 0
      ? cssRefs.flatMap(r => { const f = effectiveFileContents.get(r); return f?.content ? [f.content] : [] })
      : Array.from(effectiveFileContents.entries())
          .filter(([p]) => p.endsWith('.css'))
          .map(([, f]) => f.content)
          .filter(Boolean) as string[]

    const jsBlocks: string[] = jsRefs.length > 0
      ? jsRefs.flatMap(r => { const f = effectiveFileContents.get(r); return f?.content ? [f.content] : [] })
      : [] // Don't blindly inline all JS — it causes cross-page script bleed

    let result = html

    // Strip only local /tailwind.min.js (doesn't exist in preview server)
    result = result.replace(/<script[^>]+src=["']\/tailwind\.min\.js["'][^>]*><\/script>/gi, '')

    // NUCLEAR visibility override — appended last so it beats all LLM CSS including !important
    // Targets every known pattern that causes blank previews:
    //   1. .reveal { opacity:0 } from animations.css
    //   2. body.js-ready .reveal { opacity:0 } from base CSS + JS adding js-ready class
    //   3. Tailwind/CDN scripts hiding body via JS
    //   4. Any animation that starts from opacity:0
    const nuclearOverride = [
      '/* ===== PREVIEW SAFETY — OVERRIDES ALL LLM CSS ===== */',
      'html,body{opacity:1!important;visibility:visible!important;display:block!important}',
      '.reveal,.animated,.fade-in,.fade-up,.slide-up,[class*="animate"]{opacity:1!important;transform:none!important;transition:none!important;animation:none!important;visibility:visible!important}',
      'body.js-ready .reveal{opacity:1!important;transform:none!important}',
      'body.js-ready .reveal.revealed{opacity:1!important;transform:none!important}',
      '*[style*="opacity:0"],*[style*="opacity: 0"]{opacity:1!important}',
      '*[style*="display:none"],*[style*="display: none"]{display:block!important}',
      '*[style*="visibility:hidden"]{visibility:visible!important}',
    ].join('\n')

    // Also kill the JS that adds body.js-ready (which triggers opacity:0 on reveals)
    result = result.replace(/document\.body\.classList\.add\(['"]js-ready['"]\)/g,
      '/* js-ready disabled in preview */')

    const allCss = cssBlocks.length > 0 ? cssBlocks.join('\n') : ''
    const styleTag = `\n<style>\n${allCss}\n${nuclearOverride}\n</style>\n`
    if (result.includes('</head>')) {
      result = result.replace('</head>', styleTag + '</head>')
    } else {
      result = styleTag + result
    }
    if (jsBlocks.length > 0) {
      // Disable js-ready class addition in preview — it triggers opacity:0 on .reveal elements
      const safeJs = jsBlocks.join('\n')
        .replace(/document\.body\.classList\.add\(['"]js-ready['"]\)/g, '/* js-ready disabled in preview */')
      const scriptTag = `\n<script>\n${safeJs}\n</script>\n`
      if (result.includes('</body>')) {
        result = result.replace('</body>', scriptTag + '</body>')
      } else {
        result = result + scriptTag
      }
    }
    // Inject a navigation interceptor so clicking links to other .html files
    // posts a message to the parent to switch pages instead of navigating away.
    const navScript = `<script>
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (!a) return;
  var href = a.getAttribute('href');
  if (href && href.endsWith('.html') && !href.startsWith('http')) {
    e.preventDefault();
    window.parent.postMessage({ type: 'navigate', path: href }, '*');
  }
});
</script>`
    if (result.includes('</body>')) {
      result = result.replace('</body>', navScript + '</body>')
    } else {
      result = result + navScript
    }
    return result
  }, [effectiveFileContents, activeFileId])

  // Listen for navigation messages from the preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && typeof e.data.path === 'string') {
        const target = e.data.path.replace(/^\.\//, '')
        if (effectiveFileContents.has(target)) {
          setActiveFileId(target)
          setCenterTab('preview')
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [effectiveFileContents])

  // Auto-scale preview like Lovable: observe container width and scale to fit 1280px
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width
      if (width > 0) setPreviewScale(width / 1280)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Derived — always in sync with apiResult, no separate state needed
  const builtProjectUrl = apiResult?.generationId
    ? `http://localhost:8000/projects/${apiResult.generationId}/dist/index.html`
    : null

  const previewKey = useMemo(() => {
    if (!builtProjectUrl && !previewSrcDoc) return 'no-preview'
    const gen = apiResult?.generationId ?? 'no-gen'
    return `${gen}:${(previewSrcDoc?.length ?? 0)}:${previewReloadCount}`
  }, [apiResult?.generationId, builtProjectUrl, previewSrcDoc, previewReloadCount])

  const logs = useMemo(() => {
    const r: any = (apiResult as any)?.aiReport
    if (!r) return [] as { type: string; msg: string; t: string }[]
    const durations = r.durations ?? {}
    const pipeline: string[] = Array.isArray(r.pipeline) ? r.pipeline : []
    const issues: any[] = Array.isArray(r.issues) ? r.issues : []
    const now = new Date()
    const fmt = (offset: number) => {
      const d = new Date(now.getTime() - offset)
      return d.toTimeString().slice(0, 8)
    }
    const entries: { type: string; msg: string; t: string }[] = []
    let offset = (durations.total_ms ?? 0)
    const push = (type: string, msg: string) => {
      entries.push({ type, msg, t: fmt(offset) })
      offset = Math.max(0, offset - 200)
    }
    push('info', `Generation started — id: ${apiResult?.generationId ?? '?'}`)
    if (durations.extract_ms != null) push('info', `Document extraction: ${durations.extract_ms}ms`)
    if (durations.prep_ms != null) push('info', `Text prep: ${durations.prep_ms}ms`)
    if (durations.plan_ms != null) {
      const planStep = pipeline.find(s => s.startsWith('plan:'))
      push(planStep?.includes('failed') ? 'warn' : 'info', `Planner: ${durations.plan_ms}ms${planStep ? ` (${planStep})` : ''}`)
    }
    if (durations.design_ms != null) {
      const designStep = pipeline.find(s => s.startsWith('design'))
      push(designStep?.includes('failed') ? 'warn' : 'info', `Design system: ${durations.design_ms}ms`)
    }
    if (durations.codegen_ms != null) {
      const codeStep = pipeline.find(s => s.startsWith('codegen:'))
      push(codeStep?.includes('failed') ? 'error' : 'info', `Code generation: ${durations.codegen_ms}ms${codeStep ? ` (${codeStep})` : ''}`)
    }
    if (durations.images_ms != null) push('info', `Image injection: ${durations.images_ms}ms`)
    for (const issue of issues) {
      push(issue.type === 'llm' ? 'error' : 'warn', `Issue [${issue.type}]: ${issue.message}`)
    }
    if (durations.total_ms != null) push('success', `✓ Generation complete in ${(durations.total_ms / 1000).toFixed(1)}s`)
    return entries
  }, [apiResult])

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])

  const fileCount = useMemo(() => countFiles(effectiveTree), [effectiveTree])
  const activeFileName = useMemo(() => {
    const node = findNode(effectiveTree, activeFileId)
    return node?.type === 'file' ? node.name : activeFileId
  }, [effectiveTree, activeFileId])

  const activeCode = useMemo(() => {
    return effectiveFileContents.get(activeFileId)?.content ?? '// Select a file from the explorer'
  }, [effectiveFileContents, activeFileId])

  const openFile = useCallback(
    (id: string) => {
      setActiveFileId(id)
      setCenterTab('code')
    },
    [setActiveFileId],
  )

  const toggleFolder = useCallback(
    (id: string) => {
      const clone = structuredClone(effectiveTree)
      const node = findNode(clone, id)
      if (node && node.type === 'folder') {
        node.open = !node.open
        setTree(clone)
      }
    },
    [effectiveTree],
  )

  const getFileIcon = (name: string): { symbol: string; color: string } => {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'html': return { symbol: 'H', color: '#f97316' }
      case 'css': return { symbol: 'C', color: '#38bdf8' }
      case 'js': return { symbol: 'J', color: '#facc15' }
      case 'ts': case 'tsx': return { symbol: 'T', color: '#60a5fa' }
      case 'jsx': return { symbol: 'R', color: '#5480ba' }
      case 'json': return { symbol: '{', color: '#a78bfa' }
      case 'svg': return { symbol: 'S', color: '#fb7185' }
      default: return { symbol: '·', color: 'rgba(0,0,0,.35)' }
    }
  }

  const renderTreeNodes = (nodes: FileNode[], depth: number) => {
    return nodes.map((node) => {
      const isActive = node.id === activeFileId
      const padLeft = 8 + depth * 14

      return (
        <React.Fragment key={node.id}>
          <div
            className="file-row flex items-center gap-1.5 cursor-pointer select-none"
            style={{
              padding: `4px 6px 4px ${padLeft}px`,
              color: isActive ? '#e2e8f0' : 'rgba(255,255,255,.5)',
              background: isActive ? 'rgba(0,0,0,.05)' : 'transparent',
              borderLeft: isActive ? '2px solid #a5b4fc' : '2px solid transparent',
              transition: 'background .1s',
              fontSize: 12,
              fontFamily: "'JetBrains Mono',monospace",
            }}
            onClick={() => {
              if (node.type === 'file') openFile(node.id)
              else toggleFolder(node.id)
            }}
          >
            {node.type === 'folder' ? (
              <>
                <span style={{ fontSize: 9, color: 'rgba(0,0,0,.2)', minWidth: 8 }}>{node.open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 10, color: node.open ? '#facc15' : 'rgba(0,0,0,.35)', minWidth: 14, opacity: 0.7 }}>
                  {node.open ? '▽' : '▷'}
                </span>
              </>
            ) : (
              <>
                <span style={{ minWidth: 8 }} />
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, fontFamily: 'monospace', minWidth: 14, textAlign: 'center',
                    color: getFileIcon(node.name).color, opacity: 0.85,
                  }}
                >
                  {getFileIcon(node.name).symbol}
                </span>
              </>
            )}
            <span className="flex-1 truncate">{node.name}</span>
            <button
              className="del-btn text-xs px-1 rounded cursor-pointer"
              style={{ opacity: 0, background: 'none', border: 'none', color: 'rgba(248,113,113,.7)', lineHeight: 1 }}
              onClick={(e) => { e.stopPropagation() }}
              aria-label="Delete"
            >
              ×
            </button>
          </div>
          {node.type === 'folder' && node.open ? renderTreeNodes(node.children, depth + 1) : null}
        </React.Fragment>
      )
    })
  }

  const startBuild = async () => {
    setIsBuilding(true)
    setBuildError(null)
    setBuildPct(0)
    setBuildMsg('Extracting documents…')

    // Time-based progress estimation.  Never reaches 100% until the API responds.
    // Tuned for Groq planner (~5s) + Gemini coder (~15s/file × 4-6 files = ~90s total).
    const startTime = Date.now()
    let stopped = false
    const tick = () => {
      if (stopped) return
      const elapsedS = (Date.now() - startTime) / 1000
      // Faster curve — typical generation is 60-120 seconds
      const pct = Math.min(95, 95 * (1 - Math.exp(-elapsedS / 90)))
      setBuildPct(pct)

      if (elapsedS < 10) setBuildMsg('Analyzing your requirements…')
      else if (elapsedS < 25) setBuildMsg('AI planner creating project structure…')
      else if (elapsedS < 45) setBuildMsg('AI generating HTML pages…')
      else if (elapsedS < 70) setBuildMsg('Generating stylesheets…')
      else if (elapsedS < 100) setBuildMsg('Generating JavaScript & final files…')
      else if (elapsedS < 150) setBuildMsg('Almost done — finalizing…')
      else setBuildMsg('Still working — large projects take a bit longer…')
    }

    const interval = window.setInterval(tick, 800)

    try {
      const prompt = customPrompt.trim() || `New project: ${projectName}`
      const result = (await createGeneration(prompt, attachedFiles, accessToken, activeDomain)) as GenerationApiResponse
      setAttachedFiles([])
      setApiResult(result)
      const r: any = (result as any)?.aiReport
      const fileCount = (result as any)?.codeBundle?.files?.length ?? 1
      const totalMs = r?.durations?.total_ms
      const summary = (result as any)?.uiSpec?.meta?.summary
      setChatMessages([{
        role: 'ai',
        text: `Project generated! Created ${fileCount} file${fileCount !== 1 ? 's' : ''}${summary ? ` — ${summary}` : ''}${totalMs ? ` in ${(totalMs / 1000).toFixed(1)}s` : ''}.`,
      }])
      void loadHistory().then(() => setHomeTab('projects'))

      stopped = true
      window.clearInterval(interval)
      setBuildPct(100)
      setBuildMsg('Build complete.')
      setTimeout(() => {
        setIsBuilding(false)
        setShowSuccessOverlay(true)
      }, 450)
    } catch (e: any) {
      stopped = true
      window.clearInterval(interval)
      setIsBuilding(false)
      setBuildError(e?.message ?? 'Build failed')
      // Refresh history — the server may have completed the generation even if the frontend timed out
      void loadHistory().then(() => setHomeTab('projects'))
    }
  }

  const [isChatLoading, setIsChatLoading] = useState(false)

  const sendChat = async () => {
    const val = chatInput.trim()
    if (!val || isChatLoading) return

    const generationId = apiResult?.generationId
    if (!generationId) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'No active project. Generate a UI first.' }])
      return
    }

    const userText = val + (selectedEl ? ` [element: ${selectedEl}]` : '')
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }])
    setChatInput('')
    setSelectedEl(null)
    setSelectMode(false)
    setIsChatLoading(true)

    try {
      // Pass empty filePath so the backend auto-detects which file to edit
      const resp = await editFile(generationId, '', val, accessToken)

      // Update the file content in apiResult so the editor reflects the change
      if (resp.content && apiResult?.codeBundle?.files) {
        const updatedFiles = apiResult.codeBundle.files.map((f) =>
          f.path === activeFileId || f.path.endsWith('/' + activeFileName) || f.path === activeFileName
            ? { ...f, content: resp.content! }
            : f,
        )
        setApiResult((prev) => prev ? { ...prev, codeBundle: { files: updatedFiles } } : prev)
      }

      // Reload preview if build succeeded
      if (resp.buildSuccess) {
        setPreviewReloadCount((c) => c + 1)
      }

      const edit = { file: activeFileName, added: 0, removed: 0 }
      const aiText = resp.buildSuccess
        ? `Done! Updated \`${activeFileName}\`. Build succeeded.`
        : `Updated \`${activeFileName}\` but build had issues:\n${resp.buildOutput?.slice(-400) ?? ''}`
      setChatMessages((prev) => [...prev, { role: 'ai', text: aiText, edits: [edit] }])
      setDiffEdits([edit])
      setDiffVisible(true)
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: `Error: ${err?.message ?? 'Unknown error'}` }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const logColor: Record<string, string> = {
    error: '#f87171',
    warn: '#fbbf24',
    success: '#818cf8',
    info: 'rgba(0,0,0,.45)',
  }

  if (!ideVisible) {
    const rawName = firstName || (username.includes('@') ? username.split('@')[0] : username)
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

    const timeAgo = (iso?: string) => {
      if (!iso) return ''
      const diff = Date.now() - new Date(iso).getTime()
      const m = Math.floor(diff / 60000)
      if (m < 1) return 'just now'
      if (m < 60) return `${m}m ago`
      const h = Math.floor(m / 60)
      if (h < 24) return `${h}h ago`
      return `${Math.floor(h / 24)}d ago`
    }

    const CardThumbnail = ({ prompt }: { prompt?: string }) => {
      const p = (prompt || '').toLowerCase()
      if (p.includes('dashboard') || p.includes('analytics') || p.includes('admin')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#0d1117"/>
          <rect x="0" y="0" width="56" height="180" fill="#161b22"/>
          <rect x="8" y="16" width="40" height="6" rx="3" fill="#30363d"/>
          <rect x="8" y="30" width="40" height="6" rx="3" fill="#6366f1" opacity="0.8"/>
          <rect x="8" y="44" width="40" height="6" rx="3" fill="#30363d"/>
          <rect x="8" y="58" width="40" height="6" rx="3" fill="#30363d"/>
          <rect x="8" y="72" width="40" height="6" rx="3" fill="#30363d"/>
          <rect x="64" y="10" width="60" height="32" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="70" y="16" width="24" height="4" rx="2" fill="#6366f1" opacity="0.7"/>
          <rect x="70" y="24" width="16" height="8" rx="2" fill="#e2e8f0" opacity="0.8"/>
          <rect x="132" y="10" width="60" height="32" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="138" y="16" width="24" height="4" rx="2" fill="#10b981" opacity="0.7"/>
          <rect x="138" y="24" width="16" height="8" rx="2" fill="#e2e8f0" opacity="0.8"/>
          <rect x="200" y="10" width="60" height="32" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="206" y="16" width="24" height="4" rx="2" fill="#f59e0b" opacity="0.7"/>
          <rect x="206" y="24" width="16" height="8" rx="2" fill="#e2e8f0" opacity="0.8"/>
          <rect x="268" y="10" width="44" height="32" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="274" y="16" width="20" height="4" rx="2" fill="#8b5cf6" opacity="0.7"/>
          <rect x="274" y="24" width="12" height="8" rx="2" fill="#e2e8f0" opacity="0.8"/>
          <rect x="64" y="52" width="168" height="80" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="72" y="60" width="50" height="4" rx="2" fill="#30363d"/>
          <rect x="72" y="115" width="10" height="14" rx="2" fill="#6366f1" opacity="0.5"/>
          <rect x="86" y="105" width="10" height="24" rx="2" fill="#6366f1" opacity="0.6"/>
          <rect x="100" y="95" width="10" height="34" rx="2" fill="#6366f1" opacity="0.7"/>
          <rect x="114" y="100" width="10" height="29" rx="2" fill="#6366f1" opacity="0.65"/>
          <rect x="128" y="85" width="10" height="44" rx="2" fill="#6366f1" opacity="0.9"/>
          <rect x="142" y="92" width="10" height="37" rx="2" fill="#6366f1" opacity="0.75"/>
          <rect x="156" y="78" width="10" height="51" rx="2" fill="#6366f1"/>
          <rect x="170" y="88" width="10" height="41" rx="2" fill="#6366f1" opacity="0.8"/>
          <rect x="184" y="97" width="10" height="32" rx="2" fill="#6366f1" opacity="0.7"/>
          <rect x="198" y="82" width="10" height="47" rx="2" fill="#6366f1" opacity="0.85"/>
          <rect x="240" y="52" width="72" height="80" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <circle cx="276" cy="90" r="22" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="69 30" opacity="0.7"/>
          <circle cx="276" cy="90" r="22" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="20 79" strokeDashoffset="-69" opacity="0.7"/>
          <rect x="64" y="142" width="248" height="30" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="72" y="149" width="40" height="4" rx="2" fill="#30363d"/>
          <rect x="72" y="158" width="30" height="4" rx="2" fill="#30363d"/>
          <rect x="140" y="149" width="30" height="4" rx="2" fill="#30363d"/>
          <rect x="140" y="158" width="24" height="4" rx="2" fill="#30363d"/>
          <rect x="220" y="149" width="20" height="4" rx="2" fill="#10b981" opacity="0.6"/>
        </svg>
      )
      if (p.includes('landing') || p.includes('saas') || p.includes('marketing')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#0d1117"/>
          <rect x="0" y="0" width="320" height="28" fill="#161b22"/>
          <rect x="16" y="10" width="40" height="8" rx="4" fill="#6366f1" opacity="0.8"/>
          <rect x="120" y="12" width="24" height="5" rx="2" fill="#30363d"/>
          <rect x="152" y="12" width="24" height="5" rx="2" fill="#30363d"/>
          <rect x="184" y="12" width="24" height="5" rx="2" fill="#30363d"/>
          <rect x="264" y="9" width="40" height="10" rx="5" fill="#6366f1" opacity="0.8"/>
          <rect x="80" y="42" width="160" height="10" rx="5" fill="#e2e8f0" opacity="0.9"/>
          <rect x="96" y="58" width="128" height="6" rx="3" fill="#e2e8f0" opacity="0.5"/>
          <rect x="108" y="68" width="104" height="5" rx="2" fill="#e2e8f0" opacity="0.3"/>
          <rect x="120" y="82" width="36" height="12" rx="6" fill="#6366f1" opacity="0.9"/>
          <rect x="164" y="82" width="36" height="12" rx="6" fill="#30363d"/>
          <rect x="32" y="108" width="72" height="52" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="40" y="116" width="24" height="4" rx="2" fill="#6366f1" opacity="0.6"/>
          <rect x="40" y="124" width="48" height="3" rx="1" fill="#30363d"/>
          <rect x="40" y="130" width="40" height="3" rx="1" fill="#30363d"/>
          <rect x="124" y="108" width="72" height="52" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="132" y="116" width="24" height="4" rx="2" fill="#10b981" opacity="0.6"/>
          <rect x="132" y="124" width="48" height="3" rx="1" fill="#30363d"/>
          <rect x="132" y="130" width="40" height="3" rx="1" fill="#30363d"/>
          <rect x="216" y="108" width="72" height="52" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="224" y="116" width="24" height="4" rx="2" fill="#f59e0b" opacity="0.6"/>
          <rect x="224" y="124" width="48" height="3" rx="1" fill="#30363d"/>
          <rect x="224" y="130" width="40" height="3" rx="1" fill="#30363d"/>
        </svg>
      )
      if (p.includes('ecommerce') || p.includes('shop') || p.includes('store') || p.includes('product')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#0d1117"/>
          <rect x="0" y="0" width="320" height="24" fill="#161b22"/>
          <rect x="12" y="8" width="32" height="8" rx="4" fill="#6366f1" opacity="0.8"/>
          <rect x="260" y="8" width="20" height="8" rx="4" fill="#30363d"/>
          <rect x="286" y="8" width="20" height="8" rx="4" fill="#30363d"/>
          <rect x="0" y="24" width="70" height="156" fill="#161b22"/>
          <rect x="8" y="32" width="54" height="5" rx="2" fill="#30363d"/>
          <rect x="8" y="44" width="40" height="4" rx="2" fill="#30363d"/>
          <rect x="8" y="52" width="44" height="4" rx="2" fill="#30363d"/>
          <rect x="8" y="60" width="36" height="4" rx="2" fill="#30363d"/>
          <rect x="8" y="76" width="54" height="5" rx="2" fill="#30363d"/>
          <rect x="8" y="88" width="40" height="4" rx="2" fill="#6366f1" opacity="0.6"/>
          <rect x="8" y="96" width="44" height="4" rx="2" fill="#30363d"/>
          {[0,1,2].map(col => [0,1].map(row => (
            <g key={`${col}-${row}`}>
              <rect x={78 + col * 84} y={30 + row * 74} width="76" height="64" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
              <rect x={82 + col * 84} y={34 + row * 74} width="68" height="38" rx="4" fill="#21262d"/>
              <rect x={86 + col * 84} y={76 + row * 74} width="40" height="4" rx="2" fill="#30363d"/>
              <rect x={86 + col * 84} y={83 + row * 74} width="28" height="4" rx="2" fill="#6366f1" opacity="0.7"/>
            </g>
          )))}
        </svg>
      )
      if (p.includes('portfolio') || p.includes('resume') || p.includes('personal')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#0d1117"/>
          <rect x="0" y="0" width="320" height="24" fill="#161b22"/>
          <rect x="16" y="8" width="40" height="8" rx="4" fill="#e2e8f0" opacity="0.8"/>
          <rect x="220" y="10" width="20" height="5" rx="2" fill="#30363d"/>
          <rect x="248" y="10" width="20" height="5" rx="2" fill="#30363d"/>
          <rect x="276" y="10" width="20" height="5" rx="2" fill="#30363d"/>
          <circle cx="160" cy="64" r="22" fill="#21262d" stroke="#6366f1" strokeWidth="2" opacity="0.8"/>
          <rect x="124" y="92" width="72" height="8" rx="4" fill="#e2e8f0" opacity="0.8"/>
          <rect x="136" y="105" width="48" height="5" rx="2" fill="#6366f1" opacity="0.6"/>
          <rect x="86" y="125" width="44" height="36" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="92" y="131" width="32" height="18" rx="4" fill="#21262d"/>
          <rect x="92" y="152" width="24" height="4" rx="2" fill="#30363d"/>
          <rect x="138" y="125" width="44" height="36" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="144" y="131" width="32" height="18" rx="4" fill="#21262d"/>
          <rect x="144" y="152" width="24" height="4" rx="2" fill="#30363d"/>
          <rect x="190" y="125" width="44" height="36" rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="196" y="131" width="32" height="18" rx="4" fill="#21262d"/>
          <rect x="196" y="152" width="24" height="4" rx="2" fill="#30363d"/>
        </svg>
      )
      return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#0d1117"/>
          <rect x="0" y="0" width="320" height="24" fill="#161b22"/>
          <rect x="16" y="8" width="48" height="8" rx="4" fill="#6366f1" opacity="0.8"/>
          <rect x="246" y="9" width="58" height="7" rx="3" fill="#6366f1" opacity="0.5"/>
          <rect x="20" y="36" width="130" height="60" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="30" y="46" width="60" height="6" rx="3" fill="#e2e8f0" opacity="0.8"/>
          <rect x="30" y="58" width="100" height="4" rx="2" fill="#30363d"/>
          <rect x="30" y="66" width="80" height="4" rx="2" fill="#30363d"/>
          <rect x="30" y="74" width="90" height="4" rx="2" fill="#30363d"/>
          <rect x="30" y="85" width="36" height="10" rx="5" fill="#6366f1" opacity="0.8"/>
          <rect x="164" y="36" width="136" height="60" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="174" y="52" width="10" height="28" rx="2" fill="#6366f1" opacity="0.5"/>
          <rect x="190" y="44" width="10" height="36" rx="2" fill="#6366f1" opacity="0.6"/>
          <rect x="206" y="50" width="10" height="30" rx="2" fill="#6366f1" opacity="0.7"/>
          <rect x="222" y="40" width="10" height="40" rx="2" fill="#6366f1" opacity="0.8"/>
          <rect x="238" y="46" width="10" height="34" rx="2" fill="#6366f1" opacity="0.65"/>
          <rect x="254" y="36" width="10" height="44" rx="2" fill="#6366f1"/>
          <rect x="20" y="108" width="280" height="52" rx="8" fill="#161b22" stroke="#30363d" strokeWidth="1"/>
          <rect x="30" y="118" width="50" height="4" rx="2" fill="#30363d"/>
          <rect x="30" y="127" width="60" height="4" rx="2" fill="#30363d"/>
          <rect x="30" y="136" width="40" height="4" rx="2" fill="#30363d"/>
          <rect x="120" y="118" width="50" height="4" rx="2" fill="#30363d"/>
          <rect x="120" y="127" width="40" height="4" rx="2" fill="#30363d"/>
          <rect x="120" y="136" width="55" height="4" rx="2" fill="#30363d"/>
          <rect x="260" y="122" width="28" height="10" rx="5" fill="#6366f1" opacity="0.6"/>
        </svg>
      )
    }

    const projectName2 = (prompt?: string) => {
      if (!prompt) return 'Untitled Project'
      const p = prompt.toLowerCase()
      if (p.includes('dashboard')) return 'Analytics Dashboard'
      if (p.includes('landing')) return 'Landing Page'
      if (p.includes('ecommerce') || p.includes('shop')) return 'E-Commerce Store'
      if (p.includes('portfolio')) return 'Portfolio'
      if (p.includes('blog')) return 'Blog'
      // Take first 5 words
      return prompt.split(' ').slice(0, 5).join(' ') + (prompt.split(' ').length > 5 ? '…' : '')
    }

    const validProjects = history.filter(g => g.generationId)

    return (
      <div id="onboarding" style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Talan color bar */}
        <div className="talan-color-bar">
          <span style={{ background: '#5480ba' }} />
          <span style={{ background: '#8f9424' }} />
          <span style={{ background: '#e04580' }} />
          <span style={{ background: '#6b367d' }} />
          <span style={{ background: '#1d662e' }} />
        </div>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 260, background: '#ffffff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', position: 'fixed', top: 4, left: 0, height: 'calc(100vh - 4px)', zIndex: 40, overflowY: 'auto' }}>

          {/* Logo */}
          <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/talan-logo.svg" alt="Talan" style={{ height: 28, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: "'Inter',sans-serif", letterSpacing: '0.3px' }}>UI Generator</span>
            </div>
          </div>

          {/* Workspace */}
          <div style={{ padding: '12px 12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(0,0,0,.03)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {displayName.charAt(0)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}'s Space</p>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,.35)', margin: 0 }}>Personal workspace</p>
              </div>
            </div>
          </div>

          {/* Main nav */}
          <nav style={{ padding: '10px 10px 0' }}>
            {([
              ...(!isAdmin ? [{ icon: '⌂', label: 'Home', action: () => setHomeTab('create'), active: homeTab === 'create' }] : []),
              { icon: '⊞', label: `All projects${validProjects.length > 0 ? ` (${validProjects.length})` : ''}`, action: () => setHomeTab('projects'), active: homeTab === 'projects' },
              { icon: '◉', label: 'Profile', action: () => setHomeTab('profile'), active: homeTab === 'profile' },
              ...(isAdmin ? [{ icon: '⚙', label: 'Admin Dashboard', action: () => setHomeTab('admin'), active: homeTab === 'admin' }] : []),
            ] as { icon: string; label: string; action: () => void; active: boolean }[]).map(item => (
              <button key={item.label} onClick={item.action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 9, marginBottom: 2, background: item.active ? 'rgba(84,128,186,.1)' : 'transparent', color: item.active ? '#5480ba' : 'rgba(0,0,0,.55)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,.04)' }}
                onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {apiResult && (
              <button onClick={() => { setShowSuccessOverlay(false); setIdeVisible(true) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 9, marginBottom: 2, background: 'transparent', color: '#5480ba', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(84,128,186,.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>✦</span>
                Open Editor
              </button>
            )}
          </nav>

          {/* Recents */}
          {validProjects.length > 0 && (
            <div style={{ padding: '16px 10px 8px', flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.35)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 13px', marginBottom: 6 }}>Recents</p>
              {validProjects.slice(0, 8).map(g => (
                <button key={g.generationId}
                  onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 13px', borderRadius: 9, marginBottom: 1, background: 'transparent', color: 'rgba(0,0,0,.45)', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'all .15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(84,128,186,.07)'; el.style.color = '#1f2937' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'rgba(0,0,0,.45)' }}>
                  <span style={{ fontSize: 13, opacity: 0.4, flexShrink: 0 }}>□</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{projectName2(g.prompt)}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Bottom: user + sign out */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => setHomeTab('profile')} style={{ width: 32, height: 32, borderRadius: '50%', background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
              {displayName.charAt(0)}
            </div>
            <div onClick={() => setHomeTab('profile')} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
              {email && <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>}
            </div>
            {onLogout && (
              <button onClick={onLogout}
                style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.35)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '5px 9px', borderRadius: 7, transition: 'all .15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.background = 'rgba(248,113,113,.08)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'rgba(0,0,0,.35)'; el.style.background = 'none' }}>
                Sign out
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ marginLeft: 260, flex: 1, minHeight: '100vh', overflowY: 'auto', paddingTop: 4 }}>

          {/* ── NEW PROJECT ── */}
          {homeTab === 'create' && (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f5f7ff 0%, #ffffff 50%)', position: 'relative', overflow: 'hidden' }}>

              {/* Animated background with grid */}
              <div className="home-bg">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <div className="bg-orb bg-orb-3" />
              </div>

              <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 32px 60px', position: 'relative', zIndex: 1 }}>

              {/* Hero heading */}
              <div className="home-hero">
                <div className="home-badge">
                  <span style={{ fontSize: 16 }}>✦</span>
                  Powered by AI Agents
                </div>
                <h1 className="home-title">
                  What do you want to<br />
                  <span className="gradient-text">build today?</span>
                </h1>
                <p className="home-subtitle">
                  Describe your vision and our AI agents will architect, design, and build your application — in seconds.
                </p>
              </div>

              {/* Form */}
              <div className="home-form-card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>Project Name</label>
                    <input
                      className="home-input"
                      placeholder="my-awesome-app"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>Stack</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ id: 'HTML/CSS', icon: '🎨', label: 'Vanilla' }, { id: 'React', icon: '⚛️', label: 'React' }].map(fw => (
                        <button key={fw.id} onClick={() => setSelectedFw(fw.id as any)}
                          style={{ flex: 1, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', background: selectedFw === fw.id ? 'rgba(84,128,186,.12)' : 'rgba(0,0,0,.03)', border: `1px solid ${selectedFw === fw.id ? '#5480ba' : 'rgba(0,0,0,.08)'}`, color: selectedFw === fw.id ? '#5480ba' : 'rgba(0,0,0,.5)' }}>
                          {fw.icon} {fw.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,.6)' }}>What do you want to build?</label>
                    <button style={{ fontSize: 13, fontWeight: 600, color: '#5480ba', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setCustomPrompt('Build a SaaS analytics dashboard with a fixed left sidebar, 4-column KPI card grid, revenue line chart, plan distribution donut chart, and a user data table with status badges.')}>
                      Try example →
                    </button>
                  </div>
                  <textarea
                    className="home-textarea"
                    placeholder="E.g. Build a SaaS analytics dashboard with sidebar navigation, KPI metric cards, revenue charts, and a data table…"
                    value={customPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && customPrompt.trim() && projectName) startBuild() }}
                  />
                </div>

                {/* Document upload */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.5)', display: 'block', marginBottom: 8 }}>
                    Attach documents <span style={{ fontWeight: 400, color: 'rgba(0,0,0,.35)' }}>(PDF, DOCX, TXT, PNG, JPG — optional)</span>
                  </label>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false)
                      const dropped = Array.from(e.dataTransfer.files)
                      setAttachedFiles(prev => [...prev, ...dropped])
                    }}
                    onClick={() => { const el = document.getElementById('doc-file-input'); el && el.click() }}
                    style={{ border: `2px dashed ${dragOver ? '#5480ba' : 'rgba(0,0,0,.1)'}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', background: dragOver ? 'rgba(84,128,186,.08)' : 'rgba(0,0,0,.02)', transition: 'all .2s', textAlign: 'center' }}>
                    <input id="doc-file-input" type="file" multiple accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                    {attachedFiles.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(0,0,0,.35)' }}>
                        📎 &nbsp;Drag & drop or <span style={{ color: '#5480ba', fontWeight: 600 }}>browse</span> — specification, wireframes, design docs…
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {attachedFiles.map((f, i) => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(84,128,186,.12)', border: '1px solid rgba(84,128,186,.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#5480ba' }}>
                            📄 {f.name}
                            <button onClick={e => { e.stopPropagation(); setAttachedFiles(prev => prev.filter((_, j) => j !== i)) }}
                              style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                          </span>
                        ))}
                        <span style={{ fontSize: 12, color: 'rgba(0,0,0,.35)', alignSelf: 'center' }}>+ click to add more</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Template chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {[
                    { label: '📊 Dashboard', color: '#5480ba', bg: 'rgba(84,128,186,.1)', border: 'rgba(84,128,186,.3)', prompt: 'Build a SaaS analytics dashboard with sidebar, KPI cards, Chart.js revenue charts, and user data table' },
                    { label: '🚀 Landing Page', color: '#8f9424', bg: 'rgba(143,148,36,.1)', border: 'rgba(143,148,36,.3)', prompt: 'Build a modern SaaS landing page with hero section, features grid, pricing table, and CTA' },
                    { label: '🛒 E-commerce', color: '#e04580', bg: 'rgba(224,69,128,.08)', border: 'rgba(224,69,128,.3)', prompt: 'Build an e-commerce store with product grid, filters sidebar, product detail modal, and cart' },
                    { label: '🎨 Portfolio', color: '#6b367d', bg: 'rgba(107,54,125,.08)', border: 'rgba(107,54,125,.3)', prompt: 'Build a minimal dark portfolio with hero, skills section, projects showcase, and contact form' },
                  ].map(t => (
                    <button key={t.label} onClick={() => setCustomPrompt(t.prompt)}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 4px 16px ${t.border}` }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '' }}
                      style={{ padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700, background: t.bg, border: `1.5px solid ${t.border}`, color: t.color, cursor: 'pointer', transition: 'all .2s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Domain selector */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Domain context</label>
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,.35)' }}>
                      — {selectedDomain ? 'manually selected' : autoDetectedDomain ? `auto-detected: ${autoDetectedDomain}` : 'auto'}
                    </span>
                    {selectedDomain && (
                      <button onClick={() => setSelectedDomain(null)}
                        style={{ fontSize: 11, color: '#5480ba', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
                        ↺ reset
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DOMAINS.map(d => {
                      const isActive = activeDomain === d.value
                      const isManual = selectedDomain === d.value
                      return (
                        <button
                          key={d.value}
                          onClick={() => setSelectedDomain(prev => prev === d.value ? null : d.value)}
                          style={{
                            padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                            background: isActive ? (isManual ? 'rgba(84,128,186,.18)' : 'rgba(84,128,186,.1)') : '#ffffff',
                            border: `1.5px solid ${isActive ? '#5480ba' : '#e5e7eb'}`,
                            color: isActive ? '#5480ba' : '#4b5563',
                            boxShadow: isActive ? '0 2px 8px rgba(84,128,186,.2)' : '0 1px 3px rgba(0,0,0,.06)',
                          }}>
                          {d.emoji} {d.label}
                          {!selectedDomain && autoDetectedDomain === d.value && (
                            <span style={{ marginLeft: 4, fontSize: 9, color: '#22c55e' }}>●</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button onClick={startBuild} disabled={isBuilding || !projectName || !customPrompt}
                  className={`btn-generate ${isBuilding || !projectName || !customPrompt ? 'disabled' : 'enabled'}`}>
                  {isBuilding ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      {buildMsg}
                    </div>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      Generate App
                      <span style={{ fontSize: 18, transition: 'transform .3s' }}>→</span>
                    </span>
                  )}
                </button>

                {isBuilding && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ height: 6, borderRadius: 6, background: 'rgba(0,0,0,.04)', overflow: 'hidden', marginBottom: 10, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.06)' }}>
                      <div className="progress-bar" style={{ height: '100%', borderRadius: 6, width: `${buildPct}%`, background: 'linear-gradient(90deg,#5480ba,#6366f1,#a855f7,#e04580)', backgroundSize: '300% 100%', animation: 'gradientMove 2s ease infinite', boxShadow: '0 0 12px rgba(99,102,241,.4)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(0,0,0,.45)', fontWeight: 500 }}>
                      <span>{buildMsg}</span><span style={{ fontWeight: 700, color: '#5480ba' }}>{Math.floor(buildPct)}%</span>
                    </div>
                  </div>
                )}

                {buildError && !isBuilding && (
                  <div style={{ marginTop: 14, padding: '13px 16px', borderRadius: 10, background: 'rgba(224,69,128,.07)', border: '1px solid rgba(224,69,128,.2)', color: '#c03060', fontSize: 14 }}>
                    ⚠ {buildError} — check My Projects, your result may still be saved.
                  </div>
                )}
              </div>

              {/* Agent Pipeline */}
              <div className="home-agent-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#5480ba', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>Agent Pipeline</p>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,.35)', fontWeight: 500 }}>4 AI agents working in sequence</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { icon: '◎', agent: 'Planner', desc: 'Architecture & file plan', pct: 10, color: '#5480ba', bg: 'rgba(84,128,186,.12)' },
                    { icon: '◈', agent: 'Designer', desc: 'Design system & tokens', pct: 25, color: '#8f9424', bg: 'rgba(143,148,36,.12)' },
                    { icon: '</>', agent: 'Coder', desc: 'Full code generation', pct: 50, color: '#e04580', bg: 'rgba(224,69,128,.1)' },
                    { icon: '✓', agent: 'Validator', desc: 'Quality & consistency', pct: 90, color: '#1d662e', bg: 'rgba(29,102,46,.1)' },
                  ].map(a => {
                    const active = buildPct >= a.pct
                    const running = active && buildPct < (a.pct + 25) && isBuilding
                    return (
                      <div key={a.agent} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 14, background: active ? a.bg : 'rgba(0,0,0,.02)', border: `1.5px solid ${active ? a.color + '40' : 'rgba(0,0,0,.06)'}`, transition: 'all .4s' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, background: active ? a.color : 'rgba(0,0,0,.05)', color: active ? '#fff' : 'rgba(0,0,0,.25)', transition: 'all .4s', animation: running ? 'pulseBlue 1s ease-in-out infinite' : 'none' }}>
                          {a.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#111827' : '#9ca3af' }}>{a.agent}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: running ? a.color : active ? a.bg : 'rgba(0,0,0,.04)', color: running ? '#fff' : active ? a.color : '#9ca3af' }}>
                              {running ? '⚡ Running' : active ? '✓ Done' : 'Idle'}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: active ? '#4b5563' : '#9ca3af', margin: 0 }}>{a.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Recent Projects (shown on home page too, like Lovable) ── */}
              {validProjects.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {(['My projects'] as const).map(label => (
                        <span key={label} style={{ fontSize: 14, fontWeight: 700, color: '#111827', padding: '5px 14px', borderRadius: 20, background: 'rgba(0,0,0,.05)', border: '1px solid rgba(0,0,0,.1)' }}>{label}</span>
                      ))}
                    </div>
                    <button onClick={() => setHomeTab('projects')}
                      style={{ background: 'none', border: 'none', color: '#5480ba', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      Browse all →
                    </button>
                  </div>

                  {/* Cards row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
                    {validProjects.slice(0, 3).map(g => (
                      <div key={g.generationId}
                        className="group project-card"
                        onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}>
                        <div className="project-card-thumb" style={{ position: 'relative', height: 140 }}>
                          <CardThumbnail prompt={g.prompt} />
                          {loadingProjectId === g.generationId && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 24, height: 24, border: '3px solid rgba(84,128,186,.2)', borderTopColor: '#5480ba', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                          )}
                          <div className="opacity-0 group-hover:opacity-100" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(84,128,186,.9),rgba(99,102,241,.9))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .25s' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 10, background: '#fff', color: '#5480ba' }}>Open →</span>
                            <span style={{ fontSize: 13, fontWeight: 700, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                              onClick={e => { e.stopPropagation(); downloadGenerationZip(g.generationId!, accessToken) }}>⬇</span>
                          </div>
                        </div>
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#5480ba,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName2(g.prompt)}</p>
                            <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>Edited {timeAgo(g.updatedAt || g.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* ── MY PROJECTS ── */}
          {homeTab === 'projects' && (
            <div style={{ padding: '48px 40px 80px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 4px', fontFamily: "'Syne',sans-serif" }}>{isAdmin ? 'All Projects' : 'My Projects'}</h1>
                  <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', margin: 0 }}>{isAdmin ? adminActivity.length : validProjects.length} project{(isAdmin ? adminActivity.length : validProjects.length) !== 1 ? 's' : ''} generated</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => void loadHistory()} style={{ background: 'none', border: '1px solid rgba(0,0,0,.1)', color: 'rgba(0,0,0,.45)', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
                  {!showAllProjects && validProjects.length > 6 && (
                    <button onClick={() => setShowAllProjects(true)} style={{ background: 'none', border: 'none', color: '#5480ba', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      Browse all ({validProjects.length}) →
                    </button>
                  )}
                  {showAllProjects && (
                    <button onClick={() => setShowAllProjects(false)} style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Show less</button>
                  )}
                </div>
              </div>

              {isAdmin ? (
                /* Admin: show all projects as a list */
                adminActivity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(0,0,0,.08)', borderRadius: 20 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No projects yet</p>
                    <p style={{ fontSize: 15, color: 'rgba(0,0,0,.4)' }}>No generations have been created on this platform.</p>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, overflow: 'hidden' }}>
                    {adminActivity.map((g, i) => (
                      <div key={g.generationId || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: i < adminActivity.length - 1 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                          background: g.status === 'COMPLETED' ? 'rgba(52,211,153,.12)' : g.status === 'FAILED' ? 'rgba(248,113,113,.1)' : 'rgba(251,191,36,.1)',
                          color: g.status === 'COMPLETED' ? '#34d399' : g.status === 'FAILED' ? '#f87171' : '#fbbf24' }}>
                          {g.status}
                        </span>
                        <p style={{ flex: 1, fontSize: 13, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.prompt || 'No prompt'}</p>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', flexShrink: 0 }}>
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : historyLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(0,0,0,.05)' }}>
                      <div style={{ height: 180, background: 'rgba(0,0,0,.03)' }} />
                      <div style={{ padding: 16 }}>
                        <div style={{ height: 16, borderRadius: 8, background: 'rgba(0,0,0,.04)', marginBottom: 8, width: '70%' }} />
                        <div style={{ height: 12, borderRadius: 8, background: '#ffffff', width: '45%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : validProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(0,0,0,.08)', borderRadius: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>No projects yet</p>
                  <p style={{ fontSize: 15, color: 'rgba(0,0,0,.4)', marginBottom: 28 }}>Generate your first app to get started</p>
                  <button onClick={() => setHomeTab('create')} style={{ background: '#5480ba', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    + New Project
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {validProjects.slice(0, showAllProjects ? undefined : 6).map(g => (
                    <div key={g.generationId}
                      className="group"
                      style={{ borderRadius: 16, overflow: 'hidden', background: '#111827', border: '1px solid #1f2937', cursor: 'pointer', transition: 'all .2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(99,102,241,.5)'; el.style.boxShadow = '0 8px 40px rgba(84,128,186,.12)'; el.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1f2937'; el.style.boxShadow = 'none'; el.style.transform = 'none' }}
                      onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}>
                      {/* Thumbnail */}
                      <div style={{ position: 'relative', height: 180, background: '#0d1117', overflow: 'hidden' }}>
                        <CardThumbnail prompt={g.prompt} />
                        {loadingProjectId === g.generationId && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 26, height: 26, border: '2px solid rgba(0,0,0,.15)', borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          </div>
                        )}
                        <div className="opacity-0 group-hover:opacity-100" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'opacity .2s' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, padding: '10px 22px', borderRadius: 10, background: '#5480ba', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,.4)' }}>Open →</span>
                          <span style={{ fontSize: 14, fontWeight: 700, padding: '10px 22px', borderRadius: 10, background: 'rgba(0,0,0,.1)', color: '#1f2937', border: '1px solid rgba(0,0,0,.12)', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); downloadGenerationZip(g.generationId!, accessToken) }}>⬇ ZIP</span>
                        </div>
                      </div>
                      {/* Card footer */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName2(g.prompt)}</p>
                          <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', margin: 0 }}>Edited {timeAgo(g.updatedAt || g.createdAt)}</p>
                        </div>
                        {g.status !== 'COMPLETED' && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(251,191,36,.1)', color: '#fbbf24', flexShrink: 0 }}>⟳</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isAdmin && !showAllProjects && validProjects.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: 36 }}>
                  <button onClick={() => setShowAllProjects(true)}
                    style={{ background: 'rgba(99,102,241,.1)', color: '#5480ba', border: '1px solid rgba(99,102,241,.2)', borderRadius: 12, padding: '13px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    Browse all {validProjects.length} projects →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ADMIN DASHBOARD ── */}
          {homeTab === 'admin' && isAdmin && (
            <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 40px 80px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 6px', fontFamily: "'Syne',sans-serif" }}>Admin Dashboard</h1>
                  <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', margin: 0 }}>Platform overview and user management</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => {
                    const rows = [['Name', 'Username', 'Email', 'Joined', 'Projects', 'Verified', 'Status']]
                    adminUsers.forEach(u => rows.push([
                      [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '',
                      u.username || '',
                      u.email || '',
                      u.createdTimestamp ? new Date(u.createdTimestamp).toLocaleDateString() : '',
                      String(u.projectCount ?? 0),
                      u.emailVerified ? 'Yes' : 'No',
                      u.enabled === false ? 'Disabled' : 'Active',
                    ]))
                    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                    const a = document.createElement('a')
                    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
                    a.download = 'users.csv'
                    a.click()
                  }} style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', color: '#5480ba', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ↓ Export CSV
                  </button>
                  <button onClick={() => void loadAdminDashboard()}
                    style={{ background: 'none', border: '1px solid rgba(0,0,0,.1)', color: 'rgba(0,0,0,.4)', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {adminLoading ? '…' : '↻ Refresh'}
                  </button>
                </div>
              </div>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total Users', value: adminStats?.totalUsers ?? '—', icon: '👥', color: '#5480ba' },
                  { label: 'Total Projects', value: adminStats?.totalProjects ?? '—', icon: '⊞', color: '#8b5cf6' },
                  { label: 'Completed', value: adminStats?.completedProjects ?? '—', icon: '✓', color: '#34d399' },
                  { label: 'Success Rate', value: adminStats?.successRate != null ? `${adminStats.successRate}%` : '—', icon: '◎', color: '#a78bfa' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.05)', borderRadius: 16, padding: '22px 20px' }}>
                    <div style={{ fontSize: 20, marginBottom: 10 }}>{stat.icon}</div>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: '0 0 4px', fontFamily: "'Syne',sans-serif" }}>{String(stat.value)}</p>
                    <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Inner tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#ffffff', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {([
                  { key: 'overview', label: '⊞ Overview' },
                  { key: 'users', label: '👥 Users' },
                  { key: 'activity', label: '⚡ Activity' },
                  { key: 'failed', label: '✕ Failed' },
                  { key: 'health', label: '◉ Health' },
                ] as { key: typeof adminActiveTab; label: string }[]).map(t => (
                  <button key={t.key} onClick={() => setAdminActiveTab(t.key)}
                    style={{ background: adminActiveTab === t.key ? 'rgba(99,102,241,.2)' : 'none', border: 'none', color: adminActiveTab === t.key ? '#a5b4fc' : 'rgba(255,255,255,.4)', borderRadius: 9, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {adminError && <div style={{ padding: '16px 20px', color: '#e04580', fontSize: 14, background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.15)', borderRadius: 12, marginBottom: 20 }}>⚠ {adminError}</div>}

              {/* ── OVERVIEW TAB: chart ── */}
              {adminActiveTab === 'overview' && (
                <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, padding: '28px 28px 20px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 24px' }}>Generations — last 7 days</h3>
                  {adminDailyChart.length === 0
                    ? <p style={{ color: 'rgba(0,0,0,.35)', fontSize: 14 }}>No data yet</p>
                    : (() => {
                        const max = Math.max(...adminDailyChart.map(d => d.count), 1)
                        return (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
                            {adminDailyChart.map(d => (
                              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#5480ba' }}>{d.count || ''}</span>
                                <div style={{ width: '100%', background: 'linear-gradient(to top,#6366f1,#a78bfa)', borderRadius: '6px 6px 0 0', height: `${Math.max((d.count / max) * 100, d.count ? 4 : 0)}px`, minHeight: d.count ? 4 : 0, transition: 'height .3s' }} />
                                <span style={{ fontSize: 10, color: 'rgba(0,0,0,.35)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                  }
                </div>
              )}

              {/* ── USERS TAB ── */}
              {adminActiveTab === 'users' && (
                <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Registered Developers</h3>
                    <span style={{ fontSize: 13, color: 'rgba(0,0,0,.35)', background: 'rgba(0,0,0,.04)', padding: '4px 10px', borderRadius: 20 }}>{adminUsers.length} users</span>
                  </div>
                  {adminLoading && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>Loading…</div>}
                  {!adminLoading && adminUsers.length === 0 && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>No users found</div>}
                  {!adminLoading && adminUsers.map((u, i) => {
                    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Unknown'
                    const initials = name.charAt(0).toUpperCase()
                    const joinedDate = u.createdTimestamp ? new Date(u.createdTimestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
                    return (
                      <div key={u.userId || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: i < adminUsers.length - 1 ? '1px solid rgba(0,0,0,.03)' : 'none', transition: 'background .15s', cursor: 'pointer' }}
                        onClick={() => void openUserProjects(u)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                          <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                          <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', margin: '0 0 1px' }}>Joined</p>
                          <p style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', margin: 0 }}>{joinedDate}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                          <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', margin: '0 0 1px' }}>Projects</p>
                          <p style={{ fontSize: 17, fontWeight: 800, color: '#5480ba', margin: 0 }}>{u.projectCount ?? 0}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          {u.emailVerified
                            ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(52,211,153,.12)', color: '#34d399' }}>✓ Verified</span>
                            : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(251,191,36,.1)', color: '#fbbf24' }}>⏳ Pending</span>
                          }
                        </div>
                        {/* Enable/disable toggle */}
                        <button onClick={e => {
                          e.stopPropagation()
                          if (!u.userId) return
                          const next = u.enabled !== false
                          void setAdminUserEnabled(u.userId, !next, accessToken).then(() => {
                            setAdminUsers(prev => prev.map(x => x.userId === u.userId ? { ...x, enabled: !next } : x))
                          })
                        }} style={{ background: u.enabled === false ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.08)', border: u.enabled === false ? '1px solid rgba(52,211,153,.2)' : '1px solid rgba(248,113,113,.15)', color: u.enabled === false ? '#34d399' : '#f87171', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {u.enabled === false ? 'Enable' : 'Disable'}
                        </button>
                        {/* Delete button */}
                        <button onClick={e => {
                          e.stopPropagation()
                          if (!u.userId) return
                          if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return
                          void deleteAdminUser(u.userId, accessToken).then(() => {
                            setAdminUsers(prev => prev.filter(x => x.userId !== u.userId))
                          })
                        }} style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.12)', color: '#e04580', borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                          title="Delete user">
                          🗑
                        </button>
                        <div style={{ color: 'rgba(0,0,0,.15)', fontSize: 16, flexShrink: 0 }}>›</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── ACTIVITY TAB ── */}
              {adminActiveTab === 'activity' && (
                <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Recent Activity</h3>
                  </div>
                  {adminLoading && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>Loading…</div>}
                  {!adminLoading && adminActivity.length === 0 && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>No activity yet</div>}
                  {!adminLoading && adminActivity.map((g, i) => (
                    <div key={g.generationId || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: i < adminActivity.length - 1 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                        background: g.status === 'COMPLETED' ? 'rgba(52,211,153,.12)' : g.status === 'FAILED' ? 'rgba(248,113,113,.1)' : 'rgba(251,191,36,.1)',
                        color: g.status === 'COMPLETED' ? '#34d399' : g.status === 'FAILED' ? '#f87171' : '#fbbf24' }}>
                        {g.status}
                      </span>
                      <p style={{ flex: 1, fontSize: 13, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.prompt || 'No prompt'}</p>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', flexShrink: 0 }}>
                        {g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── FAILED TAB ── */}
              {adminActiveTab === 'failed' && (
                <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Failed Generations</h3>
                    <span style={{ fontSize: 13, background: 'rgba(248,113,113,.1)', color: '#e04580', padding: '4px 10px', borderRadius: 20 }}>{adminFailed.length} failed</span>
                  </div>
                  {adminLoading && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>Loading…</div>}
                  {!adminLoading && adminFailed.length === 0 && <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>No failed generations</div>}
                  {!adminLoading && adminFailed.map((g, i) => (
                    <div key={g.generationId || i} style={{ padding: '16px 24px', borderBottom: i < adminFailed.length - 1 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'rgba(0,0,0,.35)', fontFamily: 'monospace' }}>{g.generationId?.slice(0, 16)}…</span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.prompt || 'No prompt'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── HEALTH TAB ── */}
              {adminActiveTab === 'health' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {adminHealth
                    ? Object.entries(adminHealth).map(([svc, status]) => (
                        <div key={svc} style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 16, padding: '24px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: status === 'UP' ? '#34d399' : '#f87171', boxShadow: status === 'UP' ? '0 0 8px #34d399' : '0 0 8px #f87171', flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 3px', textTransform: 'capitalize' }}>{svc}</p>
                            <p style={{ fontSize: 13, color: status === 'UP' ? '#34d399' : '#f87171', margin: 0, fontWeight: 600 }}>{status}</p>
                          </div>
                        </div>
                      ))
                    : <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14 }}>Loading health status…</div>
                  }
                </div>
              )}
            </div>
          )}

          {/* ── USER PROJECTS SIDE PANEL ── */}
          {selectedAdminUser && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={() => setSelectedAdminUser(null)}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,.5)' }} />
              <div style={{ width: 480, height: '100%', background: '#0f1117', borderLeft: '1px solid rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {([selectedAdminUser.firstName, selectedAdminUser.lastName].filter(Boolean).join(' ') || selectedAdminUser.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                      {[selectedAdminUser.firstName, selectedAdminUser.lastName].filter(Boolean).join(' ') || selectedAdminUser.username}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>{selectedAdminUser.email}</p>
                  </div>
                  <button onClick={() => setSelectedAdminUser(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.35)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                {/* Projects list */}
                <div style={{ padding: '20px 28px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.4)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Projects ({selectedUserProjects.length})
                  </p>

                  {userProjectsLoading && (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14, padding: '40px 0' }}>Loading…</div>
                  )}

                  {!userProjectsLoading && selectedUserProjects.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,.35)', fontSize: 14, padding: '40px 0' }}>No projects yet</div>
                  )}

                  {!userProjectsLoading && selectedUserProjects.map((p, i) => (
                    <div key={p.generationId || i} style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.05)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: p.status === 'COMPLETED' ? 'rgba(52,211,153,.12)' : p.status === 'FAILED' ? 'rgba(248,113,113,.1)' : 'rgba(251,191,36,.1)',
                          color: p.status === 'COMPLETED' ? '#34d399' : p.status === 'FAILED' ? '#f87171' : '#fbbf24' }}>
                          {p.status}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.prompt || 'No prompt'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {homeTab === 'profile' && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 40px 80px' }}>

              {/* Header */}
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 32px', fontFamily: "'Syne',sans-serif" }}>My Profile</h1>

              {/* Identity card */}
              <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 20, padding: '32px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#5480ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 0 40px rgba(99,102,241,.35)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
                      {(firstName && lastName) ? `${firstName} ${lastName}` : displayName}
                    </h2>
                    {userProfile?.roles?.includes('admin') && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,.2)', color: '#5480ba', border: '1px solid rgba(84,128,186,.3)' }}>Admin</span>
                    )}
                  </div>
                  {(userProfile?.email || email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', margin: 0 }}>{userProfile?.email || email}</p>
                      {(userProfile?.emailVerified) && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,211,153,.12)', color: '#34d399' }}>✓ Verified</span>
                      )}
                    </div>
                  )}
                  {userSub && <p style={{ fontSize: 12, color: 'rgba(0,0,0,.15)', margin: '6px 0 0', fontFamily: 'monospace' }}>ID: {userSub}</p>}
                </div>
                <button onClick={() => void loadProfile()}
                  style={{ background: 'none', border: '1px solid rgba(0,0,0,.1)', color: 'rgba(0,0,0,.4)', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  {profileLoading ? '…' : '↻ Refresh'}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Total Projects', value: userStats?.totalGenerations ?? validProjects.length, icon: '⊞', color: '#5480ba' },
                  { label: 'Completed', value: userStats?.completedGenerations ?? validProjects.filter(g => g.status === 'COMPLETED').length, icon: '✓', color: '#34d399' },
                  { label: 'Success Rate', value: `${userStats?.successRate ?? (validProjects.length > 0 ? Math.round(validProjects.filter(g => g.status === 'COMPLETED').length * 100 / validProjects.length) : 0)}%`, icon: '◎', color: '#a78bfa' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.05)', borderRadius: 16, padding: '24px 20px' }}>
                    <div style={{ fontSize: 22, marginBottom: 10, color: stat.color }}>{stat.icon}</div>
                    <p style={{ fontSize: 30, fontWeight: 900, color: '#111827', margin: '0 0 4px', fontFamily: "'Syne',sans-serif" }}>{stat.value}</p>
                    <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              {validProjects.length > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 18px' }}>Recent Activity</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {validProjects.slice(0, 5).map(g => (
                      <div key={g.generationId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: '#ffffff', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(84,128,186,.08)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'}
                        onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: g.status === 'COMPLETED' ? 'rgba(52,211,153,.12)' : 'rgba(251,191,36,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {g.status === 'COMPLETED' ? '✓' : '⟳'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName2(g.prompt)}</p>
                          <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>Edited {timeAgo(g.updatedAt || g.createdAt)}</p>
                        </div>
                        <span style={{ fontSize: 13, color: 'rgba(0,0,0,.35)', flexShrink: 0 }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Actions */}
              <div style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.05)', borderRadius: 20, padding: '24px 28px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' }}>Account</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', margin: '0 0 2px' }}>Authentication</p>
                      <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>Managed by Keycloak SSO</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(52,211,153,.12)', color: '#34d399' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e04580', margin: '0 0 2px' }}>Sign out</p>
                      <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>End your current session</p>
                    </div>
                    {onLogout && (
                      <button onClick={onLogout}
                        style={{ fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 10, background: 'rgba(248,113,113,.1)', color: '#e04580', border: '1px solid rgba(248,113,113,.2)', cursor: 'pointer' }}>
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>

        {/* Build Success Overlay — only shown right after a build, dismissed on any action */}
        {showSuccessOverlay && !ideVisible && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,11,20,.85)', backdropFilter: 'blur(16px)' }}
            onClick={() => setShowSuccessOverlay(false)}>
            <div style={{ borderRadius: 28, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.1)', boxShadow: '0 40px 80px rgba(0,0,0,.4)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'rgba(84,128,186,.12)', border: '1px solid rgba(84,128,186,.3)' }}>✓</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 10px' }}>App Generated!</h2>
              <p style={{ fontSize: 15, color: 'rgba(0,0,0,.45)', margin: '0 0 28px' }}>Your project is ready to explore in the editor.</p>
              <button onClick={() => { setShowSuccessOverlay(false); setIdeVisible(true) }}
                style={{ width: '100%', padding: '15px', borderRadius: 12, fontSize: 16, fontWeight: 700, background: '#5480ba', color: '#fff', border: 'none', boxShadow: '0 0 30px rgba(99,102,241,.4)', cursor: 'pointer', marginBottom: 12 }}>
                Open Editor →
              </button>
              {apiResult?.generationId && (
                <button onClick={() => { downloadGenerationZip(apiResult!.generationId!, accessToken); setShowSuccessOverlay(false) }}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.25)', cursor: 'pointer', marginBottom: 12 }}>
                  ⬇ Download Project ZIP
                </button>
              )}
              <button onClick={() => setShowSuccessOverlay(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.35)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                Back to workspace
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // IDE UI
  return (
    <div id="ide" className="flex flex-col" style={{ height: '100vh' }}>
      <div
        className="flex items-center gap-3 px-3 shrink-0"
        style={{ height: 40, background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,.05)' }}
      >
        {/* Home button */}
        <button
          onClick={() => setIdeVisible(false)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer"
          style={{ background: 'none', border: '1px solid rgba(0,0,0,.05)', color: 'rgba(0,0,0,.4)', fontSize: 11 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,.4)')}
          type="button"
          title="Back to Home"
        >
          ‹ Home
        </button>
        <div className="w-px h-4" style={{ background: 'rgba(0,0,0,.05)' }} />
        <span className="font-extrabold text-sm tracking-tight heading" style={{ color: 'var(--accent)' }}>
          ✦ AIEditor
        </span>
        <span className="mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(0,0,0,.35)' }}>
          {projectName}
        </span>
        <div className="flex-1" />
        <span className="mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(84,128,186,.08)', border: '1px solid rgba(84,128,186,.12)', color: 'var(--accent)' }}>
          {previewSrcDoc ? 'HTML/CSS' : `${selectedFw ?? 'React'} + Vite`}
        </span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
        <span className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.35)' }}>
          localhost:5173
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col shrink-0 glass"
          style={{ width: 240, borderRight: '1px solid var(--border)', background: 'rgba(2, 6, 23, 0.4)' }}
        >
          <div className="flex justify-between items-center px-3 pt-3 pb-2">
            <span
              className="mono uppercase tracking-[0.2em]"
              style={{ fontSize: 9, color: 'rgba(0,0,0,.2)', fontWeight: 700 }}
            >
              Explorer
            </span>
            <button
              className="transition-colors cursor-pointer flex items-center justify-center rounded"
              style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.15)', width: 20, height: 20, fontSize: 16, lineHeight: 1 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(99,102,241,.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,.15)')}
              onClick={() => window.alert('Add file (demo)')}
              type="button"
              title="New file"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">{renderTreeNodes(effectiveTree, 0)}</div>
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5 }}>
              {fileCount} files scaffolded
            </span>
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-1 px-4 shrink-0 glass"
            style={{ height: 44, borderBottom: '1px solid var(--border)' }}
          >
            {([
              { id: 'preview', label: 'Preview' },
              { id: 'code', label: 'Code' },
              { id: 'terminal', label: 'Terminal' },
            ] as const).map((t) => {
              const active = centerTab === t.id
              return (
                <button
                  key={t.id}
                  className={`relative px-6 h-full text-[9px] font-black tracking-[0.2em] uppercase transition-all duration-300 cursor-pointer ${active ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/2'}`}
                  onClick={() => setCenterTab(t.id)}
                  type="button"
                >
                  {t.label}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
                  )}
                </button>
              )
            })}

            <div className="flex-1" />

            <button
              className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all duration-300 cursor-pointer border ${selectMode
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'border-white/5 bg-white/2 text-slate-500 hover:bg-white/5'
                }`}
              onClick={() => {
                setSelectMode((v: boolean) => !v)
                setSelectedEl(null)
              }}
              type="button"
            >
              <span className="text-xs">{selectMode ? '●' : '⊕'}</span> <span>{selectMode ? 'Selecting' : 'Select'}</span>
            </button>

            <div className="w-px h-4 mx-3 bg-white/10" />

            <div className="flex bg-white/5 p-1 rounded-lg gap-1">
              <button
                className={`w-8 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${!isMobile ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => setIsMobile(false)}
                title="Desktop View"
                type="button"
              >
                🖥
              </button>
              <button
                className={`w-8 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${isMobile ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => setIsMobile(true)}
                title="Mobile View"
                type="button"
              >
                📱
              </button>
            </div>

            <div className="w-px h-4 mx-3 bg-white/10" />

            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer border border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10"
              onClick={() => setPreviewReloadCount(c => c + 1)}
              title="Reload preview"
              type="button"
              style={{ fontSize: 16 }}
            >
              ↻
            </button>

            <span
              className="mono text-[9px] px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-500"
              title="Auto-scaled to fit panel (1280px desktop)"
            >
              {Math.round(previewScale * 100)}%
            </span>

            <button
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer border ${isFullscreen ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
              type="button"
            >
              {isFullscreen ? '⤫' : '⛶'}
            </button>

            {previewSrcDoc && (
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer border border-white/10 bg-white/5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/40"
                onClick={() => {
                  const blob = new Blob([previewSrcDoc], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const win = window.open(url, '_blank')
                  if (win) setTimeout(() => URL.revokeObjectURL(url), 10000)
                }}
                title="Open in new tab (Presentation Mode)"
                type="button"
                style={{ fontSize: 14 }}
              >
                ↗
              </button>
            )}

            {apiResult?.generationId && (
              <button
                className="flex items-center gap-1.5 px-3 h-8 text-[9px] font-black tracking-widest uppercase rounded-lg transition-all cursor-pointer border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                onClick={() => downloadGenerationZip(apiResult!.generationId!, accessToken)}
                title="Download project as ZIP"
                type="button"
              >
                ⬇ ZIP
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto relative bg-[#070b14]">
            {centerTab === 'preview' ? (
              <div className="h-full flex flex-col">
                {selectMode ? (
                  <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-[10px] px-4 py-2 rounded-full glass border-indigo-500/30 text-indigo-400 font-bold mono shadow-2xl"
                  >
                    ⊕ Click UI elements to modify them
                  </div>
                ) : null}

                <div className={`flex-1 relative ${isFullscreen ? 'fixed inset-0 z-50 bg-[#070b14] flex flex-col' : ''}`}>
                  {isFullscreen && (
                    <div className="flex items-center justify-between px-6 h-14 border-b border-white/10 glass shrink-0">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400">Live Preview</span>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex gap-2">
                          <button
                            className={`px-3 py-1 text-[9px] font-bold rounded ${!isMobile ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                            onClick={() => setIsMobile(false)}
                          >
                            DESKTOP
                          </button>
                          <button
                            className={`px-3 py-1 text-[9px] font-bold rounded ${isMobile ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                            onClick={() => setIsMobile(true)}
                          >
                            MOBILE
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFullscreen(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer text-xl"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div
                    className={`transition-all duration-500 ease-out ${isFullscreen ? 'flex-1 overflow-auto p-8' : 'h-full'}`}
                  >
                    <div
                      className="transition-all duration-500 ease-out mx-auto flex flex-col"
                      style={{
                        width: isMobile ? 375 : '100%',
                        height: isFullscreen ? (isMobile ? 667 : '100%') : '100%',
                        borderRadius: isMobile ? 32 : 8,
                        boxShadow: isMobile
                          ? '0 0 0 12px #0f172a, 0 0 60px rgba(0,0,0,0.8)'
                          : !isFullscreen ? '0 0 0 1px rgba(255,255,255,0.10), 0 16px 48px rgba(0,0,0,0.7)' : 'none',
                        overflow: 'hidden',
                        border: isMobile ? '2px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      {(builtProjectUrl || previewSrcDoc) ? (
                        <>
                          {!isMobile && (
                            <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: '#141927', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex gap-1.5 mr-1">
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                              </div>
                              <button
                                onClick={() => setPreviewReloadCount(c => c + 1)}
                                className="flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                title="Reload preview"
                                style={{ width: 20, height: 20, fontSize: 14, background: 'none', border: 'none', padding: 0 }}
                                type="button"
                              >
                                ↻
                              </button>
                              <div className="flex-1 flex items-center rounded-md px-3 min-w-0" style={{ background: '#ffffff', height: 24 }}>
                                <span className="mono truncate" style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>
                                  {builtProjectUrl ? builtProjectUrl.replace('http://', '') : `localhost:5173/${activeFileId}`}
                                </span>
                              </div>
                            </div>
                          )}
                          <div
                            ref={previewContainerRef}
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              position: 'relative',
                              minHeight: 0,
                            }}
                          >
                            <iframe
                            key={previewKey}
                            title="preview"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                            style={{
                              width: `${100 / previewScale}%`,
                              height: `${100 / previewScale}%`,
                              border: 'none',
                              background: '#fff',
                              display: 'block',
                              transform: `scale(${previewScale})`,
                              transformOrigin: 'top left',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                            src={builtProjectUrl ?? undefined}
                            srcDoc={builtProjectUrl ? undefined : (previewSrcDoc ?? undefined)}
                          />
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 font-medium">
                          Waiting for project build...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {apiResult ? (
                  <div className="px-4 py-2.5 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,.05)', background: '#ffffff' }}>
                    {(() => {
                      const r: any = (apiResult as any)?.aiReport
                      const ui: any = (apiResult as any)?.uiSpec
                      const provider = (r && (r.llm_provider ?? r.llmProvider)) || '(unknown)'
                      const issuesCount = Array.isArray(r?.issues) ? r.issues.length : 0
                      const pipeline = Array.isArray(r?.pipeline) ? r.pipeline.join(' → ') : ''
                      const reqsRaw = ui?.meta?.requirements
                      const requirements = Array.isArray(reqsRaw)
                        ? (reqsRaw as any[])
                          .filter((x) => typeof x === 'string' && x.trim())
                          .map((s) => String(s).trim())
                        : []
                      const _reqPreview = requirements.slice(0, 3).join(' · ')
                      void _reqPreview
                      return (
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="mono text-[9px] uppercase tracking-wider" style={{ color: 'rgba(0,0,0,.2)' }}>Active Issues</span>
                            <span className={`mono text-[10px] font-bold ${issuesCount ? 'text-red-400' : ''}`} style={{ color: issuesCount ? '#f87171' : 'rgba(0,0,0,.35)' }}>
                              {issuesCount} detected
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : null}
              </div>
            ) : null}

            {centerTab === 'code' ? (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center">
                  <span className="mono text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                    {activeFileName}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  <pre className="mono text-[12px] leading-relaxed text-slate-300">
                    <code>{activeCode}</code>
                  </pre>
                </div>
              </div>
            ) : null}

            {centerTab === 'terminal' ? (
              <div className="h-full p-6 mono text-[11px] leading-relaxed bg-[#070b14]">
                <div className="text-indigo-400 flex items-center gap-2 mb-2">
                  <span className="opacity-50">✦</span>
                  <span>npm run dev</span>
                </div>
                <div className="text-slate-500 mb-1">&gt; {projectName}@1.0.0 dev</div>
                <div className="text-slate-500 mb-4">&gt; vite</div>
                <div className="text-purple-400 font-bold mb-4">VITE v5.x ready in 312 ms</div>
                <div className="flex flex-col gap-1 mb-8">
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-16">Local:</span>
                    <span className="text-indigo-400 underline underline-offset-4 decoration-indigo-500/30">http://localhost:5173/</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-16">Network:</span>
                    <span className="text-indigo-400">http://192.168.1.5:5173/</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-500 font-bold">❯</span>
                  <div className="blink w-2 h-4 bg-indigo-500/70"></div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col shrink-0" style={{ width: 340, background: '#070d1a', borderLeft: '1px solid rgba(0,0,0,.05)', height: '100%', overflow: 'hidden' }}>
          <div className="flex items-center shrink-0" style={{ height: 44, borderBottom: '1px solid rgba(0,0,0,.05)', background: 'rgba(2,6,23,0.6)' }}>
            {([
              { id: 'chat', label: '✦ Chat' },
              { id: 'console', label: 'Console' },
              { id: 'logs', label: 'History' },
            ] as const).map((t) => {
              const active = rightTab === t.id
              return (
                <button
                  key={t.id}
                  className={`relative flex-1 h-full text-[9px] font-black tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer ${active ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                  style={{ background: active ? 'rgba(99,102,241,0.08)' : 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent' }}
                  onClick={() => setRightTab(t.id)}
                  type="button"
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {rightTab === 'chat' ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {diffVisible ? (
                <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(251,191,36,.15)', background: 'rgba(251,191,36,.04)' }}>
                  <span className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                    {diffEdits.map(e => e.file).join(', ')}
                  </span>
                  <div className="flex-1" />
                  <button className="mono text-[10px] px-2 py-0.5 rounded cursor-pointer" style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', color: '#5480ba' }} onClick={() => setDiffVisible(false)} type="button">✓ Accept</button>
                  <button className="mono text-[10px] px-2 py-0.5 rounded cursor-pointer" style={{ background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.2)', color: '#e04580' }} onClick={() => setDiffVisible(false)} type="button">✗ Reject</button>
                </div>
              ) : null}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3" style={{ scrollBehavior: 'smooth' }}>
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'rgba(0,0,0,.12)' }}>
                    <div style={{ fontSize: 32 }}>✦</div>
                    <div className="mono text-xs text-center" style={{ color: 'rgba(0,0,0,.15)', lineHeight: 1.6 }}>
                      Describe what you want to<br />change in the selected file
                    </div>
                  </div>
                ) : chatMessages.map((m, idx) => {
                  const isAI = m.role === 'ai'
                  return (
                    <div key={idx} className={`flex gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold" style={{ background: isAI ? 'linear-gradient(135deg,#6366f1,#a5b4fc)' : 'rgba(0,0,0,.08)', color: isAI ? '#fff' : 'rgba(255,255,255,.5)', fontSize: 10, marginTop: 2 }}>
                        {isAI ? '✦' : 'U'}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 mono text-xs leading-relaxed ${isAI ? 'rounded-tl-sm' : 'rounded-tr-sm'}`} style={{ background: isAI ? 'rgba(99,102,241,.12)' : 'rgba(0,0,0,.05)', color: isAI ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.6)', border: isAI ? '1px solid rgba(99,102,241,.2)' : '1px solid rgba(0,0,0,.05)' }}>
                        {m.text}
                      </div>
                    </div>
                  )
                })}
                {isChatLoading ? (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#a5b4fc)', fontSize: 10 }}>✦</div>
                    <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.2)' }}>
                      <span className="mono text-xs" style={{ color: '#5480ba' }}>Editing {activeFileName}…</span>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(0,0,0,.05)' }}>
                <div className="text-[9px] mono mb-2" style={{ color: 'rgba(0,0,0,.15)' }}>
                  AI will pick the right file automatically
                </div>
                {selectedEl ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,.12)', color: '#5480ba', border: '1px solid rgba(99,102,241,.2)' }}>⊕ {selectedEl}</span>
                    <button className="text-sm cursor-pointer" style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,.2)' }} onClick={() => setSelectedEl(null)} type="button">×</button>
                  </div>
                ) : null}
                <div className="flex gap-2 items-end">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChat() } }}
                    disabled={isChatLoading}
                    placeholder={isChatLoading ? 'AI is editing…' : 'Describe your changes… (Enter to send)'}
                    rows={3}
                    className="mono text-xs w-full resize-none custom-scrollbar"
                    style={{ background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, padding: '8px 12px', outline: 'none', color: '#111827', opacity: isChatLoading ? 0.5 : 1, lineHeight: 1.5 }}
                  />
                  <button
                    className="flex items-center justify-center rounded-xl shrink-0 cursor-pointer font-bold"
                    style={{ width: 36, height: 36, background: chatInput.trim() && !isChatLoading ? 'linear-gradient(135deg,#6366f1,#a5b4fc)' : 'rgba(0,0,0,.04)', border: 'none', color: chatInput.trim() && !isChatLoading ? '#fff' : 'rgba(0,0,0,.15)', fontSize: 16, transition: 'all .15s' }}
                    onClick={() => void sendChat()}
                    disabled={isChatLoading}
                    type="button"
                    aria-label="Send"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {rightTab === 'component' ? (
              <div className="p-4">
                <div className="mono uppercase tracking-[0.2em] mb-4" style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>
                  Hierarchy
                </div>
                <div className="mono text-[11px] space-y-2">
                  <div className="text-purple-400 font-bold">App</div>
                  <div className="text-slate-500 pl-4 border-l border-white/5 py-1">
                    <div className="flex items-center gap-2">
                      <span className="opacity-30">├</span>
                      <span>Navbar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-30">└</span>
                      <span className="text-slate-400">Hero</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <span className="opacity-20">└</span>
                      <span className="text-indigo-400/70 text-[10px]">button.btn-primary</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {rightTab === 'console' ? (
              <div className="py-1">
                {logs.map((l, idx) => (
                  <div key={idx} className="flex gap-2 items-start px-3 py-1" style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <span className="mono shrink-0 mt-0.5" style={{ fontSize: 10, color: 'rgba(0,0,0,.15)' }}>
                      {l.t}
                    </span>
                    <span className="mono leading-relaxed" style={{ fontSize: 11, color: logColor[l.type] ?? logColor.info }}>
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {rightTab === 'logs' ? (
              <div className="p-3">
                <div className="mb-3">
                  <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(0,0,0,.35)' }}>
                    Dashboard
                  </div>
                  <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                    total generations: {history.length}
                  </div>
                  <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                    last activity:{' '}
                    {(() => {
                      const latest = history
                        .map((g) => g.updatedAt || g.createdAt)
                        .filter(Boolean)
                        .map((s) => new Date(String(s)).getTime())
                        .filter((n) => Number.isFinite(n))
                        .reduce((a, b) => Math.max(a, b), 0)
                      return latest ? new Date(latest).toLocaleString() : '—'
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(0,0,0,.35)' }}>
                    Recent generations
                  </div>
                  <div className="flex-1" />
                  <button
                    className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.08)', color: 'rgba(0,0,0,.55)' }}
                    onClick={() => void loadHistory()}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                {historyLoading ? (
                  <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                    Loading…
                  </div>
                ) : null}

                {historyError ? (
                  <div className="mono text-xs" style={{ color: '#e04580' }}>
                    {historyError}
                  </div>
                ) : null}

                {!historyLoading && !historyError && history.length === 0 ? (
                  <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                    No generations yet.
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  {history.slice(0, 20).map((g) => (
                    <div
                      key={(g.generationId ?? '') + ':' + (g.createdAt ?? '')}
                      className="rounded-md p-2"
                      style={{
                        background:
                          selectedGenerationId && g.generationId && selectedGenerationId === g.generationId
                            ? 'rgba(84,128,186,.08)'
                            : 'rgba(255,255,255,.03)',
                        border:
                          selectedGenerationId && g.generationId && selectedGenerationId === g.generationId
                            ? '1px solid rgba(99,102,241,.35)'
                            : '1px solid rgba(0,0,0,.05)',
                        cursor: g.generationId ? 'pointer' : 'default',
                      }}
                      title={g.prompt ?? ''}
                      onClick={() => {
                        if (!g.generationId) return
                        setSelectedGenerationId(g.generationId)
                        void loadAudit(g.generationId)
                        void loadVersions(g.generationId)
                      }}
                    >
                      <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                        {g.createdAt ? new Date(g.createdAt).toLocaleString() : ''}
                      </div>
                      <div className="mono text-[10px] mb-1 line-clamp-2" style={{ color: 'rgba(0,0,0,.55)' }}>
                        {g.prompt ?? ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                          {g.status ?? 'unknown'}
                        </div>
                        <div className="flex-1" />
                        {g.generationId && g.status === 'COMPLETED' ? (
                          <button
                            className="mono text-[10px] px-2 py-0.5 rounded cursor-pointer"
                            style={{
                              background: loadingProjectId === g.generationId ? 'rgba(84,128,186,.12)' : 'rgba(84,128,186,.08)',
                              border: '1px solid rgba(84,128,186,.3)',
                              color: '#5480ba',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              void loadGeneration(g.generationId!)
                            }}
                            type="button"
                            disabled={loadingProjectId === g.generationId}
                          >
                            {loadingProjectId === g.generationId ? 'Loading…' : '↑ Load'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedGenerationId ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(0,0,0,.35)' }}>
                        Audit events
                      </div>
                      <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)', wordBreak: 'break-all' }}>
                        {selectedGenerationId}
                      </div>
                      <div className="flex-1" />
                      <button
                        className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
                        style={{ background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.08)', color: 'rgba(0,0,0,.55)' }}
                        onClick={() => void loadAudit(selectedGenerationId)}
                        type="button"
                      >
                        Refresh
                      </button>
                    </div>

                    {auditLoading ? (
                      <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                        Loading…
                      </div>
                    ) : null}

                    {auditError ? (
                      <div className="mono text-xs" style={{ color: '#e04580' }}>
                        {auditError}
                      </div>
                    ) : null}

                    {!auditLoading && !auditError && auditEvents.length === 0 ? (
                      <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                        No audit events.
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-1">
                      {auditEvents.map((e) => {
                        let detailsText = ''
                        try {
                          const s = e.details ? JSON.stringify(e.details) : ''
                          detailsText = s.length > 160 ? s.slice(0, 160) + '…' : s
                        } catch {
                          detailsText = ''
                        }

                        return (
                          <div
                            key={(e.eventId ?? '') + ':' + (e.timestamp ?? '')}
                            className="rounded-md p-2"
                            style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.04)' }}
                          >
                            <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                              {e.timestamp ? new Date(e.timestamp).toLocaleString() : ''}
                            </div>
                            <div className="mono text-xs" style={{ color: '#a78bfa' }}>
                              {e.type ?? 'EVENT'}
                              {typeof e.durationMs === 'number' ? (
                                <span style={{ color: 'rgba(0,0,0,.4)' }}> · {e.durationMs}ms</span>
                              ) : null}
                            </div>
                            {detailsText ? (
                              <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.45)', wordBreak: 'break-word' }}>
                                {detailsText}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {selectedGenerationId ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="mono uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(0,0,0,.35)' }}>
                        Versions
                      </div>
                      <div className="flex-1" />
                      <button
                        className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
                        style={{ background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.08)', color: 'rgba(0,0,0,.55)' }}
                        onClick={() => void loadVersions(selectedGenerationId)}
                        type="button"
                      >
                        Refresh
                      </button>
                    </div>

                    {versionsLoading ? (
                      <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                        Loading…
                      </div>
                    ) : null}

                    {versionsError ? (
                      <div className="mono text-xs" style={{ color: '#e04580' }}>
                        {versionsError}
                      </div>
                    ) : null}

                    {!versionsLoading && !versionsError && versions ? (
                      <div className="mono text-[10px] mb-2" style={{ color: 'rgba(0,0,0,.45)' }}>
                        activeVersion: {typeof versions.activeVersion === 'number' ? versions.activeVersion : 'unknown'}
                      </div>
                    ) : null}

                    {!versionsLoading && !versionsError && (!versions || !versions.codeVersions || versions.codeVersions.length === 0) ? (
                      <div className="mono text-xs" style={{ color: 'rgba(0,0,0,.4)' }}>
                        No versions.
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-1">
                      {(versions?.codeVersions ?? []).map((v) => {
                        const ver = typeof v.version === 'number' ? v.version : null
                        const isActive = ver !== null && ver === versions?.activeVersion
                        return (
                          <div
                            key={`code-v-${String(v.version)}-${String(v.createdAt ?? '')}`}
                            className="rounded-md p-2 flex items-start gap-2"
                            style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.04)' }}
                          >
                            <div className="flex-1">
                              <div className="mono text-xs" style={{ color: '#5480ba' }}>
                                code v{ver ?? '?'}{isActive ? ' (active)' : ''}
                              </div>
                              <div className="mono text-[10px]" style={{ color: 'rgba(0,0,0,.4)' }}>
                                {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                              </div>
                            </div>
                            {!isActive && ver !== null ? (
                              <button
                                className="mono text-[10px] px-2 py-1 rounded cursor-pointer"
                                style={{ background: 'rgba(84,128,186,.08)', border: '1px solid rgba(99,102,241,.25)', color: '#5480ba' }}
                                onClick={() => void doRollback(selectedGenerationId, ver)}
                                type="button"
                              >
                                Set active
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          )}
        </div>
      </div>

    </div>
  )
}
