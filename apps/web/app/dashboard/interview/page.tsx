import type { Metadata } from 'next'
import { InterviewSetsList } from '@/components/dashboard/interview-sets-list'

export const metadata: Metadata = {
  title: 'Interview — Nextup',
}

export default function InterviewPage() {
  return <InterviewSetsList />
}
