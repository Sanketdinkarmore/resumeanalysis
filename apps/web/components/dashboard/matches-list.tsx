'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ApiError,
  listJobs,
  listMatches,
  listResumes,
  mapApiError,
  type JobListItem,
  type JobStatus,
  type MatchListItem,
  type ResumeListItem,
} from '@/lib/api'
import { MatchRunForm } from '@/components/dashboard/match-run-form'
import { Chip } from '@/components/primitives'
import { cn } from '@/lib/utils'

function statusTone(status: JobStatus): 'pos' | 'neg' | 'accent' | 'info' | 'default' {
  switch (status) {
    case 'COMPLETED':
      return 'pos'
    case 'FAILED':
      return 'neg'
    case 'PROCESSING':
      return 'accent'
    case 'PENDING':
      return 'info'
    default:
      return 'default'
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatScore(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${Math.round(n)}%`
}

export function MatchesList() {
  const [analyses, setAnalyses] = useState<MatchListItem[] | null>(null)
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const resumeMap = useMemo(
    () => new Map(resumes.map((r) => [r.id, r])),
    [resumes],
  )
  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, resumeRows, jobRows] = await Promise.all([
        listMatches(),
        listResumes(),
        listJobs(),
      ])
      setAnalyses(rows)
      setResumes(resumeRows)
      setJobs(jobRows)
    } catch (err) {
      setAnalyses(null)
      if (err instanceof ApiError) {
        setError(mapApiError(err, 'load'))
      } else {
        setError('Could not load matches. Is the API running on :4000?')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            04 · Matches
          </p>
          <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            Know why you match.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Score a resume against a role, then review the breakdown and recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-10">
        <MatchRunForm onCreated={() => void load()} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !analyses && (
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading matches…
        </p>
      )}

      {!loading && analyses && analyses.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-5 py-12 text-center">
          <p className="text-[15px] font-medium text-ink">No matches yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above once you have a completed resume and job.
          </p>
        </div>
      )}

      {analyses && analyses.length > 0 && (
        <ul className="mt-10 flex flex-col gap-2">
          {analyses.map((a) => {
            const resume = resumeMap.get(a.resumeVersionId)
            const job = jobMap.get(a.jobDescriptionId)
            return (
              <li key={a.id}>
                <Link
                  href={`/dashboard/matches/${a.id}`}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border border-line bg-card/60 px-4 py-4 transition-colors',
                    'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-5',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-2xl italic tabular text-ink">
                        {formatScore(a.overallScore)}
                      </span>
                      <Chip tone={statusTone(a.status)}>{a.status}</Chip>
                    </div>
                    <p className="mt-1.5 truncate text-[14px] text-ink">
                      {resume?.name ?? 'Resume'}{' '}
                      <span className="text-ink-faint">→</span>{' '}
                      {job ? `${job.roleTitle} · ${job.companyName}` : 'Job'}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-ink-faint">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-faint sm:pl-4">
                    View →
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
