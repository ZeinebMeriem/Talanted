import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, FileText, Zap, LayoutDashboard, Rocket, ShoppingCart, Briefcase, Bot, Sparkles, Eye, Code2, Star, GitBranch, Download, Upload, Settings, ChevronRight, CheckCircle2, Clock, AlertTriangle, Plus, Layers, BarChart3, Users, Activity, XCircle, HeartPulse, FolderKanban, Timer, Award, Globe, Home, Folder, User } from 'lucide-react'
import {
  streamGeneration,
  createGeneration,
  generateAccessibilityReport,
  getAccessibilityHistory,
  type AccessibilityReport as AccessibilityReportType,
  downloadGenerationZip,
  repairGeneration,
  generateDocs,
  downloadCleanZip,
  deleteGeneration,
  renameGeneration,
  attachMeetingAnalysis,
  getAdminActivity,
  getAdminAuditLog,
  getAdminDailyChart,
  getAdminFailed,
  getAdminServiceHealth,
  getAdminStats,
  getAdminUserProjects,
  getAdminUsers,
  getGenerationCode,
  getGeneration,
  getGenerationVersions,
  getGenerationQuality,
  getMe,
  getUserStats,
  getUserProfile,
  updateUserProfile,
  sendVerificationEmail,
  uploadAvatar,
  deleteAvatar,
  listAuditEvents,
  listGenerations,
  deleteAdminUser,
  editFile,
  rollbackGeneration,
  setAdminUserEnabled,
  setAdminUserRole,
  retryAdminGeneration,
  getChatHistory,
  shareProject,
  unshareProject,
  type AdminStats,
  type AdminUser,
  type AuditEventListItem,
  type ChatMessage as ApiChatMessage,
  type DailyChartItem,
  type GenerationListItem,
  type GenerationVersionsResponse,
  type AdminAuditEvent,
  type ServiceHealth,
  type UserProfile,
  type UserStats,
} from './api'
import { ChatPanel, CodeViewer, Preview, VersionHistory, PushGitLabModal, QualityScores, TedChatBot, HomePage, ToastProvider, ErrorBoundary, DeployModal, AccessibilityReport, AccountSettings, MeetingRecorder, MyProjectsGridHub, type ChatMsg, type FileNode, type ElementInfo, type StyleChange, type ProjectItem } from './components'
import MultiAgentGenerator from './components/MultiAgentGenerator'
import { FigmaImportModal } from './components/FigmaImportModal'
import { JiraImportPage } from './JiraImportPage'
import { CollaborationPanel } from './components/CollaborationPanel'
import { useCollaboration } from './hooks/useCollaboration'
import { AdminDashboard } from './components/AdminDashboard'

type CenterTab = 'preview' | 'code' | 'quality' | 'accessibility'

type RightTab = 'chat' | 'console' | 'versions' | 'meeting'


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

