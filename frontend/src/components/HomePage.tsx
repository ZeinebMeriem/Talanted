import React, { useState, useEffect, useRef } from 'react'
import { Home, Folder, User, BookOpen, Image, ArrowUp, Volume2, Zap, LayoutDashboard, ShoppingCart, FileText, Globe, Layers, Clock, ArrowRight, Sparkles, Monitor, Lock, CheckCircle2 } from 'lucide-react'

export interface HomePageProps {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  isAuthenticated?: boolean
  recentProjects?: Array<{ id: string; name: string; createdAt: string }>
  projectCount?: number
  onCreateProject?: () => void
  onSubmitWithPrompt?: (prompt: string) => void
  isBuilding?: boolean
  buildPct?: number
  buildMsg?: string
  onViewProjects?: () => void
  onViewProfile?: () => void
  onLogout?: () => void
  onProjectClick?: (projectId: string) => void
  onImportFigma?: () => void
  onImportMeeting?: () => void
  onImportJira?: () => void
  canUseMeeting?: boolean
  canUseJira?: boolean
}

const CHIPS = [
  { icon: <LayoutDashboard size={12}/>, label: 'SaaS Dashboard',  prompt: 'SaaS analytics dashboard with sidebar, KPI cards, revenue charts, and user data table' },
  { icon: <ShoppingCart size={12}/>,    label: 'E-commerce',       prompt: 'E-commerce store with product grid, filters sidebar, product detail modal, and cart' },
  { icon: <FileText size={12}/>,        label: 'Landing Page',     prompt: 'Modern SaaS landing page with hero section, features grid, pricing table, and CTA' },
  { icon: <Globe size={12}/>,           label: 'Portfolio',        prompt: 'Minimal portfolio with hero, skills section, projects showcase, and contact form' },
  { icon: <Monitor size={12}/>,         label: 'Admin Panel',      prompt: 'Admin control panel with user management table, role badges, and activity logs' },
  { icon: <Lock size={12}/>,            label: 'Login / Auth',     prompt: 'Clean login page with glassmorphism card, email + password, and social sign-in' },
  { icon: <Layers size={12}/>,          label: 'Data Table',       prompt: 'Complex data table with sorting, filtering, pagination, and bulk actions toolbar' },
  { icon: <Sparkles size={12}/>,        label: 'AI Chat UI',       prompt: 'Modern AI chat interface with sidebar history, message bubbles, and code highlighting' },
]

const PHASES = [
  { key: 'Planner',   color: '#10b981', lightBg: 'rgba(16,185,129,.08)',
    thoughts: [
      'Parsing user prompt and extracting UI requirements...',
      'Identified 4 core user flows: Create, Navigate, Filter, Export',
      'Mapping component hierarchy: Layout → Sections → Elements',
      'Choosing design system tokens for spacing and typography...',
      'Requirements analysis complete ✓',
    ]},
  { key: 'Designer',  color: '#7c3aed', lightBg: 'rgba(124,58,237,.08)',
    thoughts: [
      'Loading design tokens and color palette...',
      'Selecting 12-column responsive grid layout...',
      'Placing hero section with gradient overlay...',
      'Building navigation component tree...',
      'Applying 4pt spacing scale throughout...',
      'Generating adaptive breakpoints: sm / md / lg / xl',
    ]},
  { key: 'Coder',     color: '#3b82f6', lightBg: 'rgba(59,130,246,.08)',
    thoughts: [
      'Generating React + TypeScript component files...',
      'Wiring interactive state with useState / useEffect...',
      'Implementing responsive breakpoint utilities...',
      'Applying WCAG 2.1 AA accessibility attributes...',
      'Optimising bundle — tree-shaking unused icons...',
    ]},
  { key: 'Validator', color: '#f59e0b', lightBg: 'rgba(245,158,11,.08)',
    thoughts: [
      'Running visual regression checks across breakpoints...',
      'Validating TypeScript prop types and generics...',
      'WCAG compliance score: 98 / 100 ✓',
      'No unused variables or imports detected ✓',
      'Build complete — ready for IDE preview ✓',
    ]},
]

