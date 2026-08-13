import type { Metadata } from 'next'
import { JobsList } from '@/components/dashboard/jobs-list'

export const metadata: Metadata = {
  title: 'Jobs — Nextup',
}

export default function JobsPage() {
  return <JobsList />
}
