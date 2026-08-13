import type { Metadata } from 'next'
import { MatchesList } from '@/components/dashboard/matches-list'

export const metadata: Metadata = {
  title: 'Matches — Nextup',
}

export default function MatchesPage() {
  return <MatchesList />
}
