import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { AiEditor } from './AiEditor'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-20px) rotate(1deg); }
    66% { transform: translateY(-10px) rotate(-1deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes border-glow {
    0%, 100% { border-color: rgba(99,102,241,0.3); box-shadow: 0 0 20px rgba(99,102,241,0.1); }
    50% { border-color: rgba(168,85,247,0.5); box-shadow: 0 0 40px rgba(168,85,247,0.2); }
  }
  @keyframes particle {
    0% { transform: translateY(100vh) translateX(0px); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px) translateX(30px); opacity: 0; }
  }
  @keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
  }
  @keyframes grid-fade {
    0%, 100% { opacity: 0.03; }
    50% { opacity: 0.07; }
  }

  .landing-root {
    min-height: 100vh;
    background: #020208;
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px);
    background-size: 60px 60px;
    animation: grid-fade 4s ease-in-out infinite;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    animation: pulse-glow 6s ease-in-out infinite;
    pointer-events: none;
  }
  .orb-1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
    top: -100px; left: -100px;
    animation-delay: 0s;
  }
  .orb-2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%);
    bottom: -80px; right: -80px;
    animation-delay: 2s;
  }
  .orb-3 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 4s;
  }

  .card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 480px;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    padding: 20px;
  }

  .logo-area {
    text-align: center;
    margin-bottom: 40px;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .logo-icon {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    margin-bottom: 16px;
    box-shadow: 0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.1);
    animation: float 6s ease-in-out infinite;
  }

  .logo-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .headline {
    font-size: clamp(36px, 5vw, 52px);
    font-weight: 900;
    line-height: 1.1;
    text-align: center;
    margin-bottom: 16px;
    color: #fff;
    letter-spacing: -1.5px;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }

  .headline-gradient {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .subtitle {
    text-align: center;
    color: rgba(255,255,255,0.35);
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 40px;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }

  .auth-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 32px;
    backdrop-filter: blur(20px);
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both, border-glow 4s ease-in-out infinite;
  }

  .tab-switcher {
    display: flex;
    background: rgba(0,0,0,0.3);
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 28px;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .tab-btn {
    flex: 1;
    padding: 10px 0;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    letter-spacing: 0.3px;
  }
  .tab-btn.active {
    background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3));
    color: #c4b5fd;
    box-shadow: 0 0 20px rgba(99,102,241,0.15);
  }
  .tab-btn.inactive {
    background: transparent;
    color: rgba(255,255,255,0.3);
  }
  .tab-btn.inactive:hover {
    color: rgba(255,255,255,0.6);
  }

  .auth-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }

  .auth-subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    margin-bottom: 24px;
  }

  .github-btn {
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #24292f, #2d333b);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    font-family: inherit;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.2px;
  }
  .github-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent);
    opacity: 0;
    transition: opacity 0.25s;
  }
  .github-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.2);
  }
  .github-btn:hover::before { opacity: 1; }
  .github-btn:active { transform: translateY(0); }
  .github-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }
  .divider-text {
    color: rgba(255,255,255,0.2);
    font-size: 12px;
  }

  .email-btn {
    width: 100%;
    padding: 14px 20px;
    background: transparent;
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 12px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    color: #818cf8;
    font-family: inherit;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    letter-spacing: 0.2px;
  }
  .email-btn:hover {
    background: rgba(99,102,241,0.08);
    border-color: rgba(99,102,241,0.6);
    color: #a5b4fc;
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(99,102,241,0.1);
  }
  .email-btn:active { transform: translateY(0); }

  .footer-text {
    color: rgba(255,255,255,0.15);
    font-size: 11px;
    text-align: center;
    margin-top: 20px;
    line-height: 1.6;
  }

  .particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .particle {
    position: absolute;
    width: 2px;
    height: 2px;
    background: rgba(99,102,241,0.6);
    border-radius: 50%;
    animation: particle linear infinite;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 12px;
    color: #818cf8;
    margin-bottom: 20px;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
  }
  .badge-dot {
    width: 6px; height: 6px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 6px #22c55e;
    animation: pulse-glow 2s ease-in-out infinite;
  }
`

function LandingPage() {
  const auth = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${8 + Math.random() * 12}s`,
      delay: `${Math.random() * 10}s`,
      size: Math.random() > 0.5 ? 2 : 3,
    }))
  )

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
        <div className="grid-bg" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="particles">
          {particles.map(p => (
            <div key={p.id} className="particle" style={{
              left: p.left,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }} />
          ))}
        </div>

        <div className="card">
          <div className="logo-area">
            <img src="/talan-logo.svg" alt="Talan" style={{ height: 48, marginBottom: 12 }} />
            <div className="logo-title">UI Generator</div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="badge">
              <div className="badge-dot" />
              Powered by AI
            </div>

            <h1 className="headline">
              Build UIs from<br />
              <span className="headline-gradient">a single prompt</span>
            </h1>

            <p className="subtitle">
              Describe your interface or upload a document —<br />
              our AI pipeline generates production-ready code.
            </p>
          </div>

          <div className="auth-box">
            <div className="tab-switcher">
              {(['signin', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab-btn ${tab === t ? 'active' : 'inactive'}`}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="auth-title">
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </div>
            <div className="auth-subtitle">
              {tab === 'signin'
                ? 'Sign in to continue building amazing UIs.'
                : 'Start generating interfaces from text or documents.'}
            </div>

            <button
              className="email-btn"
              onClick={tab === 'signin' ? signInWithEmail : signUpWithEmail}
            >
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
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <>
        <style>{css}</style>
        <div style={{
          minHeight: '100vh', background: '#020208',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
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
          minHeight: '100vh', background: '#020208',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          color: '#f87171', fontFamily: 'Inter, sans-serif',
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
    return <LandingPage />
  }

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
    />
  )
}
