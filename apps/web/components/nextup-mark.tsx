import { cn } from '@/lib/utils'

export function NextupMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      {/* outer diamond mark */}
      <path
        d="M12 1.5 22.5 12 12 22.5 1.5 12 12 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.5 17.5 12 12 17.5 6.5 12 12 6.5Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.5"
      />
      {/* orange center */}
      <circle cx="12" cy="12" r="2.1" fill="var(--accent)" />
    </svg>
  )
}

export function NextupWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <NextupMark className="h-[1.15em] w-[1.15em] text-ink" />
      <span className="text-[1.05rem] font-medium tracking-tight text-ink">Nextup</span>
    </span>
  )
}
