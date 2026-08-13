'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { cn } from '@/lib/utils'

/** Primary landing CTA — guests register; signed-in users open the dashboard. */
export function PrimaryCta({
  className,
  guestLabel = 'Start free',
}: {
  className?: string
  guestLabel?: string
}) {
  const { status } = useAuth()
  const signedIn = status === 'authenticated'

  return (
    <Link
      href={signedIn ? '/dashboard' : '/register'}
      className={cn(className)}
    >
      {signedIn ? 'Open dashboard' : guestLabel}
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
    </Link>
  )
}

export function SignInLink({ className }: { className?: string }) {
  const { status } = useAuth()
  if (status === 'authenticated') return null

  return (
    <Link href="/login" className={cn(className)}>
      Sign in
    </Link>
  )
}
