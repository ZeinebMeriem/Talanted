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

const getToastAccent = (type: ToastType): string => {
  switch (type) {
    case 'success': return 'text-emerald-400'
    case 'error':   return 'text-red-400'
    case 'warning': return 'text-amber-400'
    case 'info':    return 'text-[#019cda]'
    default:        return 'text-stone-400'
  }
}

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext()

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-toast-in flex items-start gap-3 px-4 py-3 rounded-xl border border-[#019cda]/20 bg-[#15395e] text-sky-100 shadow-2xl backdrop-blur-md transition-all duration-300"
          role="alert"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <span className={`text-sm font-bold flex-shrink-0 mt-0.5 ${getToastAccent(toast.type)}`}>
            {getToastIcon(toast.type)}
          </span>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <div className="font-bold text-xs text-white mb-0.5">{toast.title}</div>
            )}
            {toast.message && (
              <div className="text-xs text-sky-200 leading-relaxed break-words">{toast.message}</div>
            )}
          </div>
          <button
            className="flex-shrink-0 text-sky-400 hover:text-white font-bold text-base leading-none p-0.5 transition-colors duration-200"
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

