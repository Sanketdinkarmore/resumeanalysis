'use client'

import { useState } from 'react'
import { ApiError, setPassword, mapApiError } from '@/lib/api'
import { useAuth } from '@/components/auth/auth-provider'
import { PasswordInput } from '@/components/auth/password-input'
import { cn } from '@/lib/utils'

const MIN_PASSWORD = 8

export function SetPasswordPanel() {
  const { user, refreshUser } = useAuth()
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  if (!user || user.hasPassword) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    try {
      await setPassword(password)
      await refreshUser()
      setSuccess(true)
      setPasswordValue('')
      setConfirm('')
    } catch (err) {
      setError(mapApiError(err, 'auth', 'Could not set password.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mb-6 rounded-xl border border-line bg-card/60 p-4"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        Optional password
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
        You signed in with Google. Add a password here if you also want to sign in with email when
        Google is unavailable.
      </p>
      <div className="mt-3">
        <label
          htmlFor="set-password"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint"
        >
          New password
        </label>
        <PasswordInput
          id="set-password"
          value={password}
          onChange={setPasswordValue}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
      </div>
      <div className="mt-3">
        <label
          htmlFor="confirm-password"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint"
        >
          Confirm password
        </label>
        <PasswordInput
          id="confirm-password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[12px] text-neg">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-[12px] text-pos">Password saved. You can now sign in with email too.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'mt-3 inline-flex w-full items-center justify-center rounded-full border border-line px-4 py-2',
          'text-[13px] font-medium text-ink transition-colors hover:bg-paper',
          'disabled:pointer-events-none disabled:opacity-60',
        )}
      >
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  )
}
