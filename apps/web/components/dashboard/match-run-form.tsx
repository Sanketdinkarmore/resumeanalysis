'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ApiError,
  createMatch,
  listJobs,
  listResumes,
  mapApiError,
  type JobListItem,
  type ResumeListItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const fieldClass = cn(
  'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
  'outline-none transition-colors',
  'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
)

export function MatchRunForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [resumeId, setResumeId] = useState('')
  const [jobId, setJobId] = useState('')
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
        const [resumeRows, jobRows] = await Promise.all([listResumes(), listJobs()])
        if (cancelled) return
        setResumes(resumeRows.filter((r) => r.parseStatus === 'COMPLETED'))
        setJobs(jobRows.filter((j) => j.parseStatus === 'COMPLETED'))
      } catch (err) {
        if (cancelled) return
        setLoadError(mapApiError(err, 'load', 'Could not load resumes and jobs for matching.'))
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const ready = resumes.length > 0 && jobs.length > 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!resumeId || !jobId) {
      setError('Choose both a resume and a job.')
      return
    }

    setPending(true)
    try {
      const analysis = await createMatch({
        resumeVersionId: resumeId,
        jobDescriptionId: jobId,
      })
      onCreated?.()
      router.push(`/dashboard/matches/${analysis.id}`)
    } catch (err) {
      setError(mapApiError(err, 'match'))
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
        Run match
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Score a completed resume against a completed job. Only parsed items appear below.
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

      {!loadingOptions && !loadError && !ready && (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-paper/50 px-4 py-4 text-[13px] leading-relaxed text-ink-soft">
          {resumes.length === 0 && jobs.length === 0 ? (
            <p>
              You need at least one{' '}
              <Link href="/dashboard/resumes" className="text-ink underline-offset-2 hover:underline">
                completed resume
              </Link>{' '}
              and one{' '}
              <Link href="/dashboard/jobs" className="text-ink underline-offset-2 hover:underline">
                completed job
              </Link>{' '}
              before you can run a match.
            </p>
          ) : resumes.length === 0 ? (
            <p>
              No completed resumes yet.{' '}
              <Link href="/dashboard/resumes" className="text-ink underline-offset-2 hover:underline">
                Upload and wait for parsing →
              </Link>
            </p>
          ) : (
            <p>
              No completed jobs yet.{' '}
              <Link href="/dashboard/jobs" className="text-ink underline-offset-2 hover:underline">
                Add a job and wait for parsing →
              </Link>
            </p>
          )}
        </div>
      )}

      {!loadingOptions && ready && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="match-resume"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Resume
            </label>
            <select
              id="match-resume"
              value={resumeId}
              onChange={(e) => {
                setResumeId(e.target.value)
                setError(null)
              }}
              required
              className={fieldClass}
            >
              <option value="">Select resume…</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="match-job"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Job
            </label>
            <select
              id="match-job"
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
        disabled={pending || loadingOptions || !ready}
        className={cn(
          'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3',
          'text-sm font-medium text-accent-foreground transition-all sm:w-auto',
          'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'disabled:pointer-events-none disabled:opacity-60',
        )}
      >
        {pending ? 'Scoring…' : 'Run match'}
        {!pending && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
