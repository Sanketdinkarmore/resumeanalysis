'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  completeOAuthFromTokens,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type AuthCredentials,
  type User,
} from '@/lib/api'
import { getAccessToken, getRefreshToken } from '@/lib/auth/storage'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (credentials: AuthCredentials) => Promise<void>
  register: (credentials: AuthCredentials) => Promise<void>
  logout: () => Promise<void>
  completeOAuthSession: (tokens: {
    accessToken: string
    refreshToken: string
  }) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const hasToken = Boolean(getAccessToken() || getRefreshToken())
      if (!hasToken) {
        if (!cancelled) {
          setUser(null)
          setStatus('unauthenticated')
        }
        return
      }

      try {
        const me = await getMe()
        if (!cancelled) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials: AuthCredentials) => {
    const session = await apiLogin(credentials)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (credentials: AuthCredentials) => {
    const session = await apiRegister(credentials)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const completeOAuthSession = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }) => {
      const me = await completeOAuthFromTokens(tokens.accessToken, tokens.refreshToken)
      setUser(me)
      setStatus('authenticated')
    },
    [],
  )

  const refreshUser = useCallback(async () => {
    const me = await getMe()
    setUser(me)
    setStatus('authenticated')
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      completeOAuthSession,
      refreshUser,
    }),
    [user, status, login, register, logout, completeOAuthSession, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
