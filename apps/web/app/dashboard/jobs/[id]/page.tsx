import type { Metadata } from 'next'
import { JobDetailView } from '@/components/dashboard/job-detail'

export const metadata: Metadata = {
  title: 'Job — Nextup',
}

export default function JobDetailPage() {
  return <JobDetailView />
}
