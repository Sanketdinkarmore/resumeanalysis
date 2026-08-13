'use client'

import { useEffect, useState } from 'react'
import { NextupMark } from './nextup-mark'
import { PrimaryCta, SignInLink } from './landing-auth-links'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Matching', href: '#matching' },
  { label: 'Interview prep', href: '#interview' },
  { label: 'About', href: '#philosophy' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-line/70 bg-paper/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 md:px-8',
          scrolled ? 'h-14' : 'h-[72px]',
        )}
        aria-label="Primary"
      >
        <a href="#top" className="group flex items-center gap-2" aria-label="Nextup home">
          <NextupMark className="h-[18px] w-[18px] text-ink transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative rounded-md px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
                <span className="pointer-events-none absolute inset-x-3 -bottom-px flex items-center">
                  <span className="h-px w-0 bg-ink transition-all duration-300 group-hover:w-full" />
                </span>
                <span className="pointer-events-none absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 scale-0 rounded-full bg-accent transition-transform duration-300 group-hover:scale-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <SignInLink className="hidden text-[13px] font-medium text-ink-soft transition-colors hover:text-ink sm:inline" />
          <PrimaryCta
            guestLabel="Start free"
            className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-primary-foreground transition-all hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          />
        </div>
      </nav>
    </header>
  )
}
