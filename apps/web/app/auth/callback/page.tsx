'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const { completeOAuthSession } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function finish() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)
      const accessToken = params.get('accessToken')
      const refreshToken = params.get('refreshToken')

      if (!accessToken || !refreshToken) {
        if (!cancelled) setError('Sign-in did not complete. Try again.')
        return
      }

      try {
        await completeOAuthSession({ accessToken, refreshToken })
        if (!cancelled) {
          router.replace('/dashboard')
          router.refresh()
        }
      } catch {
        if (!cancelled) setError('Could not finish Google sign-in.')
      }
    }

    void finish()
    return () => {
      cancelled = true
    }
  }, [completeOAuthSession, router])

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p role="alert" className="text-[15px] text-neg">
          {error}
        </p>
        <Link
          href="/login"
          className="mt-6 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-card"
        >
          Back to sign in
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Finishing sign-in…
      </p>
    </main>
  )
}
