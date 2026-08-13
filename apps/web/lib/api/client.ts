import { ApiError, type ApiErrorBody } from '@/lib/auth/types'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth/storage'

function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not set')
  }
  return base.replace(/\/$/, '')
}

type RequestOptions = {
  method?: string
  /** JSON object or FormData (multipart — do not set Content-Type manually) */
  body?: unknown
  /** Skip Authorization header (login/register/refresh) */
  auth?: boolean
  /** Internal: avoid infinite refresh loops */
  _retried?: boolean
}

let refreshInFlight: Promise<boolean> | null = null

/** Rotate access+refresh using stored refresh token. Returns false if it failed. */
async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        clearTokens()
        return false
      }

      const data = (await res.json()) as {
        accessToken: string
        refreshToken: string
      }
      setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      clearTokens()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * Typed fetch against the Express API.
 * Attaches Bearer access token when auth !== false.
 * On 401, tries one refresh + retry.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = options
  const headers: Record<string, string> = {}
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData

  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isForm
          ? (body as FormData)
          : JSON.stringify(body),
  })

  if (res.status === 401 && auth && !_retried) {
    const ok = await tryRefresh()
    if (ok) {
      return apiRequest<T>(path, { ...options, _retried: true })
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const err = data as ApiErrorBody | null
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? (res.statusText || 'Request failed'),
      err?.details,
    )
  }

  return data as T
}
