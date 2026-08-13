import type { Metadata } from 'next'
import { ApplicationsList } from '@/components/dashboard/applications-list'

export const metadata: Metadata = {
  title: 'Applications — Nextup',
}

export default function ApplicationsPage() {
  return <ApplicationsList />
}
