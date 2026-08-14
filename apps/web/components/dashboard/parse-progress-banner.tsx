'use client'

import type { JobStatus } from '@/lib/api/resume-types'
import { isParseInProgress, parseStatusLabel } from '@/lib/parse-status'
import { cn } from '@/lib/utils'

export function ParseProgressBanner({ status }: { status: JobStatus }) {
  if (!isParseInProgress(status)) return null

  return (
    <div
      role="status"
      className="mt-6 rounded-xl border border-accent/30 bg-accent/8 px-4 py-3.5 sm:px-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        {parseStatusLabel(status)}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        Extracting skills and structure in the background. Parsed fields will appear here
        automatically — no need to refresh.
      </p>
    </div>
  )
}

export function ParsedFieldsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-8 space-y-8" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="h-3 w-28 animate-pulse rounded bg-line/80" />
          <div className="mt-3 flex flex-wrap gap-2">
            {[72, 96, 64, 88].map((w, j) => (
              <div
                key={j}
                className={cn('h-7 animate-pulse rounded-full bg-line/60')}
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function parseEmptyHint(status: JobStatus, emptyLabel: string): string {
  if (isParseInProgress(status)) {
    return 'Extracting…'
  }
  return emptyLabel
}
