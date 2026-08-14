'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ApiError,
  listInterviewSets,
  listJobs,
  mapApiError,
  type InterviewSetListItem,
  type JobListItem,
  type JobStatus,
} from '@/lib/api'
import { InterviewGenerateForm } from '@/components/dashboard/interview-generate-form'
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

export function InterviewSetsList() {
  const [sets, setSets] = useState<InterviewSetListItem[] | null>(null)
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, jobRows] = await Promise.all([listInterviewSets(), listJobs()])
      setSets(rows)
      setJobs(jobRows)
    } catch (err) {
      setSets(null)
      if (err instanceof ApiError) {
        setError(mapApiError(err, 'load'))
      } else {
        setError('Could not load interview sets. Is the API running on :4000?')
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
            06 · Interview
          </p>
          <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            Prep for the room.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Role-grounded question sets. Open a set to generate answer outlines one question at a
            time.
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
        <InterviewGenerateForm onCreated={() => void load()} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !sets && (
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading interview sets…
        </p>
      )}

      {!loading && sets && sets.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-5 py-12 text-center">
          <p className="text-[15px] font-medium text-ink">No interview sets yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above to generate your first set.
          </p>
        </div>
      )}

      {sets && sets.length > 0 && (
        <ul className="mt-10 flex flex-col gap-2">
          {sets.map((s) => {
            const job = jobMap.get(s.jobDescriptionId)
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/interview/${s.id}`}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border border-line bg-card/60 px-4 py-4 transition-colors',
                    'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-5',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-ink">
                        {job ? `${job.roleTitle} · ${job.companyName}` : 'Interview set'}
                      </span>
                      <Chip tone={statusTone(s.status)}>{s.status}</Chip>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-ink-faint">
                      {s._count.questions} question{s._count.questions === 1 ? '' : 's'} ·{' '}
                      {formatDate(s.createdAt)}
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
