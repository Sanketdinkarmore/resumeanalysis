/**
 * Browser token persistence.
 * Access + refresh live in localStorage (API is Bearer/body, not cookies).
 * Keys are namespaced so other apps on localhost don't collide.
 */

const ACCESS_KEY = 'nextup.accessToken'
const REFRESH_KEY = 'nextup.refreshToken'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
