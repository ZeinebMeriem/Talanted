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

  const profile = auth.user?.profile as any
  const username = profile?.preferred_username || profile?.email || profile?.sub || 'user'
  const email = profile?.email as string | undefined
  const firstName = profile?.given_name as string | undefined
  const lastName = profile?.family_name as string | undefined
  const userSub = profile?.sub as string | undefined
  const roles: string[] = (profile?.realm_access?.roles as string[] | undefined) ?? []

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
