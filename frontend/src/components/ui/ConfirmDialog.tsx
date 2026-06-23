import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Confirm action failed:', error)
    }
  }

  const footer = (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button
        variant={isDangerous ? 'danger' : 'primary'}
        onClick={handleConfirm}
        loading={isLoading}
      >
        {confirmText}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={footer}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div style={{ paddingRight: '40px' }}>
        {typeof message === 'string' ? (
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.6',
            margin: 0,
          }}>
            {message}
          </p>
        ) : (
          message
        )}
      </div>
    </Modal>
  )
}
