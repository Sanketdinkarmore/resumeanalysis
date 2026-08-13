import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthForm } from '@/components/auth/auth-form'
import { GuestOnly } from '@/components/auth/require-auth'

export const metadata: Metadata = {
  title: 'Create account — Nextup',
  description: 'Create your Nextup account and start building your career system.',
}

export default function RegisterPage() {
  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Get started"
        title={
          <>
            Build your system.{' '}
            <span className="font-serif italic">Start free.</span>
          </>
        }
        footer={
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <AuthForm mode="register" />
      </AuthShell>
    </GuestOnly>
  )
}