export function AiEditor({ accessToken, username = 'there', email, firstName, lastName, userSub, roles = [], onLogout, initialGenerationId, initialHomeTab }: { accessToken?: string; username?: string; email?: string; firstName?: string; lastName?: string; userSub?: string; roles?: string[]; onLogout?: () => void; initialGenerationId?: string | null; initialHomeTab?: 'create' | 'projects' | 'profile' | 'admin' }) {
  const [projectName, setProjectName] = useState('my-awesome-app')
  const [customPrompt, setCustomPrompt] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gemini')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  // Accessibility report state — cached per project so switching away and back preserves results
  const [accessibilityReports, setAccessibilityReports] = useState<Record<string, AccessibilityReportType>>({})
  const [isGeneratingAccessibility, setIsGeneratingAccessibility] = useState(false)

  // Quality / repair / docs state
  const [liveScores, setLiveScores] = useState<{ globalScore?: number; semanticFidelity?: number; codeQuality?: number; completeness?: number; accessibility?: number; visualRichness?: number } | null>(null)
  const [liveReasoning, setLiveReasoning] = useState<Record<string, string> | null>(null)
  const [isRepairing, setIsRepairing] = useState(false)
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false)
  const [docsGenerated, setDocsGenerated] = useState(false)

  // Figma import state
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false)
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null)
  const [figmaToken, setFigmaToken] = useState<string | null>(null)
  const [figmaFileName, setFigmaFileName] = useState<string | null>(null)

  // TED Chatbot state
  const [isTedOpen, setIsTedOpen] = useState(false)
  const [isMeetingRecorderOpen, setIsMeetingRecorderOpen] = useState(false)
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false)
  const [pendingMeetingAnalysis, setPendingMeetingAnalysis] = useState<any>(null)
  const [currentEditingFile, setCurrentEditingFile] = useState<string | null>(null)
  const lastEditTime = useRef<number>(0)

  // Auto-detect domain from prompt keywords (mirrors Python detect_domain())
  const autoDetectedDomain = useMemo(() => {
    const p = customPrompt.toLowerCase()
    const keywords: Record<string, string[]> = {
      ecommerce: ['shop', 'store', 'product', 'cart', 'checkout', 'price', 'buy', 'boutique', 'catalogue', 'panier'],
      medical: ['patient', 'doctor', 'appointment', 'medical', 'health', 'clinic', 'hospital', 'médecin', 'santé'],
      dashboard: ['dashboard', 'analytics', 'metrics', 'chart', 'graph', 'stats', 'kpi', 'tableau de bord'],
      education: ['course', 'lesson', 'student', 'teacher', 'quiz', 'learning', 'cours', 'formation', 'élève'],
      saas: ['saas', 'subscription', 'plan', 'api', 'integration', 'enterprise', 'abonnement', 'plateforme'],
      portfolio: ['portfolio', 'skill', 'designer', 'developer', 'creative', 'réalisation', 'compétence'],
      restaurant: ['restaurant', 'menu', 'food', 'reservation', 'chef', 'dish', 'cuisine', 'repas'],
      real_estate: ['property', 'house', 'apartment', 'rent', 'immobilier', 'appartement', 'maison', 'agence'],
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
    { value: 'ecommerce', emoji: '🛒', label: 'E-commerce' },
    { value: 'dashboard', emoji: '📊', label: 'Dashboard' },
    { value: 'medical', emoji: '🏥', label: 'Médical' },
    { value: 'education', emoji: '🎓', label: 'Éducation' },
    { value: 'saas', emoji: '💼', label: 'SaaS' },
    { value: 'portfolio', emoji: '🎨', label: 'Portfolio' },
    { value: 'restaurant', emoji: '🍽️', label: 'Restaurant' },
    { value: 'real_estate', emoji: '🏠', label: 'Immobilier' },
  ]

  const activeDomain = selectedDomain ?? autoDetectedDomain

  const isAdmin = roles.includes('admin')

  // Navigation — admin lands directly on admin dashboard
  const [homeTab, setHomeTab] = useState<'create' | 'projects' | 'profile' | 'admin'>(initialHomeTab || (isAdmin ? 'admin' : 'create'))
  const [adminActiveMenu, setAdminActiveMenu] = useState<string>('Overview')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createMode, setCreateMode] = useState<'scratch' | 'jira'>('scratch')

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
  const [adminActiveTab, setAdminActiveTab] = useState<'overview' | 'users' | 'activity' | 'failed' | 'health' | 'audit'>('overview')
  const [adminAudit, setAdminAudit] = useState<AdminAuditEvent[]>([])
  const [adminChartDays, setAdminChartDays] = useState<30 | 7>(30)
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [adminProjectSearch, setAdminProjectSearch] = useState('')
  const [adminProjectStatus, setAdminProjectStatus] = useState<'all' | 'COMPLETED' | 'PROCESSING' | 'FAILED'>('all')
  const [adminActivityFilter, setAdminActivityFilter] = useState<'all' | 'COMPLETED' | 'FAILED' | 'PROCESSING'>('all')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // IDE
  const [ideVisible, setIdeVisible] = useState(false)
  const [centerTab, setCenterTab] = useState<CenterTab>('preview')
  const [rightTab, setRightTab] = useState<RightTab>('chat')
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const [chatInput, setChatInput] = useState('')
  const [diffVisible, setDiffVisible] = useState(false)
  const [diffEdits, setDiffEdits] = useState<{ file: string; added: number; removed: number }[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewReloadCount, setPreviewReloadCount] = useState(0)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1.0)

  const [buildMsg, setBuildMsg] = useState('Scaffolding project…')
  const [buildPct, setBuildPct] = useState(0)
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  // ── Preview CSS override (live suggestion hover) ───────────────────────
  const [previewOverrideCSS, setPreviewOverrideCSS] = useState<string | null>(null)

  // ── Inspect mode (click-to-select element in preview) ──────────────────
  const [inspectMode, setInspectMode] = useState(false)
  const [selectedZone, setSelectedZone] = useState<{ label: string; description: string } | null>(null)
  const [hoverZoneBox, setHoverZoneBox] = useState<{ top: string; height: string; left: string; width: string } | null>(null)
  const [chatPrefill, setChatPrefill] = useState('')  // Pre-filled chat message from inspect
  const [inspectModal, setInspectModal] = useState<{ zone: { label: string; description: string } } | null>(null)
  const [inspectInstruction, setInspectInstruction] = useState('')
  const [isApplyingEdit, setIsApplyingEdit] = useState(false)
  const [lastVersionSaved, setLastVersionSaved] = useState<number | null>(null)

  const [apiResult, setApiResult] = useState<GenerationApiResponse | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [history, setHistory] = useState<GenerationListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [homePanelTab, setHomePanelTab] = useState<'mine' | 'recent'>('mine')
  const [projectSearch, setProjectSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<'all'|'prompt'|'meeting'|'jira'>('all')
  const [projectSort, setProjectSort] = useState<'date'|'name'>('date')
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('talanted_recent_views') || '[]') } catch { return [] }
  })

  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null)
  const activeProjectId = apiResult?.generationId || selectedGenerationId || ''
  const accessibilityReport = accessibilityReports[activeProjectId]

  const { connected: collabConnected, activeUsers: collabUsers, lastEvent: collabLastEvent,
          send: collabSend, projectLock, lockProject, unlockProject } = useCollaboration({
    projectId: activeProjectId,
    userName: username,
    enabled: !!activeProjectId,
  })
  const [auditEvents, setAuditEvents] = useState<AuditEventListItem[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const [versions, setVersions] = useState<GenerationVersionsResponse | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  // Stop any in-progress audit when switching projects
  useEffect(() => {
    setIsGeneratingAccessibility(false)
  }, [selectedGenerationId])

  // Auto-load last saved audit from backend when opening a project with no cached report
  useEffect(() => {
    if (!activeProjectId || accessibilityReports[activeProjectId]) return
    getAccessibilityHistory(activeProjectId, accessToken ?? undefined)
      .then(history => {
        if (!history || history.length === 0) return
        const latest = history[0]
        setAccessibilityReports(prev => {
          if (prev[activeProjectId]) return prev // already set by concurrent run
          return {
            ...prev,
            [activeProjectId]: {
              generated: true,
              score: latest.score,
              wcagLevel: latest.wcagLevel,
              summary: latest.summary,
              issues: latest.issues ?? [],
              passed: latest.passed ?? [],
              recommendations: latest.recommendations ?? [],
              filesAnalyzed: latest.filesAnalyzed,
            },
          }
        })
      })
      .catch(() => { /* no history is fine */ })
  }, [activeProjectId])

  // GitLab push modal
  const [isPushGitLabModalOpen, setIsPushGitLabModalOpen] = useState(false)

  // Deploy modal
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [liveDeployUrl, setLiveDeployUrl] = useState<string | undefined>(undefined)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [showSharePopover, setShowSharePopover] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // Handle element selection from inspect mode
  const handleElementSelected = useCallback((info: ElementInfo) => {
    // Don't auto-switch to chat anymore - let them use the visual editor
  }, []);

  // Stable ref so handleStyleChange can call loadVersions without ordering issues
  const loadVersionsRef = useRef<((id: string) => Promise<void>) | null>(null)

  // Handle style change from visual editor — only fires when user clicks "Apply to Code"
  const handleStyleChange = useCallback(async (change: StyleChange) => {
    const generationId = selectedGenerationId
    if (!generationId) return

    const elementDesc = change.element.textContent
      ? `the ${change.element.tagName} element with text "${change.element.textContent.slice(0, 40)}"`
      : `the ${change.element.tagName}${change.element.className ? `.${change.element.className.split(' ')[0]}` : ''} element`

    const instruction = change.property === 'multiple'
      ? `Update ${elementDesc}: change ${change.newValue}. Apply these exact CSS property values directly to the component's inline styles or CSS class.`
      : `Change the ${change.property} of ${elementDesc} to "${change.newValue}". Apply this exact value in the source code.`

    try {
      const resp = await editFile(generationId, '', instruction, accessToken || '', selectedModel)
      if (resp.buildSuccess) {
        setPreviewReloadCount(c => c + 1)
        void loadVersionsRef.current?.(generationId)
      }
    } catch (err) {
      console.error('Style apply failed:', err)
    }
  }, [selectedGenerationId, selectedModel, accessToken])

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null)
      setHistoryLoading(true)
      const items = await listGenerations(accessToken)
      setHistory(items)
    } catch (e: any) {
      console.error('Failed to load projects:', e)
      setHistoryError(e?.message ?? 'Unable to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [accessToken])

  const loadGeneration = useCallback(async (generationId: string) => {
    try {
      setLoadingProjectId(generationId)
      // Clear stale data from any previously selected project
      setVersions(null)
      setVersionsError(null)
      setAuditEvents([])
      setAuditError(null)
      setLiveScores(null)
      setLiveReasoning(null)
      setLiveDeployUrl(undefined)
      const [bundle, history, generation, quality] = await Promise.all([
        getGenerationCode(generationId, accessToken),
        getChatHistory(generationId, accessToken),
        getGeneration(generationId, accessToken),
        getGenerationQuality(generationId, undefined, accessToken),
      ])
      setApiResult({ generationId, codeBundle: bundle, uiSpec: undefined, aiReport: undefined })
      setSelectedGeneration(generation)
      setSelectedGenerationId(generationId)
      if (generation?.deployUrl) setLiveDeployUrl(generation.deployUrl)
      // Use fetched quality scores if available, otherwise fall back to generation-level scores
      const hasQuality = quality && Object.values(quality).some(v => v != null && typeof v === 'number')
      if (hasQuality) {
        setLiveScores({
          globalScore: quality.globalScore,
          semanticFidelity: quality.semanticFidelity,
          codeQuality: quality.codeQuality,
          completeness: quality.completeness,
          accessibility: quality.accessibility,
          visualRichness: quality.visualRichness,
        })
        setLiveReasoning(quality.reasoning ?? null)
      }
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

  // Keep ref in sync so handleStyleChange can call loadVersions without ordering issues
  loadVersionsRef.current = loadVersions

  // Auto-load generation from URL query param (?gen=...) on component mount
  useEffect(() => {
    if (initialGenerationId && !apiResult) {
      void loadGeneration(initialGenerationId)
    }
  }, [initialGenerationId, apiResult, loadGeneration])

  const doRollback = useCallback(
    async (generationId: string, version: number) => {
      try {
        setVersionsError(null)
        await rollbackGeneration(generationId, version, accessToken)
        // Reload metadata and force the preview iframe to re-fetch the restored build
        await Promise.all([loadHistory(), loadAudit(generationId), loadVersions(generationId)])
        setPreviewReloadCount(c => c + 1)
        // Load quality scores specific to the restored version
        const quality = await getGenerationQuality(generationId, version, accessToken)
        const hasQuality = quality && Object.values(quality).some(v => v != null && typeof v === 'number')
        if (hasQuality) {
          setLiveScores({
            globalScore: quality.globalScore,
            semanticFidelity: quality.semanticFidelity,
            codeQuality: quality.codeQuality,
            completeness: quality.completeness,
            accessibility: quality.accessibility,
            visualRichness: quality.visualRichness,
          })
          setLiveReasoning(quality.reasoning ?? null)
        } else {
          setLiveScores(null)
          setLiveReasoning(null)
        }
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

      // Debug log
      console.log('🔍 Loading admin dashboard with token:', accessToken?.substring(0, 30) + '...')

      const [users, stats, activity, failed, chart, health, audit] = await Promise.all([
        getAdminUsers(accessToken),
        getAdminStats(accessToken),
        getAdminActivity(accessToken),
        getAdminFailed(accessToken),
        getAdminDailyChart(accessToken, 30),
        getAdminServiceHealth(accessToken),
        getAdminAuditLog(accessToken),
      ])

      setAdminUsers(users)
      setAdminStats(stats)
      setAdminActivity(activity)
      setAdminFailed(failed)
      setAdminDailyChart(chart)
      setAdminHealth(health)
      setAdminAudit(audit)
    } catch (e: any) {
      const errMsg = e?.message ?? 'Failed to load admin data'
      console.error('❌ Admin dashboard error:', errMsg, e)
      setAdminError(errMsg)
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

  // Load admin dashboard when tab is opened or token changes
  useEffect(() => {
    if (homeTab === 'admin' && accessToken) {
      void loadAdminDashboard()
    }
  }, [homeTab, accessToken, loadAdminDashboard])

  // Auto-refresh health every 30 seconds when on health tab
  useEffect(() => {
    if (homeTab !== 'admin' || adminActiveTab !== 'health') return
    const id = setInterval(() => {
      getAdminServiceHealth(accessToken).then(setAdminHealth).catch(() => {})
    }, 30000)
    return () => clearInterval(id)
  }, [homeTab, adminActiveTab, accessToken])

  useEffect(() => {
    if (ideVisible || homeTab === 'projects') {
      void loadHistory()
    }
  }, [ideVisible, homeTab, loadHistory])

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
        ":root {\n  --primary: #7dd3fc;\n  --bg: #0f172a;\n  --surface: #1e293b;\n}\n\nbody {\n  background: var(--bg);\n  color: #f1f5f9;\n  font-family: sans-serif;\n}\n\n.navbar {\n  display: flex;\n  justify-content: space-between;\n  padding: 1rem 2rem;\n  background: var(--surface);\n}\n\n.hero {\n  text-align: center;\n  padding: 5rem 2rem;\n}\n\n.btn-primary {\n  background: var(--primary);\n  color: #000;\n  padding: .6rem 1.4rem;\n  border: none;\n  border-radius: 6px;\n  cursor: pointer;\n}",
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
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#7dd3fc"/>\n  <text x="50" y="58" text-anchor="middle"\n    font-size="28" fill="#000">M</text>\n</svg>',
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

  // Esc closes inspect mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectMode) {
        setInspectMode(false)
        setHoverZoneBox(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [inspectMode])

  // Auto-dismiss the "version saved" toast after 3 s
  useEffect(() => {
    if (!lastVersionSaved) return
    const t = setTimeout(() => setLastVersionSaved(null), 3000)
    return () => clearTimeout(t)
  }, [lastVersionSaved])

  const [userScale, setUserScale] = useState<number | null>(null)

  // Auto-scale preview like Lovable: observe container width and scale to fit 1280px
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      if (userScale !== null) return // don't auto-scale if user manually zoomed
      const width = entries[0].contentRect.width
      // Scale to fit visually, but cap it so it doesn't get ridiculously small or too large
      if (width > 0 && userScale === null) setPreviewScale(Math.min(1.0, Math.max(0.85, width / 1280)))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [userScale])

  // Derived — always in sync with apiResult, no separate state needed
  // Use relative path for iframe so it goes through Vite proxy (same-origin)
  const builtProjectUrl = apiResult?.generationId
    ? `/preview/${apiResult.generationId}/dist/index.html`
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

  const getFileBadge = (name: string): { label: string; bg: string; color: string } => {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx':  return { label: 'TSX',  bg: '#dbeafe', color: '#2563eb' }
      case 'ts':   return { label: 'TS',   bg: '#dbeafe', color: '#2563eb' }
      case 'jsx':  return { label: 'JSX',  bg: '#dcfce7', color: '#16a34a' }
      case 'js':   return { label: 'JS',   bg: '#fef9c3', color: '#ca8a04' }
      case 'css':  return { label: 'CSS',  bg: '#e0f2fe', color: '#0369a1' }
      case 'html': return { label: 'HTML', bg: '#ffedd5', color: '#c2410c' }
      case 'json': return { label: 'JSON', bg: '#f3f4f6', color: '#4b5563' }
      case 'svg':  return { label: 'SVG',  bg: '#fce7f3', color: '#be185d' }
      default:     return { label: ext?.toUpperCase() ?? 'FILE', bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  const renderTreeNodes = (nodes: FileNode[], depth: number) => {
    return nodes.map((node) => {
      const isActive = node.id === activeFileId
      const padLeft = 6 + depth * 14
      const badge = node.type === 'file' ? getFileBadge(node.name) : null

      return (
        <React.Fragment key={node.id}>
          <div
            className="file-row flex items-center gap-1.5 cursor-pointer select-none group"
            style={{
              padding: `5px 8px 5px ${padLeft}px`,
              color: isActive ? '#ffffff' : '#374151',
              background: isActive ? '#111827' : 'transparent',
              transition: 'background .12s',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              borderRadius: 6,
              margin: '1px 4px',
            }}
            onClick={() => {
              if (node.type === 'file') openFile(node.id)
              else toggleFolder(node.id)
            }}
          >
            {node.type === 'folder' ? (
              <>
                <span style={{ fontSize: 9, color: isActive ? '#9ca3af' : '#9ca3af', minWidth: 10, lineHeight: 1 }}>
                  {node.open ? '▾' : '▸'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={node.open ? '#f59e0b' : '#d97706'} style={{ minWidth: 14, opacity: 0.9 }}>
                  {node.open
                    ? <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
                    : <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>}
                </svg>
              </>
            ) : (
              <>
                <span style={{ minWidth: 10 }} />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#9ca3af' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" style={{ minWidth: 12, opacity: 0.7 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </>
            )}
            <span className="flex-1 truncate" style={{ letterSpacing: '-0.01em' }}>{node.name}</span>
            {badge && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                padding: '1px 5px', borderRadius: 4,
                background: isActive ? 'rgba(255,255,255,.15)' : badge.bg,
                color: isActive ? '#e5e7eb' : badge.color,
                flexShrink: 0,
              }}>
                {badge.label}
              </span>
            )}
          </div>
          {node.type === 'folder' && node.open ? renderTreeNodes(node.children, depth + 1) : null}
        </React.Fragment>
      )
    })
  }

  // ── Inspect mode helpers ────────────────────────────────────────────────
  const INSPECT_ZONES = [
    { top: '0%', height: '10%', left: '0%', width: '100%', label: 'header / navbar', description: 'the header navigation bar' },
    { top: '10%', height: '20%', left: '0%', width: '100%', label: 'hero section', description: 'the hero section' },
    { top: '30%', height: '22%', left: '0%', width: '100%', label: 'features / content', description: 'the features or content area' },
    { top: '52%', height: '23%', left: '0%', width: '100%', label: 'cards / grid', description: 'the cards or data grid' },
    { top: '75%', height: '25%', left: '0%', width: '100%', label: 'footer', description: 'the footer section' },
  ]
  const INSPECT_ZONES_SIDEBAR = [
    { top: '0%', height: '100%', left: '0%', width: '16%', label: 'sidebar', description: 'the sidebar navigation' },
    { top: '0%', height: '100%', left: '84%', width: '16%', label: 'right panel', description: 'the right side panel' },
  ]

  const detectZone = (relX: number, relY: number) => {
    if (relX < 0.16) return INSPECT_ZONES_SIDEBAR[0]
    if (relX > 0.84) return INSPECT_ZONES_SIDEBAR[1]
    return (
      INSPECT_ZONES.find((_, i) => {
        const topPct = parseFloat(INSPECT_ZONES[i].top) / 100
        const botPct = topPct + parseFloat(INSPECT_ZONES[i].height) / 100
        return relY >= topPct && relY < botPct
      }) ?? INSPECT_ZONES[INSPECT_ZONES.length - 1]
    )
  }

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const relY = (e.clientY - rect.top) / rect.height
    const zone = detectZone(relX, relY)
    setHoverZoneBox({ top: zone.top, height: zone.height, left: zone.left, width: zone.width })
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const relY = (e.clientY - rect.top) / rect.height
    const zone = detectZone(relX, relY)
    setSelectedZone({ label: zone.label, description: zone.description })
    setHoverZoneBox(null)
    setRightTab('chat')
  }

  const applyInspectEdit = async () => {
    if (!inspectInstruction.trim() || isApplyingEdit) return
    const generationId = apiResult?.generationId
    if (!generationId) return
    setIsApplyingEdit(true)
    try {
      const instruction = `Modify ${inspectModal!.zone.description}: ${inspectInstruction}`
      const resp = await editFile(generationId, '', instruction, accessToken, selectedModel)
      if (resp.content && apiResult?.codeBundle?.files) {
        const updatedFiles = apiResult.codeBundle.files.map((f) =>
          f.path === activeFileId || f.path === activeFileName
            ? { ...f, content: resp.content! }
            : f
        )
        setApiResult(prev => prev ? { ...prev, codeBundle: { files: updatedFiles } } : prev)
      }
      if (resp.buildSuccess) {
        setPreviewReloadCount(c => c + 1)
      }
      // Reload versions so the new version appears
      if (selectedGenerationId) {
        void loadVersions(selectedGenerationId)
        if (resp.buildSuccess) {
          setLastVersionSaved(Date.now())
          setRightTab('versions')
        }
      }
      setInspectModal(null)
      setInspectInstruction('')
      setInspectMode(false)
    } catch (err: any) {
      console.error('Inspect edit failed:', err)
    } finally {
      setIsApplyingEdit(false)
    }
  }

  const startBuild = async (promptOverride?: string, nameOverride?: string, figmaUrlOverride?: string | null, figmaTokenOverride?: string | null) => {
    setIsBuilding(true)
    setBuildError(null)
    setBuildPct(0)
    setBuildMsg('Starting…')

    try {
      const prompt = (promptOverride ?? customPrompt).trim() || `New project: ${nameOverride ?? projectName}`

      setLiveScores(null)
      setDocsGenerated(false)
      const capturedMeetingAnalysis = pendingMeetingAnalysis
      setPendingMeetingAnalysis(null)
      // Use override values when called immediately after setState (avoids React batching issue)
      const effectiveFigmaUrl   = figmaUrlOverride   !== undefined ? figmaUrlOverride   : figmaUrl
      const effectiveFigmaToken = figmaTokenOverride !== undefined ? figmaTokenOverride : figmaToken
      for await (const event of streamGeneration(prompt, attachedFiles, accessToken, activeDomain, selectedModel, undefined, undefined, selectedTheme, capturedMeetingAnalysis, effectiveFigmaUrl, effectiveFigmaToken)) {
        if (event.type === 'progress') {
          setBuildPct(event.progress)
          setBuildMsg(event.message)
        } else if (event.type === 'complete') {
          const result = event.result as GenerationApiResponse
          setAttachedFiles([])
          setApiResult(result)
          const r: any = (result as any)?.aiReport
          // Wire live quality scores from SSE complete event
          const uiEval = r?.ui_evaluation
          if (uiEval) {
            setLiveScores({
              globalScore: uiEval.global_score,
              semanticFidelity: uiEval.semantic_fidelity,
              codeQuality: uiEval.code_quality,
              completeness: uiEval.completeness,
              accessibility: uiEval.accessibility,
              visualRichness: uiEval.visual_richness,
            })
            setLiveReasoning(uiEval.reasoning ?? null)
          }
          const fileCount = (result as any)?.codeBundle?.files?.length ?? 1
          const totalMs = r?.durations?.total_ms
          const summary = (result as any)?.uiSpec?.meta?.summary
          setChatMessages([{
            role: 'ai',
            text: `Project generated! Created ${fileCount} file${fileCount !== 1 ? 's' : ''}${summary ? ` — ${summary}` : ''}${totalMs ? ` in ${(totalMs / 1000).toFixed(1)}s` : ''}.`,
          }])
          void loadHistory().then(() => setHomeTab('projects'))
          setBuildPct(100)
          setBuildMsg('Build complete.')
          setTimeout(() => {
            setIsBuilding(false)
            setShowSuccessOverlay(true)
          }, 450)
          return
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    } catch (e: any) {
      setIsBuilding(false)
      setBuildError(e?.message ?? 'Build failed')
      void loadHistory().then(() => setHomeTab('projects'))
    }
  }

  const handleGenerateAccessibility = async () => {
    const id = apiResult?.generationId || selectedGenerationId
    console.log('[Accessibility] Button clicked. ID:', id, 'apiResult:', apiResult, 'selectedGenerationId:', selectedGenerationId)
    if (!id) {
      console.log('[Accessibility] No project ID found, showing error')
      return
    }
    if (isGeneratingAccessibility) {
      console.log('[Accessibility] Already generating, ignoring click')
      return
    }
    console.log('[Accessibility] Starting audit for:', id)
    setIsGeneratingAccessibility(true)
    setCenterTab('accessibility')
    try {
      const report = await generateAccessibilityReport(id, accessToken)
      console.log('[Accessibility] Report received:', report)
      setAccessibilityReports(prev => ({ ...prev, [id]: report }))
    } catch (e: any) {
      console.error('[Accessibility] Error:', e)
      setAccessibilityReports(prev => ({ ...prev, [id]: { generated: false, error: e?.message ?? 'Audit failed' } }))
    } finally {
      setIsGeneratingAccessibility(false)
    }
  }

  const handleRepair = async () => {
    const id = apiResult?.generationId
    if (!id || isRepairing) return
    setIsRepairing(true)
    try {
      const result = await repairGeneration(id, accessToken)
      // Update quality scores and reasoning from repair response
      setLiveScores({
        globalScore: result.globalScore,
        semanticFidelity: result.semanticFidelity,
        codeQuality: result.codeQuality,
        completeness: result.completeness,
        accessibility: result.accessibility,
        visualRichness: result.visualRichness,
      })
      if (result.reasoning) setLiveReasoning(result.reasoning)
      // Reload the code bundle so Code tab reflects any repaired files
      try {
        const updatedBundle = await getGenerationCode(id, accessToken)
        setApiResult(prev => prev ? { ...prev, codeBundle: updatedBundle } : prev)
      } catch (_) {}
      // Refresh the preview so the user sees the result of the repair
      setPreviewReloadCount(c => c + 1)
      setCenterTab('preview')
    } catch (e: any) {
      console.error('Repair failed:', e)
    } finally {
      setIsRepairing(false)
    }
  }

  const handleGenerateDocs = async () => {
    const id = apiResult?.generationId
    if (!id || isGeneratingDocs || docsGenerated) return
    setIsGeneratingDocs(true)
    try {
      await generateDocs(id, accessToken)
      setDocsGenerated(true)
      // Reload code bundle so the Code tab shows JSDoc-annotated files
      try {
        const updatedBundle = await getGenerationCode(id, accessToken)
        setApiResult(prev => prev ? { ...prev, codeBundle: updatedBundle } : prev)
      } catch (_) {}
      // Switch to Code tab so user sees the JSDoc comments immediately
      setCenterTab('code')
    } catch (e: any) {
      console.error('Docs generation failed:', e)
    } finally {
      setIsGeneratingDocs(false)
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

    // Check if another user holds the lock
    if (projectLock && projectLock.lockedBy !== username) {
      setChatMessages((prev) => [...prev, {
        role: 'ai' as const,
        text: `Locked by ${projectLock.lockedBy} — please wait until they finish editing.`,
      }])
      return
    }

    lockProject()

    const userText = val
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }])
    setChatInput('')
    setSelectedZone(null)
    setIsChatLoading(true)

    try {
      // Pass empty filePath so the backend auto-detects which file to edit
      const resp = await editFile(generationId, '', val, accessToken, selectedModel)

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
      unlockProject()
    }
  }

  const logColor: Record<string, string> = {
    error: '#f87171',
    warn: '#fbbf24',
    success: '#38bdf8',
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
          <rect width="320" height="180" fill="#f8fafc" />
          <rect x="0" y="0" width="56" height="180" fill="#ffffff" />
          <rect x="8" y="16" width="40" height="6" rx="3" fill="#e2e8f0" />
          <rect x="8" y="30" width="40" height="6" rx="3" fill="#019cda" opacity="0.8" />
          <rect x="8" y="44" width="40" height="6" rx="3" fill="#e2e8f0" />
          <rect x="8" y="58" width="40" height="6" rx="3" fill="#e2e8f0" />
          <rect x="8" y="72" width="40" height="6" rx="3" fill="#e2e8f0" />
          <rect x="64" y="10" width="60" height="32" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="70" y="16" width="24" height="4" rx="2" fill="#019cda" opacity="0.7" />
          <rect x="70" y="24" width="16" height="8" rx="2" fill="#1f2937" opacity="0.8" />
          <rect x="132" y="10" width="60" height="32" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="138" y="16" width="24" height="4" rx="2" fill="#10b981" opacity="0.7" />
          <rect x="138" y="24" width="16" height="8" rx="2" fill="#1f2937" opacity="0.8" />
          <rect x="200" y="10" width="60" height="32" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="206" y="16" width="24" height="4" rx="2" fill="#f59e0b" opacity="0.7" />
          <rect x="206" y="24" width="16" height="8" rx="2" fill="#1f2937" opacity="0.8" />
          <rect x="268" y="10" width="44" height="32" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="274" y="16" width="20" height="4" rx="2" fill="#0284c7" opacity="0.7" />
          <rect x="274" y="24" width="12" height="8" rx="2" fill="#1f2937" opacity="0.8" />
          <rect x="64" y="52" width="168" height="80" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="72" y="60" width="50" height="4" rx="2" fill="#e2e8f0" />
          <rect x="72" y="115" width="10" height="14" rx="2" fill="#019cda" opacity="0.5" />
          <rect x="86" y="105" width="10" height="24" rx="2" fill="#019cda" opacity="0.6" />
          <rect x="100" y="95" width="10" height="34" rx="2" fill="#019cda" opacity="0.7" />
          <rect x="114" y="100" width="10" height="29" rx="2" fill="#019cda" opacity="0.65" />
          <rect x="128" y="85" width="10" height="44" rx="2" fill="#019cda" opacity="0.9" />
          <rect x="142" y="92" width="10" height="37" rx="2" fill="#019cda" opacity="0.75" />
          <rect x="156" y="78" width="10" height="51" rx="2" fill="#019cda" />
          <rect x="170" y="88" width="10" height="41" rx="2" fill="#019cda" opacity="0.8" />
          <rect x="184" y="97" width="10" height="32" rx="2" fill="#019cda" opacity="0.7" />
          <rect x="198" y="82" width="10" height="47" rx="2" fill="#019cda" opacity="0.85" />
          <rect x="240" y="52" width="72" height="80" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="276" cy="90" r="22" fill="none" stroke="#019cda" strokeWidth="8" strokeDasharray="69 30" opacity="0.7" />
          <circle cx="276" cy="90" r="22" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="20 79" strokeDashoffset="-69" opacity="0.7" />
          <rect x="64" y="142" width="248" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="72" y="149" width="40" height="4" rx="2" fill="#e2e8f0" />
          <rect x="72" y="158" width="30" height="4" rx="2" fill="#e2e8f0" />
          <rect x="140" y="149" width="30" height="4" rx="2" fill="#e2e8f0" />
          <rect x="140" y="158" width="24" height="4" rx="2" fill="#e2e8f0" />
          <rect x="220" y="149" width="20" height="4" rx="2" fill="#10b981" opacity="0.6" />
        </svg>
      )
      if (p.includes('landing') || p.includes('saas') || p.includes('marketing')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#f8fafc" />
          <rect x="0" y="0" width="320" height="28" fill="#ffffff" />
          <rect x="16" y="10" width="40" height="8" rx="4" fill="#019cda" opacity="0.8" />
          <rect x="120" y="12" width="24" height="5" rx="2" fill="#94a3b8" />
          <rect x="152" y="12" width="24" height="5" rx="2" fill="#94a3b8" />
          <rect x="184" y="12" width="24" height="5" rx="2" fill="#94a3b8" />
          <rect x="264" y="9" width="40" height="10" rx="5" fill="#019cda" opacity="0.8" />
          <rect x="80" y="42" width="160" height="10" rx="5" fill="#1f2937" opacity="0.9" />
          <rect x="96" y="58" width="128" height="6" rx="3" fill="#64748b" opacity="0.5" />
          <rect x="108" y="68" width="104" height="5" rx="2" fill="#94a3b8" opacity="0.3" />
          <rect x="120" y="82" width="36" height="12" rx="6" fill="#019cda" opacity="0.9" />
          <rect x="164" y="82" width="36" height="12" rx="6" fill="#e2e8f0" />
          <rect x="32" y="108" width="72" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="40" y="116" width="24" height="4" rx="2" fill="#019cda" opacity="0.6" />
          <rect x="40" y="124" width="48" height="3" rx="1" fill="#cbd5e1" />
          <rect x="40" y="130" width="40" height="3" rx="1" fill="#cbd5e1" />
          <rect x="124" y="108" width="72" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="132" y="116" width="24" height="4" rx="2" fill="#10b981" opacity="0.6" />
          <rect x="132" y="124" width="48" height="3" rx="1" fill="#cbd5e1" />
          <rect x="132" y="130" width="40" height="3" rx="1" fill="#cbd5e1" />
          <rect x="216" y="108" width="72" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="224" y="116" width="24" height="4" rx="2" fill="#f59e0b" opacity="0.6" />
          <rect x="224" y="124" width="48" height="3" rx="1" fill="#cbd5e1" />
          <rect x="224" y="130" width="40" height="3" rx="1" fill="#cbd5e1" />
        </svg>
      )
      if (p.includes('ecommerce') || p.includes('shop') || p.includes('store') || p.includes('product')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#f8fafc" />
          <rect x="0" y="0" width="320" height="24" fill="#ffffff" />
          <rect x="12" y="8" width="32" height="8" rx="4" fill="#019cda" opacity="0.8" />
          <rect x="260" y="8" width="20" height="8" rx="4" fill="#e2e8f0" />
          <rect x="286" y="8" width="20" height="8" rx="4" fill="#e2e8f0" />
          <rect x="0" y="24" width="70" height="156" fill="#ffffff" />
          <rect x="8" y="32" width="54" height="5" rx="2" fill="#e2e8f0" />
          <rect x="8" y="44" width="40" height="4" rx="2" fill="#cbd5e1" />
          <rect x="8" y="52" width="44" height="4" rx="2" fill="#cbd5e1" />
          <rect x="8" y="60" width="36" height="4" rx="2" fill="#cbd5e1" />
          <rect x="8" y="76" width="54" height="5" rx="2" fill="#e2e8f0" />
          <rect x="8" y="88" width="40" height="4" rx="2" fill="#019cda" opacity="0.6" />
          <rect x="8" y="96" width="44" height="4" rx="2" fill="#cbd5e1" />
          {[0, 1, 2].map(col => [0, 1].map(row => (
            <g key={`${col}-${row}`}>
              <rect x={78 + col * 84} y={30 + row * 74} width="76" height="64" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <rect x={82 + col * 84} y={34 + row * 74} width="68" height="38" rx="4" fill="#f1f5f9" />
              <rect x={86 + col * 84} y={76 + row * 74} width="40" height="4" rx="2" fill="#cbd5e1" />
              <rect x={86 + col * 84} y={83 + row * 74} width="28" height="4" rx="2" fill="#019cda" opacity="0.7" />
            </g>
          )))}
        </svg>
      )
      if (p.includes('portfolio') || p.includes('resume') || p.includes('personal')) return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#f8fafc" />
          <rect x="0" y="0" width="320" height="24" fill="#ffffff" />
          <rect x="16" y="8" width="40" height="8" rx="4" fill="#1f2937" opacity="0.8" />
          <rect x="220" y="10" width="20" height="5" rx="2" fill="#cbd5e1" />
          <rect x="248" y="10" width="20" height="5" rx="2" fill="#cbd5e1" />
          <rect x="276" y="10" width="20" height="5" rx="2" fill="#cbd5e1" />
          <circle cx="160" cy="64" r="22" fill="#f1f5f9" stroke="#019cda" strokeWidth="2" opacity="0.8" />
          <rect x="124" y="92" width="72" height="8" rx="4" fill="#1f2937" opacity="0.8" />
          <rect x="136" y="105" width="48" height="5" rx="2" fill="#019cda" opacity="0.6" />
          <rect x="86" y="125" width="44" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="92" y="131" width="32" height="18" rx="4" fill="#f1f5f9" />
          <rect x="92" y="152" width="24" height="4" rx="2" fill="#cbd5e1" />
          <rect x="138" y="125" width="44" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="144" y="131" width="32" height="18" rx="4" fill="#f1f5f9" />
          <rect x="144" y="152" width="24" height="4" rx="2" fill="#cbd5e1" />
          <rect x="190" y="125" width="44" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="196" y="131" width="32" height="18" rx="4" fill="#f1f5f9" />
          <rect x="196" y="152" width="24" height="4" rx="2" fill="#cbd5e1" />
        </svg>
      )
      return (
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect width="320" height="180" fill="#f8fafc" />
          <rect x="0" y="0" width="320" height="24" fill="#ffffff" />
          <rect x="16" y="8" width="48" height="8" rx="4" fill="#019cda" opacity="0.8" />
          <rect x="246" y="9" width="58" height="7" rx="3" fill="#019cda" opacity="0.5" />
          <rect x="20" y="36" width="130" height="60" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="30" y="46" width="60" height="6" rx="3" fill="#1f2937" opacity="0.8" />
          <rect x="30" y="58" width="100" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="66" width="80" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="74" width="90" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="85" width="36" height="10" rx="5" fill="#019cda" opacity="0.8" />
          <rect x="164" y="36" width="136" height="60" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="174" y="52" width="10" height="28" rx="2" fill="#019cda" opacity="0.5" />
          <rect x="190" y="44" width="10" height="36" rx="2" fill="#019cda" opacity="0.6" />
          <rect x="206" y="50" width="10" height="30" rx="2" fill="#019cda" opacity="0.7" />
          <rect x="222" y="40" width="10" height="40" rx="2" fill="#019cda" opacity="0.8" />
          <rect x="238" y="46" width="10" height="34" rx="2" fill="#019cda" opacity="0.65" />
          <rect x="254" y="36" width="10" height="44" rx="2" fill="#019cda" />
          <rect x="20" y="108" width="280" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="30" y="118" width="50" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="127" width="60" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="136" width="40" height="4" rx="2" fill="#cbd5e1" />
          <rect x="120" y="118" width="50" height="4" rx="2" fill="#cbd5e1" />
          <rect x="120" y="127" width="40" height="4" rx="2" fill="#cbd5e1" />
          <rect x="120" y="136" width="55" height="4" rx="2" fill="#cbd5e1" />
          <rect x="260" y="122" width="28" height="10" rx="5" fill="#019cda" opacity="0.6" />
        </svg>
      )
    }

    const ProjectThumbnail = ({ generationId, prompt }: { generationId: string; prompt?: string }) => {
      const [failed, setFailed] = React.useState(false)
      if (failed) return (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)' }}>
          <CardThumbnail prompt={prompt} />
        </div>
      )
      return (
        <iframe
          src={`/preview/${generationId}/dist/index.html`}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: 1280, height: 900,
            border: 'none',
            transform: 'scale(0.222)',
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: '#fff',
          }}
          sandbox="allow-scripts allow-same-origin"
          tabIndex={-1}
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      )
    }

    const CardFooter = ({
      g,
    }: {
      g: typeof validProjects[0]
    }) => {
      const [editing, setEditing] = React.useState(false)
      const [nameValue, setNameValue] = React.useState(g.name || projectName2(g.prompt))
      const [saving, setSaving] = React.useState(false)
      const [confirmDelete, setConfirmDelete] = React.useState(false)
      const [deleting, setDeleting] = React.useState(false)
      const inputRef = React.useRef<HTMLInputElement>(null)

      React.useEffect(() => {
        if (editing) setTimeout(() => inputRef.current?.select(), 30)
      }, [editing])

      // Sync nameValue when server data changes (after rename + reload)
      React.useEffect(() => {
        if (!editing) setNameValue(g.name || projectName2(g.prompt))
      }, [g.name, g.prompt, editing])

      const saveName = async () => {
        const trimmed = nameValue.trim()
        if (!trimmed || !g.generationId) { setEditing(false); return }
        if (trimmed === (g.name || projectName2(g.prompt))) { setEditing(false); return }
        setSaving(true)
        try {
          await renameGeneration(g.generationId, trimmed, accessToken)
          // Reload history so the name persists from the server into React state
          await loadHistory()
        } catch {
          // revert on failure
          setNameValue(g.name || projectName2(g.prompt))
        } finally {
          setSaving(false)
          setEditing(false)
        }
      }

      const doDelete = async () => {
        if (!g.generationId) return
        setDeleting(true)
        try {
          await deleteGeneration(g.generationId, accessToken)
          await loadHistory()
        } catch { /* ignore */ }
        finally { setDeleting(false); setConfirmDelete(false) }
      }

      return (
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editing ? (
              <input
                ref={inputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void saveName()
                  if (e.key === 'Escape') { setEditing(false); setNameValue(g.name || projectName2(g.prompt)) }
                }}
                onBlur={() => void saveName()}
                style={{ width: '100%', fontSize: 14, fontWeight: 700, color: '#111827', border: 'none', borderBottom: '2px solid #019cda', outline: 'none', background: 'transparent', padding: '1px 0' }}
              />
            ) : (
              <p
                style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                title="Click to rename"
                onClick={() => setEditing(true)}
              >
                {saving ? '…' : (g.name || projectName2(g.prompt))}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 5, verticalAlign: 'middle', opacity: 0.6 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </p>
            )}
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Edited {timeAgo(g.updatedAt || g.createdAt)}</p>
            {(() => {
              const hasMeeting = !!(g as any).meetingAnalysis
              const hasJira = !!(g as any).jiraIssueKey || !!((g as any).jiraIssueKeys?.length)
              if (hasMeeting) return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#f3e8ff', color: '#15395e', border: '1px solid #e9d5ff' }}>
                  🎙 Meeting
                </span>
              )
              if (hasJira) return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                  🔗 Jira
                </span>
              )
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                  💬 Prompt
                </span>
              )
            })()}
          </div>

          {/* Delete */}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                onClick={doDelete}
                disabled={deleting}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? '…' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete project"
              style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#9ca3af' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
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

    const _GRID_COLORS = ['from-[#15395e] to-[#019cda]','from-[#0b64a0] to-teal-500','from-violet-600 to-indigo-600','from-amber-500 to-orange-600','from-[#15395e] to-sky-400','from-[#1c456f] to-stone-500','from-emerald-600 to-teal-500','from-pink-500 to-rose-600','from-violet-600 to-[#019cda]','from-stone-700 to-stone-900','from-[#1a446f] to-[#019cda]']
    const _relTime = (d?: string) => { if (!d) return 'Unknown'; const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); const day = Math.floor(h/24); const w = Math.floor(day/7); if (h < 1) return 'Edited just now'; if (h < 24) return `Edited ${h}h ago`; if (day < 7) return `Edited ${day}d ago`; return `Edited ${w}w ago` }
    const mappedProjects: ProjectItem[] = validProjects.map((g, i) => {
      const hasMeeting = !!g.meetingAnalysis
      const hasJira = !!(g.jiraIssueKey || g.jiraIssueKeys?.length)
      const tag: 'Prompt' | 'Meeting' | 'Jira' = hasMeeting ? 'Meeting' : hasJira ? 'Jira' : 'Prompt'
      const statusMap: Record<string, string> = { COMPLETED: 'Ready for Push', PROCESSING: 'Active Pipeline', FAILED: 'Validated Draft' }
      const agentMap: Record<string, string[]> = { Meeting: ['Meeting Scribe Agent', 'Code Generator Synth'], Jira: ['Jira Backlog Agent', 'Code Generator Synth', 'WCAG Reviewer'], Prompt: ['Prompt Agent', 'Code Generator Synth'] }
      return { id: g.generationId!, title: g.name || projectName2(g.prompt), tag, status: statusMap[g.status ?? ''] ?? 'Draft', version: g.activeVersion ? `v${g.activeVersion}.0` : 'v1.0.0', elements: tag === 'Meeting' ? '10 UI Widgets' : tag === 'Jira' ? '8 Table Views' : '12 Components', wcagScore: '—', editedTime: _relTime(g.updatedAt || g.createdAt), description: g.prompt || 'No description available.', color: _GRID_COLORS[i % _GRID_COLORS.length], agents: agentMap[tag] }
    })

    const isDark = false
    const sidebarText = 'rgba(0,0,0,.55)'
    const sidebarBorder = '#e5e7eb'
    const sidebarLabel = 'rgba(0,0,0,.35)'
    const homeIsActive = homeTab === 'create' && !showCreateForm

    return (
      <div id="onboarding" style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>

        {/* Brand color bar */}
        <div className="talan-color-bar" style={{ display: ideVisible ? 'none' : undefined }}>
          <span style={{ background: '#04081c' }} />
          <span style={{ background: '#0e142e' }} />
          <span style={{ background: '#7c3aed' }} />
          <span style={{ background: '#a78bfa' }} />
          <span style={{ background: '#c4b5fd' }} />
        </div>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, minHeight: '100vh', overflowY: 'auto', background: 'transparent', position: 'relative', display: 'flex' }}>

          {/* ── SHARED SIDEBAR for non-home tabs ── */}
          {!ideVisible && homeTab !== 'create' && (
            <aside style={{ width:256, background:'#04081c', borderRight:'1px solid #1e2a4a', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0, minHeight:'100vh', padding:'18px 14px', userSelect:'none' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:22, flexGrow:1 }}>
                {/* Brand */}
                <div style={{ padding:'4px 6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:17, fontWeight:900, color:'#fff', letterSpacing:'-0.03em' }}>talented</span>
                    <span style={{ width:14, height:4, background:'#7c3aed', borderRadius:2, marginTop:3, display:'inline-block' }} />
                  </div>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,.35)', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'monospace' }}>Client Portal</span>
                </div>
                {/* Workspace pill */}
                <div>
                  <div style={{ fontSize:9, letterSpacing:'0.12em', color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', marginBottom:6, paddingLeft:6 }}>Workspace</div>
                  <div style={{ background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', padding:'10px 12px', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:'rgba(124,58,237,.25)', color:'#c4b5fd', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                      {(firstName || username).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{firstName || username}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.45)', fontFamily:'monospace', fontWeight:600 }}>Standard Workspace</div>
                    </div>
                  </div>
                </div>
                {/* Nav */}
                {homeTab !== 'admin' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {[
                      { id:'create',   label:'Home',                              icon:<Home size={14}/> },
                      { id:'projects', label:`All projects (${validProjects.length})`, icon:<Folder size={14}/> },
                      ...(!isAdmin ? [{ id:'profile', label:'Profile', icon:<User size={14}/> }] : []),
                      ...(isAdmin  ? [{ id:'admin',   label:'Admin Dashboard', icon:<LayoutDashboard size={14}/> }] : []),
                    ].map(item => (
                      <button key={item.id} onClick={() => setHomeTab(item.id as any)}
                        style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:10, fontSize:12, fontWeight: homeTab===item.id?800:500, display:'flex', alignItems:'center', gap:8, border:'none', cursor:'pointer', transition:'all .15s', background: homeTab===item.id?'rgba(124,58,237,.18)':'transparent', color: homeTab===item.id?'#c4b5fd':'rgba(255,255,255,.65)', boxShadow: homeTab===item.id?'inset 0 0 0 1px rgba(124,58,237,.3)':'none' }}>
                        {item.icon}<span style={{ color:'inherit' }}>{item.label}</span>
                        {item.id==='projects' && <span style={{ marginLeft:'auto', fontSize:9, fontFamily:'monospace', fontWeight:700, background:'rgba(124,58,237,.2)', color:'#a78bfa', padding:'1px 6px', borderRadius:6 }}>{validProjects.length}</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* ── ADMIN PORTAL NAV ── */
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <button onClick={() => setHomeTab('create')}
                      style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:10, fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(124,58,237,.25)', cursor:'pointer', background:'rgba(124,58,237,.1)', color:'#c4b5fd', marginBottom:10 }}>
                      <span>←</span><span>Exit Admin Panel</span>
                    </button>
                    <div style={{ fontSize:9, letterSpacing:'0.12em', color:'rgba(255,255,255,.3)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', marginBottom:4, paddingLeft:4 }}>Dashboards</div>
                    {[
                      { id:'Overview',     label:"Vue d'ensemble", icon:'📊' },
                      { id:'Users',        label:'Utilisateurs',   icon:'👥' },
                      { id:'Generations',  label:'Compilations',   icon:'⚡' },
                      { id:'System',       label:'Paramètres',     icon:'🛠️' },
                    ].map(item => (
                      <button key={item.id} onClick={() => setAdminActiveMenu(item.id)}
                        style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:10, fontSize:12, fontWeight: adminActiveMenu===item.id?800:500, display:'flex', alignItems:'center', gap:8, border:'none', cursor:'pointer', transition:'all .15s', background: adminActiveMenu===item.id?'rgba(124,58,237,.18)':'transparent', color: adminActiveMenu===item.id?'#c4b5fd':'rgba(255,255,255,.65)', boxShadow: adminActiveMenu===item.id?'inset 0 0 0 1px rgba(124,58,237,.3)':'none' }}>
                        <span style={{ fontSize:14 }}>{item.icon}</span><span style={{ color:'inherit' }}>{item.label}</span>
                      </button>
                    ))}
                    <div style={{ fontSize:9, letterSpacing:'0.12em', color:'rgba(255,255,255,.3)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', margin:'14px 0 6px', paddingLeft:4 }}>Live Channels</div>
                    <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px 12px', border:'1px solid rgba(255,255,255,.06)', fontSize:10, fontFamily:'monospace', display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,.35)', paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,.07)' }}><span>Channel</span><span>Status</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'rgba(255,255,255,.65)' }}>● Gemini 2.0 Router</span><span style={{ color:'#34d399', fontWeight:600 }}>Online</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'rgba(255,255,255,.65)' }}>● GitLab Webhooks</span><span style={{ color:'#818cf8', fontWeight:600 }}>Active</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'rgba(255,255,255,.65)' }}>● D2C Compiler</span><span style={{ color:'#34d399', fontWeight:600 }}>Idle</span></div>
                    </div>
                  </div>
                )}
                {/* Recents */}
                {validProjects.length > 0 && (
                  <div>
                    <div style={{ fontSize:9, letterSpacing:'0.12em', color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', marginBottom:6, paddingLeft:6 }}>Recents</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                      {validProjects.slice(0, 8).map(g => (
                        <button key={g.generationId}
                          onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}
                          style={{ width:'100%', textAlign:'left', padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'space-between', border:'none', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.55)', transition:'all .15s' }}
                          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.85)'}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)'}}>
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'inherit' }}>{g.name || projectName2(g.prompt)}</span>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(124,58,237,.5)', flexShrink:0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Bottom user */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:14, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(124,58,237,.25)', border:'1px solid rgba(124,58,237,.35)', color:'#c4b5fd', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0, textTransform:'uppercase' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
                    {email && <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>}
                  </div>
                </div>
                {onLogout && (
                  <button onClick={onLogout}
                    style={{ width:'100%', padding:'7px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.55)', fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center', transition:'all .15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,.1)';(e.currentTarget as HTMLButtonElement).style.color='#fca5a5';(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(239,68,68,.25)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)';(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.08)'}}>
                    Sign out →
                  </button>
                )}
              </div>
            </aside>
          )}

          {/* ── CONTENT AREA ── */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>

          {/* ── HOME PAGE ── */}
          {homeTab === 'create' && !showCreateForm && (
            <HomePage
              isAuthenticated={true}
              username={username}
              email={email}
              firstName={firstName}
              lastName={lastName}
              projectCount={validProjects.length}
              recentProjects={history.slice(0, 8).map(item => ({
                id: item.generationId || item.sessionId || '',
                name: projectName2(item.prompt),
                createdAt: item.createdAt || new Date().toISOString()
              }))}
              onCreateProject={() => setShowCreateForm(true)}
              onImportJira={() => setIsJiraModalOpen(true)}
              onImportMeeting={() => setIsMeetingRecorderOpen(true)}
              onImportFigma={() => setIsFigmaModalOpen(true)}
              onSubmitWithPrompt={(prompt) => {
                const autoName = prompt.trim().split(/\s+/).slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'my-app'
                setCustomPrompt(prompt)
                setProjectName(autoName)
                void startBuild(prompt, autoName)
              }}
              isBuilding={isBuilding}
              buildPct={buildPct}
              buildMsg={buildMsg}
              onViewProjects={() => setHomeTab('projects')}
              onViewProfile={() => setHomeTab('profile')}
              onProjectClick={id => { setLoadingProjectId(id); void loadGeneration(id); setShowCreateForm(true) }}
              onLogout={onLogout}
            />
          )}

          {/* ── NEW PROJECT ── */}
          {homeTab === 'create' && (showCreateForm || createMode !== 'scratch') && createMode === 'scratch' && (
            <div className="home-container">
              {/* Extra aurora blobs */}
              <div aria-hidden="true" style={{ position: 'absolute', top: '25%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(1,156,218,.22) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'auroraBlob2 24s ease-in-out infinite' }} />
              <div aria-hidden="true" style={{ position: 'absolute', bottom: '5%', right: '15%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.2) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'auroraBlob4 18s ease-in-out infinite' }} />
              {/* ✦ Sparkles */}
              {[
                { top:'8%',  left:'12%', size:7,  delay:0,    dur:2.8 },
                { top:'15%', left:'72%', size:5,  delay:0.6,  dur:3.2 },
                { top:'22%', left:'88%', size:9,  delay:1.1,  dur:2.5 },
                { top:'38%', left:'6%',  size:6,  delay:0.3,  dur:3.6 },
                { top:'45%', left:'55%', size:4,  delay:1.8,  dur:2.2 },
                { top:'60%', left:'82%', size:8,  delay:0.9,  dur:3.0 },
                { top:'70%', left:'28%', size:5,  delay:2.1,  dur:2.7 },
                { top:'78%', left:'65%', size:7,  delay:0.4,  dur:3.4 },
                { top:'12%', left:'42%', size:4,  delay:1.5,  dur:2.9 },
                { top:'55%', left:'18%', size:6,  delay:0.7,  dur:3.1 },
                { top:'30%', left:'95%', size:5,  delay:1.3,  dur:2.6 },
                { top:'85%', left:'48%', size:8,  delay:0.2,  dur:3.8 },
                { top:'5%',  left:'58%', size:4,  delay:1.9,  dur:2.4 },
                { top:'50%', left:'38%', size:6,  delay:0.8,  dur:3.3 },
                { top:'92%', left:'22%', size:5,  delay:1.6,  dur:2.8 },
              ].map((s, i) => (
                <svg key={i} aria-hidden="true" className="sparkle"
                  style={{ top: s.top, left: s.left, width: s.size, height: s.size, animation: `sparkleDrift ${s.dur}s ${s.delay}s ease-in-out infinite` }}
                  viewBox="0 0 24 24">
                  <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
                    fill="rgba(1,156,218,.7)" />
                </svg>
              ))}
              {/* ── HERO: centered prompt area ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px 40px 80px', position: 'relative', zIndex: 1, boxSizing: 'border-box', width: '100%', minHeight: 'calc(100vh - 160px)' }}>

                {/* Hero heading */}
                <h1 style={{ textAlign: 'center', fontSize: 'clamp(26px,3.2vw,42px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#0f172a', margin: '0 0 8px', animation: 'fadeUp .5s .05s both' }}>
                  What should we build, <span style={{ background: 'linear-gradient(135deg,#019cda,#15395e 50%,#0369a1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{firstName || username}?</span>
                </h1>
                <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', marginBottom: 24, animation: 'fadeUp .5s .1s both', maxWidth: 520 }}>
                  Describe your idea — our AI agents will generate production-ready UI in seconds.
                </p>

                {/* Mode pills */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20, animation: 'fadeUp .5s .15s both', alignItems: 'center' }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .25s', border: '1.5px solid rgba(1,156,218,.5)', background: 'rgba(1,156,218,.12)', color: '#019cda', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(1,156,218,.12)' }}>
                    <Sparkles size={13} /> From Scratch
                  </button>
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value === 'meeting') setIsMeetingRecorderOpen(true)
                      else if (e.target.value === 'jira') setIsJiraModalOpen(true)
                      else if (e.target.value === 'figma') setIsFigmaModalOpen(true)
                      e.target.value = ''
                    }}
                    style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid rgba(255,255,255,.7)', background: 'rgba(255,255,255,.6)', color: '#6b7280', backdropFilter: 'blur(8px)', outline: 'none', transition: 'all .25s', appearance: 'none', WebkitAppearance: 'none', paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                    onFocus={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(1,156,218,.4)'; el.style.background = 'rgba(255,255,255,.8)' }}
                    onBlur={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(255,255,255,.7)'; el.style.background = 'rgba(255,255,255,.6)' }}>
                    <option value="" disabled>⬇ Import...</option>
                    <option value="figma">🎨 From Figma</option>
                    <option value="meeting">🎙 From Meeting</option>
                    <option value="jira">🔗 From Jira</option>
                  </select>
                </div>

                {/* ── Prompt card + pipeline flex row ── */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: (isBuilding || buildPct > 0) ? 1000 : 760, transition: 'max-width .45s cubic-bezier(.4,0,.2,1)', animation: 'fadeUp .5s .25s both' }}>
                <div className="home-form-card" style={{ flex: 1, minWidth: 0 }}>

                  {/* Top row: project name + textarea side by side */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 20px 14px', gap: 12, borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                    {/* Project name pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Project</span>
                      <input
                        placeholder="my-app"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        style={{ width: 110, padding: '2px 8px', fontSize: 13, fontWeight: 600, border: '1px solid rgba(1,156,218,.2)', borderRadius: 6, outline: 'none', background: 'rgba(1,156,218,.04)', color: '#1e293b', fontFamily: 'inherit' }}
                      />
                    </div>
                    {/* Textarea — grows horizontally */}
                    <textarea
                      style={{
                        flex: 1, minHeight: 72, maxHeight: 180, padding: '2px 0',
                        background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                        fontSize: 15, lineHeight: 1.6, color: '#1e293b', fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Ask Talanted to build…"
                      value={customPrompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && customPrompt.trim() && projectName) startBuild() }}
                    />
                    {/* Generate button — inline right */}
                    <button onClick={() => startBuild()} disabled={isBuilding || !projectName || !customPrompt}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0, marginTop: 2, cursor: isBuilding || !projectName || !customPrompt ? 'not-allowed' : 'pointer', background: isBuilding || !projectName || !customPrompt ? '#e2e8f0' : 'linear-gradient(135deg,#019cda,#15395e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', boxShadow: isBuilding || !projectName || !customPrompt ? 'none' : '0 4px 14px rgba(1,156,218,.4)' }}
                      onMouseEnter={e => { if (!isBuilding && projectName && customPrompt) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
                      title="Generate (Ctrl+Enter)">
                      {isBuilding
                        ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        : <Zap size={16} />
                      }
                    </button>
                  </div>

                  {/* Bottom bar: chips + attach */}
                  <div style={{ padding: '10px 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Template chips */}
                    <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                      {[
                        { icon: <LayoutDashboard size={13} />, label: 'Dashboard',  prompt: 'Build a SaaS analytics dashboard with sidebar, KPI cards, Chart.js revenue charts, and user data table' },
                        { icon: <Rocket size={13} />,          label: 'Landing',    prompt: 'Build a modern SaaS landing page with hero section, features grid, pricing table, and CTA' },
                        { icon: <ShoppingCart size={13} />,    label: 'E-commerce', prompt: 'Build an e-commerce store with product grid, filters sidebar, product detail modal, and cart' },
                        { icon: <Briefcase size={13} />,       label: 'Portfolio',  prompt: 'Build a minimal portfolio with hero, skills section, projects showcase, and contact form' },
                      ].map(t => (
                        <button key={t.label} onClick={() => setCustomPrompt(t.prompt)} className="template-chip" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Attach */}
                    <label title="Attach files" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(1,156,218,.06)', border: '1px solid rgba(1,156,218,.15)', cursor: 'pointer', fontSize: 14, flexShrink: 0, transition: 'all .2s', color: '#019cda' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(1,156,218,.12)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(1,156,218,.06)' }}>
                      📎
                      <input id="doc-file-input" type="file" multiple accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.mmd,.excalidraw" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                    </label>

                    {/* Figma import */}
                    <button
                      type="button"
                      title="Importer depuis Figma"
                      onClick={() => setIsFigmaModalOpen(true)}
                      style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: figmaUrl ? 'rgba(1,156,218,.12)' : 'rgba(1,156,218,.06)', border: `1px solid ${figmaUrl ? 'rgba(1,156,218,.4)' : 'rgba(1,156,218,.15)'}`, cursor: 'pointer', fontSize: 14, flexShrink: 0, transition: 'all .2s', color: '#15395e' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(1,156,218,.14)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = figmaUrl ? 'rgba(1,156,218,.12)' : 'rgba(1,156,218,.06)' }}
                    >
                      🎨
                    </button>
                  </div>

                  {/* Attached files chips + Figma chip */}
                  {(attachedFiles.length > 0 || figmaUrl) && (
                    <div style={{ padding: '6px 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {attachedFiles.map((f, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(1,156,218,.08)', border: '1px solid rgba(1,156,218,.2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#019cda' }}>
                          {f.name}
                          <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                      {figmaUrl && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(1,156,218,.08)', border: '1px solid rgba(1,156,218,.25)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#15395e' }}>
                          🎨 {figmaFileName || 'Figma file'}
                          <button onClick={() => { setFigmaUrl(null); setFigmaToken(null); setFigmaFileName(null) }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {isBuilding && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <div style={{ height: 3, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
                        <div className="progress-bar" style={{ height: '100%', borderRadius: 3, width: `${buildPct}%`, background: 'linear-gradient(90deg,#019cda,#0369a1)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                        <span>{buildMsg}</span>
                        <span style={{ fontWeight: 700, color: '#019cda' }}>{Math.floor(buildPct)}%</span>
                      </div>
                    </div>
                  )}

                  {buildError && !isBuilding && (
                    <div style={{ margin: '0 14px 12px', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', color: '#dc2626', fontSize: 13 }}>
                      {buildError} — check My Projects.
                    </div>
                  )}
                </div>

                {/* ── Agent Pipeline panel (appears to the right when building) ── */}
                {(isBuilding || buildPct > 0) && (
                  <div style={{ width: 240, flexShrink: 0, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(20px)', borderRadius: 18, padding: '20px 18px', border: '1px solid rgba(255,255,255,.9)', boxShadow: '0 4px 24px rgba(1,156,218,.1)', animation: 'fadeUp .3s ease' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(1,156,218,.7)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, margin: '0 0 14px' }}>Agent Pipeline</p>
                    {[
                      { icon: '◎', label: 'Planner',  desc: 'Architecture',  pct: 10, color: '#019cda' },
                      { icon: '◈', label: 'Designer', desc: 'Design system', pct: 35, color: '#15395e' },
                      { icon: '</>', label: 'Coder',   desc: 'Code gen',      pct: 60, color: '#0369a1' },
                      { icon: '✓',  label: 'Validator',desc: 'QA check',     pct: 88, color: '#059669' },
                    ].map((a, idx) => {
                      const active = buildPct >= a.pct
                      const running = active && buildPct < (a.pct + 25) && isBuilding
                      const done = buildPct >= (a.pct + 25) || (!isBuilding && active)
                      return (
                        <div key={a.label} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: idx < 3 ? '1px solid rgba(0,0,0,.04)' : 'none', position: 'relative' }}>
                          {idx < 3 && <div style={{ position: 'absolute', left: 13, top: 32, width: 2, height: 20, background: active ? a.color + '30' : '#e5e7eb' }} />}
                          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: active ? a.color : '#f1f5f9', color: active ? '#fff' : '#94a3b8', transition: 'all .4s', boxShadow: running ? `0 4px 14px ${a.color}40` : 'none' }}>
                            {running ? <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : done ? '✓' : a.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: active ? '#1e293b' : '#94a3b8', margin: '0 0 2px' }}>{a.label}</p>
                            <p style={{ fontSize: 11, color: active ? '#64748b' : '#cbd5e1', margin: 0 }}>{a.desc}</p>
                            {running && <span style={{ fontSize: 9, fontWeight: 700, color: a.color, background: a.color + '15', padding: '2px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>● Running</span>}
                            {done && <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>✓ Done</span>}
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ marginTop: 14, padding: 12, background: 'rgba(1,156,218,.05)', borderRadius: 10, border: '1px solid rgba(1,156,218,.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{buildMsg}</span>
                        <span style={{ fontWeight: 700, color: '#019cda' }}>{Math.floor(buildPct)}%</span>
                      </div>
                      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#019cda,#0369a1)', width: buildPct + '%', transition: 'width .3s ease', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                )}

                </div>{/* end flex row */}

                {/* ── placeholder so the old grid is gone ── */}
                <div style={{ display: 'none' }}>

                  {/* LEFT: Agent Pipeline */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(79,70,229,.6)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Agent Pipeline</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { icon: '◎', agent: 'Planner', desc: 'Architecture', pct: 10, color: '#019cda', bg: 'rgba(1,156,218,.07)' },
                        { icon: '◈', agent: 'Designer', desc: 'Design system', pct: 25, color: '#15395e', bg: 'rgba(1,156,218,.07)' },
                        { icon: '</>', agent: 'Coder', desc: 'Code gen', pct: 50, color: '#0369a1', bg: 'rgba(3,105,161,.07)' },
                        { icon: '✓', agent: 'Validator', desc: 'QA check', pct: 90, color: '#059669', bg: 'rgba(5,150,105,.07)' },
                      ].map((a, idx) => {
                        const active = buildPct >= a.pct
                        const running = active && buildPct < (a.pct + 25) && isBuilding
                        return (
                          <div key={a.agent} style={{ flex: 1, borderRadius: 12, padding: '12px 8px', background: active ? a.bg : 'rgba(255,255,255,.65)', border: `1px solid ${active ? a.color + '30' : 'rgba(255,255,255,.8)'}`, transition: 'all .4s', textAlign: 'center', boxShadow: active ? `0 4px 16px ${a.color}20` : '0 2px 8px rgba(0,0,0,.04)', backdropFilter: 'blur(8px)' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: active ? a.color : '#f1f5f9', color: active ? '#fff' : '#94a3b8', boxShadow: active ? `0 4px 12px ${a.color}35` : 'none', transition: 'all .4s' }}>
                              {running ? <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : a.icon}
                            </div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: active ? '#1e293b' : '#94a3b8', margin: '0 0 2px' }}>{a.agent}</p>
                            <p style={{ fontSize: 10, color: active ? '#64748b' : '#cbd5e1', margin: 0 }}>{a.desc}</p>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: running ? a.color : active ? `${a.color}15` : '#f1f5f9', color: running ? '#fff' : active ? a.color : '#cbd5e1' }}>
                              {running ? '⚡ Running' : active ? '✓ Done' : (
                                <><span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: `pulse ${1.2 + idx * 0.3}s ease-in-out infinite` }} /> Ready</>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* RIGHT: Recent Projects */}
                  <div>
                    {validProjects.length > 0 && (<>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(79,70,229,.6)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Recent Projects</p>
                      <button onClick={() => setHomeTab('projects')} style={{ background: 'none', border: 'none', color: '#019cda', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Browse all ({validProjects.length}) →
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {validProjects.slice(0, 6).map(g => {
                        const hasMeeting = !!(g as any).meetingAnalysis
                        const hasJira = !!(g as any).jiraIssueKey || !!((g as any).jiraIssueKeys?.length)
                        const srcEmoji = hasMeeting ? '🎙' : hasJira ? '🔗' : '💬'
                        const srcLabel = hasMeeting ? 'Meeting' : hasJira ? 'Jira' : 'Prompt'
                        return (
                          <div key={g.generationId}
                            className="group"
                            style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 6px rgba(0,0,0,.05)' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7dd3fc'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 28px rgba(1,156,218,.18)' }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e5e7eb'; el.style.transform = ''; el.style.boxShadow = '0 2px 6px rgba(0,0,0,.05)' }}
                            onClick={() => { setLoadingProjectId(g.generationId ?? null); loadGeneration(g.generationId!) }}>
                            {/* Live preview thumbnail */}
                            <div style={{ position: 'relative', height: 150, background: '#f8fafc', overflow: 'hidden' }}>
                              {g.generationId && g.status === 'COMPLETED'
                                ? <ProjectThumbnail generationId={g.generationId} prompt={g.prompt} />
                                : <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)' }}><CardThumbnail prompt={g.prompt} /></div>}
                              {loadingProjectId === g.generationId && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                </div>
                              )}
                              <div className="opacity-0 group-hover:opacity-100" style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,35,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity .18s', zIndex: 5 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 8, background: '#019cda', color: '#fff', boxShadow: '0 4px 16px rgba(1,156,218,.4)' }}>Open →</span>
                              </div>
                            </div>
                            {/* Footer */}
                            <div style={{ padding: '9px 11px 11px', background: '#fff', borderTop: '1px solid #f3f4f6' }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {g.name || projectName2(g.prompt)}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b7280' }}>
                                <span style={{ fontWeight: 600, color: hasMeeting ? '#15395e' : hasJira ? '#ea580c' : '#019cda' }}>{srcEmoji} {srcLabel}</span>
                                <span style={{ color: '#d1d5db' }}>·</span>
                                <span>{timeAgo(g.updatedAt || g.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    </>)}
                  </div>
                </div>

              </div>

              {/* ── BOTTOM: light project panel ── */}
              {validProjects.length > 0 && (() => {
                const recentProjects = recentlyViewedIds
                  .map(id => validProjects.find(p => p.generationId === id))
                  .filter(Boolean) as typeof validProjects
                const panelProjects = homePanelTab === 'recent' ? recentProjects : validProjects
                const displayProjects = panelProjects.slice(0, 6)
                return (
                <div style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px 24px 0 0', padding: '32px 48px 48px', margin: '0 20px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.9)', boxShadow: '0 -4px 32px rgba(1,156,218,.08)' }}>
                  {/* Tabs + Browse all */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,.04)', borderRadius: 10, padding: 3 }}>
                      {(['mine', 'recent'] as const).map(tab => (
                        <button key={tab} onClick={() => setHomePanelTab(tab)}
                          style={{ padding: '6px 18px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all .15s',
                            fontWeight: homePanelTab === tab ? 600 : 500,
                            background: homePanelTab === tab ? '#fff' : 'transparent',
                            color: homePanelTab === tab ? '#1f2937' : '#9ca3af',
                            boxShadow: homePanelTab === tab ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                          }}>
                          {tab === 'mine' ? 'My projects' : 'Recently viewed'}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setHomeTab('projects')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#019cda', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '.7'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                      Browse all ({validProjects.length}) →
                    </button>
                  </div>
                  {/* Cards grid */}
                  {homePanelTab === 'recent' && recentProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>👁</div>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>No recently viewed projects yet</p>
                      <p style={{ fontSize: 12, margin: '4px 0 0', color: '#d1d5db' }}>Click any project to track it here</p>
                    </div>
                  ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    {displayProjects.map(g => {
                      const hasMeeting = !!(g as any).meetingAnalysis
                      const hasJira = !!(g as any).jiraIssueKey || !!((g as any).jiraIssueKeys?.length)
                      const srcEmoji = hasMeeting ? '🎙' : hasJira ? '🔗' : '💬'
                      const srcLabel = hasMeeting ? 'Meeting' : hasJira ? 'Jira' : 'Prompt'
                      return (
                        <div key={g.generationId}
                          className="group"
                          style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all .25s cubic-bezier(.4,0,.2,1)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7dd3fc'; el.style.transform = 'translateY(-5px) scale(1.01)'; el.style.boxShadow = '0 20px 48px rgba(1,156,218,.18)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e5e7eb'; el.style.transform = ''; el.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)' }}
                          onClick={() => {
                            setLoadingProjectId(g.generationId ?? null)
                            if (g.generationId) {
                              const updated = [g.generationId, ...recentlyViewedIds.filter(id => id !== g.generationId)].slice(0, 12)
                              setRecentlyViewedIds(updated)
                              localStorage.setItem('talanted_recent_views', JSON.stringify(updated))
                            }
                            loadGeneration(g.generationId!)
                          }}>
                          <div style={{ position: 'relative', height: 200, background: '#f8fafc', overflow: 'hidden' }}>
                            {g.generationId && g.status === 'COMPLETED'
                              ? <ProjectThumbnail generationId={g.generationId} prompt={g.prompt} />
                              : <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)' }}><CardThumbnail prompt={g.prompt} /></div>}
                            {loadingProjectId === g.generationId && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                <div style={{ width: 22, height: 22, border: '2px solid rgba(1,156,218,.25)', borderTopColor: '#019cda', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              </div>
                            )}
                            <div className="opacity-0 group-hover:opacity-100" style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,40,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity .2s', zIndex: 5, backdropFilter: 'blur(2px)' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, padding: '9px 24px', borderRadius: 10, background: '#fff', color: '#019cda', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>Open →</span>
                            </div>
                          </div>
                          <div style={{ padding: '14px 18px 16px', background: '#fff', borderTop: '1px solid #f3f4f6' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.name || projectName2(g.prompt)}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af' }}>
                              <span style={{ fontWeight: 600, color: hasMeeting ? '#15395e' : hasJira ? '#ea580c' : '#019cda' }}>{srcEmoji} {srcLabel}</span>
                              <span>·</span>
                              <span>{timeAgo(g.updatedAt || g.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>
                )
              })()}
            </div>
          )}

          {/* ── MY PROJECTS ── */}
          {homeTab === 'projects' && (
            <div style={{ padding: '32px 24px 80px' }}>


              <MyProjectsGridHub
                initialProjects={mappedProjects}
                initialSelectedProjectId={activeProjectId || undefined}
                onSelectProject={id => { setLoadingProjectId(id); void loadGeneration(id) }}
                onOpenInIDE={id => { setLoadingProjectId(id); void loadGeneration(id) }}
                onDeleteProject={async id => { await deleteGeneration(id, accessToken); void loadHistory() }}
              />
            </div>
          )}


          {/* ── ADMIN DASHBOARD ── */}
          {homeTab === 'admin' && isAdmin && (
            <AdminDashboard
              onBackToWorkspace={() => setHomeTab('create')}
              activeMenu={adminActiveMenu}
              onMenuChange={setAdminActiveMenu}
              accessToken={accessToken}
            />
          )}

          {/* ── PROFILE ── */}
          {homeTab === 'profile' && (
            <>
              <div style={{ padding: '40px 0 80px' }}>
                <AccountSettings accessToken={accessToken} />
              </div>
            </>
          )}

          </div>{/* ── END CONTENT AREA ── */}
        </main>

        {/* Build Success Overlay — only shown right after a build, dismissed on any action */}
        {showSuccessOverlay && !ideVisible && (
          <div
            onClick={() => setShowSuccessOverlay(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,.88)', backdropFilter: 'blur(20px)' }}
          >
            {/* Ambient glow */}
            <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(1,156,218,.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative', borderRadius: 24, padding: '44px 40px 36px', maxWidth: 400, width: '90%',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(15,23,42,.98), rgba(30,27,75,.95))',
                border: '1px solid rgba(1,156,218,.25)',
                boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 80px rgba(0,0,0,.6), 0 0 60px rgba(1,156,218,.12)',
              }}
            >
              {/* Checkmark ring */}
              <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 24px' }}>
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0 }}>
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#019cda" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                  <circle cx="36" cy="36" r="33" fill="rgba(1,156,218,.1)" stroke="url(#ringGrad)" strokeWidth="1.5" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#ringGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#019cda" />
                        <stop offset="100%" stopColor="#0369a1" />
                      </linearGradient>
                    </defs>
                    <polyline points="20 6 9 17 4 12" stroke="url(#checkGrad)" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8 }}>
                Generation Complete
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                App Generated!
              </h2>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 28px', lineHeight: 1.6 }}>
                Your project is ready to explore in the editor.
              </p>

              {/* Quality score pill if available */}
              {liveScores?.globalScore != null && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(1,156,218,.12)', border: '1px solid rgba(1,156,218,.25)', marginBottom: 24 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>Quality Score: {liveScores.globalScore}/100</span>
                </div>
              )}

              {/* Primary CTA */}
              <button
                onClick={() => { setShowSuccessOverlay(false); setIdeVisible(true) }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                  background: 'linear-gradient(135deg, #019cda, #0369a1)',
                  color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 10,
                  boxShadow: '0 4px 24px rgba(1,156,218,.4)',
                  transition: 'opacity .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Open Editor
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              {/* Secondary: ZIP download */}
              {apiResult?.generationId && (
                <button
                  onClick={() => { downloadGenerationZip(apiResult!.generationId!, accessToken); setShowSuccessOverlay(false) }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    background: 'rgba(255,255,255,.04)', color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', marginBottom: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background .2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Project ZIP
                </button>
              )}

              {/* Dismiss */}
              <button
                onClick={() => setShowSuccessOverlay(false)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', marginTop: 2, transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                Back to workspace
              </button>
            </div>
          </div>
        )}

        {/* Meeting Recorder — available from the create page */}
        <MeetingRecorder
          isOpen={isMeetingRecorderOpen}
          onClose={() => setIsMeetingRecorderOpen(false)}
          onRequirementsExtracted={(prompt, analysis) => {
            setCustomPrompt(prompt)
            setPendingMeetingAnalysis(analysis)
            setIsMeetingRecorderOpen(false)
          }}
        />
        <JiraImportPage
          isOpen={isJiraModalOpen}
          onClose={() => setIsJiraModalOpen(false)}
          accessToken={accessToken}
        />

        <FigmaImportModal
          isOpen={isFigmaModalOpen}
          onClose={() => setIsFigmaModalOpen(false)}
          accessToken={accessToken}
          onImport={(url, token, fileName) => {
            setFigmaUrl(url)
            setFigmaToken(token)
            setFigmaFileName(fileName)
            // Auto-generate immediately — pass url/token directly to bypass React state batching
            const autoPrompt = `Generate a React UI that faithfully reproduces the "${fileName}" Figma design. Implement every visible screen, component, and interaction.`
            const autoName = fileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 28) || 'figma-ui'
            setCustomPrompt(autoPrompt)
            setProjectName(autoName)
            setShowCreateForm(false)  // stay on HomePage so the Scoping Dashboard is shown
            setHomeTab('create')
            void startBuild(autoPrompt, autoName, url, token)
          }}
        />
      </div>
    )
  }

  // IDE UI — real logic wired into MultiAgentGenerator slots
  const _ideAppName = (apiResult as any)?.name || (apiResult as any)?.prompt?.slice(0, 40) || projectName || 'My Project'

  // ── pre-compute meeting panel ──
  let _meetingPanel: React.ReactNode = null
  if (selectedGeneration?.meetingAnalysis) {
    let ma: any = null
    try { ma = JSON.parse(selectedGeneration.meetingAnalysis) } catch { /**/ }
    if (ma) {
      const funcReqs: any[] = ma.functional_requirements || ma.requirements || []
      const nfReqs: any[] = ma.non_functional_requirements || []
      const arch = ma.system_architecture
      const meetingSummary = ma.summary
      const ambiguities: any[] = ma.ambiguities || []
      const risks: any[] = ma.risk_areas || []
      const questions: any[] = ma.clarification_questions || []
      const getMeetingText = (item: any) => typeof item === 'string' ? item : (item.description || item.text || item.insight || item.question || item.area || '')
      const mSec: React.CSSProperties = { marginBottom: 20 }
      const mHead: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5480ba', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }
      const mTag = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: color, color: '#fff', marginLeft: 4 })
      _meetingPanel = (
        <div style={{ padding: '16px 14px' }}>
          {meetingSummary?.overview && <div style={mSec}><div style={mHead}>Overview</div><p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>{meetingSummary.overview}</p></div>}
          {funcReqs.length > 0 && <div style={mSec}><div style={mHead}>Functional Requirements <span style={mTag('#10b981')}>{funcReqs.length}</span></div><ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>{funcReqs.map((r: any, i: number) => <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{getMeetingText(r)}{r.priority && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>({r.priority})</span>}</li>)}</ul></div>}
          {nfReqs.length > 0 && <div style={mSec}><div style={mHead}>Non-Functional <span style={mTag('#019cda')}>{nfReqs.length}</span></div><ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>{nfReqs.map((r: any, i: number) => <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{getMeetingText(r)}</li>)}</ul></div>}
          {arch?.architecture_style && <div style={mSec}><div style={mHead}>Architecture</div><p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px' }}><strong>Style:</strong> {arch.architecture_style}</p>{arch.system_layers?.length > 0 && <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px' }}><strong>Layers:</strong> {arch.system_layers.join(', ')}</p>}</div>}
          {ambiguities.length > 0 && <div style={mSec}><div style={mHead}>Ambiguities <span style={mTag('#f59e0b')}>{ambiguities.length}</span></div><ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>{ambiguities.map((a: any, i: number) => <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{getMeetingText(a)}</li>)}</ul></div>}
          {risks.length > 0 && <div style={mSec}><div style={mHead}>Risk Areas <span style={mTag('#ef4444')}>{risks.length}</span></div><ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>{risks.map((r: any, i: number) => <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{getMeetingText(r)}</li>)}</ul></div>}
          {questions.length > 0 && <div style={mSec}><div style={mHead}>Open Questions <span style={mTag('#0284c7')}>{questions.length}</span></div><ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>{questions.map((q: any, i: number) => <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{getMeetingText(q)}</li>)}</ul></div>}
          {ma.completeness_score != null && <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}><span style={{ fontSize: 12, color: '#64748b' }}>Completeness: </span><strong style={{ fontSize: 14, color: '#5480ba' }}>{ma.completeness_score}%</strong></div>}
        </div>
      )
    }
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <MultiAgentGenerator
          appName={_ideAppName}
          onBackToDashboard={() => { setIdeVisible(false); setHomeTab('projects') }}
          fileExplorer={<>{renderTreeNodes(effectiveTree, 0)}</>}
          fileCount={fileCount}
          onInspect={() => { setInspectMode(p => !p); setCenterTab('preview') }}
          inspectMode={inspectMode}
          centerTab={centerTab}
          setCenterTab={setCenterTab}
          centerContent={{
            preview: (
              <Preview
                deviceMode={deviceMode}
                setDeviceMode={setDeviceMode}
                previewScale={previewScale}
                setPreviewScale={setPreviewScale}
                previewSrcDoc={previewSrcDoc}
                builtProjectUrl={builtProjectUrl}
                buildPct={buildPct}
                isBuilding={isBuilding}
                buildMsg={buildMsg}
                buildError={buildError}
                onRepair={handleRepair}
                isRepairing={isRepairing}
                inspectMode={inspectMode}
                setInspectMode={setInspectMode}
                selectedZone={selectedZone}
                hoverZoneBox={hoverZoneBox}
                previewReloadCount={previewReloadCount}
                onElementSelected={handleElementSelected}
                onStyleChange={handleStyleChange}
                previewOverrideCSS={previewOverrideCSS}
              />
            ),
            code: (
              <CodeViewer
                tree={tree}
                setTree={setTree}
                activeFileId={activeFileId}
                setActiveFileId={setActiveFileId}
                effectiveFileContents={effectiveFileContents}
              />
            ),
            quality: (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                {apiResult?.generationId && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flex: 1 }}>{liveScores ? 'Live audit results' : 'Latest saved scores'}</span>
                    <button onClick={handleGenerateDocs} disabled={isGeneratingDocs || docsGenerated} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: docsGenerated ? '#ecfdf5' : '#fff', color: docsGenerated ? '#059669' : '#374151', fontSize: 12, fontWeight: 600, cursor: docsGenerated ? 'default' : isGeneratingDocs ? 'wait' : 'pointer' }}>
                      {isGeneratingDocs ? '⏳' : docsGenerated ? '✅' : '📄'} {isGeneratingDocs ? 'Generating…' : docsGenerated ? 'Docs Ready' : 'Generate Docs'}
                    </button>
                    <button onClick={() => downloadCleanZip(apiResult!.generationId!, accessToken)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #019cda, #0369a1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      📦 Clean Stack ZIP
                    </button>
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <QualityScores
                    scores={liveScores ?? { globalScore: selectedGeneration?.globalScore, semanticFidelity: selectedGeneration?.semanticFidelity, codeQuality: selectedGeneration?.codeQuality, completeness: selectedGeneration?.completeness, accessibility: selectedGeneration?.accessibility, visualRichness: selectedGeneration?.visualRichness }}
                    reasoning={liveReasoning ?? undefined}
                    generationId={apiResult?.generationId}
                    onRepair={handleRepair}
                    onEvaluate={handleRepair}
                    isRepairing={isRepairing}
                  />
                </div>
              </div>
            ),
            accessibility: (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                {(apiResult?.generationId || selectedGenerationId) && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flex: 1 }}>WCAG 2.1 AA Audit</span>
                    <button onClick={handleGenerateAccessibility} disabled={isGeneratingAccessibility} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isGeneratingAccessibility ? 'wait' : 'pointer' }}>
                      {isGeneratingAccessibility ? '⏳ Auditing…' : '♿ Run Audit'}
                    </button>
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <AccessibilityReport
                    report={accessibilityReport}
                    generationId={apiResult?.generationId ?? selectedGenerationId ?? undefined}
                    accessToken={accessToken}
                    onGenerate={handleGenerateAccessibility}
                    isGenerating={isGeneratingAccessibility}
                    onFixApplied={() => setPreviewReloadCount(c => c + 1)}
                  />
                </div>
              </div>
            ),
          }}
          rightTab={rightTab as any}
          setRightTab={(t) => { setRightTab(t as any); if (t === 'versions' && selectedGenerationId) void loadVersions(selectedGenerationId) }}
          hasMeetingTab={!!selectedGeneration?.meetingAnalysis}
          rightContent={{
            chat: (
              <ChatPanel
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                selectedGenerationId={selectedGenerationId}
                selectedZone={selectedZone}
                diffVisible={diffVisible}
                setDiffVisible={setDiffVisible}
                diffEdits={diffEdits}
                setDiffEdits={setDiffEdits}
                accessToken={accessToken || ''}
                selectedModel={selectedModel}
                onFileUpdated={(newMessages, edits) => {
                  setChatMessages(newMessages)
                  setDiffEdits(edits)
                  if (edits.length > 0) { setPreviewReloadCount(c => c + 1); setInspectMode(false) }
                  if (selectedGenerationId) void loadVersions(selectedGenerationId)
                }}
                prefillMessage={chatPrefill}
                onPrefillUsed={() => setChatPrefill('')}
                onClearZone={() => setSelectedZone(null)}
                onPreviewOverride={setPreviewOverrideCSS}
                projectLock={projectLock}
                onEditStart={lockProject}
                onEditEnd={unlockProject}
              />
            ),
            versions: (
              <div style={{ padding: '4px 12px 16px' }}>
                {!selectedGenerationId
                  ? <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>No project selected</div>
                  : (
                    <VersionHistory
                      versions={versions}
                      versionsLoading={versionsLoading}
                      versionsError={versionsError}
                      selectedGenerationId={selectedGenerationId}
                      onRollback={async (id, ver) => { await doRollback(id, ver); setPreviewReloadCount(c => c + 1) }}
                      onRefresh={() => void loadVersions(selectedGenerationId)}
                    />
                  )
                }
              </div>
            ),
            meeting: _meetingPanel,
          }}
          rightHeader={activeProjectId ? (
            <CollaborationPanel
              projectId={activeProjectId}
              userName={username}
              connected={collabConnected}
              activeUsers={collabUsers}
              projectLock={projectLock}
              isOwner={(() => { const ownerId = selectedGeneration?.userId ?? (apiResult as any)?.userId; return !ownerId || ownerId === userSub })()}
              accessToken={accessToken}
            />
          ) : undefined}
          isTedOpen={isTedOpen}
          onTedOpen={() => { setIsTedOpen(true) }}
          onTedClose={() => setIsTedOpen(false)}
          tedAccessToken={accessToken}
          tedGenerationId={selectedGenerationId || undefined}
          tedCurrentFile={currentEditingFile || undefined}
          tedFileContent={effectiveFileContents.get(currentEditingFile || '')?.content || ''}
          tedAllFiles={Array.from(effectiveFileContents.entries()).map(([path, file]) => ({ path, content: file.content || '' }))}
          onTedFileApplied={() => {
            if (selectedGenerationId) {
              void loadGeneration(selectedGenerationId)
              setPreviewReloadCount(c => c + 1)   // force iframe reload
            }
          }}
          shareToken={shareToken}
          shareLink={shareToken ? `${window.location.origin}/share/${shareToken}` : undefined}
          isSharing={isSharing}
          onShareCreate={async () => {
            if (!apiResult?.generationId) return;
            setIsSharing(true);
            try { const { shareToken: tok } = await shareProject(apiResult.generationId, accessToken); setShareToken(tok) } catch { /**/ } finally { setIsSharing(false) }
          }}
          onRevoke={async () => {
            if (!apiResult?.generationId) return;
            try { await unshareProject(apiResult.generationId, accessToken); setShareToken(null) } catch { /**/ }
          }}
          onZip={(!isAdmin && !!apiResult?.generationId) ? () => downloadGenerationZip(apiResult!.generationId!, accessToken) : undefined}
          onGitlab={(!isAdmin && !!apiResult?.generationId) ? () => setIsPushGitLabModalOpen(true) : undefined}
          onDeploy={(!isAdmin && !!apiResult?.generationId) ? () => setIsDeployModalOpen(true) : undefined}
          onMeeting={(!isAdmin && !!apiResult?.generationId) ? () => setIsMeetingRecorderOpen(true) : undefined}
          isAdmin={isAdmin}
          modals={(
            <>
              <MeetingRecorder
                isOpen={isMeetingRecorderOpen}
                onClose={() => setIsMeetingRecorderOpen(false)}
                onRequirementsExtracted={async (prompt, analysis) => {
                  setIsMeetingRecorderOpen(false)
                  if (selectedGenerationId) {
                    try { await attachMeetingAnalysis(selectedGenerationId, analysis, accessToken); await loadGeneration(selectedGenerationId); setRightTab('meeting') } catch { /**/ }
                  } else { setCustomPrompt(prompt); setPendingMeetingAnalysis(analysis) }
                }}
              />
              <PushGitLabModal
                isOpen={isPushGitLabModalOpen}
                onClose={() => setIsPushGitLabModalOpen(false)}
                generationId={selectedGenerationId || ''}
                accessToken={accessToken}
              />
              {isDeployModalOpen && selectedGenerationId && (
                <DeployModal
                  generationId={selectedGenerationId}
                  accessToken={accessToken}
                  existingDeployUrl={liveDeployUrl ?? selectedGeneration?.deployUrl}
                  onClose={() => setIsDeployModalOpen(false)}
                  onDeployed={url => { setLiveDeployUrl(url); setIsDeployModalOpen(false) }}
                />
              )}
              {lastVersionSaved && (
                <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 70, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(15,23,42,.96), rgba(30,27,75,.94))', border: '1px solid rgba(1,156,218,.35)', boxShadow: '0 8px 32px rgba(0,0,0,.4)', animation: 'fadeUp .25s ease' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(1,156,218,.15)', border: '1px solid rgba(1,156,218,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Version saved</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>View in Versions tab · rollback anytime</div>
                  </div>
                  <button onClick={() => setLastVersionSaved(null)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </>
          )}
        />
        {/* ── legacy IDE hidden layer (kept for state continuity — UI now in MultiAgentGenerator) ── */}
        <div id="ide" className="flex flex-col" style={{ height: '100vh', display: 'none' }}>
          <div
            className="flex items-center gap-3 px-4 shrink-0"
            style={{ height: 56, background: 'rgba(255,255,255,.95)', borderBottom: '1px solid rgba(226,232,240,.8)', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02)', backdropFilter: 'blur(8px)' }}
          >
            {/* Home button */}
            <button
              onClick={() => { setIdeVisible(false); setHomeTab('projects') }}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .25s', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(84,128,186,.12)'; e.currentTarget.style.borderColor = '#cbd5e1' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.04)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
              type="button"
              title="Back to Home"
            >
              ← Home
            </button>
            <div className="w-px h-6" style={{ background: 'linear-gradient(to bottom, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)', margin: '0 8px' }} />
            <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #5480ba 0%, #6ba3d9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
              AIEditor
            </span>
            {selectedGeneration && (
              <span className="mono" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginLeft: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedGeneration.name || (selectedGeneration.prompt ? selectedGeneration.prompt.split(' ').slice(0, 4).join(' ') + '…' : projectName)}
              </span>
            )}
            <div className="flex-1" />
            <span className="mono" style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', color: '#3b82f6', fontWeight: 600, boxShadow: '0 1px 2px rgba(59,130,246,.08)' }}>
              {previewSrcDoc ? 'HTML/CSS' : 'React + Vite'}
            </span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', marginLeft: 12, boxShadow: '0 0 0 3px rgba(16,185,129,.15)' }} />
            <span className="mono" style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>
              localhost:5173
            </span>

            {/* TED Button */}
            {!isAdmin && <button
              onClick={() => setIsTedOpen(true)}
              style={{
                padding: '8px 16px',
                marginLeft: 12,
                borderRadius: 10,
                border: '1px solid #dbeafe',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#3b82f6',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .25s',
                boxShadow: '0 1px 2px rgba(59,130,246,.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,.15)'
                e.currentTarget.style.borderColor = '#93c5fd'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(59,130,246,.08)'
                e.currentTarget.style.borderColor = '#dbeafe'
              }}
              type="button"
              title="Open TED Assistant"
            >
              <Bot size={14} /> TED
            </button>}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div
              className="flex flex-col shrink-0"
              style={{ width: 280, borderRight: '1px solid rgba(226,232,240,.6)', background: 'linear-gradient(to bottom, #fafbfc 0%, #f8fafc 100%)', boxShadow: '2px 0 8px rgba(0,0,0,.02)' }}
            >
              <div className="flex items-center px-4 pt-4 pb-3">
                <span
                  className="mono uppercase"
                  style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}
                >
                  Explorer
                </span>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">{renderTreeNodes(effectiveTree, 0)}</div>
              <div className="px-4 py-3" style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                <span className="mono" style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                  {fileCount} files
                </span>
              </div>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden" style={{ borderRight: '1px solid rgba(226,232,240,.6)', background: '#ffffff' }}>
              <div
                style={{ height: 54, borderBottom: '1px solid rgba(226,232,240,.6)', background: 'rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', gap: 2, padding: '0 20px', boxShadow: '0 1px 2px rgba(0,0,0,.02)' }}
              >
                {([
                  { id: 'preview', label: 'Preview', icon: <Eye size={13} /> },
                  { id: 'code', label: 'Code', icon: <Code2 size={13} /> },
                  { id: 'quality', label: 'Quality', icon: <Star size={13} /> },
                  { id: 'accessibility', label: 'Accessibility', icon: <CheckCircle2 size={13} /> },
                ] as const).filter(t => !isAdmin || t.id === 'preview' || t.id === 'code').map((t) => {
                  const active = centerTab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCenterTab(t.id)}
                      type="button"
                      style={{
                        position: 'relative', padding: '0 20px', height: 38, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                        background: active ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : 'transparent',
                        color: active ? '#019cda' : '#94a3b8',
                        transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: 10,
                        boxShadow: active ? '0 2px 8px rgba(1,156,218,.12)' : 'none'
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc' } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' } }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{t.icon}{t.label}</span>
                      {active && (
                        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, background: 'linear-gradient(90deg, #019cda, #0369a1)', borderRadius: 3 }} />
                      )}
                    </button>
                  )
                })}

                <div className="flex-1" />


                {/* Zoom controls */}
                <div className="flex items-center gap-2" style={{ marginLeft: 8 }}>
                  <button
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: previewScale <= 0.3 ? '#f1f5f9' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0', color: previewScale <= 0.3 ? '#cbd5e1' : '#64748b', transition: 'all .2s'
                    }}
                    onClick={() => {
                      setPreviewScale(s => Math.max(0.3, s - 0.1));
                      setUserScale(Math.max(0.3, previewScale - 0.1));
                    }}
                    disabled={previewScale <= 0.3}
                    title="Zoom out"
                    type="button"
                  >
                    −
                  </button>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: '#64748b', minWidth: 45, textAlign: 'center',
                    background: '#f1f5f9', padding: '4px 8px', borderRadius: 6
                  }}>
                    {Math.round(previewScale * 100)}%
                  </span>
                  <button
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: previewScale >= 1.5 ? '#f1f5f9' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0', color: previewScale >= 1.5 ? '#cbd5e1' : '#64748b', transition: 'all .2s'
                    }}
                    onClick={() => {
                      setPreviewScale(s => Math.min(1.5, s + 0.1));
                      setUserScale(Math.min(1.5, previewScale + 0.1));
                    }}
                    disabled={previewScale >= 1.5}
                    title="Zoom in"
                    type="button"
                  >
                    +
                  </button>
                </div>

                <div className="w-px h-6" style={{ background: 'linear-gradient(to bottom, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)', margin: '0 12px' }} />

                <button
                  style={{
                    width: 38, height: 38, borderRadius: 10, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', color: '#64748b', transition: 'all .25s',
                    boxShadow: '0 1px 2px rgba(0,0,0,.04)'
                  }}
                  onClick={() => setPreviewReloadCount(c => c + 1)}
                  title="Reload preview"
                  type="button"
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(1,156,218,.15)'; e.currentTarget.style.color = '#019cda' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.04)'; e.currentTarget.style.color = '#64748b' }}
                >
                  ↻
                </button>

                {/* Inspect Mode Toggle */}
                {!isAdmin && (
                <button
                  style={{
                    padding: '0 14px', height: 38, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: inspectMode
                      ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
                      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: inspectMode ? '1px solid #c084fc' : '1px solid #e2e8f0',
                    color: inspectMode ? '#9333ea' : '#64748b',
                    transition: 'all .25s',
                    boxShadow: inspectMode ? '0 2px 8px rgba(147,51,234,.2)' : '0 1px 2px rgba(0,0,0,.04)'
                  }}
                  onClick={() => setInspectMode(!inspectMode)}
                  title="Toggle inspect mode"
                  type="button"
                >
                  🎯 {inspectMode ? 'Inspecting' : 'Inspect'}
                </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: isRepairing ? 'rgba(239,68,68,.15)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)',
                      border: '1px solid #fca5a5', color: '#dc2626',
                      cursor: isRepairing ? 'not-allowed' : 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onClick={handleRepair}
                    disabled={isRepairing}
                    title="Fix build errors with AI"
                    type="button"
                    onMouseEnter={e => { if (!isRepairing) { e.currentTarget.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#dc2626' } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#fef2f2,#fee2e2)'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                  >
                    {isRepairing ? '⟳ Fixing…' : '🔧 Fix'}
                  </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', color: '#fff',
                      cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(34,197,94,.35)'
                    }}
                    onClick={() => downloadGenerationZip(apiResult!.generationId!, accessToken)}
                    title="Download project as ZIP"
                    type="button"
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(34,197,94,.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(34,197,94,.35)' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    ZIP
                  </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: 'linear-gradient(135deg, #fc6d26 0%, #e24329 100%)', border: 'none', color: '#fff',
                      cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(252,109,38,.35)'
                    }}
                    onClick={() => setIsPushGitLabModalOpen(true)}
                    title="Push code to GitLab"
                    type="button"
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(252,109,38,.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(252,109,38,.35)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/></svg>
                    GITLAB
                  </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: liveDeployUrl
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : 'linear-gradient(135deg, #00AD9F 0%, #059669 100%)',
                      border: 'none', color: '#fff',
                      cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(0,173,159,.35)'
                    }}
                    onClick={() => setIsDeployModalOpen(true)}
                    title={liveDeployUrl ? `Deployed: ${liveDeployUrl}` : 'Deploy to Netlify'}
                    type="button"
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,173,159,.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,173,159,.35)' }}
                  >
                    {liveDeployUrl
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    }
                    {liveDeployUrl ? 'LIVE' : 'DEPLOY'}
                  </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <div style={{ position: 'relative' }}>
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: shareToken
                          ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)'
                          : 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
                        border: shareToken ? 'none' : '1px solid #bae6fd',
                        color: shareToken ? '#fff' : '#0284c7',
                        cursor: isSharing ? 'not-allowed' : 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: shareToken ? '0 2px 8px rgba(14,165,233,.35)' : '0 1px 2px rgba(0,0,0,.04)'
                      }}
                      onClick={async () => {
                        if (shareToken) {
                          setShowSharePopover(v => !v)
                          return
                        }
                        setIsSharing(true)
                        try {
                          const { shareToken: tok } = await shareProject(apiResult!.generationId!, accessToken)
                          setShareToken(tok)
                          setShowSharePopover(true)
                        } catch { /* ignore */ } finally { setIsSharing(false) }
                      }}
                      disabled={isSharing}
                      title={shareToken ? 'Shared — click to copy link' : 'Share project publicly'}
                      type="button"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      {isSharing ? 'SHARING…' : shareToken ? 'SHARED' : 'SHARE'}
                    </button>
                    {showSharePopover && shareToken && (
                      <div style={{
                        position: 'absolute', top: 46, right: 0, zIndex: 200,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 16, width: 320,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Share link</span>
                          <button onClick={() => setShowSharePopover(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <input
                            readOnly
                            value={`${window.location.origin}/share/${shareToken}`}
                            style={{ flex: 1, fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#475569', background: '#f8fafc', outline: 'none' }}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`)
                              setShareCopied(true)
                              setTimeout(() => setShareCopied(false), 2000)
                            }}
                            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: shareCopied ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#019cda,#0369a1)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s', minWidth: 64 }}
                          >
                            {shareCopied ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <button
                          onClick={async () => {
                            if (!apiResult?.generationId) return
                            await unshareProject(apiResult.generationId, accessToken)
                            setShareToken(null)
                            setShowSharePopover(false)
                          }}
                          style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Revoke link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!isAdmin && apiResult?.generationId && selectedGeneration?.meetingAnalysis && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: 'linear-gradient(135deg, #15395e 0%, #0369a1 100%)',
                      border: 'none', color: '#fff',
                      cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(1,156,218,.35)'
                    }}
                    onClick={() => setRightTab('meeting')}
                    title="View meeting requirements"
                    type="button"
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(1,156,218,.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(1,156,218,.35)' }}
                  >
                    <Mic size={14} />
                    MEETING
                  </button>
                )}

                {!isAdmin && apiResult?.generationId && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 10,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: 'linear-gradient(135deg, #019cda 0%, #0369a1 100%)', border: 'none', color: '#fff',
                      cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(1,156,218,.35)'
                    }}
                    onClick={() => setIsTedOpen(true)}
                    title="Open TED AI Assistant"
                    type="button"
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(1,156,218,.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(1,156,218,.35)' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg>
                    TED
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto relative" style={{ background: '#f1f5f9', backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                {centerTab === 'preview' ? (
                  <div style={{ position: 'relative', height: '100%', width: '100%' }}>
                    <Preview
                      deviceMode={deviceMode}
                      setDeviceMode={setDeviceMode}
                      previewScale={previewScale}
                      setPreviewScale={setPreviewScale}
                      previewSrcDoc={previewSrcDoc}
                      builtProjectUrl={builtProjectUrl}
                      buildPct={buildPct}
                      isBuilding={isBuilding}
                      buildMsg={buildMsg}
                      buildError={buildError}
                      onRepair={handleRepair}
                      isRepairing={isRepairing}
                      inspectMode={inspectMode}
                      setInspectMode={setInspectMode}
                      selectedZone={selectedZone}
                      hoverZoneBox={hoverZoneBox}
                      previewReloadCount={previewReloadCount}
                      onElementSelected={handleElementSelected}
                      onStyleChange={handleStyleChange}
                      previewOverrideCSS={previewOverrideCSS}
                    />
                    {/* No overlay — inspect mode sends events directly into the iframe via INSPECT_SCRIPT */}
                  </div>
                ) : null}

                {centerTab === 'code' ? (
                  <CodeViewer
                    tree={tree}
                    setTree={setTree}
                    activeFileId={activeFileId}
                    setActiveFileId={setActiveFileId}
                    effectiveFileContents={effectiveFileContents}
                  />
                ) : null}

                {centerTab === 'quality' ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    {/* Quality action bar */}
                    {apiResult?.generationId && (
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flex: 1 }}>
                          {liveScores ? 'Live audit results' : 'Latest saved scores'}
                        </span>
                        <button
                          onClick={handleGenerateDocs}
                          disabled={isGeneratingDocs || docsGenerated}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: docsGenerated ? '#ecfdf5' : '#fff', color: docsGenerated ? '#059669' : '#374151', fontSize: 12, fontWeight: 600, cursor: docsGenerated ? 'default' : isGeneratingDocs ? 'wait' : 'pointer', transition: 'all .2s', opacity: docsGenerated ? 0.85 : 1 }}
                        >
                          {isGeneratingDocs ? '⏳' : docsGenerated ? '✅' : '📄'} {isGeneratingDocs ? 'Generating…' : docsGenerated ? 'Docs Ready' : 'Generate Docs'}
                        </button>
                        <button
                          onClick={() => downloadCleanZip(apiResult!.generationId!, accessToken)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #019cda, #0369a1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          📦 Clean Stack ZIP
                        </button>
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <QualityScores
                        scores={liveScores ?? {
                          globalScore: selectedGeneration?.globalScore,
                          semanticFidelity: selectedGeneration?.semanticFidelity,
                          codeQuality: selectedGeneration?.codeQuality,
                          completeness: selectedGeneration?.completeness,
                          accessibility: selectedGeneration?.accessibility,
                          visualRichness: selectedGeneration?.visualRichness,
                        }}
                        reasoning={liveReasoning ?? undefined}
                        generationId={apiResult?.generationId}
                        onRepair={handleRepair}
                        onEvaluate={handleRepair}
                        isRepairing={isRepairing}
                      />
                    </div>
                  </div>
                ) : null}

                <div style={{ height: '100%', display: centerTab === 'accessibility' ? 'flex' : 'none', flexDirection: 'column', background: '#f8fafc' }}>
                    {(apiResult?.generationId || selectedGenerationId) && (
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flex: 1 }}>
                          WCAG 2.1 AA Audit
                        </span>
                        <button
                          onClick={handleGenerateAccessibility}
                          disabled={isGeneratingAccessibility}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isGeneratingAccessibility ? 'wait' : 'pointer' }}
                        >
                          {isGeneratingAccessibility ? '⏳ Auditing…' : '♿ Run Audit'}
                        </button>
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <AccessibilityReport
                        report={accessibilityReport}
                        generationId={apiResult?.generationId ?? selectedGenerationId ?? undefined}
                        accessToken={accessToken}
                        onGenerate={handleGenerateAccessibility}
                        isGenerating={isGeneratingAccessibility}
                        onFixApplied={() => {
                          setPreviewReloadCount(c => c + 1)
                        }}
                      />
                    </div>
                  </div>

              </div>
            </div>

            {!isAdmin && <div className="flex flex-col shrink-0" style={{ width: 360, background: '#ffffff', borderLeft: '1px solid #e2e8f0', height: '100%', overflow: 'hidden' }}>
              <div style={{ height: 50, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flex: 1, height: '100%' }}>
                  {([
                    { id: 'chat', label: 'Chat' },
                    { id: 'versions', label: 'Versions' },
                    ...(selectedGeneration?.meetingAnalysis ? [{ id: 'meeting', label: 'Meeting' }] : []),
                  ] as { id: RightTab; label: string }[]).map((t) => {
                    const active = rightTab === t.id
                    return (
                      <button
                        key={t.id}
                        style={{
                          flex: 1, height: '100%', border: 'none', cursor: 'pointer', position: 'relative',
                          fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: active ? '#f8fafc' : 'transparent',
                          color: active ? '#5480ba' : '#94a3b8',
                          borderBottom: active ? '3px solid #5480ba' : '3px solid transparent',
                          transition: 'all .2s',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' } }}
                        onClick={() => {
                          setRightTab(t.id)
                          if (t.id === 'versions' && selectedGenerationId) void loadVersions(selectedGenerationId)
                        }}
                        type="button"
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
                {activeProjectId && (
                  <div style={{ paddingRight: 10, flexShrink: 0 }}>
                    <CollaborationPanel
                      projectId={activeProjectId}
                      userName={username}
                      connected={collabConnected}
                      activeUsers={collabUsers}
                      projectLock={projectLock}
                      isOwner={
                        (() => {
                          const ownerId = selectedGeneration?.userId ?? (apiResult as any)?.userId
                          return !ownerId || ownerId === userSub
                        })()
                      }
                      accessToken={accessToken}
                    />
                  </div>
                )}
              </div>

              {rightTab === 'chat' ? (
                <ChatPanel
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isChatLoading={isChatLoading}
                  selectedGenerationId={selectedGenerationId}
                  selectedZone={selectedZone}
                  diffVisible={diffVisible}
                  setDiffVisible={setDiffVisible}
                  diffEdits={diffEdits}
                  setDiffEdits={setDiffEdits}
                  accessToken={accessToken || ''}
                  selectedModel={selectedModel}
                  onFileUpdated={(newMessages, edits) => {
                    setChatMessages(newMessages)
                    setDiffEdits(edits)
                    if (edits.length > 0) {
                      setPreviewReloadCount(c => c + 1)
                      setInspectMode(false)
                    }
                    // Always refresh versions — backend may create one even when filePath is missing from response
                    if (selectedGenerationId) void loadVersions(selectedGenerationId)
                  }}
                  prefillMessage={chatPrefill}
                  onPrefillUsed={() => setChatPrefill('')}
                  onClearZone={() => setSelectedZone(null)}
                  onPreviewOverride={setPreviewOverrideCSS}
                  projectLock={projectLock}
                  onEditStart={lockProject}
                  onEditEnd={unlockProject}
                />
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">


                  {rightTab === 'versions' ? (
                    <div style={{ padding: '4px 12px 16px' }}>
                      {!selectedGenerationId ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>
                          No project selected
                        </div>
                      ) : (
                        <VersionHistory
                          versions={versions}
                          versionsLoading={versionsLoading}
                          versionsError={versionsError}
                          selectedGenerationId={selectedGenerationId}
                          onRollback={async (id, ver) => {
                            await doRollback(id, ver)
                            setPreviewReloadCount(c => c + 1)
                          }}
                          onRefresh={() => void loadVersions(selectedGenerationId)}
                        />
                      )}
                    </div>
                  ) : null}

                  {rightTab === 'meeting' ? (() => {
                    let ma: any = null
                    try { ma = JSON.parse(selectedGeneration?.meetingAnalysis || '') } catch { /* */ }
                    if (!ma) return <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>No meeting data</div>
                    const funcReqs: any[] = ma.functional_requirements || ma.requirements || []
                    const nfReqs: any[] = ma.non_functional_requirements || []
                    const arch = ma.system_architecture
                    const summary = ma.summary
                    const ambiguities: any[] = ma.ambiguities || []
                    const risks: any[] = ma.risk_areas || []
                    const questions: any[] = ma.clarification_questions || []
                    const getText = (item: any) => typeof item === 'string' ? item : (item.description || item.text || item.insight || item.question || item.area || '')
                    const sectionStyle: React.CSSProperties = { marginBottom: 20 }
                    const headStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5480ba', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }
                    const tagStyle = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: color, color: '#fff', marginLeft: 4 })
                    return (
                      <div style={{ padding: '16px 14px' }}>
                        {summary?.overview && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Overview</div>
                            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>{summary.overview}</p>
                          </div>
                        )}
                        {funcReqs.length > 0 && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Functional Requirements <span style={tagStyle('#10b981')}>{funcReqs.length}</span></div>
                            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                              {funcReqs.map((r: any, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>
                                  {getText(r)}
                                  {r.priority && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>({r.priority})</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {nfReqs.length > 0 && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Non-Functional Requirements <span style={tagStyle('#019cda')}>{nfReqs.length}</span></div>
                            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                              {nfReqs.map((r: any, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>{getText(r)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {arch && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Architecture</div>
                            {arch.architecture_style && <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px' }}><strong>Style:</strong> {arch.architecture_style}</p>}
                            {arch.system_layers?.length > 0 && (
                              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px' }}><strong>Layers:</strong> {arch.system_layers.join(', ')}</p>
                            )}
                            {arch.technology_stack && Object.keys(arch.technology_stack).length > 0 && (
                              <div>
                                <p style={{ fontSize: 12, color: '#475569', margin: '0 0 4px' }}><strong>Tech stack:</strong></p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {Object.entries(arch.technology_stack).map(([k, v]: [string, any]) => (
                                    <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#3b82f6' }}>{k}: {v}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {arch.api_endpoints?.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                <p style={{ fontSize: 12, color: '#475569', margin: '0 0 4px' }}><strong>API Endpoints:</strong></p>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {arch.api_endpoints.map((ep: string, i: number) => (
                                    <li key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', marginBottom: 2 }}>{ep}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {ambiguities.length > 0 && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Ambiguities <span style={tagStyle('#f59e0b')}>{ambiguities.length}</span></div>
                            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                              {ambiguities.map((a: any, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>{getText(a)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {risks.length > 0 && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Risk Areas <span style={tagStyle('#ef4444')}>{risks.length}</span></div>
                            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                              {risks.map((r: any, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>{getText(r)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {questions.length > 0 && (
                          <div style={sectionStyle}>
                            <div style={headStyle}>Open Questions <span style={tagStyle('#0284c7')}>{questions.length}</span></div>
                            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                              {questions.map((q: any, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>{getText(q)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ma.completeness_score != null && (
                          <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Completeness score: </span>
                            <strong style={{ fontSize: 14, color: '#5480ba' }}>{ma.completeness_score}%</strong>
                          </div>
                        )}
                      </div>
                    )
                  })() : null}
                </div>
              )}
            </div>}
          </div>

          {/* TED Chatbot */}
          <TedChatBot
            isOpen={isTedOpen}
            onClose={() => setIsTedOpen(false)}
            accessToken={accessToken}
            generationId={selectedGenerationId || undefined}
            currentFile={currentEditingFile || undefined}
            fileCount={apiResult?.codeBundle?.files?.length ?? 0}
            fileContent={effectiveFileContents.get(currentEditingFile || '')?.content || ''}
            allFiles={Array.from(effectiveFileContents.entries()).map(([path, file]) => ({
              path,
              content: file.content || '',
            }))}
            onFileApplied={() => {
              if (selectedGenerationId) loadGeneration(selectedGenerationId)
            }}
          />

          {/* Meeting Recorder — Speech to Requirements */}
          <MeetingRecorder
            isOpen={isMeetingRecorderOpen}
            onClose={() => setIsMeetingRecorderOpen(false)}
            onRequirementsExtracted={async (prompt, analysis) => {
              setIsMeetingRecorderOpen(false)
              if (selectedGenerationId) {
                try {
                  await attachMeetingAnalysis(selectedGenerationId, analysis, accessToken)
                  await loadGeneration(selectedGenerationId)
                  setRightTab('meeting')
                } catch {
                  // silently ignore — meeting data not critical
                }
              } else {
                setCustomPrompt(prompt)
                setPendingMeetingAnalysis(analysis)
              }
            }}
          />

          <PushGitLabModal
            isOpen={isPushGitLabModalOpen}
            onClose={() => setIsPushGitLabModalOpen(false)}
            generationId={selectedGenerationId || ''}
            accessToken={accessToken}
          />

          {isDeployModalOpen && selectedGenerationId && (
            <DeployModal
              generationId={selectedGenerationId}
              accessToken={accessToken}
              existingDeployUrl={liveDeployUrl ?? selectedGeneration?.deployUrl}
              onClose={() => setIsDeployModalOpen(false)}
              onDeployed={url => { setLiveDeployUrl(url); setIsDeployModalOpen(false) }}
            />
          )}

          {/* ── Version Saved Toast ─────────────────────────────────────── */}
          {lastVersionSaved && (
            <div
              style={{
                position: 'fixed', bottom: 24, right: 24, zIndex: 70,
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(15,23,42,.96), rgba(30,27,75,.94))',
                border: '1px solid rgba(1,156,218,.35)',
                boxShadow: '0 8px 32px rgba(0,0,0,.4), 0 0 24px rgba(1,156,218,.15)',
                animation: 'fadeUp .25s ease',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(1,156,218,.15)', border: '1px solid rgba(1,156,218,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Version saved</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>View in Versions tab · rollback anytime</div>
              </div>
              <button
                onClick={() => setLastVersionSaved(null)}
                style={{ marginLeft: 4, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2, lineHeight: 1 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}

        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}
