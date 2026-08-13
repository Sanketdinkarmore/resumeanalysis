import type { Metadata } from 'next'
import { ApplicationDetailView } from '@/components/dashboard/application-detail'

export const metadata: Metadata = {
  title: 'Application — Nextup',
}

export default function ApplicationDetailPage() {
  return <ApplicationDetailView />
}
