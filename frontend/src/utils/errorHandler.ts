// Centralized error handling utility
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    if (typeof record.message === 'string') {
      return record.message
    }
    if (typeof record.error === 'string') {
      return record.error
    }
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ERR_')
    )
  }
  return false
}

export function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('validation')
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    return typeof record.statusCode === 'number' && record.statusCode === 400
  }
  return false
}
