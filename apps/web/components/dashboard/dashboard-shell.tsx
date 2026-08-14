'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { NextupMark } from '@/components/nextup-mark'
import { SetPasswordPanel } from '@/components/dashboard/set-password-panel'
import { DASHBOARD_NAV } from '@/lib/dashboard-nav'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()

  return (
    <ul className={cn('flex flex-col gap-0.5', className)}>
      {DASHBOARD_NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                active
                  ? 'bg-card text-ink'
                  : 'text-ink-soft hover:bg-card/70 hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'font-mono text-[10px] tabular tracking-wider',
                  active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-soft',
                )}
              >
                {item.index}
              </span>
              <span className="text-[13px] font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  async function onLogout() {
    await logout()
    onNavigate?.()
    router.replace('/login')
  }

  return (
    <div className="border-t border-line pt-4">
      <SetPasswordPanel />
      <p className="truncate px-3 font-mono text-[11px] text-ink-faint" title={user?.email}>
        {user?.email}
      </p>
      <div className="mt-3 flex flex-col gap-0.5">
        {/* <Link
          href="/"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-card/70 hover:text-ink"
        >
          Landing page
        </Link> */}
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-lg px-3 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-card/70 hover:text-neg"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="relative min-h-screen bg-background">
      <div aria-hidden className="pointer-events-none fixed inset-0 grain opacity-50" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper/90 px-3 py-5 backdrop-blur-md md:flex lg:w-64">
        <Link href="/dashboard" className="group mb-8 flex items-center gap-2 px-3">
          <NextupMark className="h-[18px] w-[18px] text-ink transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
        </Link>
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Career OS
        </p>
        <nav className="flex-1 overflow-y-auto" aria-label="Dashboard">
          <NavLinks />
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line/70 bg-paper/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Nextup dashboard">
          <NextupMark className="h-[18px] w-[18px] text-ink" />
          <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:text-ink"
          aria-expanded={open}
          aria-controls="dashboard-mobile-nav"
        >
          Menu
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={cn(
            'absolute inset-0 bg-ink/30 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setOpen(false)}
        />
        <aside
          id="dashboard-mobile-nav"
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-paper px-3 py-5 shadow-xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="mb-6 flex items-center justify-between px-3">
            <span className="flex items-center gap-2">
              <NextupMark className="h-[18px] w-[18px] text-ink" />
              <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[10px] uppercase tracking-wider text-ink-faint"
            >
              Close
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto" aria-label="Dashboard">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
          <SidebarFooter onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Main */}
      <div className="relative z-10 min-w-0 md:pl-60 lg:pl-64">
        <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8 md:px-8 md:py-10">
          {children}
        </div>
      </div>
    </div>
  )
}
