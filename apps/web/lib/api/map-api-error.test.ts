import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/auth/types'
import { mapApiError } from '@/lib/api/map-api-error'

describe('mapApiError', () => {
  it('maps auth EMAIL_TAKEN', () => {
    const err = new ApiError(409, 'EMAIL_TAKEN', 'taken')
    expect(mapApiError(err, 'auth')).toBe('An account with this email already exists.')
  })

  it('maps match RESUME_NOT_PARSED', () => {
    const err = new ApiError(400, 'RESUME_NOT_PARSED', 'raw')
    expect(mapApiError(err, 'match')).toContain('not parsed yet')
  })

  it('maps interview APPLICATION_SET_EXISTS', () => {
    const err = new ApiError(409, 'APPLICATION_SET_EXISTS', 'exists')
    expect(mapApiError(err, 'interview')).toContain('already exists')
  })

  it('uses API message for HAS_DEPENDENTS', () => {
    const err = new ApiError(409, 'HAS_DEPENDENTS', 'Cannot delete linked job')
    expect(mapApiError(err, 'delete')).toBe('Cannot delete linked job')
  })

  it('falls back for unknown errors', () => {
    expect(mapApiError(new Error('boom'), 'load')).toBe('Could not load data. Try again.')
  })

  it('prefers API message when no mapping exists', () => {
    const err = new ApiError(400, 'CUSTOM', 'Custom server message')
    expect(mapApiError(err, 'job')).toBe('Custom server message')
  })
})
