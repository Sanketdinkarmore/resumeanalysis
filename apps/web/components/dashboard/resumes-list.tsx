'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, listResumes, type JobStatus, type ResumeListItem } from '@/lib/api'
import { Chip } from '@/components/primitives'
import { ResumeUploadForm } from '@/components/dashboard/resume-upload-form'
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

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
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

export function ResumesList() {
  const [resumes, setResumes] = useState<ResumeListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listResumes()
      setResumes(rows)
    } catch (err) {
      setResumes(null)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not load resumes. Is the API running on :4000?')
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
            02 · Resumes
          </p>
          <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            Your resume versions.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Upload a PDF, we parse it into a structured profile you can use for matching.
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
        <ResumeUploadForm onUploaded={() => void load()} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !resumes && (
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading resumes…
        </p>
      )}

      {!loading && resumes && resumes.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-paper/40 px-5 py-12 text-center">
          <p className="text-[15px] font-medium text-ink">No resumes yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Use the form above to upload your first PDF.
          </p>
        </div>
      )}

      {resumes && resumes.length > 0 && (
        <ul className="mt-10 flex flex-col gap-2">
          {resumes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/resumes/${r.id}`}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-line bg-card/60 px-4 py-4 transition-colors',
                  'hover:border-ink/25 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-5',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-ink">{r.name}</span>
                    <Chip tone={statusTone(r.parseStatus)}>{r.parseStatus}</Chip>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                    {r.originalFilename} · {formatBytes(r.sizeBytes)} · {formatDate(r.createdAt)}
                  </p>
                  {r.parseError && (
                    <p className="mt-1.5 text-[12px] text-neg line-clamp-2">{r.parseError}</p>
                  )}
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
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
