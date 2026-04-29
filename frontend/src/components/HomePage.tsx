import React, { useState } from 'react'
import { Home, FolderOpen, User, LogOut, Sparkles, ArrowRight, LayoutDashboard, Globe, ShoppingCart, Package, Play, CheckCircle2, Loader2 } from 'lucide-react'

export interface HomePageProps {
  username?: string
  firstName?: string
  email?: string
  isAuthenticated?: boolean
  recentProjects?: Array<{ id: string; name: string; createdAt: string }>
  onCreateProject?: () => void
  onViewProjects?: () => void
  onLogout?: () => void
  onProjectClick?: (projectId: string) => void
}

export const HomePage: React.FC<HomePageProps> = ({
  username = 'Developer',
  firstName,
  isAuthenticated = false,
  recentProjects = [],
  onCreateProject,
  onViewProjects,
  onLogout,
  onProjectClick,
}) => {
  const [projectName, setProjectName] = useState('my-awesome-app')
  const [stack, setStack] = useState<'vanilla' | 'react'>('react')
  const [aiModel, setAiModel] = useState('gemini-2.0-flash')
  const [desc, setDesc] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [progress, setProgress] = useState(38)
  const [generating, setGenerating] = useState(false)

  const displayName = firstName || username
  const tags = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'landing', label: 'Landing Page', icon: Globe },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
    { id: 'portfolio', label: 'Portfolio', icon: Package },
  ]
  const pipeline = [
    { label: 'Planner', sub: 'Architecture & plan', status: 'done' },
    { label: 'Designer', sub: 'Design system', status: 'running' },
    { label: 'Coder', sub: 'Code generation', status: 'pending' },
    { label: 'Validator', sub: 'Quality check', status: 'pending' },
  ]
  const sidebarRecent = recentProjects.length > 0 ? recentProjects.slice(0, 5) : [
    { id: '1', name: 'Analytics Dashboard' },
    { id: '2', name: 'Fork of: generate...' },
    { id: '3', name: 'Fork of: necessary...' },
    { id: '4', name: 'Fork of: flight...' },
    { id: '5', name: 'Fork of: generate...' },
  ]

  const guestMode = !isAuthenticated

  return (
    <div style={{ display: 'flex', background: '#f0f4f8', fontFamily: "'Inter', sans-serif" }}>
      {/* MAIN CENTER — AiEditor already provides left sidebar */}
      <div style={{ flex: 1, padding: '32px 40px' }}>
        {guestMode && (
          <div style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            fontSize: 12,
            fontWeight: 600,
          }}>
            You are browsing in guest mode. Sign in starts automatically when you create a project.
          </div>
        )}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>What should we <span style={{ color: '#5480ba' }}>build</span> today?</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Describe your idea and our AI agents will build it in seconds.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[{ icon: Sparkles, t: '4 AI Agents in sequence' }, { icon: CheckCircle2, t: 'React & Tailwind production code' }, { icon: Play, t: 'Live Preview instant render' }, { icon: Package, t: 'Export Ready download ZIP' }].map((b, i) => {
            const BadgeIcon = b.icon
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', fontWeight: 500 }}>
                <BadgeIcon size={13} />{b.t}
              </div>
            )
          })}
        </div>

        {/* FORM CARD */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', maxWidth: 640 }}>
          <Field label="Project Name">
            <input value={projectName} onChange={e => setProjectName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          </Field>
          <Field label="Stack">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['vanilla', 'react'] as const).map(s => (
                <button key={s} onClick={() => setStack(s)} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: '1px solid ' + (stack === s ? '#5480ba' : '#e2e8f0'), background: stack === s ? '#eef2ff' : '#fff', color: stack === s ? '#5480ba' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="AI Model">
            <select value={aiModel} onChange={e => setAiModel(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff' }}>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Smart)</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro (Advanced)</option>
            </select>
          </Field>
          <Field label="Describe your application">
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="E.g., 'Enterprise dashboard for managing users, revenue analytics, and subscription plans'" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, minHeight: 80, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {tags.map(t => {
              const TagIcon = t.icon
              return (
                <button key={t.id} onClick={() => setActiveTag(activeTag === t.id ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid ' + (activeTag === t.id ? '#5480ba' : '#e2e8f0'), background: activeTag === t.id ? '#eef2ff' : '#fff', color: activeTag === t.id ? '#5480ba' : '#64748b', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <TagIcon size={14} />{t.label}
                </button>
              )
            })}
          </div>
          {generating && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                <span>Creating design system...</span><span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg,#5480ba,#8f9424)', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
          <button onClick={() => { setGenerating(true); let p = 0; const iv = setInterval(() => { p += 5; setProgress(p); if (p >= 100) { clearInterval(iv); setGenerating(false); onCreateProject?.(); } }, 200); }} style={{ width: '100%', padding: '12px 20px', background: 'linear-gradient(135deg,#5480ba,#8f9424)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {generating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Generating...</> : <><Sparkles size={16} />{guestMode ? 'Sign In to Generate' : 'Generate UI'}</>}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside style={{ width: 280, background: '#fff', borderLeft: '1px solid #e2e8f0', padding: 24, flexShrink: 0 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Agent Pipeline</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>4 in sequence</div>
          {pipeline.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < pipeline.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: step.status === 'done' ? '#dcfce7' : step.status === 'running' ? '#fef3c7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step.status === 'done' ? <CheckCircle2 size={14} color="#16a34a" /> : step.status === 'running' ? <Loader2 size={14} color="#d97706" style={{ animation: 'spin 1s linear infinite' }} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {step.label}
                  {step.status === 'running' && <span style={{ fontSize: 9, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>Running</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{step.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent</div>
          {sidebarRecent.slice(0, 3).map(p => (
            <button key={p.id} onClick={() => onProjectClick?.(p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}>
              <div style={{ width: 20, height: 20, background: '#eef2ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LayoutDashboard size={12} color="#5480ba" />
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>just now</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, border: 'none', background: active ? '#eef2ff' : 'transparent', color: active ? '#5480ba' : '#64748b', fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: 2 }}>
      {icon}{label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'capitalize' }}>{label}</label>
      {children}
    </div>
  )
}
