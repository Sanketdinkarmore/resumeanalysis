'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, listJobs, type JobListItem, type JobStatus } from '@/lib/api'
import { Chip } from '@/components/primitives'
import { JobCreateForm } from '@/components/dashboard/job-create-form'
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

export function JobsList() {
  const [jobs, setJobs] = useState<JobListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setJobs(await listJobs())
    } catch (err) {
      setJobs(null)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not load jobs. Is the API running on :4000?')
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
            03 · Jobs
          </p>
          <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            Roles you&apos;re targeting.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Paste a posting, we extract required skills and keywords for matching.
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

      <div className="mt-8">
        <JobCreateForm onCreated={() => void load()} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !jobs && (
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading jobs…
        </p>
      )}

      {!loading && jobs && jobs.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-5 py-12 text-center">
          <p className="text-[15px] font-medium text-ink">No jobs yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above to add your first role.
          </p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <ul className="mt-10 flex flex-col gap-2">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link
                href={`/dashboard/jobs/${j.id}`}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-line bg-card/60 px-4 py-4 transition-colors',
                  'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-5',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-ink">
                      {j.roleTitle}
                    </span>
                    <Chip tone={statusTone(j.parseStatus)}>{j.parseStatus}</Chip>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                    {j.companyName} · {formatDate(j.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-ink-faint sm:pl-4">
                  View →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
