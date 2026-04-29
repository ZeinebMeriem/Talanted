import React, { createContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
  onClose?: () => void
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => string
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToastContext = (): ToastContextType => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = toast.duration ?? 4000
    const fullToast: ToastMessage = { ...toast, id, duration }

    setToasts(prev => [...prev, fullToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id)
      if (toast?.onClose) {
        toast.onClose()
      }
      return prev.filter(t => t.id !== id)
    })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

const getToastIcon = (type: ToastType): string => {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    default: return '•'
  }
}

const getToastGradient = (type: ToastType): string => {
  switch (type) {
    case 'success': return 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
    case 'error': return 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
    case 'warning': return 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
    case 'info': return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
    default: return 'from-slate-50 to-slate-100'
  }
}

const getToastBorderColor = (type: ToastType): string => {
  switch (type) {
    case 'success': return 'border-emerald-200 dark:border-emerald-700'
    case 'error': return 'border-red-200 dark:border-red-700'
    case 'warning': return 'border-amber-200 dark:border-amber-700'
    case 'info': return 'border-blue-200 dark:border-blue-700'
    default: return 'border-slate-200'
  }
}

const getToastIconColor = (type: ToastType): string => {
  switch (type) {
    case 'success': return 'text-emerald-600 dark:text-emerald-400'
    case 'error': return 'text-red-600 dark:text-red-400'
    case 'warning': return 'text-amber-600 dark:text-amber-400'
    case 'info': return 'text-blue-600 dark:text-blue-400'
    default: return 'text-slate-600'
  }
}

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext()

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            animate-toast-in
            flex gap-4 p-4 rounded-lg
            border backdrop-blur-md
            bg-gradient-to-br ${getToastGradient(toast.type)} ${getToastBorderColor(toast.type)}
            shadow-lg hover:shadow-xl
            transition-all duration-300
          `}
          role="alert"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          style={{
            animation: `toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)`
          }}
        >
          <span className={`text-xl font-bold flex-shrink-0 ${getToastIconColor(toast.type)}`}>
            {getToastIcon(toast.type)}
          </span>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {toast.title}
              </div>
            )}
            {toast.message && (
              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed break-words">
                {toast.message}
              </div>
            )}
          </div>
          <button
            className={`
              flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              font-bold text-lg leading-none
              p-1
              transition-colors duration-200
            `}
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

