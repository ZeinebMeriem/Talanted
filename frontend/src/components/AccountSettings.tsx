import React, { useEffect, useRef, useState } from 'react'
import {
  getUserProfile, updateUserProfile, sendVerificationEmail,
  uploadAvatar, deleteAvatar, getUserStats,
  type UserProfileResponse, type UpdateProfileRequest,
} from '../api'
import { Camera, Check, ChevronDown, Mail, Shield, Bell, Globe, Clock, Save, X, Zap, Layers, Star } from 'lucide-react'

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Asia/Dubai', value: 'Asia/Dubai' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
]

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'French (Français)', value: 'fr' },
  { label: 'Spanish (Español)', value: 'es' },
  { label: 'German (Deutsch)', value: 'de' },
]

const AVATAR_KEY = 'talanted_avatar_url'

interface Toggle { label: string; desc: string; key: 'emailNotifications' | 'projectUpdates' | 'weeklyDigest' }
const TOGGLES: Toggle[] = [
  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates and alerts via email' },
  { key: 'projectUpdates',     label: 'Project Updates',     desc: 'Notify when a generation completes' },
  { key: 'weeklyDigest',       label: 'Weekly Digest',       desc: 'Summary of your activity every week' },
]

interface AccountSettingsProps {
  accessToken?: string
  onClose?: () => void
}

