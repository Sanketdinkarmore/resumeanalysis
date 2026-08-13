'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ApiError,
  listApplications,
  type ApplicationListItem,
  type ApplicationStage,
} from '@/lib/api'
import { ApplicationCreateForm } from '@/components/dashboard/application-create-form'
import { Chip } from '@/components/primitives'
import { cn } from '@/lib/utils'

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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listApplications())
    } catch (err) {
      setRows(null)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not load applications. Is the API running on :4000?')
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
            05 · Applications
          </p>
          <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            Track the pipeline.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Roles you&apos;re pursuing, from saved to offer. Open one to move stages or edit notes.
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
        <ApplicationCreateForm onCreated={() => void load()} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !rows && (
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading applications…
        </p>
      )}

      {!loading && rows && rows.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-5 py-12 text-center">
          <p className="text-[15px] font-medium text-ink">No applications yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above to link a resume to a job.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="mt-10 flex flex-col gap-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/dashboard/applications/${a.id}`}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-line bg-card/60 px-4 py-4 transition-colors',
                  'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-5',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-ink">
                      {a.roleTitle}
                    </span>
                    <Chip tone={stageTone(a.stage)}>{a.stage}</Chip>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                    {a.companyName} · updated {formatDate(a.updatedAt)}
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
