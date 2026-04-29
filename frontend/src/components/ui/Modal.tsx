import React, { useEffect, useRef, ReactNode } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  // Auto-focus first element only when modal first opens
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Event listeners — stable, re-bind only when handlers change
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose()
      }
    }

    const handleBackdropClick = (e: MouseEvent) => {
      if (closeOnBackdropClick && e.target === backdropRef.current) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>

        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleKeyDown)
    backdropRef.current?.addEventListener('click', handleBackdropClick)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleKeyDown)
      backdropRef.current?.removeEventListener('click', handleBackdropClick)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, closeOnBackdropClick, closeOnEscape])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-fade"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`
          w-full ${sizeMap[size]} max-h-[90vh] overflow-auto
          rounded-2xl bg-white dark:bg-slate-900
          shadow-2xl
          animate-modal-scale
          border border-white/40 dark:border-slate-800/40
        `}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 2px rgba(255,255,255,0.3)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 id="modal-title" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title}
            </h2>
            <button
              className="
                text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                text-2xl leading-none
                hover:bg-slate-100 dark:hover:bg-slate-800
                p-1 rounded-lg
                transition-all duration-200
                focus-visible:outline-2 focus-visible:outline-blue-500
              "
              onClick={onClose}
              aria-label="Close dialog"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        <div className="px-6 py-6">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

