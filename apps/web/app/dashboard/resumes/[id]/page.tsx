import type { Metadata } from 'next'
import { ResumeDetailView } from '@/components/dashboard/resume-detail'

export const metadata: Metadata = {
  title: 'Resume — Nextup',
}

export default function ResumeDetailPage() {
  return <ResumeDetailView />
}
