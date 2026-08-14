export type UserRole = 'USER' | 'ADMIN'

export type User = {
  id: string
  email: string
  role: UserRole
  createdAt: string
  hasPassword: boolean
}

/** Shape returned by register / login / refresh */
export type AuthSession = {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type ApiErrorBody = {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
