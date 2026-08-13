import type { Metadata } from 'next'
import { ResumesList } from '@/components/dashboard/resumes-list'

export const metadata: Metadata = {
  title: 'Resumes — Nextup',
}

export default function ResumesPage() {
  return <ResumesList />
}
