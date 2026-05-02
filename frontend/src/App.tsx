import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { AiEditor } from './AiEditor'
import { JiraImportPage } from './JiraImportPage'

function useSafeAuth() {
  const auth = useAuth()
  return auth
}

// ── Inline logo — no external file needed ────────────────────────────────────
function TalantedLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="44" height="44" rx="12" fill="url(#tg)" />
      <rect x="8" y="13" width="28" height="5" rx="2.5" fill="white" />
      <rect x="19.5" y="13" width="5" height="22" rx="2.5" fill="white" />
      <circle cx="38" cy="8" r="5" fill="#f0abfc" />
      <circle cx="38" cy="8" r="2.5" fill="white" opacity="0.8" />
    </svg>
  )
}

// ── Spinner shown while auth loads ──────────────────────────────────────────
const spinnerCss = `
  @keyframes spin-ring { to { transform: rotate(360deg); } }
  @keyframes lp-fade-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes lp-gradient { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  @keyframes lp-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,-30px) scale(1.08)} }
  @keyframes lp-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,40px) scale(0.94)} }
  @keyframes lp-blob3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(20px,-25px)} 66%{transform:translate(-15px,15px)} }
  @keyframes lp-shimmer { 0%{left:-100%} 100%{left:100%} }
  @keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.5)} }
  @keyframes lp-slide-right { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
`

// ── Landing Page ─────────────────────────────────────────────────────────────

const EXAMPLES = [
  '📊 Analytics dashboard with charts and KPIs',
  '🛒 E-commerce product listing page',
  '🎨 Portfolio with dark theme and animations',
  '📋 Admin panel with sidebar navigation',
  '📱 Mobile app landing page',
  '💳 Pricing page with plan comparison',
]

const FEATURES = [
  { icon: '🤖', label: '4 AI Agents', sub: 'working in sequence' },
  { icon: '⚛️', label: 'React + Tailwind', sub: 'production-ready code' },
  { icon: '⚡', label: 'Live Preview', sub: 'instant render' },
  { icon: '📦', label: 'Export & Push', sub: 'ZIP or GitLab' },
  { icon: '🔍', label: 'Quality Score', sub: 'auto-validated' },
  { icon: '🕒', label: 'Version History', sub: 'rollback anytime' },
]

