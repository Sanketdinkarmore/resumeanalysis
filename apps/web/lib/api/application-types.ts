export type ApplicationStage =
  | 'SAVED'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'

export const APPLICATION_STAGES: ApplicationStage[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]

export type CreateApplicationInput = {
  resumeVersionId: string
  jobDescriptionId: string
  matchAnalysisId?: string
  notes?: string
}

export type ApplicationStageHistoryItem = {
  id: string
  fromStage: ApplicationStage | null
  toStage: ApplicationStage
  note: string | null
  changedAt: string
}

export type ApplicationListItem = {
  id: string
  resumeVersionId: string
  jobDescriptionId: string
  matchAnalysisId: string | null
  companyName: string
  roleTitle: string
  stage: ApplicationStage
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ApplicationDetail = ApplicationListItem & {
  stageHistory: ApplicationStageHistoryItem[]
}

export type ListApplicationsParams = {
  stage?: ApplicationStage
  search?: string
  sort?: 'updatedAt' | 'createdAt' | 'companyName'
  order?: 'asc' | 'desc'
}
