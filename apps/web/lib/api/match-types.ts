import type { JobStatus } from '@/lib/api/resume-types'

export type RecommendationType =
  | 'ADD_SKILL'
  | 'ADD_KEYWORD'
  | 'IMPROVE_BULLET'
  | 'CLARIFY_EXPERIENCE'
  | 'OTHER'

export type RecommendationSeverity = 'INFO' | 'WARN' | 'CRITICAL'

export type MatchRecommendation = {
  id: string
  type: RecommendationType
  severity: RecommendationSeverity
  title: string
  detail: string
  evidence: Record<string, unknown> | null
}

export type MatchListItem = {
  id: string
  resumeVersionId: string
  jobDescriptionId: string
  overallScore: number | null
  status: JobStatus
  createdAt: string
}

export type MatchAnalysis = {
  id: string
  userId: string
  resumeVersionId: string
  jobDescriptionId: string
  overallScore: number | null
  mustHaveScore: number | null
  preferredScore: number | null
  keywordScore: number | null
  seniorityScore: number | null
  keywordCoverage: number | null
  matchedSkills: string[]
  missingMustHave: string[]
  missingPreferred: string[]
  status: JobStatus
  errorMessage: string | null
  createdAt: string
  recommendations: MatchRecommendation[]
}
