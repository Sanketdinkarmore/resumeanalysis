import { apiRequest } from '@/lib/api/client'
import type { MatchAnalysis, MatchListItem } from '@/lib/api/match-types'

export type CreateMatchInput = {
  resumeVersionId: string
  jobDescriptionId: string
}

export async function listMatches(): Promise<MatchListItem[]> {
  const data = await apiRequest<{ analyses: MatchListItem[] }>('/match-analyses')
  return data.analyses
}

export async function getMatch(id: string): Promise<MatchAnalysis> {
  const data = await apiRequest<{ analysis: MatchAnalysis }>(`/match-analyses/${id}`)
  return data.analysis
}

export async function createMatch(input: CreateMatchInput): Promise<MatchAnalysis> {
  const data = await apiRequest<{ analysis: MatchAnalysis }>('/match-analyses', {
    method: 'POST',
    body: {
      resumeVersionId: input.resumeVersionId,
      jobDescriptionId: input.jobDescriptionId,
    },
  })
  return data.analysis
}
