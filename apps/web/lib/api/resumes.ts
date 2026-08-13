import { apiRequest } from '@/lib/api/client'
import type {
  ResumeDetail,
  ResumeListItem,
  ResumeUploadResult,
} from '@/lib/api/resume-types'

export const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024

export async function listResumes(): Promise<ResumeListItem[]> {
  const data = await apiRequest<{ resumes: ResumeListItem[] }>('/resumes')
  return data.resumes
}

export async function getResume(id: string): Promise<ResumeDetail> {
  const data = await apiRequest<{ resume: ResumeDetail }>(`/resumes/${id}`)
  return data.resume
}

export async function uploadResume(input: {
  file: File
  name: string
  tags?: string
}): Promise<ResumeUploadResult> {
  const form = new FormData()
  form.append('file', input.file)
  form.append('name', input.name.trim())
  if (input.tags?.trim()) {
    form.append('tags', input.tags.trim())
  }

  const data = await apiRequest<{ resume: ResumeUploadResult }>('/resumes', {
    method: 'POST',
    body: form,
  })
  return data.resume
}
