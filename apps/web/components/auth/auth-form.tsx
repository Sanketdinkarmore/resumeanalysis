'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { PasswordInput } from '@/components/auth/password-input'
import { mapApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 8

export function AuthForm({ mode, oauthError }: { mode: Mode; oauthError?: string | null }) {
  const router = useRouter()
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(oauthError ?? null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed || password.length < MIN_PASSWORD) {
      setError(`Enter a valid email and a password of at least ${MIN_PASSWORD} characters.`)
      return
    }

    setPending(true)
    try {
      if (mode === 'login') {
        await login({ email: trimmed, password })
      } else {
        await register({ email: trimmed, password })
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(mapApiError(err, 'auth'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-5">
      <GoogleSignInButton />

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-line" />
        </div>
        <p className="relative mx-auto w-fit bg-background px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          or email
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="email"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              'mt-2 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink',
              'placeholder:text-ink-faint',
              'outline-none transition-colors',
              'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
            )}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={MIN_PASSWORD}
            placeholder={`At least ${MIN_PASSWORD} characters`}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-neg/25 bg-neg/4 px-3.5 py-2.5 text-[13px] text-neg"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            'group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3',
            'text-sm font-medium text-accent-foreground transition-all',
            'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
            'disabled:pointer-events-none disabled:opacity-60',
          )}
        >
          {pending
            ? mode === 'login'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          {!pending && (
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          )}
        </button>
      </form>
    </div>
  )
}
