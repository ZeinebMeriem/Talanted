import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import './index.css'

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI
const postLogoutRedirectUri = window.location.origin + '/'

const hasOidcConfig = authority && clientId && redirectUri

if (!hasOidcConfig) {
  // eslint-disable-next-line no-console
  console.warn('OIDC config missing - running in dev/bypass mode')
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (hasOidcConfig) {
  root.render(
    <React.StrictMode>
      <AuthProvider
        authority={authority}
        client_id={clientId}
        redirect_uri={redirectUri}
        post_logout_redirect_uri={postLogoutRedirectUri}
        response_type="code"
        scope="openid profile email"
        onSigninCallback={() => {
          window.history.replaceState({}, document.title, '/')
        }}
      >
        <App />
      </AuthProvider>
    </React.StrictMode>,
  )
} else {
  // Dev mode: skip auth, render app directly
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
