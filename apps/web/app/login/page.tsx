import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthForm } from '@/components/auth/auth-form'
import { GuestOnly } from '@/components/auth/require-auth'

export const metadata: Metadata = {
  title: 'Sign in — Nextup',
  description: 'Sign in to your Nextup career operating system.',
}

export default function LoginPage() {
  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Welcome back"
        title={
          <>
            Sign in to{' '}
            <span className="font-serif italic">your system.</span>
          </>
        }
        footer={
          <>
            New here?{' '}
            <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        }
      >
        <AuthForm mode="login" />
      </AuthShell>
    </GuestOnly>
  )
}
