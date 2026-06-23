import { useToastContext, type ToastType } from '../components/ui/Toast'

interface ToastOptions {
  title?: string
  duration?: number
}

export const useToast = () => {
  const { addToast } = useToastContext()

  return {
    success: (message: string, options?: ToastOptions) =>
      addToast({ message, type: 'success', title: options?.title, duration: options?.duration }),
    error: (message: string, options?: ToastOptions) =>
      addToast({ message, type: 'error', title: options?.title ?? 'Error', duration: options?.duration }),
    warning: (message: string, options?: ToastOptions) =>
      addToast({ message, type: 'warning', title: options?.title ?? 'Warning', duration: options?.duration }),
    info: (message: string, options?: ToastOptions) =>
      addToast({ message, type: 'info', title: options?.title, duration: options?.duration }),
  }
}
