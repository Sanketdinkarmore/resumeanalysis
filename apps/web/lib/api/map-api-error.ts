import { ApiError } from '@/lib/auth/types'

export type ApiErrorContext =
  | 'auth'
  | 'match'
  | 'application'
  | 'interview'
  | 'resume-upload'
  | 'job'
  | 'delete'
  | 'load'

const NETWORK =
  'Could not reach the server. Is the API running on :4000?'

const NETWORK_WITH_AI =
  'Could not reach the server. Are the API (:4000) and AI (:8000) running?'

const DEFAULT_FALLBACK: Record<ApiErrorContext, string> = {
  auth: 'Something went wrong. Try again.',
  match: 'Could not run this match.',
  application: 'Could not save this application.',
  interview: 'Could not generate interview questions.',
  'resume-upload': 'Upload failed. Try again.',
  job: 'Could not save this job.',
  delete: 'Could not delete. Try again.',
  load: 'Could not load data. Try again.',
}

/** Context-specific messages when a code can read better in one screen. */
const CONTEXT_MESSAGES: Partial<
  Record<ApiErrorContext, Partial<Record<string, string>>>
> = {
  auth: {
    EMAIL_TAKEN: 'An account with this email already exists.',
    INVALID_CREDENTIALS: 'Email or password is incorrect.',
    VALIDATION_ERROR: 'Check your email and password (min 8 characters).',
  },
  match: {
    RESUME_NOT_PARSED:
      'That resume is not parsed yet. Wait until status is Completed, then try again.',
    JD_NOT_PARSED:
      'That job is not parsed yet. Wait until status is Completed, then try again.',
    NOT_FOUND: 'Resume or job not found. Refresh and pick again.',
    VALIDATION_ERROR: 'Choose both a resume and a job.',
  },
  application: {
    NOT_FOUND: 'Resume, job, or match not found. Refresh and pick again.',
    ANALYSIS_MISMATCH: 'That match does not belong to the selected resume and job.',
    VALIDATION_ERROR: 'Choose a resume and a job.',
    SAME_STAGE: 'Application is already in this stage.',
  },
  interview: {
    NOT_FOUND: 'Job, resume, or application not found. Refresh and pick again.',
    APPLICATION_JD_MISMATCH: 'That application is not linked to the selected job.',
    APPLICATION_SET_EXISTS:
      'A set already exists for this application. Generate again to replace it.',
    GENERATION_FAILED:
      'Question generation failed. Is the AI service running with Groq/Gemini configured?',
    VALIDATION_ERROR: 'Choose a job to generate questions.',
  },
  'resume-upload': {
    FILE_REQUIRED: 'Choose a PDF file to upload.',
    INVALID_FILE_TYPE: 'Only PDF files are supported.',
    FILE_TOO_LARGE: 'PDF must be 5MB or smaller.',
    NAME_REQUIRED: 'Give this resume a name.',
  },
  job: {
    VALIDATION_ERROR: 'Check company, role title, and description (min 50 characters).',
  },
  load: {
    NOT_FOUND: 'Not found.',
    UNAUTHORIZED: 'Your session expired. Sign in again.',
  },
}

/** Codes shared across the app — API message used when no friendlier copy exists. */
const GLOBAL_MESSAGES: Record<string, string | ((err: ApiError) => string)> = {
  HAS_DEPENDENTS: (err) => err.message,
  OAUTH_ONLY: (err) => err.message,
  GENERATION_FAILED: (err) =>
    err.message ||
    'Generation failed. Is the AI service running with Groq/Gemini configured?',
  UNAUTHORIZED: 'Your session expired. Sign in again.',
  INVALID_REFRESH: 'Your session expired. Sign in again.',
  INTERNAL_ERROR: 'Something went wrong on the server. Try again.',
}

function networkMessage(context: ApiErrorContext): string {
  if (context === 'match' || context === 'job' || context === 'resume-upload') {
    return NETWORK_WITH_AI
  }
  if (context === 'interview') return NETWORK_WITH_AI
  if (context === 'auth') return NETWORK
  return NETWORK
}

export function mapApiError(
  err: unknown,
  context: ApiErrorContext,
  fallback?: string,
): string {
  if (err instanceof ApiError) {
    const contextual = CONTEXT_MESSAGES[context]?.[err.code]
    if (contextual) return contextual

    const global = GLOBAL_MESSAGES[err.code]
    if (global) {
      return typeof global === 'function' ? global(err) : global
    }

    if (err.code === 'NOT_FOUND' && context === 'load') {
      return 'Not found.'
    }

    return err.message || fallback || DEFAULT_FALLBACK[context]
  }

  if (err instanceof TypeError) {
    return networkMessage(context)
  }

  return fallback ?? DEFAULT_FALLBACK[context]
}
