import type { JobStatus } from '@/lib/api/resume-types'

export type JobListItem = {
  id: string
  companyName: string
  roleTitle: string
  sourceUrl: string | null
  parseStatus: JobStatus
  createdAt: string
  updatedAt: string
}

export type ParsedJobData = {
  id: string
  jobDescriptionId: string
  requiredSkills: string[]
  preferredSkills: string[]
  responsibilities: unknown[]
  qualifications: unknown[]
  seniority: string
  keywords: string[]
  rawExtract: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type JobDetail = JobListItem & {
  rawText: string
  parseError: string | null
  parsedData: ParsedJobData | null
}
