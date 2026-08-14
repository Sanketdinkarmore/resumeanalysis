import { apiRequest } from '@/lib/api/client'
import { clearTokens, getRefreshToken, setTokens } from '@/lib/auth/storage'
import type { AuthSession, User } from '@/lib/auth/types'

export type AuthCredentials = {
  email: string
  password: string
}

function persistSession(session: AuthSession) {
  setTokens(session.accessToken, session.refreshToken)
  return session
}

export async function register(credentials: AuthCredentials): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: credentials,
    auth: false,
  })
  return persistSession(session)
}

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
  })
  return persistSession(session)
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  try {
    if (refreshToken) {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      })
    }
  } finally {
    clearTokens()
  }
}

export async function getMe(): Promise<User> {
  const data = await apiRequest<{ user: User }>('/auth/me')
  return data.user
}

export async function setPassword(password: string): Promise<void> {
  await apiRequest<void>('/auth/set-password', {
    method: 'POST',
    body: { password },
  })
}

export async function isGoogleSignInEnabled(): Promise<boolean> {
  const data = await apiRequest<{ enabled: boolean }>('/auth/google/enabled', {
    auth: false,
  })
  return data.enabled
}

export async function completeOAuthFromTokens(
  accessToken: string,
  refreshToken: string,
): Promise<User> {
  setTokens(accessToken, refreshToken)
  return getMe()
}
