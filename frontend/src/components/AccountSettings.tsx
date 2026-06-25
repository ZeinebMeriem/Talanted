import React, { useEffect, useRef, useState } from 'react'
import {
  getUserProfile, updateUserProfile, sendVerificationEmail,
  uploadAvatar, deleteAvatar, getUserStats,
  type UserProfileResponse, type UpdateProfileRequest,
} from '../api'
import { Camera, Check, Mail, Bell, Save, X, Zap, Layers, Star, Shield, Lock, ArrowRight } from 'lucide-react'
import { getPlan, formatLimit, PLAN_ORDER, type PlanId } from '../lib/plans'
import { getUserPlan, syncPlanFromProfile } from '../hooks/usePlanLimits'
import UpgradeModal from './UpgradeModal'

const AVATAR_KEY = 'talanted_avatar_url'

/* ── Plan Badge — extracted sub-component so hooks are valid ───────── */
function PlanBadge({ totalGen, generationsThisMonth, projectCount, profile, accessToken, userSub }:
  { totalGen: number; generationsThisMonth: number; projectCount: number; profile: import('../api').UserProfileResponse | null; accessToken?: string; userSub?: string }) {
  // Prefer plan from profile (authoritative) then localStorage fallback
  const planId   = profile ? (syncPlanFromProfile(profile) as PlanId) : getUserPlan()
  const plan     = getPlan(planId)
  const limits   = plan.limits
  const nextId   = PLAN_ORDER[PLAN_ORDER.indexOf(planId as PlanId) + 1] as PlanId | undefined
  const nextPlan = nextId ? getPlan(nextId) : null
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const usedGen  = generationsThisMonth ?? totalGen
  const usedProj = projectCount ?? 0

  const rows = [
    { label:'Projects',              value:`${usedProj} / ${formatLimit(limits.maxProjects)}`,                  locked: false },
    { label:'AI generations / month',value:`${usedGen} / ${formatLimit(limits.maxGenerationsMonth)}`,           locked: false },
    { label:'Team seats',            value:formatLimit(limits.maxTeamSeats),                                     locked: false },
    { label:'Custom agents / project',value:limits.maxAgentsPerProject === 0 ? '🔒 None' : formatLimit(limits.maxAgentsPerProject), locked: limits.maxAgentsPerProject === 0 },
    { label:'Version history',       value:limits.versionHistoryDays === -1 ? 'Unlimited' : `${limits.versionHistoryDays} days`,  locked: false },
    { label:'Meeting + Jira modes',  value: limits.canUseMeetingMode ? 'Enabled' : '🔒 Locked',                locked: !limits.canUseMeetingMode },
    { label:'GitLab / GitHub export',value: limits.canExportGitLab   ? 'Enabled' : '🔒 Locked',                locked: !limits.canExportGitLab },
    { label:'WCAG audit',            value: limits.wcagLevel === 'full' ? 'Full AA' : limits.wcagLevel === 'basic' ? 'Basic' : '🔒 None', locked: limits.wcagLevel === 'none' },
    { label:'SSO / SAML',            value: limits.canUseSSO  ? 'Enabled' : '🔒 Locked',                       locked: !limits.canUseSSO },
    { label:'REST API',              value: limits.canUseAPI  ? 'Enabled' : '🔒 Locked',                       locked: !limits.canUseAPI },
  ]
  const projectPct   = limits.maxProjects === -1 ? Math.min(100, (usedProj / 20) * 100)
                     : Math.min(100, (usedProj / limits.maxProjects) * 100)

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,#04081c,#0f1535)', border:'1px solid rgba(124,58,237,.25)', borderRadius:16, padding:20, boxShadow:'0 4px 16px rgba(0,0,0,.15)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(124,58,237,.12)', pointerEvents:'none' }}/>

        {/* Title */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(124,58,237,.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Star size={13} color="#c4b5fd"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,.35)' }}>Current plan</p>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color:'#fff' }}>{plan.name}</p>
            </div>
          </div>
          <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 10px', borderRadius:20, background: plan.badgeBg, color: plan.badgeText }}>
            {plan.id.toUpperCase()}
          </span>
        </div>

        {/* Rows */}
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:500 }}>{r.label}</span>
              <span style={{ fontSize:11, fontWeight:700, color: r.locked ? '#f87171' : 'rgba(255,255,255,.8)' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Projects progress bar */}
        <div style={{ margin:'14px 0 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:600, marginBottom:5 }}>
            <span>Projects usage</span>
            <span>{usedProj} / {formatLimit(limits.maxProjects)}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,.08)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#7c3aed,#a855f7)', width:`${projectPct}%`, transition:'width .5s' }}/>
          </div>
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'14px 0' }}/>

        {/* Upgrade button */}
        {nextPlan ? (
          <button onClick={() => setUpgradeOpen(true)}
            style={{ width:'100%', padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontWeight:800, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'rgba(124,58,237,.25)', color:'#c4b5fd', transition:'all .15s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(124,58,237,.4)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(124,58,237,.25)')}>
            <Zap size={12} fill="#c4b5fd"/> Upgrade to {nextPlan.name} <ArrowRight size={12}/>
          </button>
        ) : (
          <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.3)', textAlign:'center' }}>✓ You're on the highest plan</p>
        )}
      </div>

      {upgradeOpen && (
        <UpgradeModal
          context={{ type:'feature', current:0, max:0 }}
          onClose={() => setUpgradeOpen(false)}
          accessToken={accessToken}
          userSub={userSub}
        />
      )}
    </>
  )
}

