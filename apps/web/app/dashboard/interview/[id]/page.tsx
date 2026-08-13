import type { Metadata } from 'next'
import { InterviewSetDetailView } from '@/components/dashboard/interview-set-detail'

export const metadata: Metadata = {
  title: 'Interview set — Nextup',
}

export default function InterviewSetDetailPage() {
  return <InterviewSetDetailView />
}
