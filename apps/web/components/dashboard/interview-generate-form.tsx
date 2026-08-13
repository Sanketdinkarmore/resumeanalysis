'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ApiError,
  createInterviewSet,
  listApplications,
  listJobs,
  listResumes,
  type ApplicationListItem,
  type JobListItem,
  type ResumeListItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NOT_FOUND':
        return 'Job, resume, or application not found. Refresh and pick again.'
      case 'APPLICATION_JD_MISMATCH':
        return 'That application is not linked to the selected job.'
      case 'APPLICATION_SET_EXISTS':
        return 'A set already exists for this application. Generate again to replace it.'
      case 'GENERATION_FAILED':
        return err.message || 'Question generation failed. Is the AI service running with Groq/Gemini configured?'
      case 'VALIDATION_ERROR':
        return 'Choose a job to generate questions.'
      default:
        return err.message || 'Could not generate interview questions.'
    }
  }
  return 'Could not reach the server. Are the API (:4000) and AI (:8000) running?'
}

const fieldClass = cn(
  'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
  'outline-none transition-colors',
  'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
)

export function InterviewGenerateForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [jobId, setJobId] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingOptions(true)
      setLoadError(null)
      try {
        const [jobRows, resumeRows, appRows] = await Promise.all([
          listJobs(),
          listResumes(),
          listApplications(),
        ])
        if (cancelled) return
        setJobs(jobRows)
        setResumes(resumeRows)
        setApplications(appRows)
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'Could not load jobs, resumes, and applications.',
        )
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const jobApps = useMemo(() => {
    if (!jobId) return []
    return applications.filter((a) => a.jobDescriptionId === jobId)
  }, [applications, jobId])

  useEffect(() => {
    if (applicationId && !jobApps.some((a) => a.id === applicationId)) {
      setApplicationId('')
    }
  }, [jobApps, applicationId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!jobId) {
      setError('Choose a job.')
      return
    }

    setPending(true)
    try {
      const result = await createInterviewSet({
        jobDescriptionId: jobId,
        applicationId: applicationId || undefined,
        resumeVersionId: applicationId ? undefined : resumeId || undefined,
      })
      onCreated?.()
      router.push(`/dashboard/interview/${result.questionSet.id}`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-xl border border-line bg-card/70 p-5 sm:p-6"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
        Generate set
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Create questions for a job. Optionally ground them in a resume or an application
        (uses that application&apos;s resume). Linking an application regenerates/replaces any
        previous set for it. Needs the AI service (Groq preferred).
      </p>

      {loadingOptions && (
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading options…
        </p>
      )}

      {loadError && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
        >
          {loadError}
        </p>
      )}

      {!loadingOptions && !loadError && jobs.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-paper/50 px-4 py-4 text-[13px] leading-relaxed text-ink-soft">
          <p>
            Add a{' '}
            <Link href="/dashboard/jobs" className="text-ink underline-offset-2 hover:underline">
              job
            </Link>{' '}
            first.
          </p>
        </div>
      )}

      {!loadingOptions && jobs.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="iv-job"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Job
            </label>
            <select
              id="iv-job"
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value)
                setError(null)
              }}
              required
              className={fieldClass}
            >
              <option value="">Select job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.roleTitle} · {j.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="iv-app"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Application{' '}
              <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
            </label>
            <select
              id="iv-app"
              value={applicationId}
              onChange={(e) => {
                setApplicationId(e.target.value)
                if (e.target.value) setResumeId('')
                setError(null)
              }}
              disabled={!jobId}
              className={cn(fieldClass, 'disabled:opacity-60')}
            >
              <option value="">
                {!jobId
                  ? 'Select job first…'
                  : jobApps.length === 0
                    ? 'No applications for this job'
                    : 'None'}
              </option>
              {jobApps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.roleTitle} · {a.stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="iv-resume"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Resume{' '}
              <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
            </label>
            <select
              id="iv-resume"
              value={resumeId}
              onChange={(e) => {
                setResumeId(e.target.value)
                if (e.target.value) setApplicationId('')
                setError(null)
              }}
              disabled={Boolean(applicationId)}
              className={cn(fieldClass, 'disabled:opacity-60')}
            >
              <option value="">
                {applicationId ? 'Using application resume' : 'JD only / none'}
              </option>
              {!applicationId &&
                resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || loadingOptions || jobs.length === 0}
        className={cn(
          'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3',
          'text-sm font-medium text-accent-foreground transition-all sm:w-auto',
          'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'disabled:pointer-events-none disabled:opacity-60',
        )}
      >
        {pending ? 'Generating… (may take a bit)' : 'Generate questions'}
        {!pending && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
