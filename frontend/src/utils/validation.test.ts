import { describe, it, expect } from 'vitest'
import { validators, compose } from './validation'

describe('validators.required', () => {
  it('returns error for empty string', () => {
    expect(validators.required('')).toBe('This field is required')
  })
  it('returns error for whitespace only', () => {
    expect(validators.required('   ')).toBe('This field is required')
  })
  it('returns error for null', () => {
    expect(validators.required(null)).toBe('This field is required')
  })
  it('returns null for valid value', () => {
    expect(validators.required('hello')).toBeNull()
  })
})

describe('validators.email', () => {
  it('returns null for valid email', () => {
    expect(validators.email('user@example.com')).toBeNull()
  })
  it('returns error for invalid email', () => {
    expect(validators.email('not-an-email')).toBe('Please enter a valid email address')
  })
  it('returns null for empty string', () => {
    expect(validators.email('')).toBeNull()
  })
})

describe('validators.minLength', () => {
  it('returns error when too short', () => {
    expect(validators.minLength(5)('abc')).toBe('Must be at least 5 characters')
  })
  it('returns null when long enough', () => {
    expect(validators.minLength(3)('hello')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(validators.minLength(5)('')).toBeNull()
  })
})

describe('validators.maxLength', () => {
  it('returns error when too long', () => {
    expect(validators.maxLength(3)('hello')).toBe('Cannot exceed 3 characters')
  })
  it('returns null when within limit', () => {
    expect(validators.maxLength(10)('hello')).toBeNull()
  })
})

describe('validators.url', () => {
  it('returns null for valid URL', () => {
    expect(validators.url('https://example.com')).toBeNull()
  })
  it('returns error for invalid URL', () => {
    expect(validators.url('not-a-url')).toBe('Please enter a valid URL')
  })
  it('returns null for empty string', () => {
    expect(validators.url('')).toBeNull()
  })
})

describe('validators.pattern', () => {
  it('returns null when pattern matches', () => {
    expect(validators.pattern(/^\d+$/, 'Numbers only')('123')).toBeNull()
  })
  it('returns error when pattern does not match', () => {
    expect(validators.pattern(/^\d+$/, 'Numbers only')('abc')).toBe('Numbers only')
  })
})

describe('compose', () => {
  it('returns null when all validators pass', () => {
    const validate = compose(validators.required, validators.email)
    expect(validate('user@example.com')).toBeNull()
  })
  it('returns first error when one fails', () => {
    const validate = compose(validators.required, validators.email)
    expect(validate('')).toBe('This field is required')
  })
  it('returns email error when required passes but email fails', () => {
    const validate = compose(validators.required, validators.email)
    expect(validate('notanemail')).toBe('Please enter a valid email address')
  })
})
