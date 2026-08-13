import { apiRequest } from '@/lib/api/client'
import type {
  CreateInterviewSetInput,
  InterviewQuestion,
  InterviewSetDetail,
  InterviewSetListItem,
} from '@/lib/api/interview-types'

export type InterviewSetCreateResult = {
  questionSet: InterviewSetDetail
  groundedInResume: boolean
}

export async function listInterviewSets(): Promise<InterviewSetListItem[]> {
  const data = await apiRequest<{ questionSets: InterviewSetListItem[] }>(
    '/interview-question-sets',
  )
  return data.questionSets
}

export async function getInterviewSet(id: string): Promise<InterviewSetDetail> {
  const data = await apiRequest<{ questionSet: InterviewSetDetail }>(
    `/interview-question-sets/${id}`,
  )
  return data.questionSet
}

export async function createInterviewSet(
  input: CreateInterviewSetInput,
): Promise<InterviewSetCreateResult> {
  const body: Record<string, string> = {
    jobDescriptionId: input.jobDescriptionId,
  }
  if (input.applicationId) body.applicationId = input.applicationId
  if (input.resumeVersionId) body.resumeVersionId = input.resumeVersionId

  return apiRequest<InterviewSetCreateResult>('/interview-question-sets', {
    method: 'POST',
    body,
  })
}

export async function generateAnswerOutline(
  setId: string,
  questionId: string,
): Promise<InterviewQuestion> {
  const data = await apiRequest<{ question: InterviewQuestion }>(
    `/interview-question-sets/${setId}/questions/${questionId}/answer-outline`,
    { method: 'POST', body: {} },
  )
  return data.question
}
