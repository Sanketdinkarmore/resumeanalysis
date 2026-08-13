'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

/** Blocks unauthenticated users — used by the dashboard layout. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          Checking session…
        </p>
      </main>
    )
  }

  if (status !== 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          Redirecting…
        </p>
      </main>
    )
  }

  return <>{children}</>
}

/** Sends already-signed-in users away from login/register. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          Checking session…
        </p>
      </main>
    )
  }

  if (status === 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          Redirecting…
        </p>
      </main>
    )
  }

  return <>{children}</>
}
