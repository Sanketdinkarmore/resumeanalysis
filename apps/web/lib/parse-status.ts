import type { JobStatus } from '@/lib/api/resume-types'

/** Human-readable parse status for list rows. */
export function parseStatusLabel(status: JobStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Waiting to parse'
    case 'PROCESSING':
      return 'Parsing…'
    case 'COMPLETED':
      return 'Ready for matching'
    case 'FAILED':
      return 'Parse failed'
    default:
      return status
  }
}

export function isParseInProgress(status: JobStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING'
}
