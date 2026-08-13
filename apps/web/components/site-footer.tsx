import Link from 'next/link'
import { NextupMark } from './nextup-mark'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Matching', href: '#matching' },
      { label: 'Interview prep', href: '#interview' },
      { label: 'About', href: '#philosophy' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Create account', href: '/register' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#philosophy' },
      { label: 'Contact', href: '/register' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-16 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <NextupMark className="h-[18px] w-[18px] text-ink" />
            <span className="text-[15px] font-medium tracking-tight text-ink">Nextup</span>
          </div>
          <p className="mt-4 max-w-xs font-serif text-lg italic text-ink-soft">
            A better way to get hired.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-faint">
              {col.title}
            </span>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      className="text-[13px] text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl items-center justify-between border-t border-line-soft pt-6">
        <span className="font-mono text-[11px] text-ink-faint">
          © {new Date().getFullYear()} Nextup
        </span>
        <span className="font-mono text-[11px] text-ink-faint">AI suggests. Evidence decides.</span>
      </div>
    </footer>
  )
}