export function AccountSettings({ accessToken, onClose }: AccountSettingsProps) {
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

  // Restore avatar from localStorage on every mount
  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY)
    if (saved) {
      setAvatarPreview(saved)
    }
  }, [])

  useEffect(() => { load() }, [accessToken])

  const load = async () => {
    try {
      setLoading(true)
      const [data, st] = await Promise.allSettled([
        getUserProfile(accessToken),
        getUserStats(accessToken),
      ])
      if (data.status === 'fulfilled') {
        const d = data.value
        setProfile(d)
        if (d.bio) setBio(d.bio)
        if (d.timezone) setTimezone(d.timezone)
        if (d.preferredLanguage) setLanguage(d.preferredLanguage)
        if (d.notifications) setNotifs({ emailNotifications: d.notifications.emailNotifications ?? true, projectUpdates: d.notifications.projectUpdates ?? true, weeklyDigest: d.notifications.weeklyDigest ?? false })
        // localStorage first (always accessible), backend URL as fallback
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
      const req: UpdateProfileRequest = { bio, timezone, preferredLanguage: language, notifications: notifs }
      const updated = await updateUserProfile(req, accessToken)
      setProfile(updated)
      showToast('Profile saved successfully!')
    } catch { showToast('Failed to save profile', 'error') }
    finally { setSaving(false) }
  }

  const processFile = (file: File) => {
    if (file.size > 5242880) { showToast('File too large (max 5 MB)', 'error'); return }
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { showToast('Only PNG, JPEG or WebP allowed', 'error'); return }
    setAvatarFile(file)
    // Immediate preview (synchronous, shows instantly)
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    // Async: save base64 to localStorage for persistence across navigation
    const r = new FileReader()
    r.onload = e => {
      const dataUrl = e.target?.result as string
      if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl)
    }
    r.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!avatarFile) return
    try {
      setUploadingAvatar(true)
      // Save data URL to localStorage immediately (doesn't depend on MinIO URL)
      const r = new FileReader()
      const dataUrl = await new Promise<string>(resolve => {
        r.onload = e => resolve(e.target?.result as string)
        r.readAsDataURL(avatarFile)
      })
      localStorage.setItem(AVATAR_KEY, dataUrl)
      setAvatarPreview(dataUrl)

      // Also upload to backend (best effort)
      try {
        await uploadAvatar(avatarFile, accessToken)
      } catch { /* backend upload optional */ }

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(1,156,218,.15)', borderTopColor: '#019cda', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.username || 'User'

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: "'Inter', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.1)',
          animation: 'fadeUp .3s ease',
        }}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Hero banner ── */}
      <div style={{
        borderRadius: 24, overflow: 'hidden', marginBottom: 24,
        background: 'linear-gradient(135deg, #019cda 0%, #0369a1 50%, #0369a1 100%)',
        position: 'relative',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div style={{ padding: '32px 32px 28px', display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={initials}
                onError={() => setAvatarPreview(null)}
                style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid rgba(255,255,255,.3)', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', border: '3px solid rgba(255,255,255,.3)' }}>{initials}</div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}
            >
              <Camera size={14} color="#019cda" />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
          </div>

          {/* Name & email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-.02em' }}>{displayName}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {profile?.email && <span style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>{profile.email}</span>}
              {profile?.emailVerified
                ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,211,153,.25)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={10} /> Verified</span>
                : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(251,191,36,.2)', color: '#fde68a' }}>Pending</span>
              }
            </div>
            {profile?.createdAt && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: '6px 0 0' }}>
                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              {[
                { icon: <Layers size={16} />, value: stats.totalGenerations ?? 0, label: 'Projects' },
                { icon: <Zap size={16} />, value: stats.completedGenerations ?? 0, label: 'Completed' },
                { icon: <Star size={16} />, value: stats.totalGenerations ? Math.round((stats.completedGenerations ?? 0) / stats.totalGenerations * 100) : 0, label: 'Success %' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload pending banner */}
        {avatarFile && (
          <div style={{ background: 'rgba(0,0,0,.2)', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', flex: 1 }}>New photo selected: <strong>{avatarFile.name}</strong></span>
            <button onClick={handleUpload} disabled={uploadingAvatar} style={{ background: '#fff', color: '#019cda', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {uploadingAvatar ? 'Uploading…' : 'Save photo'}
            </button>
            <button onClick={() => { setAvatarFile(null); const saved = localStorage.getItem(AVATAR_KEY); setAvatarPreview(saved || profile?.avatarUrl || null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>

      {/* ── Email verification ── */}
      {!profile?.emailVerified && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mail size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>Verify your email address</p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>Confirm your email to unlock all features</p>
          </div>
          <button onClick={handleVerify} disabled={verifying} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {verifying ? 'Sending…' : 'Send link'}
          </button>
        </div>
      )}

      {/* ── Photo upload card ── */}
      <Card title="Photo" icon={<Camera size={16} />}>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#019cda' : 'rgba(0,0,0,.1)'}`,
            borderRadius: 14,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(1,156,218,.04)' : 'transparent',
            transition: 'all .2s ease',
          }}
        >
          <Camera size={28} color={dragging ? '#019cda' : '#94a3b8'} style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Drag & drop or click to upload</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>PNG, JPEG or WebP — max 5 MB</p>
        </div>
        {profile?.avatarUrl && (
          <button onClick={handleDeleteAvatar} disabled={uploadingAvatar} style={{ marginTop: 12, background: 'none', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>
            Remove photo
          </button>
        )}
      </Card>

      {/* ── Profile form ── */}
      <Card title="Profile" icon={<Shield size={16} />}>
        <FormField label="Bio">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A few words about yourself..."
            rows={3}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' }}
            onFocus={e => e.target.style.borderColor = '#019cda'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Timezone" icon={<Clock size={13} />}>
            <StyledSelect value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </FormField>
          <FormField label="Language" icon={<Globe size={13} />}>
            <StyledSelect value={language} onChange={setLanguage} options={LANGUAGES} />
          </FormField>
        </div>
      </Card>

      {/* ── Notifications ── */}
      <Card title="Notifications" icon={<Bell size={16} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {TOGGLES.map((t, i) => (
            <label key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < TOGGLES.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', margin: 0 }}>{t.label}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{t.desc}</p>
              </div>
              <ToggleSwitch checked={notifs[t.key]} onChange={v => setNotifs(p => ({ ...p, [t.key]: v }))} />
            </label>
          ))}
        </div>
      </Card>

      {/* ── Save ── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: saving ? '#7dd3fc' : 'linear-gradient(135deg, #019cda, #0369a1)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(1,156,218,.35)',
            transition: 'all .2s ease',
          }}
        >
          <Save size={15} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {onClose && (
          <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #f0f0f8', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(1,156,218,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#019cda' }}>{icon}</div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {icon && <span style={{ color: '#019cda' }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

function StyledSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 36px 10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff', appearance: 'none', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? 'linear-gradient(135deg, #019cda, #0369a1)' : '#e5e7eb',
        position: 'relative', transition: 'background .25s ease',
        boxShadow: checked ? '0 2px 8px rgba(1,156,218,.4)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .25s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

export default AccountSettings