interface Toggle { label: string; desc: string; key: 'emailNotifications' | 'projectUpdates' }
const TOGGLES: Toggle[] = [
  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates and alerts via email' },
  { key: 'projectUpdates',     label: 'Project Updates',     desc: 'Notify when a generation completes' },
]

interface AccountSettingsProps {
  accessToken?: string
  userSub?    : string
  onClose?: () => void
}

export function AccountSettings({ accessToken, userSub, onClose }: AccountSettingsProps) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [stats, setStats]     = useState<{ totalGenerations?: number; completedGenerations?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [bio, setBio]         = useState('')
  const [timezone, setTimezone]   = useState('UTC')
  const [language, setLanguage]   = useState('en')
  const [notifs, setNotifs] = useState({ emailNotifications: true, projectUpdates: true, weeklyDigest: false })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY)
    if (saved) setAvatarPreview(saved)
  }, [])

  useEffect(() => { load() }, [accessToken])

  const load = async () => {
    try {
      setLoading(true)
      const [data, st] = await Promise.allSettled([getUserProfile(accessToken), getUserStats(accessToken)])
      if (data.status === 'fulfilled') {
        const d = data.value
        setProfile(d)
        if (d.bio) setBio(d.bio)
        if (d.timezone) setTimezone(d.timezone)
        if (d.preferredLanguage) setLanguage(d.preferredLanguage)
        if (d.notifications) setNotifs({ emailNotifications: d.notifications.emailNotifications ?? true, projectUpdates: d.notifications.projectUpdates ?? true, weeklyDigest: d.notifications.weeklyDigest ?? false })
        const localUrl = localStorage.getItem(AVATAR_KEY)
        if (localUrl) setAvatarPreview(localUrl)
        else if (d.avatarUrl) setAvatarPreview(d.avatarUrl)
      }
      if (st.status === 'fulfilled') setStats(st.value)
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await updateUserProfile({ bio, timezone, preferredLanguage: language, notifications: notifs }, accessToken)
      setProfile(updated)
      showToast('Profile saved successfully!')
    } catch { showToast('Failed to save profile', 'error') }
    finally { setSaving(false) }
  }

  const processFile = (file: File) => {
    if (file.size > 5242880) { showToast('File too large (max 5 MB)', 'error'); return }
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { showToast('Only PNG, JPEG or WebP allowed', 'error'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    const r = new FileReader()
    r.onload = e => { const d = e.target?.result as string; if (d) localStorage.setItem(AVATAR_KEY, d) }
    r.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!avatarFile) return
    try {
      setUploadingAvatar(true)
      const r = new FileReader()
      const dataUrl = await new Promise<string>(resolve => { r.onload = e => resolve(e.target?.result as string); r.readAsDataURL(avatarFile) })
      localStorage.setItem(AVATAR_KEY, dataUrl)
      setAvatarPreview(dataUrl)
      try { await uploadAvatar(avatarFile, accessToken) } catch {}
      setAvatarFile(null)
      showToast('Photo updated!')
    } catch { showToast('Upload failed', 'error') }
    finally { setUploadingAvatar(false) }
  }

  const handleDeleteAvatar = async () => {
    try {
      setUploadingAvatar(true)
      await deleteAvatar(accessToken)
      setProfile(p => p ? { ...p, avatarUrl: undefined } : null)
      setAvatarPreview(null)
      localStorage.removeItem(AVATAR_KEY)
      showToast('Photo removed')
    } catch { showToast('Delete failed', 'error') }
    finally { setUploadingAvatar(false) }
  }

  const handleVerify = async () => {
    try {
      setVerifying(true)
      const res = await sendVerificationEmail(accessToken)
      if (res.success) showToast('Verification email sent!')
      else showToast(res.message || 'Failed', 'error')
    } catch { showToast('Could not send email', 'error') }
    finally { setVerifying(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, background:'#f4f5f9' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #ede9fe', borderTopColor:'#7c3aed', animation:'spin 1s linear infinite' }} />
    </div>
  )

  const displayName = profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : profile?.username || 'User'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const totalGen = stats?.totalGenerations ?? 0
  const doneGen  = stats?.completedGenerations ?? 0

  // Profile completeness score
  const checks = [
    { label: 'Email verified', done: !!profile?.emailVerified },
    { label: 'Photo uploaded', done: !!avatarPreview },
    { label: 'Bio written',    done: bio.trim().length > 0 },
  ]
  const completePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100)
  // SVG ring params
  const R = 38, C = 2 * Math.PI * R
  const dash = (completePct / 100) * C

  return (
    <div style={{ background:'#f4f5f9', minHeight:'100%', fontFamily:"'Inter',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', alignItems:'center', gap:8, padding:'11px 16px', borderRadius:10, background: toast.type==='success'?'#ecfdf5':'#fef2f2', border:`1px solid ${toast.type==='success'?'#a7f3d0':'#fecaca'}`, color: toast.type==='success'?'#065f46':'#991b1b', fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}>
          {toast.type==='success' ? <Check size={14}/> : <X size={14}/>} {toast.msg}
        </div>
      )}

      {/* ── Identity strip ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8edf5', padding:'18px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            {/* Glow rings */}
            <div style={{ position:'absolute', inset:-6, borderRadius:'50%', background:'linear-gradient(135deg,rgba(124,58,237,.35),rgba(167,139,250,.15),rgba(196,181,253,.1))', filter:'blur(6px)', zIndex:0 }}/>
            <div style={{ position:'absolute', inset:-3, borderRadius:'50%', background:'linear-gradient(135deg,rgba(124,58,237,.6),rgba(139,92,246,.4))', zIndex:1 }}/>
            {avatarPreview
              ? <img src={avatarPreview} alt={initials} onError={()=>setAvatarPreview(null)}
                  style={{ position:'relative', zIndex:2, width:60, height:60, borderRadius:'50%', objectFit:'cover', display:'block', boxShadow:'0 0 0 2px #fff' }} />
              : (
                <div style={{ position:'relative', zIndex:2, width:60, height:60, borderRadius:'50%', background:'linear-gradient(145deg,#6d28d9 0%,#7c3aed 40%,#a855f7 70%,#c084fc 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'inset 0 1px 0 rgba(255,255,255,.25), 0 0 0 2px #fff' }}>
                  <span style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-.03em', textShadow:'0 1px 4px rgba(0,0,0,.25)' }}>{initials}</span>
                </div>
              )
            }
            <button onClick={()=>fileRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, zIndex:3, width:20, height:20, borderRadius:'50%', background:'#7c3aed', border:'2px solid #fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, boxShadow:'0 2px 6px rgba(124,58,237,.5)' }}>
              <Camera size={9} color="#fff"/>
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:'none' }} onChange={e=>{ if(e.target.files?.[0]) processFile(e.target.files[0]) }}/>
          </div>

          {/* Name */}
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0f172a', letterSpacing:'-.025em' }}>{displayName}</h1>
              {profile?.emailVerified
                ? <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#dcfce7', color:'#166534', display:'inline-flex', alignItems:'center', gap:3 }}><Check size={9}/>Verified</span>
                : <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'rgba(124,58,237,.08)', color:'#7c3aed', border:'1px solid rgba(124,58,237,.15)', cursor:'pointer' }} onClick={handleVerify}>{verifying?'Sending…':'Unverified'}</span>
              }
            </div>
            {profile?.email && <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b', fontFamily:'monospace' }}>{profile.email}</p>}
          </div>

          {/* Stat pills */}
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {[
              { icon:<Layers size={12}/>, value:String(totalGen),                                            label:'Projects' },
              { icon:<Zap size={12}/>,    value:String(doneGen),                                              label:'Done' },
              { icon:<Star size={12}/>,   value: totalGen ? `${Math.round(doneGen/totalGen*100)}%` : '—',     label:'Rate' },
            ].map(s=>(
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#f8f9fc', border:'1px solid #e8edf5', borderRadius:10 }}>
                <span style={{ color:'#7c3aed' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending upload */}
          {avatarFile && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'rgba(124,58,237,.06)', border:'1px solid rgba(124,58,237,.2)', borderRadius:10 }}>
              <span style={{ fontSize:12, color:'#4c1d95', fontWeight:600, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{avatarFile.name}</span>
              <button onClick={handleUpload} disabled={uploadingAvatar} style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:7, padding:'4px 10px', fontSize:12, fontWeight:700, cursor:'pointer' }}>{uploadingAvatar?'…':'Save'}</button>
              <button onClick={()=>{setAvatarFile(null);const s=localStorage.getItem(AVATAR_KEY);setAvatarPreview(s||profile?.avatarUrl||null)}} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY: 2-column grid ── */}
      <div style={{ padding:'22px 32px', display:'grid', gridTemplateColumns:'1fr 290px', gap:18, alignItems:'start' }}>

        {/* ── COL 1 — Editable content ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Email alert */}
          {!profile?.emailVerified && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <Mail size={14} color="#f59e0b" style={{ flexShrink:0 }}/>
              <p style={{ fontSize:12, fontWeight:600, color:'#92400e', margin:0, flex:1 }}>Confirm your email to unlock all features</p>
              <button onClick={handleVerify} disabled={verifying} style={{ background:'#f59e0b', color:'#fff', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>{verifying?'Sending…':'Send link'}</button>
            </div>
          )}

          <SectionCard title="Profile Photo" icon={<Camera size={13}/>}>
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)processFile(f)}}
              onClick={()=>fileRef.current?.click()}
              style={{ border:`2px dashed ${dragging?'#7c3aed':'#dde3ef'}`, borderRadius:11, padding:'22px 14px', textAlign:'center', cursor:'pointer', background:dragging?'rgba(124,58,237,.02)':'transparent', transition:'all .2s' }}>
              <Camera size={20} color={dragging?'#7c3aed':'#cbd5e1'} style={{ margin:'0 auto 8px' }}/>
              <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 2px' }}>Drag & drop or click</p>
              <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>PNG, JPEG or WebP — max 5 MB</p>
            </div>
            {profile?.avatarUrl && (
              <button onClick={handleDeleteAvatar} disabled={uploadingAvatar} style={{ marginTop:10, background:'none', border:'1px solid rgba(239,68,68,.3)', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, color:'#ef4444', cursor:'pointer' }}>Remove photo</button>
            )}
          </SectionCard>

          <SectionCard title="Bio" icon={<Shield size={13}/>}>
            <textarea
              value={bio}
              onChange={e=>setBio(e.target.value)}
              placeholder="A few words about yourself..."
              rows={4}
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #dde3ef', borderRadius:10, fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', outline:'none', color:'#1e293b', background:'#fafbff', transition:'border-color .2s' }}
              onFocus={e=>e.target.style.borderColor='#7c3aed'}
              onBlur={e=>e.target.style.borderColor='#dde3ef'}
            />
          </SectionCard>

          <SectionCard title="Notifications" icon={<Bell size={13}/>}>
            {TOGGLES.map((t,i)=>(
              <label key={t.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom: i<TOGGLES.length-1?'1px solid #f1f5f9':'none', cursor:'pointer' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#1e293b', margin:0 }}>{t.label}</p>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>{t.desc}</p>
                </div>
                <ToggleSwitch checked={notifs[t.key]} onChange={v=>setNotifs(p=>({...p,[t.key]:v}))}/>
              </label>
            ))}
          </SectionCard>

          {/* Save */}
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, background: saving?'#a78bfa':'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'#fff', border:'none', borderRadius:11, padding:'12px 20px', fontSize:13, fontWeight:700, cursor: saving?'not-allowed':'pointer', boxShadow: saving?'none':'0 4px 14px rgba(124,58,237,.3)', transition:'all .2s' }}>
              <Save size={14}/>{saving?'Saving…':'Save Changes'}
            </button>
            {onClose && (
              <button onClick={onClose} style={{ padding:'12px 18px', borderRadius:11, border:'1.5px solid #dde3ef', background:'#fff', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer' }}>Cancel</button>
            )}
          </div>
        </div>

        {/* ── COL 2 — Sidebar: health + plan + security ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Completeness ring */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'22px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', textAlign:'center' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 16px' }}>Profile Health</p>
            <div style={{ position:'relative', display:'inline-block', marginBottom:14 }}>
              <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform:'rotate(-90deg)' }}>
                <circle cx={48} cy={48} r={R} fill="none" stroke="#f1f5f9" strokeWidth={10}/>
                <circle cx={48} cy={48} r={R} fill="none"
                  stroke={completePct >= 80 ? '#10b981' : completePct >= 50 ? '#7c3aed' : '#f59e0b'}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${C}`}
                  style={{ transition:'stroke-dasharray .6s ease' }}
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:20, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{completePct}<span style={{ fontSize:12, fontWeight:600, color:'#94a3b8' }}>%</span></span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7, textAlign:'left' }}>
              {checks.map(c=>(
                <div key={c.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background: c.done?'#dcfce7':'#f1f5f9', border:`1.5px solid ${c.done?'#86efac':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {c.done ? <Check size={10} color="#16a34a"/> : <span style={{ width:5, height:5, borderRadius:'50%', background:'#cbd5e1', display:'block' }}/>}
                  </div>
                  <span style={{ fontSize:12, fontWeight: c.done?600:400, color: c.done?'#374151':'#94a3b8' }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan badge */}
          <PlanBadge
            totalGen={totalGen}
            generationsThisMonth={profile?.generationsThisMonth ?? 0}
            projectCount={profile?.projectCount ?? 0}
            profile={profile}
            accessToken={accessToken}
            userSub={userSub}
          />

          {/* Security */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ width:24, height:24, borderRadius:7, background:'rgba(124,58,237,.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed' }}><Lock size={12}/></div>
              <h3 style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>Security</h3>
            </div>
            {[
              { label:'Email',   status: profile?.emailVerified ? 'Verified' : 'Pending', style: profile?.emailVerified ? { background:'#dcfce7', color:'#166534' } : { background:'#f1f5f9', color:'#64748b' } },
              { label:'Session', status: 'Active', style: { background:'#dcfce7', color:'#166534' } },
            ].map(s=>(
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #f8f9fc' }}>
                <span style={{ fontSize:12, color:'#64748b', fontWeight:500 }}>{s.label}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, ...s.style }}>{s.status}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16, paddingBottom:12, borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ width:24, height:24, borderRadius:7, background:'rgba(124,58,237,.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed' }}>{icon}</div>
        <h3 style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}


function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={()=>onChange(!checked)}
      style={{ width:42, height:23, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0, background: checked?'linear-gradient(135deg,#7c3aed,#5b21b6)':'#e2e8f0', position:'relative', transition:'background .25s', boxShadow: checked?'0 2px 8px rgba(124,58,237,.4)':'none' }}>
      <span style={{ position:'absolute', top:3, left: checked?22:3, width:17, height:17, borderRadius:'50%', background:'#fff', transition:'left .25s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </button>
  )
}

export default AccountSettings
