import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { AiEditor } from './AiEditor'
import { JiraImportPage } from './JiraImportPage'

// Custom hook that returns auth context
// Assumes AuthProvider is properly configured
function useSafeAuth() {
  const auth = useAuth()
  return auth
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes float1 {
    0%,100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-30px) scale(1.04); }
  }
  @keyframes float2 {
    0%,100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(20px) scale(0.97); }
  }
  @keyframes float3 {
    0%,100% { transform: translate(0,0); }
    33% { transform: translate(15px,-20px); }
    66% { transform: translate(-10px,10px); }
  }
  @keyframes colorBar {
    0%,100% { transform: scaleX(1); }
    50% { transform: scaleX(1.02); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .landing-root {
    min-height: 100vh;
    background: #fff;
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex;
    overflow: hidden;
  }

  /* ── Color bar top ── */
  .color-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 5px;
    display: flex;
    z-index: 100;
    animation: colorBar 4s ease-in-out infinite;
  }
  .color-bar span { flex: 1; }

  /* ── Left ── */
  .landing-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px 70px;
    position: relative;
    overflow: hidden;
    background: #fff;
  }

  /* Decorative blobs */
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    opacity: 0.18;
  }
  .blob-1 {
    width: 380px; height: 380px;
    background: #5480ba;
    top: -100px; right: -60px;
    animation: float1 8s ease-in-out infinite;
  }
  .blob-2 {
    width: 280px; height: 280px;
    background: #e04580;
    bottom: -80px; left: -60px;
    animation: float2 10s ease-in-out infinite;
  }
  .blob-3 {
    width: 200px; height: 200px;
    background: #8f9424;
    top: 50%; left: 55%;
    animation: float3 12s ease-in-out infinite;
  }

  /* Decorative circles outline */
  .deco-circle {
    position: absolute;
    border-radius: 50%;
    border: 2px solid;
    pointer-events: none;
  }
  .deco-1 {
    width: 500px; height: 500px;
    border-color: rgba(84,128,186,0.08);
    top: -150px; right: -150px;
  }
  .deco-2 {
    width: 300px; height: 300px;
    border-color: rgba(224,69,128,0.07);
    bottom: -100px; left: 100px;
  }

  .left-top {
    margin-bottom: 52px;
    animation: fadeUp 0.7s ease both;
  }

  .left-eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #8f9424;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.7s ease 0.1s both;
  }
  .left-eyebrow::before {
    content: '';
    display: inline-block;
    width: 24px; height: 2px;
    background: #8f9424;
  }

  .left-headline {
    font-family: 'Arvo', Georgia, serif;
    font-size: clamp(38px, 4vw, 60px);
    font-weight: 700;
    color: #111;
    line-height: 1.1;
    margin-bottom: 24px;
    animation: fadeUp 0.7s ease 0.15s both;
  }
  .left-headline .accent-blue { color: #5480ba; }
  .left-headline .accent-rose { color: #e04580; }

  .left-sub {
    font-size: 17px;
    color: #555;
    line-height: 1.7;
    max-width: 440px;
    animation: fadeUp 0.7s ease 0.25s both;
  }

  .feature-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: fadeUp 0.7s ease 0.35s both;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 14px;
    color: #333;
    font-size: 15px;
    font-weight: 500;
  }
  .feature-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tagline {
    margin-top: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeUp 0.7s ease 0.45s both;
  }
  .tagline-line {
    height: 2px;
    width: 32px;
    background: linear-gradient(90deg, #5480ba, #e04580);
  }
  .tagline-text {
    font-size: 13px;
    font-style: italic;
    color: #999;
    letter-spacing: 0.3px;
  }

  /* ── Right ── */
  .landing-right {
    width: 460px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 48px;
    background: #f7f7f7;
    border-left: 1px solid #ebebeb;
    position: relative;
  }

  .card {
    width: 100%;
    animation: fadeUp 0.8s ease 0.2s both;
  }

  .card-logo { margin-bottom: 36px; }

  .card-title {
    font-family: 'Arvo', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: #111;
    margin-bottom: 8px;
  }

  .card-subtitle {
    font-size: 14px;
    color: #888;
    margin-bottom: 36px;
    line-height: 1.6;
  }

  .tab-switcher {
    display: flex;
    background: #ebebeb;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 28px;
  }

  .tab-btn {
    flex: 1;
    padding: 11px 0;
    border-radius: 9px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    transition: all 0.25s ease;
    letter-spacing: 0.3px;
  }
  .tab-btn.active {
    background: #fff;
    color: #5480ba;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .tab-btn.inactive {
    background: transparent;
    color: #aaa;
  }
  .tab-btn.inactive:hover { color: #666; }

  .email-btn {
    width: 100%;
    padding: 15px 20px;
    background: #5480ba;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    font-family: inherit;
    transition: all 0.25s ease;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-size: 13px;
  }
  .email-btn:hover {
    background: #4470aa;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(84,128,186,0.4);
  }
  .email-btn:active { transform: translateY(0); box-shadow: none; }

  .footer-text {
    color: #ccc;
    font-size: 11px;
    text-align: center;
    margin-top: 24px;
    line-height: 1.6;
  }

  @media (max-width: 900px) {
    .landing-left { display: none; }
    .landing-right { width: 100%; border-left: none; }
  }
`

function LandingPage() {
  const auth = useSafeAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  const signInWithEmail = () => {
    void auth.signinRedirect()
  }

  const signUpWithEmail = () => {
    void auth.signinRedirect({ extraQueryParams: { action: 'register' } })
  }

  return (
    <>
      <style>{css}</style>
      <div className="landing-root">

        {/* Color bar */}
        <div className="color-bar">
          <span style={{ background: '#5480ba' }} />
          <span style={{ background: '#8f9424' }} />
          <span style={{ background: '#e04580' }} />
          <span style={{ background: '#6b367d' }} />
          <span style={{ background: '#1d662e' }} />
        </div>

        {/* Left panel */}
        <div className="landing-left">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="deco-circle deco-1" />
          <div className="deco-circle deco-2" />

          <div className="left-top">
            <img src="/talan-logo.svg" alt="Talan" style={{ height: 42, marginBottom: 48, display: 'block' }} />

            <div className="left-eyebrow">Internal Tool</div>

            <h1 className="left-headline">
              Build UIs from<br />
              <span className="accent-blue">a single</span>{' '}
              <span className="accent-rose">prompt</span>
            </h1>

            <p className="left-sub">
              Describe your interface or upload a document —
              generate production-ready React code instantly.
            </p>
          </div>

          <ul className="feature-list">
            {[
              { label: 'Natural language to UI in seconds', color: '#5480ba' },
              { label: 'React + Tailwind production-ready code', color: '#8f9424' },
              { label: 'Live preview & version history', color: '#e04580' },
              { label: 'Document upload — PDF, image, wireframe', color: '#6b367d' },
              { label: 'Multiple provider support', color: '#1d662e' },
            ].map(f => (
              <li key={f.label} className="feature-item">
                <span className="feature-dot" style={{ background: f.color }} />
                {f.label}
              </li>
            ))}
          </ul>

          <div className="tagline">
            <div className="tagline-line" />
            <span className="tagline-text">Positive innovation — Talan © 2026</span>
          </div>
        </div>

        {/* Right panel — auth form */}
        <div className="landing-right">
          <div className="card">
            <div className="card-logo">
              <img src="/talan-logo.svg" alt="Talan" style={{ height: 34 }} />
            </div>

            <h2 className="card-title">
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="card-subtitle">
              {tab === 'signin'
                ? 'Sign in to your Talan UI Generator account.'
                : 'Start generating interfaces from text or documents.'}
            </p>

            <div className="tab-switcher">
              {(['signin', 'signup'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : 'inactive'}`}>
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <button className="email-btn" onClick={tab === 'signin' ? signInWithEmail : signUpWithEmail}>
              {tab === 'signin' ? 'Sign in with Email' : 'Sign up with Email'}
            </button>

            <p className="footer-text">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}

export default function App() {
  const auth = useSafeAuth()

  if (auth.isLoading) {
    return (
      <>
        <style>{css}</style>
        <div style={{
          minHeight: '100vh', background: '#f7f7f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid rgba(84,128,186,0.2)',
            borderTopColor: '#5480ba',
            animation: 'rotate-slow 0.8s linear infinite',
          }} />
        </div>
      </>
    )
  }

  if (auth.error) {
    return (
      <>
        <style>{css}</style>
        <div style={{
          minHeight: '100vh', background: '#f7f7f7',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          color: '#e04580', fontFamily: 'Inter, sans-serif',
        }}>
          <div>Auth error: {String(auth.error)}</div>
          <button onClick={() => void auth.signinRedirect()} style={{
            padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            Try again
          </button>
        </div>
      </>
    )
  }

  if (!auth.isAuthenticated) {
    // Not authenticated - react-oidc-context should redirect to Keycloak
    // If it doesn't, show loading while redirect happens
    return (
      <>
        <style>{css}</style>
        <div style={{
          minHeight: '100vh', background: '#f7f7f7',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          color: '#5480ba', fontFamily: 'Inter, sans-serif', padding: '20px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid rgba(84,128,186,0.2)',
            borderTopColor: '#5480ba',
            animation: 'rotate-slow 0.8s linear infinite',
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Redirecting to Keycloak...</p>
            <p style={{ fontSize: 13, color: '#999' }}>Please login to continue</p>
          </div>
          <button onClick={() => void auth.signinRedirect()} style={{
            padding: '10px 24px', background: '#5480ba',
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            Login with Keycloak
          </button>
        </div>
      </>
    )
  }

  // Authenticated - show the app
  const profile = auth.user?.profile as any
  const username = profile?.preferred_username || profile?.email || profile?.sub || 'user'
  const email = profile?.email as string | undefined
  const firstName = profile?.given_name as string | undefined
  const lastName = profile?.family_name as string | undefined
  const userSub = profile?.sub as string | undefined

  const accessClaims = (() => {
    try {
      const token = auth.user?.access_token
      if (!token) return {}
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    } catch { return {} }
  })()
  const roles: string[] = (accessClaims?.realm_access?.roles as string[] | undefined) ?? []

  const doLogout = async () => {
    try {
      await auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin + '/' })
    } catch {
      await auth.removeUser()
      window.location.assign('/')
    }
  }

  const path = window.location.pathname
  if (path === '/jira' || path.startsWith('/jira/')) {
    return <JiraImportPage accessToken={auth.user?.access_token} />
  }

  // Extract ?gen=... parameter if present (for loading forked projects)
  // Also extract ?mode=... parameter (for returning from Jira import)
  const params = new URLSearchParams(window.location.search)
  const generationIdFromUrl = params.get('gen')
  const initialHomeTab = params.get('mode') as 'create' | 'projects' | 'profile' | 'admin' | null

  return (
    <AiEditor
      accessToken={auth.user?.access_token}
      username={username}
      email={email}
      firstName={firstName}
      lastName={lastName}
      userSub={userSub}
      roles={roles}
      onLogout={doLogout}
      initialGenerationId={generationIdFromUrl}
      initialHomeTab={initialHomeTab || undefined}
    />
  )
}
