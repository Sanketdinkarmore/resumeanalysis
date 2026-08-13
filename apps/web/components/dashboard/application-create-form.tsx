'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ApiError,
  createApplication,
  listJobs,
  listMatches,
  listResumes,
  type JobListItem,
  type MatchListItem,
  type ResumeListItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NOT_FOUND':
        return 'Resume, job, or match not found. Refresh and pick again.'
      case 'ANALYSIS_MISMATCH':
        return 'That match does not belong to the selected resume and job.'
      case 'VALIDATION_ERROR':
        return 'Choose a resume and a job.'
      default:
        return err.message || 'Could not create this application.'
    }
  }
  return 'Could not reach the server. Is the API running on :4000?'
}

function formatScore(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${Math.round(n)}%`
}

const fieldClass = cn(
  'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
  'outline-none transition-colors',
  'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
)

export function ApplicationCreateForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [matches, setMatches] = useState<MatchListItem[]>([])
  const [resumeId, setResumeId] = useState('')
  const [jobId, setJobId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [notes, setNotes] = useState('')
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
        const [resumeRows, jobRows, matchRows] = await Promise.all([
          listResumes(),
          listJobs(),
          listMatches(),
        ])
        if (cancelled) return
        setResumes(resumeRows)
        setJobs(jobRows)
        setMatches(matchRows)
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'Could not load resumes and jobs.',
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

  const pairMatches = useMemo(() => {
    if (!resumeId || !jobId) return []
    return matches.filter(
      (m) => m.resumeVersionId === resumeId && m.jobDescriptionId === jobId,
    )
  }, [matches, resumeId, jobId])

  useEffect(() => {
    if (matchId && !pairMatches.some((m) => m.id === matchId)) {
      setMatchId('')
    }
  }, [pairMatches, matchId])

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
      const app = await createApplication({
        resumeVersionId: resumeId,
        jobDescriptionId: jobId,
        matchAnalysisId: matchId || undefined,
        notes: notes.trim() || undefined,
      })
      onCreated?.()
      router.push(`/dashboard/applications/${app.id}`)
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
        Track application
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Link a resume to a job. Starts at Saved. Optionally attach a match score.
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
              Add a{' '}
              <Link href="/dashboard/resumes" className="text-ink underline-offset-2 hover:underline">
                resume
              </Link>{' '}
              and a{' '}
              <Link href="/dashboard/jobs" className="text-ink underline-offset-2 hover:underline">
                job
              </Link>{' '}
              first.
            </p>
          ) : resumes.length === 0 ? (
            <p>
              No resumes yet.{' '}
              <Link href="/dashboard/resumes" className="text-ink underline-offset-2 hover:underline">
                Upload one →
              </Link>
            </p>
          ) : (
            <p>
              No jobs yet.{' '}
              <Link href="/dashboard/jobs" className="text-ink underline-offset-2 hover:underline">
                Add a job →
              </Link>
            </p>
          )}
        </div>
      )}

      {!loadingOptions && ready && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="app-resume"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Resume
            </label>
            <select
              id="app-resume"
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
              htmlFor="app-job"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Job
            </label>
            <select
              id="app-job"
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
          <div className="sm:col-span-2">
            <label
              htmlFor="app-match"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Match{' '}
              <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
            </label>
            <select
              id="app-match"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              disabled={!resumeId || !jobId}
              className={cn(fieldClass, 'disabled:opacity-60')}
            >
              <option value="">
                {!resumeId || !jobId
                  ? 'Select resume & job first…'
                  : pairMatches.length === 0
                    ? 'No match for this pair'
                    : 'None'}
              </option>
              {pairMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatScore(m.overallScore)} · {m.status}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="app-notes"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Notes{' '}
              <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
            </label>
            <textarea
              id="app-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Recruiter name, deadline, referral…"
              className={cn(fieldClass, 'resize-y min-h-[5rem] leading-relaxed')}
            />
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
        {pending ? 'Saving…' : 'Start tracking'}
        {!pending && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