function LandingPage() {
  const auth = useSafeAuth()
  const [hovered, setHovered] = useState<number | null>(null)
  const [inputFocused, setInputFocused] = useState(false)

  const goSignIn = () => void auth.signinRedirect()
  const goSignUp = () => void auth.signinRedirect({ extraQueryParams: { action: 'register' } })

  return (
    <>
      <style>{spinnerCss}</style>
      <div style={{
        minHeight: '100vh',
        background: '#fafafa',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#0f172a',
        overflowX: 'hidden',
        position: 'relative',
      }}>

        {/* ── Gradient blobs background ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            top: -200, right: -150,
            animation: 'lp-blob1 14s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 550, height: 550, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)',
            bottom: -100, left: -100,
            animation: 'lp-blob2 18s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)',
            top: '40%', left: '45%',
            animation: 'lp-blob3 22s ease-in-out infinite',
          }} />
        </div>

        {/* ── Top color bar ── */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100,
          background: 'linear-gradient(90deg, #6366f1, #818cf8, #a855f7, #c084fc, #ec4899)',
        }} />

        {/* ── Navbar ── */}
        <nav style={{
          position: 'fixed', top: 3, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: 60,
          background: 'rgba(250,250,250,0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(99,102,241,0.08)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TalantedLogo size={32} />
            <span style={{
              fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Talanted</span>
          </div>

          {/* Nav actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={goSignIn} style={{
              padding: '8px 18px', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 10, background: 'transparent', color: '#6366f1',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >Sign in</button>
            <button onClick={goSignUp} style={{
              padding: '8px 20px', border: 'none',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)' }}
            >Get started free</button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{
          position: 'relative', zIndex: 1,
          paddingTop: 140, paddingBottom: 60,
          textAlign: 'center', padding: '140px 24px 60px',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            marginBottom: 28,
            animation: 'lp-fade-up .6s ease .1s both',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#6366f1', display: 'inline-block',
              animation: 'lp-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366f1' }}>
              AI-Powered UI Generator
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', margin: '0 auto 20px',
            maxWidth: 820,
            animation: 'lp-fade-up .6s ease .15s both',
          }}>
            What do you want{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'lp-gradient 4s ease infinite',
              display: 'inline-block',
            }}>to build?</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 18, color: '#64748b', lineHeight: 1.7,
            maxWidth: 500, margin: '0 auto 44px',
            animation: 'lp-fade-up .6s ease .2s both',
          }}>
            Describe your interface — <strong style={{ color: '#4f46e5' }}>Talanted</strong> turns it into
            production-ready React code in seconds.
          </p>

          {/* ── Prompt box (Lovable-style) ── */}
          <div style={{
            maxWidth: 720, margin: '0 auto 32px',
            animation: 'lp-fade-up .6s ease .25s both',
          }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 14px 14px 22px',
                borderRadius: 18,
                background: '#fff',
                border: `2px solid ${inputFocused ? '#6366f1' : 'rgba(99,102,241,0.2)'}`,
                boxShadow: inputFocused
                  ? '0 0 0 4px rgba(99,102,241,0.12), 0 8px 32px rgba(99,102,241,0.14)'
                  : '0 4px 24px rgba(99,102,241,0.1)',
                transition: 'all .25s ease',
              }}
              onMouseEnter={() => setInputFocused(true)}
              onMouseLeave={() => setInputFocused(false)}
            >
              <span style={{ fontSize: 18 }}>✨</span>
              <span style={{ flex: 1, fontSize: 15, color: '#94a3b8', textAlign: 'left' }}>
                Describe your UI — e.g. "Dashboard with revenue chart and user table"…
              </span>
              <button onClick={goSignIn} style={{
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                backgroundSize: '200% 200%',
                animation: 'lp-gradient 4s ease infinite',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                position: 'relative', overflow: 'hidden',
              }}>
                <span style={{ position: 'relative', zIndex: 1 }}>Sign in to generate →</span>
                <span style={{
                  position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
                  animation: 'lp-shimmer 2.5s infinite',
                }} />
              </button>
            </div>
          </div>

          {/* ── Example chips — visual only, no redirect ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            maxWidth: 760, margin: '0 auto 70px',
            animation: 'lp-fade-up .6s ease .3s both',
          }}>
            {EXAMPLES.map((ex, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${hovered === i ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'}`,
                  background: hovered === i ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.8)',
                  color: hovered === i ? '#4f46e5' : '#475569',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'default',
                  transition: 'all .2s ease',
                  backdropFilter: 'blur(8px)',
                  transform: hovered === i ? 'translateY(-2px)' : '',
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {ex}
              </span>
            ))}
          </div>

          {/* ── Feature strip ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
            animation: 'lp-fade-up .6s ease .35s both',
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(99,102,241,0.12)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(99,102,241,0.07)',
                transition: 'transform .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 8px 24px rgba(99,102,241,0.14)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 12px rgba(99,102,241,0.07)' }}
              >
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 900, margin: '0 auto',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)',
        }} />

        {/* ── How it works ── */}
        <section style={{
          position: 'relative', zIndex: 1,
          padding: '64px 24px 80px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            From prompt to production in 3 steps
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', marginBottom: 48 }}>No setup. No boilerplate. Just describe and ship.</p>

          <div style={{
            display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap',
            maxWidth: 900, margin: '0 auto',
          }}>
            {[
              { step: '01', icon: '✍️', title: 'Describe', desc: 'Type what you need — a dashboard, form, landing page, anything.' },
              { step: '02', icon: '🤖', title: 'Generate', desc: '4 AI agents collaborate: planner, designer, coder, validator.' },
              { step: '03', icon: '🚀', title: 'Ship', desc: 'Preview live, edit with TED, export ZIP or push to GitLab.' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: '1 1 220px', maxWidth: 280,
                padding: '28px 24px',
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(99,102,241,0.12)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.07)',
                textAlign: 'left',
                transition: 'transform .25s, box-shadow .25s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-5px)'; el.style.boxShadow = '0 12px 36px rgba(99,102,241,0.14)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 4px 20px rgba(99,102,241,0.07)' }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#a855f7',
                  background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 999, padding: '4px 10px', display: 'inline-block', marginBottom: 16,
                }}>STEP {s.step}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA banner ── */}
        <section style={{
          position: 'relative', zIndex: 1,
          padding: '0 24px 80px',
        }}>
          <div style={{
            maxWidth: 700, margin: '0 auto',
            padding: '48px 40px',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(99,102,241,0.35)',
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              Ready to build something amazing?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 28 }}>
              Join Talanted and generate your first UI in under 60 seconds.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={goSignUp} style={{
                padding: '13px 28px', border: 'none', borderRadius: 12,
                background: '#fff', color: '#6366f1',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
              >Get started free →</button>
              <button onClick={goSignIn} style={{
                padding: '13px 28px',
                border: '2px solid rgba(255,255,255,0.4)',
                borderRadius: 12, background: 'transparent',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >Sign in</button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          position: 'relative', zIndex: 1,
          borderTop: '1px solid rgba(99,102,241,0.1)',
          padding: '24px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TalantedLogo size={24} />
            <span style={{
              fontWeight: 700, fontSize: 14,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Talanted</span>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>© 2026 Talanted — AI-Powered UI Generation</span>
        </footer>

      </div>
    </>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const auth = useSafeAuth()

  if (auth.isLoading) {
    return (
      <>
        <style>{spinnerCss}</style>
        <div style={{
          minHeight: '100vh', background: '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.15)',
            borderTopColor: '#6366f1',
            animation: 'spin-ring 0.8s linear infinite',
          }} />
        </div>
      </>
    )
  }

  if (auth.error) {
    return (
      <>
        <style>{spinnerCss}</style>
        <div style={{
          minHeight: '100vh', background: '#fafafa',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ color: '#ef4444', fontSize: 14 }}>Auth error: {String(auth.error)}</div>
          <button onClick={() => void auth.signinRedirect()} style={{
            padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>Try again</button>
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

  const path = window.location.pathname
  if (path === '/jira' || path.startsWith('/jira/')) {
    return <JiraImportPage accessToken={auth.user?.access_token} />
  }

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
