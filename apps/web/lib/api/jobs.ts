import { apiRequest } from '@/lib/api/client'
import type { JobDetail, JobListItem } from '@/lib/api/job-types'
import type { JobStatus } from '@/lib/api/resume-types'

export type CreateJobInput = {
  companyName: string
  roleTitle: string
  rawText: string
  sourceUrl?: string
}

export type JobCreateResult = {
  id: string
  companyName: string
  roleTitle: string
  sourceUrl: string | null
  parseStatus: JobStatus
  parseError: string | null
  createdAt: string
  parsedData: {
    requiredSkills: string[]
    preferredSkills: string[]
    keywords: string[]
    seniority: string
  } | null
}

export async function listJobs(): Promise<JobListItem[]> {
  const data = await apiRequest<{ jobDescriptions: JobListItem[] }>(
    '/job-descriptions',
  )
  return data.jobDescriptions
}

export async function getJob(id: string): Promise<JobDetail> {
  const data = await apiRequest<{ jobDescription: JobDetail }>(
    `/job-descriptions/${id}`,
  )
  return data.jobDescription
}

export async function createJob(input: CreateJobInput): Promise<JobCreateResult> {
  const body: Record<string, string> = {
    companyName: input.companyName.trim(),
    roleTitle: input.roleTitle.trim(),
    rawText: input.rawText.trim(),
  }
  if (input.sourceUrl?.trim()) {
    body.sourceUrl = input.sourceUrl.trim()
  }

  const data = await apiRequest<{ jobDescription: JobCreateResult }>(
    '/job-descriptions',
    { method: 'POST', body },
  )
  return data.jobDescription
}
