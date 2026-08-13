import Link from 'next/link'
import { DASHBOARD_NAV } from '@/lib/dashboard-nav'

export function DashboardHome() {
  const modules = DASHBOARD_NAV.filter((n) => n.href !== '/dashboard')

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Overview</p>
      <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
        Your career system,{' '}
        <span className="font-serif italic">in one place.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Resumes, roles, matches, applications, and interview prep — connected. Feature screens
        land next; the shell is ready.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col rounded-xl border border-line bg-card/60 p-5 transition-colors hover:border-ink/25 hover:bg-card"
          >
            <span className="font-mono text-[11px] tabular text-accent">{m.index}</span>
            <span className="mt-2 text-base font-medium text-ink">{m.label}</span>
            <span className="mt-1 text-[13px] text-ink-soft transition-colors group-hover:text-ink">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
