import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export const useConfirm = () => {
  const [state, setState] = useState<{
    isOpen: boolean
    options: ConfirmOptions | null
    isLoading: boolean
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: null,
    isLoading: false,
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        isLoading: false,
        resolve,
      })
    })
  }, [])

  const onConfirm = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      state.resolve?.(true)
      setState({
        isOpen: false,
        options: null,
        isLoading: false,
        resolve: null,
      })
    } catch (error) {
      console.error('Confirm error:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [state.resolve])

  const onCancel = useCallback(() => {
    state.resolve?.(false)
    setState({
      isOpen: false,
      options: null,
      isLoading: false,
      resolve: null,
    })
  }, [state.resolve])

  return {
    isOpen: state.isOpen,
    options: state.options,
    isLoading: state.isLoading,
    confirm,
    onConfirm,
    onCancel,
  }
}