export const HomePage: React.FC<HomePageProps> = ({
  username = 'User',
  firstName,
  lastName,
  email,
  recentProjects = [],
  projectCount,
  onCreateProject,
  onSubmitWithPrompt,
  isBuilding = false,
  buildPct = 0,
  buildMsg = '',
  onViewProjects,
  onViewProfile,
  onLogout,
  onProjectClick,
  onImportFigma,
  onImportMeeting,
  onImportJira,
  canUseMeeting = true,
  canUseJira = true,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'home' | 'projects' | 'profile'>('home')
  const [promptInput, setPromptInput] = useState('')
  const [thoughtLines, setThoughtLines] = useState<Array<{text:string; phase:number; color:string}>>([])
  const thoughtTimerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const thoughtIndexRef = useRef<{phase:number; line:number}>({ phase:0, line:0 })
  const streamRef = useRef<HTMLDivElement>(null)

  const displayName = firstName ? (lastName ? `${firstName} ${lastName}` : firstName) : username
  const workspaceName = firstName || username
  const totalProjects = projectCount ?? recentProjects.length
  const latestProject = recentProjects[0]?.name ?? 'No project selected'
  const activePhaseIndex = Math.min(Math.floor(buildPct / 25), 3)

  useEffect(() => {
    if (isBuilding) {
      thoughtIndexRef.current = { phase: 0, line: 0 }
      setThoughtLines([])
      thoughtTimerRef.current = setInterval(() => {
        const { phase, line } = thoughtIndexRef.current
        if (phase >= PHASES.length) { clearInterval(thoughtTimerRef.current!); return }
        const p = PHASES[phase]
        if (line < p.thoughts.length) {
          setThoughtLines(prev => [...prev, { text: p.thoughts[line], phase, color: p.color }])
          thoughtIndexRef.current.line++
          setTimeout(() => streamRef.current?.scrollTo({ top: 9999, behavior:'smooth' }), 60)
        } else if (phase < PHASES.length - 1) {
          thoughtIndexRef.current = { phase: phase + 1, line: 0 }
        }
      }, 900)
    } else {
      clearInterval(thoughtTimerRef.current!)
    }
    return () => { clearInterval(thoughtTimerRef.current!) }
  }, [isBuilding])

  const handleTab = (tab: 'home' | 'projects' | 'profile') => {
    setActiveSidebarTab(tab)
    if (tab === 'projects') onViewProjects?.()
    if (tab === 'profile') onViewProfile?.()
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', width:'100%', fontFamily:"'Inter',sans-serif" }}>

      {/* ── CSS KEYFRAMES ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(7px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes pulseRing {
          0%,100% { box-shadow: 0 0 0 0 var(--rc,rgba(124,58,237,.5)) }
          50%     { box-shadow: 0 0 0 6px transparent }
        }
        @keyframes cursorBlink {
          0%,100% { opacity:1 }
          50%     { opacity:0 }
        }
        @keyframes contentFade {
          from { opacity:1; transform:translateY(0) }
          to   { opacity:0; transform:translateY(-12px) }
        }
        @keyframes streamFade {
          from { opacity:0; transform:translateY(14px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes skeletonPop {
          from { opacity:0; transform:scaleY(.8) }
          to   { opacity:1; transform:scaleY(1) }
        }
        .sk {
          background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size:200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius:5px;
        }
        .thought-row { animation: fadeInUp .38s ease both }
        .stream-in   { animation: streamFade .5s ease both }
        .content-out { animation: contentFade .4s ease both; pointer-events:none }
        .skel-pop    { animation: skeletonPop .4s ease both }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:220, background:'#04081c', color:'#fff', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0, borderRight:'1px solid #1e2a4a', padding:'18px 12px', userSelect:'none' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20, flexGrow:1 }}>

          <div style={{ padding:'2px 4px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:16, fontWeight:900, color:'#fff', letterSpacing:'-0.03em' }}>talented</span>
              <span style={{ width:12, height:4, background:'#7c3aed', borderRadius:2, marginTop:2, display:'inline-block' }}/>
            </div>
            <span style={{ fontSize:9, color:'rgba(255,255,255,.3)', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'monospace' }}>Client Portal</span>
          </div>

          <div>
            <div style={{ fontSize:9, letterSpacing:'0.1em', color:'rgba(255,255,255,.3)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', marginBottom:5, paddingLeft:4 }}>Workspace</div>
            <div style={{ background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', padding:'9px 10px', borderRadius:10, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'rgba(124,58,237,.25)', color:'#c4b5fd', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                {workspaceName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{workspaceName}</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', fontFamily:'monospace' }}>Standard Workspace</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {([
              { id:'home',     label:'Home',                            icon:<Home size={13}/> },
              { id:'projects', label:`All projects (${totalProjects})`, icon:<Folder size={13}/> },
              { id:'profile',  label:'Profile',                         icon:<User size={13}/> },
            ] as const).map(item=>(
              <button key={item.id} onClick={()=>handleTab(item.id)}
                style={{ width:'100%', textAlign:'left', padding:'7px 9px', borderRadius:9, fontSize:11, fontWeight:activeSidebarTab===item.id?800:500, display:'flex', alignItems:'center', gap:7, border:'none', cursor:'pointer', transition:'all .15s', background:activeSidebarTab===item.id?'rgba(124,58,237,.18)':'transparent', color:activeSidebarTab===item.id?'#c4b5fd':'rgba(255,255,255,.6)', boxShadow:activeSidebarTab===item.id?'inset 0 0 0 1px rgba(124,58,237,.3)':'none' }}>
                <span style={{ color:'inherit', display:'flex' }}>{item.icon}</span>
                <span style={{ color:'inherit' }}>{item.label}</span>
                {item.id==='projects' && <span style={{ marginLeft:'auto', fontSize:9, fontFamily:'monospace', fontWeight:700, background:'rgba(124,58,237,.2)', color:'#a78bfa', padding:'1px 5px', borderRadius:5 }}>{totalProjects}</span>}
              </button>
            ))}
          </div>

          {recentProjects.length > 0 && (
            <div>
              <div style={{ fontSize:9, letterSpacing:'0.1em', color:'rgba(255,255,255,.3)', fontWeight:700, textTransform:'uppercase', fontFamily:'monospace', marginBottom:5, paddingLeft:4 }}>Recents</div>
              {recentProjects.slice(0,8).map(item=>(
                <button key={item.id} onClick={()=>onProjectClick?.(item.id)}
                  style={{ width:'100%', textAlign:'left', padding:'5px 9px', borderRadius:7, fontSize:11, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'space-between', border:'none', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.5)', transition:'all .15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.8)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.5)'}}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'inherit' }}>{item.name}</span>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'rgba(124,58,237,.5)', flexShrink:0 }}/>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:12, display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:27, height:27, borderRadius:'50%', background:'rgba(124,58,237,.25)', border:'1px solid rgba(124,58,237,.3)', color:'#c4b5fd', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0, textTransform:'uppercase' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
              {email && <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>}
            </div>
          </div>
          <button onClick={onLogout}
            style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center', transition:'all .15s' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,.1)';(e.currentTarget as HTMLButtonElement).style.color='#fca5a5';(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(239,68,68,.2)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.5)';(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.07)'}}>
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'#f4f5f9', position:'relative', overflow:'hidden' }}>

        {/* Top bar */}
        <header style={{ background:'#fff', borderBottom:'1px solid #e8edf5', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'monospace', fontWeight:600 }}>v3.4.2</div>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.1em' }}>Scoping Dashboard</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'monospace', textTransform:'uppercase', fontWeight:600 }}>Selected Layout Target</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{latestProject}</div>
            </div>
          </div>
        </header>

        {/* ── STREAM OF THOUGHT OVERLAY ── */}
        {isBuilding && (
          <div className="stream-in" style={{ position:'absolute', inset:0, top:57, zIndex:15, background:'#f4f5f9', display:'flex', flexDirection:'column', padding:'22px 24px', gap:18, overflow:'hidden' }}>

            {/* Header row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#7c3aed', animation:'pulseRing 1.6s ease infinite', '--rc':'rgba(124,58,237,.5)' } as React.CSSProperties}/>
                <span style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>AI is designing your UI</span>
                <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500, fontFamily:'monospace' }}>{buildMsg || 'Initializing pipeline…'}</span>
              </div>
              <span style={{ fontSize:13, fontWeight:800, color:'#7c3aed' }}>{buildPct}%</span>
            </div>

            {/* Progress bar */}
            <div style={{ height:3, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#7c3aed,#a855f7,#c084fc)', borderRadius:99, transition:'width .8s ease', width:`${buildPct}%` }}/>
            </div>

            {/* Phase stepper */}
            <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'10px 16px', alignItems:'center', justifyContent:'space-between' }}>
              {PHASES.map((ph, i)=>{
                const done    = i < activePhaseIndex
                const active  = i === activePhaseIndex
                const pending = i > activePhaseIndex
                return (
                  <React.Fragment key={ph.key}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0, transition:'all .4s', background: done?ph.color:active?ph.color:'#f1f5f9', color: done||active?'#fff':'#94a3b8', boxShadow: active?`0 0 0 4px ${ph.color}30`:'' }}>
                        {done ? <CheckCircle2 size={13}/> : ph.key[0]}
                      </div>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color: done?'#0f172a':active?'#0f172a':'#94a3b8' }}>{ph.key}</div>
                        {active && <div style={{ fontSize:9, color:ph.color, fontWeight:600, fontFamily:'monospace' }}>Running…</div>}
                        {done   && <div style={{ fontSize:9, color:'#10b981', fontWeight:600, fontFamily:'monospace' }}>Done ✓</div>}
                      </div>
                    </div>
                    {i < PHASES.length-1 && <div style={{ flex:1, height:1, background: i<activePhaseIndex?'#10b981':'#e2e8f0', margin:'0 12px', transition:'background .5s' }}/>}
                  </React.Fragment>
                )
              })}
            </div>

            {/* MAIN SPLIT: thought stream LEFT + skeleton preview RIGHT */}
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, minHeight:0 }}>

              {/* LEFT — Thought stream */}
              <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'16px 18px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'monospace', marginBottom:12 }}>Agent Thoughts</div>
                <div ref={streamRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                  {thoughtLines.map((t, i)=>(
                    <div key={i} className="thought-row" style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:t.color, flexShrink:0, marginTop:6 }}/>
                      <span style={{ fontSize:12, color:'#374151', lineHeight:1.55, fontWeight:500 }}>{t.text}</span>
                    </div>
                  ))}
                  {/* blinking cursor on last active thought */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, paddingLeft:13 }}>
                    <span style={{ width:2, height:14, background:PHASES[activePhaseIndex]?.color??'#7c3aed', borderRadius:1, animation:'cursorBlink 1s step-end infinite' }}/>
                  </div>
                </div>
              </div>

              {/* RIGHT — Skeleton UI wireframe */}
              <div className="skel-pop" style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'14px', display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'monospace', marginBottom:4 }}>UI Preview</div>

                {/* Fake browser chrome */}
                <div style={{ border:'1px solid #e8edf5', borderRadius:10, overflow:'hidden', flex:1, display:'flex', flexDirection:'column' }}>
                  {/* browser bar */}
                  <div style={{ background:'#f8fafc', borderBottom:'1px solid #e8edf5', padding:'7px 10px', display:'flex', alignItems:'center', gap:5 }}>
                    {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c, opacity:.7 }}/>)}
                    <div className="sk" style={{ flex:1, height:9, marginLeft:8 }}/>
                  </div>
                  {/* page content skeleton */}
                  <div style={{ flex:1, display:'flex', minHeight:0 }}>
                    {/* fake sidebar */}
                    <div style={{ width:52, borderRight:'1px solid #e8edf5', padding:'10px 8px', display:'flex', flexDirection:'column', gap:6, background:'#fafbfc' }}>
                      <div className="sk" style={{ height:20, borderRadius:6, marginBottom:4 }}/>
                      {[1,2,3,4].map(n=><div key={n} className="sk" style={{ height:10 }}/>)}
                    </div>
                    {/* fake content */}
                    <div style={{ flex:1, padding:'12px 12px', display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
                      {/* heading + bar */}
                      <div className="sk" style={{ height:14, width:'55%' }}/>
                      <div style={{ display:'flex', gap:6 }}>
                        {[1,2,3].map(n=>(
                          <div key={n} className="sk" style={{ flex:1, height:42, borderRadius:8 }}/>
                        ))}
                      </div>
                      {/* table rows */}
                      {[1,2,3].map(n=>(
                        <div key={n} className="sk" style={{ height:10, width:`${100-n*8}%`, animationDelay:`${n*.15}s` }}/>
                      ))}
                      {/* cards grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:4 }}>
                        {[1,2,3,4].map(n=>(
                          <div key={n} className="sk" style={{ height:54, borderRadius:8, animationDelay:`${n*.12}s` }}/>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── NORMAL CONTENT (fades out when building) ── */}
        <div className={isBuilding ? 'content-out' : ''} style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 280px', gap:18, alignItems:'start' }}>

          {/* ── LEFT ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Heading */}
            <div>
              <h2 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-.03em', lineHeight:1.2, display:'flex', flexWrap:'wrap', alignItems:'baseline', gap:'0 6px' }}>
                <span style={{ color:'#7c3aed' }}>Generate designs</span>
                <span style={{ fontSize:14, color:'#94a3b8', fontWeight:400 }}>˅</span>
                <span style={{ color:'#0f172a' }}>with Talented AI, start creating!</span>
              </h2>
            </div>

            {/* Prompt */}
            <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <textarea
                placeholder={'Describe the UI you want, e.g. "A finance dashboard with dark sidebar, KPI cards and a line chart"'}
                value={promptInput}
                onChange={e=>setPromptInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ promptInput.trim()&&onSubmitWithPrompt?onSubmitWithPrompt(promptInput.trim()):onCreateProject?.() } }}
                style={{ width:'100%', height:60, background:'transparent', outline:'none', border:'none', fontSize:13, color:'#1e293b', fontFamily:'inherit', resize:'none', lineHeight:1.6 }}
              />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid #f1f5f9', gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Try:</span>
                  {['Workplace app','Landing page','Login page'].map(ex=>(
                    <button key={ex} onClick={()=>setPromptInput(`${ex} modern clean design`)}
                      style={{ fontSize:11, fontWeight:600, color:'#475569', background:'none', border:'none', cursor:'pointer', padding:0, transition:'color .15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#7c3aed')} onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
                      {ex}
                    </button>
                  ))}
                  <span style={{ color:'#e2e8f0' }}>|</span>
                  <button style={{ fontSize:11, fontWeight:700, color:'#7c3aed', background:'none', border:'none', cursor:'pointer', padding:0 }}>What can AI do?</button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <button style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 10px', fontSize:11, fontWeight:600, color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <BookOpen size={12} color="#94a3b8"/> Smart design system
                  </button>
                  <button style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:6, cursor:'pointer', display:'flex', alignItems:'center', color:'#94a3b8' }}>
                    <Image size={13}/>
                  </button>
                  <button
                    onClick={()=>{ promptInput.trim()&&onSubmitWithPrompt?onSubmitWithPrompt(promptInput.trim()):onCreateProject?.() }}
                    disabled={isBuilding}
                    style={{ width:32, height:32, borderRadius:9, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:'#7c3aed', boxShadow:'0 2px 8px rgba(124,58,237,.4)', transition:'all .2s' }}>
                    <ArrowUp size={14} color="#fff"/>
                  </button>
                </div>
              </div>
            </div>

            {/* Inspiration chips */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <Sparkles size={13} color="#7c3aed"/>
                <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Quick prompts</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {CHIPS.map(chip=>(
                  <button key={chip.label} onClick={()=>setPromptInput(chip.prompt)}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', fontSize:11, fontWeight:600, color:'#374151', cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(124,58,237,.4)';(e.currentTarget as HTMLButtonElement).style.color='#7c3aed';(e.currentTarget as HTMLButtonElement).style.background='rgba(124,58,237,.04)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='#e2e8f0';(e.currentTarget as HTMLButtonElement).style.color='#374151';(e.currentTarget as HTMLButtonElement).style.background='#fff'}}>
                    <span style={{ color:'#94a3b8', display:'flex' }}>{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Import cards — tall vertical */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {([
                { label:'Import from Figma',   sub:'Compile Figma vectors',      onClick:onImportFigma??onCreateProject,   accent:'#f97316', bg:'#fff7ed', locked:false,
                  icon:<svg style={{width:28,height:28}} viewBox="0 0 38 57" fill="none"><path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/><path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/><path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/><path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#F24E1E"/><path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#A259FF"/></svg> },
                { label:'Import from Meeting', sub:'Speech requirements scribe', onClick:onImportMeeting??onCreateProject, accent:'#7c3aed', bg:'#f5f3ff', locked:!canUseMeeting,
                  icon:<Volume2 size={24} color="#7c3aed"/> },
                { label:'Import from Jira',    sub:'Translate Jira issues',       onClick:onImportJira??onCreateProject,    accent:'#2563eb', bg:'#eff6ff', locked:!canUseJira,
                  icon:<svg style={{width:24,height:24}} viewBox="0 0 24 24" fill="none"><path d="M11.571 11.429L6.857 6.714A5.143 5.143 0 0 0 6.857 14l4.714-2.571z" fill="#2684FF"/><path d="M11.571 11.429l4.715 4.714A5.143 5.143 0 0 0 16.286 9l-4.715 2.429z" fill="#0052CC"/><path d="M11.571 11.429L6.857 14a5.143 5.143 0 0 0 9.429 1.143L11.57 11.43z" fill="#2684FF"/></svg> },
              ] as const).map(c=>(
                <button key={c.label} onClick={c.onClick}
                  style={{ background: c.locked?'#f8f9fc':'#fff', border:`1px solid ${c.locked?'#e2e8f0':'#e8edf5'}`, borderRadius:18, padding:'20px 20px 18px', textAlign:'left', cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', gap:0, minHeight:140, position:'relative', overflow:'hidden' }}
                  onMouseEnter={e=>{ if(!c.locked){(e.currentTarget as HTMLButtonElement).style.borderColor=c.accent+'88';(e.currentTarget as HTMLButtonElement).style.boxShadow=`0 4px 16px ${c.accent}18`} }}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=c.locked?'#e2e8f0':'#e8edf5';(e.currentTarget as HTMLButtonElement).style.boxShadow='none'}}>
                  {/* Lock overlay for gated features */}
                  {c.locked && (
                    <div style={{ position:'absolute', top:10, right:10, display:'flex', alignItems:'center', gap:4, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', borderRadius:20, padding:'3px 8px' }}>
                      <Lock size={9} color="#7c3aed"/>
                      <span style={{ fontSize:9, fontWeight:800, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em' }}>Team plan</span>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'auto' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:c.locked?'#f1f5f9':c.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:c.locked?.55:1 }}>{c.icon}</div>
                    {!c.locked && <span style={{ fontSize:20, color:'#cbd5e1', lineHeight:1, fontWeight:300, marginTop:2 }}>+</span>}
                  </div>
                  <div style={{ marginTop:18 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:c.locked?'#94a3b8':'#0f172a', lineHeight:1.3 }}>{c.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, marginTop:3 }}>{c.locked ? 'Upgrade to Team to unlock' : c.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:20 }}>
            <div style={{ background:'linear-gradient(135deg,#04081c,#0f1535)', borderRadius:16, padding:'16px 18px', border:'1px solid rgba(124,58,237,.2)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(124,58,237,.15)', filter:'blur(30px)', pointerEvents:'none' }}/>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Workspace Stats</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Projects', value: totalProjects },
                  { label:'This week', value: recentProjects.filter(p=>{ const d=new Date(p.createdAt); const now=new Date(); return (now.getTime()-d.getTime())<7*24*3600*1000 }).length },
                ].map(s=>(
                  <div key={s.label}>
                    <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:600, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'16px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Clock size={13} color="#7c3aed"/>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>Recent</span>
                </div>
                <button onClick={onViewProjects} style={{ fontSize:11, fontWeight:600, color:'#7c3aed', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  All <ArrowRight size={11}/>
                </button>
              </div>
              {recentProjects.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#94a3b8' }}>
                  <Layers size={24} style={{ margin:'0 auto 6px', opacity:.4 }}/>
                  <p style={{ fontSize:12, fontWeight:500, margin:0 }}>No projects yet</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {recentProjects.slice(0,8).map((p,i)=>(
                    <button key={p.id} onClick={()=>onProjectClick?.(p.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 8px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', transition:'all .15s', width:'100%' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#f8f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <div style={{ width:28, height:28, borderRadius:8, background:`hsl(${(i*47)%360},60%,90%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Layers size={13} color={`hsl(${(i*47)%360},60%,40%)`}/>
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{new Date(p.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                      </div>
                      <ArrowRight size={11} color="#cbd5e1"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
