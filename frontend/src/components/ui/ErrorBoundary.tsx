import React, { ReactNode, ErrorInfo } from 'react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div
          style={{
            padding: '24px',
            margin: '16px',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            color: '#7f1d1d',
          }}
          role="alert"
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
            {this.state.error.message}
          </p>
          <Button
            onClick={this.handleReset}
            variant="danger"
            size="sm"
          >
            Try Again
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '16px', fontSize: '12px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Error details
              </summary>
              <pre
                style={{
                  background: 'rgba(0,0,0,0.1)',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '11px',
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
