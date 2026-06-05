import { useAuth } from 'react-oidc-context'
import { AiEditor } from './AiEditor'
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
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: '#6366f1', animation: 'spin-ring 0.8s linear infinite' }} />
        </div>
      </>
    )
  }

  if (auth.error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: '#ef4444', fontSize: 14 }}>Auth error: {String(auth.error)}</div>
        <button onClick={() => void auth.signinRedirect()} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Try again
        </button>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <LandingPage onSignIn={() => void auth.signinRedirect()} />
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

export default function App() {
  const currentPath = window.location.pathname
  const shareMatch = currentPath.match(/^\/share\/([a-zA-Z0-9]+)$/)
  if (shareMatch) {
    return <SharePage token={shareMatch[1]} />
  }
  return <AuthenticatedApp />
}
