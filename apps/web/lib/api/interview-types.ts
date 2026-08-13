import type { JobStatus } from '@/lib/api/resume-types'

export type QuestionCategory = 'TECHNICAL' | 'BEHAVIORAL' | 'PROJECT'

export type CreateInterviewSetInput = {
  jobDescriptionId: string
  applicationId?: string
  resumeVersionId?: string
}

export type InterviewQuestion = {
  id: string
  category: QuestionCategory
  prompt: string
  answerOutline: string | null
  answerGeneratedAt: string | null
  createdAt: string
}

export type InterviewSetListItem = {
  id: string
  jobDescriptionId: string
  applicationId: string | null
  status: JobStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  _count: { questions: number }
}

export type InterviewSetDetail = {
  id: string
  userId: string
  jobDescriptionId: string
  applicationId: string | null
  resumeVersionId: string | null
  status: JobStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  questions: InterviewQuestion[]
}
