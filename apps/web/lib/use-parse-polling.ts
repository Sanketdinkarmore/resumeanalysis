'use client'

import { useEffect } from 'react'
import type { JobStatus } from '@/lib/api/resume-types'
import { isParseInProgress } from '@/lib/parse-status'

/** How often detail pages refresh while parse is in progress. */
export const PARSE_DETAIL_POLL_MS = 2000

/** Poll quickly after landing on a detail page mid-parse, then on an interval. */
export function useParseDetailPolling(
  status: JobStatus | undefined,
  reload: (opts?: { quiet?: boolean }) => void | Promise<void>,
) {
  useEffect(() => {
    if (!status || !isParseInProgress(status)) return

    const tick = () => void reload({ quiet: true })
    const first = window.setTimeout(tick, 800)
    const timer = window.setInterval(tick, PARSE_DETAIL_POLL_MS)

    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [status, reload])
}
