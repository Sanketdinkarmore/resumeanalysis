'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ApiError, deleteJob, getJob, mapApiError, type JobDetail } from '@/lib/api'
import { Chip } from '@/components/primitives'
import { DeleteResourceSection } from '@/components/dashboard/delete-resource-section'
import {
  ParseProgressBanner,
  ParsedFieldsSkeleton,
  parseEmptyHint,
} from '@/components/dashboard/parse-progress-banner'
import { isParseInProgress, parseStatusLabel } from '@/lib/parse-status'
import { useParseDetailPolling } from '@/lib/use-parse-polling'
import { cn } from '@/lib/utils'

function statusTone(status: JobDetail['parseStatus']) {
  switch (status) {
    case 'COMPLETED':
      return 'pos' as const
    case 'FAILED':
      return 'neg' as const
    case 'PROCESSING':
      return 'accent' as const
    default:
      return 'info' as const
  }
}

function SkillGroup({
  label,
  items,
  parseStatus,
}: {
  label: string
  items: string[]
  parseStatus: JobDetail['parseStatus']
}) {
  return (
    <section className="mt-8">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-soft">
          {parseEmptyHint(parseStatus, 'None extracted.')}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((s) => (
            <span
              key={s}
              className={cn(
                'inline-flex rounded border border-line bg-card px-2 py-1',
                'font-mono text-[11px] text-ink-soft',
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export function JobDetailView() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [job, setJob] = useState<JobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!id) return
    if (!opts?.quiet) {
      setLoading(true)
      setError(null)
    }
    try {
      setJob(await getJob(id))
      setError(null)
    } catch (err) {
      setJob(null)
      if (err instanceof ApiError) {
        setError(err.status === 404 ? 'Job not found.' : mapApiError(err, 'load'))
      } else {
        setError('Could not load this job.')
      }
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useParseDetailPolling(job?.parseStatus, load)

  if (loading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Loading job…
      </p>
    )
  }

  if (error || !job) {
    return (
      <div>
        <p role="alert" className="text-[15px] text-neg">
          {error ?? 'Job not found.'}
        </p>
        <Link
          href="/dashboard/jobs"
          className="mt-6 inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        >
          ← Jobs
        </Link>
      </div>
    )
  }

  const parsed = job.parsedData
  const parsing = isParseInProgress(job.parseStatus)
  const required = (parsed?.requiredSkills ?? []).map(String)
  const preferred = (parsed?.preferredSkills ?? []).map(String)
  const keywords = (parsed?.keywords ?? []).map(String)

  return (
    <div>
      <Link
        href="/dashboard/jobs"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Jobs
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            {job.roleTitle}
          </h1>
          <p className="mt-2 font-mono text-[12px] text-ink-faint">{job.companyName}</p>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block truncate text-[13px] text-accent hover:underline"
            >
              Source link →
            </a>
          )}
        </div>
        <Chip tone={statusTone(job.parseStatus)}>{parseStatusLabel(job.parseStatus)}</Chip>
      </div>

      <ParseProgressBanner status={job.parseStatus} />

      {job.parseError && (
        <p className="mt-6 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg">
          {job.parseError}
        </p>
      )}

      {!parsing && parsed?.seniority && parsed.seniority !== 'unknown' && (
        <p className="mt-6 font-mono text-[12px] text-ink-soft">
          Seniority · <span className="text-ink">{parsed.seniority}</span>
        </p>
      )}

      {parsing ? (
        <ParsedFieldsSkeleton rows={3} />
      ) : (
        <>
          <SkillGroup label="Required skills" items={required} parseStatus={job.parseStatus} />
          <SkillGroup label="Preferred skills" items={preferred} parseStatus={job.parseStatus} />
          <SkillGroup label="Keywords" items={keywords} parseStatus={job.parseStatus} />
        </>
      )}

      <section className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Raw description
        </p>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-paper/50 p-4 text-[13px] leading-relaxed text-ink-soft">
          {job.rawText}
        </pre>
      </section>

      <DeleteResourceSection
        description="Remove this job description. You cannot delete jobs linked to match analyses or applications."
        confirmText={`Delete ${job.companyName} — ${job.roleTitle}? This cannot be undone.`}
        redirectTo="/dashboard/jobs"
        onDelete={() => deleteJob(job.id)}
      />
    </div>
  )
}
