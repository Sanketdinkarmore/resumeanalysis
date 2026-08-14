export { apiRequest } from '@/lib/api/client'
export { mapApiError, type ApiErrorContext } from '@/lib/api/map-api-error'
export { register, login, logout, getMe, setPassword, isGoogleSignInEnabled, completeOAuthFromTokens, type AuthCredentials } from '@/lib/api/auth'
export { listResumes, getResume, uploadResume, deleteResume, MAX_RESUME_PDF_BYTES } from '@/lib/api/resumes'
export { listJobs, getJob, createJob, deleteJob, type CreateJobInput, type JobCreateResult } from '@/lib/api/jobs'
export {
  listMatches,
  getMatch,
  createMatch,
  type CreateMatchInput,
} from '@/lib/api/matches'
export {
  listApplications,
  getApplication,
  createApplication,
  updateApplicationNotes,
  updateApplicationStage,
  deleteApplication,
  type ApplicationCreateResult,
} from '@/lib/api/applications'
export type {
  JobStatus,
  ResumeListItem,
  ResumeDetail,
  ParsedResumeSummary,
  ResumeUploadResult,
  ResumeExperience,
  ResumeTextItem,
  ResumeBullet,
} from '@/lib/api/resume-types'
export type {
  JobListItem,
  JobDetail,
  ParsedJobData,
} from '@/lib/api/job-types'
export type {
  MatchListItem,
  MatchAnalysis,
  MatchRecommendation,
  RecommendationType,
  RecommendationSeverity,
} from '@/lib/api/match-types'
export type {
  ApplicationStage,
  ApplicationListItem,
  ApplicationDetail,
  ApplicationStageHistoryItem,
  ListApplicationsParams,
  CreateApplicationInput,
} from '@/lib/api/application-types'
export { APPLICATION_STAGES } from '@/lib/api/application-types'
export {
  listInterviewSets,
  getInterviewSet,
  createInterviewSet,
  generateAnswerOutline,
  deleteInterviewSet,
  type InterviewSetCreateResult,
} from '@/lib/api/interview'
export type {
  QuestionCategory,
  InterviewQuestion,
  InterviewSetListItem,
  InterviewSetDetail,
  CreateInterviewSetInput,
} from '@/lib/api/interview-types'
export {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '@/lib/auth/storage'
export {
  ApiError,
  type User,
  type UserRole,
  type AuthSession,
  type ApiErrorBody,
} from '@/lib/auth/types'
