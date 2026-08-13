import Link from 'next/link'

export function DashboardPlaceholder({
  index,
  title,
  blurb,
}: {
  index: string
  title: string
  blurb: string
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
        {index} · {title}
      </p>
      <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
        {title}{' '}
        <span className="font-serif italic">coming next.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">{blurb}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
      >
        ← Overview
      </Link>
    </div>
  )
}
