import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { AiEditor } from './AiEditor'

export default function App() {
  const auth = useAuth()

  useEffect(() => {
    if (window.location.pathname.startsWith('/auth/callback')) return
    if (auth.isLoading) return
    if (auth.activeNavigator) return
    if (auth.isAuthenticated) return

    void auth.signinRedirect()
  }, [auth])

  if (auth.isLoading) {
    return <div>Loading…</div>
  }

  if (auth.error) {
    return (
      <div>
        <div>Auth error: {String(auth.error)}</div>
        <button onClick={() => void auth.signinRedirect()}>
          Sign in
        </button>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <div>Redirecting to login…</div>
  }

  const username =
    (auth.user?.profile as any)?.preferred_username ||
    (auth.user?.profile as any)?.email ||
    auth.user?.profile?.sub ||
    'user'

  const doLogout = async () => {
    try {
      await auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin + '/' })
    } catch {
      await auth.removeUser()
      window.location.assign('/')
    }
  }

  return (
    <AiEditor accessToken={auth.user?.access_token} username={username} onLogout={doLogout} />
  )
}
