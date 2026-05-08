import React, { useEffect, useState } from 'react'
import {
  getUserProfile,
  updateUserProfile,
  sendVerificationEmail,
  uploadAvatar,
  deleteAvatar,
  type UserProfileResponse,
  type UpdateProfileRequest,
} from '../api'

type TimezoneOption = { label: string; value: string }

const TIMEZONES: TimezoneOption[] = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Dubai', value: 'Asia/Dubai' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
]

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'French (Français)', value: 'fr' },
  { label: 'German (Deutsch)', value: 'de' },
  { label: 'Spanish (Español)', value: 'es' },
  { label: 'Italian (Italiano)', value: 'it' },
]

interface AccountSettingsProps {
  accessToken?: string
  onClose?: () => void
}

export function AccountSettings({ accessToken, onClose }: AccountSettingsProps) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verifyingSending, setVerifyingSending] = useState(false)

  // Form state
  const [bio, setBio] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    weeklyDigest: false,
  })

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Load profile on mount
  useEffect(() => {
    loadProfile()
  }, [accessToken])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUserProfile(accessToken)
      setProfile(data)

      // Set form fields
      if (data.bio) setBio(data.bio)
      if (data.timezone) setTimezone(data.timezone)
      if (data.preferredLanguage) setLanguage(data.preferredLanguage)
      if (data.notifications) setNotifications({
        emailNotifications: data.notifications.emailNotifications ?? false,
        projectUpdates: data.notifications.projectUpdates ?? false,
        weeklyDigest: data.notifications.weeklyDigest ?? false
      })
      if (data.avatarUrl) setAvatarPreview(data.avatarUrl)
    } catch (err) {
      setError(`Failed to load profile: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const request: UpdateProfileRequest = {
        bio,
        timezone,
        preferredLanguage: language,
        notifications,
      }

      const updated = await updateUserProfile(request, accessToken)
      setProfile(updated)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(`Failed to save profile: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      setError('Avatar file too large. Maximum size: 5MB')
      return
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Invalid file type. Allowed: PNG, JPEG, WebP')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadAvatar = async () => {
    if (!avatarFile) return

    try {
      setUploadingAvatar(true)
      setError(null)
      const result = await uploadAvatar(avatarFile, accessToken)
      setProfile((prev) => prev ? { ...prev, avatarUrl: result.avatarUrl } : null)
      setAvatarFile(null)
      setSuccess('Avatar uploaded successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(`Failed to upload avatar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      setUploadingAvatar(true)
      setError(null)
      await deleteAvatar(accessToken)
      setProfile((prev) => prev ? { ...prev, avatarUrl: undefined } : null)
      setAvatarPreview(null)
      setSuccess('Avatar deleted successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(`Failed to delete avatar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSendVerificationEmail = async () => {
    try {
      setVerifyingSending(true)
      setError(null)
      const result = await sendVerificationEmail(accessToken)
      if (result.success) {
        setSuccess('Verification email sent! Check your inbox.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.message || 'Failed to send verification email')
      }
    } catch (err) {
      setError(`Failed to send verification email: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setVerifyingSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#666' }}>Loading profile...</div>
      </div>
    )
  }

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.username || 'User'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 20,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            fontSize: 14,
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 20,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            fontSize: 14,
            color: '#16a34a',
          }}
        >
          {success}
        </div>
      )}

      {/* Identity Card */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 20, padding: 32, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={avatarPreview || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=5480ba&color=fff&size=80&bold=true&font-size=0.4'}
              alt="Avatar"
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '3px solid #5480ba',
              }}
            />
          </div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
              {displayName}
            </h2>
            {profile?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', margin: 0 }}>{profile.email}</p>
                {profile.emailVerified ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(52,211,153,.12)',
                      color: '#34d399',
                    }}
                  >
                    ✓ Verified
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(251,191,36,.1)',
                      color: '#fbbf24',
                    }}
                  >
                    ⏳ Pending
                  </span>
                )}
              </div>
            )}
            {profile?.createdAt && (
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,.35)', margin: 0 }}>
                Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Email verification section */}
        {!profile?.emailVerified && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Email verification pending</p>
            <button
              onClick={handleSendVerificationEmail}
              disabled={verifyingSending}
              style={{
                background: '#5480ba',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: verifyingSending ? 'not-allowed' : 'pointer',
                opacity: verifyingSending ? 0.6 : 1,
              }}
            >
              {verifyingSending ? 'Sending...' : 'Send verification email'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar upload section */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Photo</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <img
            src={avatarPreview || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=5480ba&color=fff&size=100&bold=true' }
            alt="Preview"
            style={{ width: 100, height: 100, borderRadius: 12, border: '1px solid rgba(0,0,0,.1)' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'inline-block',
                  background: '#5480ba',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginRight: 8,
                }}
              >
                Choose file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
              {avatarFile && (
                <>
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    style={{
                      background: '#34d399',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                      opacity: uploadingAvatar ? 0.6 : 1,
                    }}
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Upload'}
                  </button>
                </>
              )}
            </div>
            {profile?.avatarUrl && (
              <button
                onClick={handleDeleteAvatar}
                disabled={uploadingAvatar}
                style={{
                  background: 'none',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                  opacity: uploadingAvatar ? 0.6 : 1,
                }}
              >
                Delete current photo
              </button>
            )}
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: '8px 0 0' }}>
              PNG, JPEG or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile settings */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Profile</h3>

        {/* Bio */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,.15)',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Timezone */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,.15)',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Preferred Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,.15)',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification preferences */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Notifications</h3>

        {[
          { key: 'emailNotifications' as const, label: 'Email Notifications', description: 'Get email updates about your account' },
          { key: 'projectUpdates' as const, label: 'Project Updates', description: 'Be notified when projects are completed' },
          { key: 'weeklyDigest' as const, label: 'Weekly Digest', description: 'Get a weekly summary of your activity' },
        ].map((pref) => (
          <label key={pref.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={notifications[pref.key]}
              onChange={(e) => setNotifications((prev) => ({ ...prev, [pref.key]: e.target.checked }))}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{pref.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', margin: 0 }}>{pref.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            flex: 1,
            background: '#5480ba',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(0,0,0,.15)',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
