import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import './index.css'

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI
const postLogoutRedirectUri = window.location.origin + '/'

if (!authority || !clientId || !redirectUri) {
  // Fail fast to avoid confusing 401 loops.
  // eslint-disable-next-line no-console
  console.error('Missing OIDC env vars: VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID, VITE_OIDC_REDIRECT_URI')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider
      authority={authority}
      client_id={clientId}
      redirect_uri={redirectUri}
      post_logout_redirect_uri={postLogoutRedirectUri}
      response_type="code"
      scope="openid profile email"
      onSigninCallback={() => {
        // Remove auth query params from the URL.
        window.history.replaceState({}, document.title, '/')
      }}
    >
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
