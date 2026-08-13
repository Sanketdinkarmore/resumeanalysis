'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 8

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'EMAIL_TAKEN':
        return 'An account with this email already exists.'
      case 'INVALID_CREDENTIALS':
        return 'Email or password is incorrect.'
      case 'VALIDATION_ERROR':
        return 'Check your email and password (min 8 characters).'
      default:
        return err.message || 'Something went wrong. Try again.'
    }
  }
  return 'Could not reach the server. Is the API running on :4000?'
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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
      setError(mapError(err))
    } finally {
      setPending(false)
    }
  }

  return (
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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(
            'mt-2 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink',
            'placeholder:text-ink-faint',
            'outline-none transition-colors',
            'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
          )}
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
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
  )
}
