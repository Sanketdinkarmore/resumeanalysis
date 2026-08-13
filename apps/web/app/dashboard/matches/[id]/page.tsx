import type { Metadata } from 'next'
import { MatchDetailView } from '@/components/dashboard/match-detail'

export const metadata: Metadata = {
  title: 'Match — Nextup',
}

export default function MatchDetailPage() {
  return <MatchDetailView />
}
