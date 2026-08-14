'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ApiError,
  APPLICATION_STAGES,
  listApplications,
  mapApiError,
  type ApplicationListItem,
  type ApplicationStage,
} from '@/lib/api'
import { ApplicationCreateForm } from '@/components/dashboard/application-create-form'
import { Chip } from '@/components/primitives'
import { cn } from '@/lib/utils'

type StageFilter = ApplicationStage | 'ALL'

function stageTone(
  stage: ApplicationStage,
): 'pos' | 'neg' | 'accent' | 'info' | 'default' {
  switch (stage) {
    case 'OFFER':
      return 'pos'
    case 'REJECTED':
    case 'WITHDRAWN':
      return 'neg'
    case 'INTERVIEW':
    case 'SCREENING':
      return 'accent'
    case 'APPLIED':
      return 'info'
    case 'SAVED':
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

export function ApplicationsList() {
  const [rows, setRows] = useState<ApplicationListItem[] | null>(null)
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (filter: StageFilter = stageFilter) => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await listApplications({
          stage: filter === 'ALL' ? undefined : filter,
        }),
      )
    } catch (err) {
      setRows(null)
      if (err instanceof ApiError) {
        setError(mapApiError(err, 'load'))
      } else {
        setError('Could not load applications. Is the API running on :4000?')
      }
    } finally {
      setLoading(false)
    }
  }, [stageFilter])

  useEffect(() => {
    void load(stageFilter)
  }, [stageFilter, load])

  function onFilterChange(next: StageFilter) {
    setStageFilter(next)
  }

  const filteredEmpty = !loading && rows && rows.length === 0 && stageFilter !== 'ALL'

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            05 · Applications
          </p>
          <h1 className="mt-3 text-balance text-2xl font-medium leading-[1.05] tracking-tight text-ink sm:text-3xl md:text-4xl">
            Track the pipeline.
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">
            Roles you&apos;re pursuing, from saved to offer. Open one to move stages or edit notes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(stageFilter)}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-8 sm:mt-10">
        <ApplicationCreateForm onCreated={() => void load(stageFilter)} />
      </div>

      <div className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Filter by stage
        </p>
        <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={() => onFilterChange('ALL')}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors',
              stageFilter === 'ALL'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-paper text-ink-soft hover:text-ink',
            )}
          >
            All
          </button>
          {APPLICATION_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => onFilterChange(stage)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors',
                stageFilter === stage
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-paper text-ink-soft hover:text-ink',
              )}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-neg/25 bg-neg/4 px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !rows && (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading applications…
        </p>
      )}

      {!loading && rows && rows.length === 0 && stageFilter === 'ALL' && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-4 py-10 text-center sm:px-5 sm:py-12">
          <p className="text-[15px] font-medium text-ink">No applications yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above to link a resume to a job.
          </p>
        </div>
      )}

      {filteredEmpty && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-4 py-10 text-center sm:px-5 sm:py-12">
          <p className="text-[15px] font-medium text-ink">No {stageFilter} applications</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Try another stage or track a new application above.
          </p>
          <button
            type="button"
            onClick={() => onFilterChange('ALL')}
            className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-card"
          >
            Show all
          </button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="mt-8 flex flex-col gap-2 sm:mt-10">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/dashboard/applications/${a.id}`}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border border-line bg-card/60 px-3 py-3 transition-colors',
                  'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-4',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-ink sm:text-[15px]">
                      {a.roleTitle}
                    </span>
                    <Chip tone={stageTone(a.stage)} className="shrink-0">
                      {a.stage}
                    </Chip>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                    {a.companyName} · updated {formatDate(a.updatedAt)}
                  </p>
                </div>
                <span className="shrink-0 self-start font-mono text-[11px] text-ink-faint sm:self-center sm:pl-4">
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
