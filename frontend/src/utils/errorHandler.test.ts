import { describe, it, expect } from 'vitest'
import { getErrorMessage, isNetworkError, isValidationError } from './errorHandler'

describe('getErrorMessage', () => {
  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke')
  })
  it('returns message from object with message property', () => {
    expect(getErrorMessage({ message: 'custom error' })).toBe('custom error')
  })
  it('returns error from object with error property', () => {
    expect(getErrorMessage({ error: 'bad request' })).toBe('bad request')
  })
  it('returns string directly', () => {
    expect(getErrorMessage('plain error')).toBe('plain error')
  })
  it('returns fallback for unknown type', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred')
  })
  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
  })
})

describe('isNetworkError', () => {
  it('returns true for fetch error', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
  })
  it('returns true for network error', () => {
    expect(isNetworkError(new Error('network error'))).toBe(true)
  })
  it('returns true for ERR_ code', () => {
    expect(isNetworkError(new Error('ERR_CONNECTION_REFUSED'))).toBe(true)
  })
  it('returns false for non-network error', () => {
    expect(isNetworkError(new Error('Validation failed'))).toBe(false)
  })
  it('returns false for non-Error', () => {
    expect(isNetworkError('some string')).toBe(false)
  })
})

describe('isValidationError', () => {
  it('returns true for Error with validation message', () => {
    expect(isValidationError(new Error('validation failed'))).toBe(true)
  })
  it('returns true for object with statusCode 400', () => {
    expect(isValidationError({ statusCode: 400 })).toBe(true)
  })
  it('returns false for Error without validation', () => {
    expect(isValidationError(new Error('something else'))).toBe(false)
  })
  it('returns false for object with other status code', () => {
    expect(isValidationError({ statusCode: 500 })).toBe(false)
  })
  it('returns false for non-Error string', () => {
    expect(isValidationError('error')).toBe(false)
  })
})
