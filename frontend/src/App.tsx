import { useAuth } from 'react-oidc-context'
import { AiEditor as RemixApp } from './AiEditor'
import { JiraImportPage } from './JiraImportPage'
import LandingPage from './pages/LandingPage'
import SharePage from './pages/SharePage'

function useSafeAuth() {
  try {
    const auth = useAuth()
    if (!auth) throw new Error('auth undefined')
    return auth
  } catch {
    // useAuth() threw — AuthProvider not available (dev mode without OIDC)
    const devToken = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZXYtdXNlciIsInByZWZlcnJlZF91c2VybmFtZSI6ImRldmVsb3BlciIsImdpdmVuX25hbWUiOiJEZXZlbG9wZXIiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6ImRldkBsb2NhbCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl19fQ.'
    return {
      isLoading: false,
      isAuthenticated: true,
      error: null,
      user: {
        access_token: devToken,
        profile: { sub: 'dev-user', preferred_username: 'developer', given_name: 'Developer', family_name: 'User', name: 'Developer User', email: 'dev@local', email_verified: true },
      },
      signinRedirect: async () => { window.location.reload() },
      signoutRedirect: async () => { window.location.assign('/') },
      removeUser: async () => { window.location.assign('/') },
    }
  }
}

const spinnerCss = `@keyframes spin-ring { to { transform: rotate(360deg); } }`

function AuthenticatedApp() {
  const auth = useSafeAuth()

  if (auth.isLoading) {
    return (
      <>
        <style>{spinnerCss}</style>
        <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(1,156,218,0.15)', borderTopColor: '#019cda', animation: 'spin-ring 0.8s linear infinite' }} />
        </div>
      </>
    )
  }

  if (auth.error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: '#ef4444', fontSize: 14 }}>Auth error: {String(auth.error)}</div>
        <button onClick={() => void auth.signinRedirect()} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#019cda,#0369a1)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Try again
        </button>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    async function signinWithCredentials(identifier: string, password: string): Promise<string | null> {
      const authority = import.meta.env.VITE_OIDC_AUTHORITY as string
      const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string
      try {
        const res = await fetch(`${authority}/protocol/openid-connect/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            username: identifier,
            password,
            scope: 'openid profile email',
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as Record<string, string>
          return err.error_description || 'Invalid email or password.'
        }
        const tokens = await res.json() as Record<string, string | number>
        // Decode JWT payload to get profile
        const parseJwt = (t: string) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) } catch { return {} } }
        const profile = parseJwt(tokens.id_token as string || tokens.access_token as string)
        const storageKey = `oidc.user:${authority}:${clientId}`
        const userObj = {
          id_token: tokens.id_token,
          session_state: tokens.session_state ?? null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: 'Bearer',
          scope: tokens.scope,
          profile,
          expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in as number),
        }
        sessionStorage.setItem(storageKey, JSON.stringify(userObj))
        window.location.reload()
        return null
      } catch {
        return 'Network error. Please try again.'
      }
    }
    async function register(
      firstName: string, lastName: string, email: string, username: string, password: string
    ): Promise<string | null> {
      try {
        const bff = import.meta.env.VITE_BFF_BASE_URL as string || 'http://localhost:8081'
        const res = await fetch(`${bff}/api/users/public/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, username, password }),
        })
        const data = await res.json() as Record<string, string>
        if (!res.ok) return data.error || 'Registration failed.'
        // Auto-login with ROPC after successful registration
        return signinWithCredentials(email, password)
      } catch {
        return 'Network error. Please try again.'
      }
    }

    return <LandingPage onSignIn={() => void auth.signinRedirect()} onSignInWithCredentials={signinWithCredentials} onRegister={register} />
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
    const idToken = (auth.user as any)?.id_token
    try { await auth.removeUser() } catch { /* ignore */ }
    const authority = import.meta.env.VITE_OIDC_AUTHORITY
    if (authority) {
      const params = new URLSearchParams({
        post_logout_redirect_uri: window.location.origin + '/',
        client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
        ...(idToken ? { id_token_hint: idToken } : {}),
      })
      window.location.href = `${authority}/protocol/openid-connect/logout?${params}`
    } else {
      window.location.assign('/')
    }
  }

  const path = window.location.pathname
  if (path === '/jira' || path.startsWith('/jira/')) {
    return <JiraImportPage isOpen={true} onClose={() => window.location.assign('/')} accessToken={auth.user?.access_token} />
  }

  return (
    <RemixApp
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

export default function App() {
  const currentPath = window.location.pathname
  const shareMatch = currentPath.match(/^\/share\/([a-zA-Z0-9]+)$/)
  if (shareMatch) {
    return <SharePage token={shareMatch[1]} />
  }
  return <AuthenticatedApp />
}
