import { apiRequest } from '@/lib/api/client'
import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationStage,
  CreateApplicationInput,
  ListApplicationsParams,
} from '@/lib/api/application-types'

export type ApplicationCreateResult = {
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

export async function listApplications(
  params: ListApplicationsParams = {},
): Promise<ApplicationListItem[]> {
  const qs = new URLSearchParams()
  if (params.stage) qs.set('stage', params.stage)
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)

  const query = qs.toString()
  const path = query ? `/applications?${query}` : '/applications'
  const data = await apiRequest<{ applications: ApplicationListItem[] }>(path)
  return data.applications
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const data = await apiRequest<{ application: ApplicationDetail }>(
    `/applications/${id}`,
  )
  return data.application
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<ApplicationCreateResult> {
  const body: Record<string, string> = {
    resumeVersionId: input.resumeVersionId,
    jobDescriptionId: input.jobDescriptionId,
  }
  if (input.matchAnalysisId) body.matchAnalysisId = input.matchAnalysisId
  if (input.notes?.trim()) body.notes = input.notes.trim()

  const data = await apiRequest<{ application: ApplicationCreateResult }>(
    '/applications',
    { method: 'POST', body },
  )
  return data.application
}

export async function updateApplicationNotes(
  id: string,
  notes: string | null,
): Promise<{ id: string; notes: string | null; updatedAt: string }> {
  const data = await apiRequest<{
    application: {
      id: string
      companyName: string
      roleTitle: string
      stage: ApplicationStage
      notes: string | null
      updatedAt: string
    }
  }>(`/applications/${id}`, {
    method: 'PATCH',
    body: { notes },
  })
  return data.application
}

export async function updateApplicationStage(
  id: string,
  stage: ApplicationStage,
  note?: string,
): Promise<{ id: string; stage: ApplicationStage; updatedAt: string }> {
  const body: { stage: ApplicationStage; note?: string } = { stage }
  if (note?.trim()) body.note = note.trim()

  const data = await apiRequest<{
    application: {
      id: string
      companyName: string
      roleTitle: string
      stage: ApplicationStage
      updatedAt: string
    }
  }>(`/applications/${id}/stage`, {
    method: 'PATCH',
    body,
  })
  return data.application
}
