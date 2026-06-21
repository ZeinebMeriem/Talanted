import React, { useState } from 'react'
import { Home, Folder, User, ChevronDown, BookOpen, Image, ArrowUp, Volume2 } from 'lucide-react'

export interface HomePageProps {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  isAuthenticated?: boolean
  recentProjects?: Array<{ id: string; name: string; createdAt: string }>
  projectCount?: number
  onCreateProject?: () => void
  onViewProjects?: () => void
  onViewProfile?: () => void
  onLogout?: () => void
  onProjectClick?: (projectId: string) => void
  onImportFigma?: () => void
  onImportMeeting?: () => void
  onImportJira?: () => void
}

export const HomePage: React.FC<HomePageProps> = ({
  username = 'User',
  firstName,
  lastName,
  email,
  recentProjects = [],
  projectCount,
  onCreateProject,
  onViewProjects,
  onViewProfile,
  onLogout,
  onProjectClick,
  onImportFigma,
  onImportMeeting,
  onImportJira,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'home' | 'projects' | 'profile'>('home')
  const [promptInput, setPromptInput] = useState('')

  const displayName = firstName
    ? (lastName ? `${firstName} ${lastName}` : firstName)
    : username
  const workspaceName = firstName || username
  const totalProjects = projectCount ?? recentProjects.length
  const latestProject = recentProjects[0]?.name ?? 'Ecommerce Live Dashboard'

  const handleTab = (tab: 'home' | 'projects' | 'profile') => {
    setActiveSidebarTab(tab)
    if (tab === 'projects') onViewProjects?.()
    if (tab === 'profile') onViewProfile?.()
  }

  return (
    <div className="flex min-h-screen w-full font-sans">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 bg-[#091e36] text-white p-4.5 flex flex-col justify-between shrink-0 select-none">

        <div className="space-y-5.5 flex-grow">

          {/* Workspace Header Panel */}
          <div>
            <div className="text-[10px] tracking-wider text-white/50 font-mono font-bold uppercase mb-2">
              Workspace
            </div>
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-3 transition-colors cursor-default">
              <div className="w-8.5 h-8.5 rounded-lg bg-sky-500/20 text-[#019cda] font-extrabold flex items-center justify-center text-sm shadow">
                {workspaceName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-none truncate">{workspaceName}</h4>
                <span className="text-[9px] text-white/60 font-medium font-mono">Standard Workspace</span>
              </div>
            </div>
          </div>

          {/* Nav Tabs List */}
          <div className="space-y-1">
            <button
              onClick={() => handleTab('home')}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                activeSidebarTab === 'home'
                  ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span>Home</span>
              </div>
            </button>

            <button
              onClick={() => handleTab('projects')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                activeSidebarTab === 'projects'
                  ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span>All projects ({totalProjects})</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#0e2137] text-white rounded font-bold shrink-0">
                {totalProjects}
              </span>
            </button>

            <button
              onClick={() => handleTab('profile')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeSidebarTab === 'profile'
                  ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Profile</span>
            </button>
          </div>

          {/* Recents list */}
          {recentProjects.length > 0 && (
            <div className="pt-1.5">
              <div className="text-[9px] uppercase tracking-wider text-white/50 font-mono font-bold mb-1.5 px-2.5">
                RECENTS
              </div>
              <div className="space-y-0.5">
                {recentProjects.slice(0, 8).map(item => (
                  <button
                    key={item.id}
                    onClick={() => onProjectClick?.(item.id)}
                    className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all truncate flex items-center justify-between text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connected User Block with Sign Out */}
        <div className="border-t border-white/10 pt-3 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7.5 h-7.5 rounded-full bg-[#15395e] text-white font-extrabold flex items-center justify-center text-xs shadow border border-white/10 uppercase shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold truncate text-white">{displayName}</div>
              {email && <p className="text-[9px] text-white/70 truncate font-mono">{email}</p>}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-[#15395e] hover:bg-[#1a4470] border border-white/10 p-1.5 rounded-lg text-[10px] text-white font-bold transition-all text-center flex items-center justify-center gap-1.5"
          >
            Sign out session &rarr;
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top navigation header */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-mono">v3.4.2</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 mt-1 uppercase tracking-tight">
              Scoping Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-mono text-stone-400 uppercase">Selected Layout Target</div>
              <div className="text-xs font-bold text-stone-800">{latestProject}</div>
            </div>
            <span className="w-px h-8 bg-stone-200" />
            <button
              onClick={onCreateProject}
              className="bg-[#15395e] hover:bg-[#1f4e7d] text-white text-xs font-bold px-4.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              Navigate to Generateur
            </button>
          </div>
        </header>

        {/* Scene container */}
        <div className="flex-1 overflow-y-auto bg-white px-6 py-6 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

            {/* Header Title */}
            <div className="text-left space-y-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight font-sans flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[#2563eb] inline-flex items-center gap-0.5 select-none hover:underline cursor-pointer">
                  Generate designs
                  <ChevronDown className="w-5 h-5 text-[#2563eb]" />
                </span>
                <span className="text-stone-900">with Pixso AI, start creating!</span>
              </h2>
            </div>

            {/* Prompt Console Card */}
            <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5.5 space-y-4 hover:shadow-lg transition-all">
              <div className="flex gap-3">
                <textarea
                  placeholder="Generate desired designs with one click, e.g., blue finance homepage"
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onCreateProject?.() }}
                  className="flex-grow bg-transparent outline-none text-sm text-stone-800 placeholder-stone-400 font-medium resize-none h-16 py-1 focus:ring-0 border-none px-0"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3.5 border-t border-stone-100">
                {/* Example presets */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-stone-500 font-medium">
                  <span className="text-stone-400 font-normal">Example:</span>
                  <button onClick={() => setPromptInput('Workplace app dashboard with tracking widgets')} className="hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold text-stone-600">
                    Workplace app
                  </button>
                  <button onClick={() => setPromptInput('Corporate landing page with elegant hero text slider')} className="hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold text-stone-600">
                    Landing page
                  </button>
                  <button onClick={() => setPromptInput('Login page mockup with backdrop glassmorphism')} className="hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold text-stone-600">
                    Login page
                  </button>
                  <span className="text-stone-200">|</span>
                  <button className="text-[#2563eb] hover:underline font-bold cursor-pointer">
                    What can AI do?
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button className="bg-white border border-stone-200 hover:border-stone-300 text-stone-800 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold shadow-xs transition-all">
                    <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                    <span>Smart design system</span>
                  </button>
                  <button className="bg-white border border-stone-200 hover:border-stone-305 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 transition-colors">
                    <Image className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onCreateProject}
                    className="bg-[#2563eb] hover:bg-blue-700 text-white p-2 rounded-xl shadow-md flex items-center justify-center w-8 h-8 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Import Cards Grid */}
            <div className="max-w-4xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6.5">

                {/* Figma Import */}
                <button
                  onClick={onImportFigma ?? onCreateProject}
                  className="bg-white border border-stone-200 hover:border-orange-400 p-6.5 rounded-2xl text-left hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group cursor-pointer duration-200 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                      <svg className="w-6.5 h-6.5 shrink-0" viewBox="0 0 38 57" fill="none">
                        <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
                        <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
                        <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
                        <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#F24E1E"/>
                        <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#A259FF"/>
                      </svg>
                    </span>
                    <span className="text-stone-400 font-extrabold group-hover:text-orange-500 text-lg pr-1">+</span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-stone-950 group-hover:text-orange-600">Import from Figma</div>
                    <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Compile Figma vectors</p>
                  </div>
                </button>

                {/* Meeting Scribe */}
                <button
                  onClick={onImportMeeting ?? onCreateProject}
                  className="bg-white border border-stone-200 hover:border-violet-400 p-6.5 rounded-2xl text-left hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group cursor-pointer duration-200 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Volume2 className="w-5.5 h-5.5 text-violet-600" />
                    </span>
                    <span className="text-stone-400 font-extrabold group-hover:text-violet-500 text-lg pr-1">+</span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-stone-950 group-hover:text-violet-600">Import from Meeting</div>
                    <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Speech requirements scribe</p>
                  </div>
                </button>

                {/* Jira Backlog */}
                <button
                  onClick={onImportJira ?? onCreateProject}
                  className="bg-white border border-stone-200 hover:border-blue-400 p-6.5 rounded-2xl text-left hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group cursor-pointer duration-200 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M11.571 11.429L6.857 6.714A5.143 5.143 0 0 0 6.857 14l4.714-2.571z" fill="#2684FF"/>
                        <path d="M11.571 11.429l4.715 4.714A5.143 5.143 0 0 0 16.286 9l-4.715 2.429z" fill="#0052CC"/>
                        <path d="M11.571 11.429L6.857 14a5.143 5.143 0 0 0 9.429 1.143L11.57 11.43z" fill="#2684FF"/>
                      </svg>
                    </span>
                    <span className="text-stone-400 font-extrabold group-hover:text-blue-500 text-lg pr-1">+</span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-stone-950 group-hover:text-blue-600">Import from Jira</div>
                    <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Translate Jira issues</p>
                  </div>
                </button>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
