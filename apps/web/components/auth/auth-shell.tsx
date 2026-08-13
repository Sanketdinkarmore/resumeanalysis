import Link from 'next/link'
import { NextupMark } from '@/components/nextup-mark'

export function AuthShell({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string
  title: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 grain opacity-70" />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 pt-8 md:px-0">
        <Link href="/" className="group flex items-center gap-2" aria-label="Nextup home">
          <NextupMark className="h-[18px] w-[18px] text-ink transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
        >
          ← Home
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 md:px-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        <h1 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>

        <div className="mt-10">{children}</div>

        <p className="mt-8 text-center text-[13px] text-ink-soft">{footer}</p>
      </div>
    </main>
  )
}
