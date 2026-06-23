// Simple validation utilities
export const validators = {
  required: (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required'
    }
    return null
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value && !emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  },

  minLength: (minLength: number) => (value: string) => {
    if (value && value.length < minLength) {
      return `Must be at least ${minLength} characters`
    }
    return null
  },

  maxLength: (maxLength: number) => (value: string) => {
    if (value && value.length > maxLength) {
      return `Cannot exceed ${maxLength} characters`
    }
    return null
  },

  url: (value: string) => {
    try {
      if (value) {
        new URL(value)
      }
      return null
    } catch {
      return 'Please enter a valid URL'
    }
  },

  pattern: (pattern: RegExp, message: string) => (value: string) => {
    if (value && !pattern.test(value)) {
      return message
    }
    return null
  },
}

// Compose multiple validators
export const compose = (...validators_: Array<(value: any) => string | null>) => {
  return (value: any) => {
    for (const validator of validators_) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}
