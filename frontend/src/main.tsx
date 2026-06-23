import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import './index.css'

type ErrorBoundaryState = {
  hasError: boolean
  message?: string
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected frontend error',
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('❌ Frontend runtime error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: 24 }}>
          <div style={{ maxWidth: 560, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>The app hit an unexpected error</h1>
            <p style={{ margin: '10px 0 16px', color: '#475569', fontSize: 14 }}>Refresh the page to recover. If this keeps happening, check the browser console for details.</p>
            <pre style={{ margin: '0 0 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, color: '#334155', fontSize: 12, whiteSpace: 'pre-wrap' }}>{this.state.message}</pre>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI
const postLogoutRedirectUri = window.location.origin + '/'

const hasOidcConfig = authority && clientId && redirectUri

if (!hasOidcConfig) {
  console.warn('OIDC config missing - running in dev/bypass mode')
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  // eslint-disable-next-line no-console
  console.error('❌ Root element not found!')
  document.body.innerHTML = '<h1>Error: root element not found</h1>'
} else {
  const root = ReactDOM.createRoot(rootEl)

  // Add a loading indicator that's visible before React renders
  rootEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Inter,sans-serif;background:#f7f7f7;"><div style="text-align:center;"><div style="font-size:14px;color:#666;margin-bottom:16px;">Loading...</div><div style="width:40px;height:40px;border:3px solid rgba(84,128,186,0.2);border-top-color:#5480ba;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;" /></div></div>'

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
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </AuthProvider>
      </React.StrictMode>,
    )
  } else {
    root.render(
      <React.StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </React.StrictMode>,
    )
  }
}
