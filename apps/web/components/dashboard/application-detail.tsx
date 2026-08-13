'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ApiError,
  APPLICATION_STAGES,
  getApplication,
  getJob,
  getResume,
  updateApplicationNotes,
  updateApplicationStage,
  type ApplicationDetail,
  type ApplicationStage,
  type JobDetail,
  type ResumeDetail,
} from '@/lib/api'
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

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const fieldClass = cn(
  'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
  'outline-none transition-colors',
  'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
)

export function ApplicationDetailView() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [job, setJob] = useState<JobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [notesDraft, setNotesDraft] = useState('')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [notesPending, setNotesPending] = useState(false)

  const [nextStage, setNextStage] = useState<ApplicationStage | ''>('')
  const [stageNote, setStageNote] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)
  const [stagePending, setStagePending] = useState(false)

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!id) return
    if (!opts?.quiet) {
      setLoading(true)
      setError(null)
    }
    try {
      const row = await getApplication(id)
      setApp(row)
      setNotesDraft(row.notes ?? '')
      setNextStage('')
      setStageNote('')
      const [r, j] = await Promise.all([
        getResume(row.resumeVersionId).catch(() => null),
        getJob(row.jobDescriptionId).catch(() => null),
      ])
      setResume(r)
      setJob(j)
      setError(null)
    } catch (err) {
      setApp(null)
      if (err instanceof ApiError) {
        setError(err.status === 404 ? 'Application not found.' : err.message)
      } else {
        setError('Could not load this application.')
      }
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function onSaveNotes(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !app) return
    setNotesError(null)
    setNotesPending(true)
    try {
      const trimmed = notesDraft.trim()
      const updated = await updateApplicationNotes(id, trimmed.length ? trimmed : null)
      setApp((prev) =>
        prev
          ? { ...prev, notes: updated.notes, updatedAt: updated.updatedAt }
          : prev,
      )
      setNotesDraft(updated.notes ?? '')
    } catch (err) {
      setNotesError(
        err instanceof ApiError
          ? err.message || 'Could not save notes.'
          : 'Could not save notes.',
      )
    } finally {
      setNotesPending(false)
    }
  }

  async function onMoveStage(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !app || !nextStage) return
    setStageError(null)
    setStagePending(true)
    try {
      await updateApplicationStage(id, nextStage, stageNote.trim() || undefined)
      await load({ quiet: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SAME_STAGE') {
          setStageError('Already in that stage.')
        } else {
          setStageError(err.message || 'Could not update stage.')
        }
      } else {
        setStageError('Could not update stage.')
      }
    } finally {
      setStagePending(false)
    }
  }

  if (loading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Loading application…
      </p>
    )
  }

  if (error || !app) {
    return (
      <div>
        <p role="alert" className="text-[15px] text-neg">
          {error ?? 'Application not found.'}
        </p>
        <Link
          href="/dashboard/applications"
          className="mt-6 inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        >
          ← Applications
        </Link>
      </div>
    )
  }

  const otherStages = APPLICATION_STAGES.filter((s) => s !== app.stage)
  const notesDirty = notesDraft.trim() !== (app.notes ?? '').trim()

  return (
    <div>
      <Link
        href="/dashboard/applications"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Applications
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Application
          </p>
          <h1 className="mt-2 text-balance text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl">
            {app.roleTitle}
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">{app.companyName}</p>
        </div>
        <Chip tone={stageTone(app.stage)}>{app.stage}</Chip>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-card/60 p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Linked
        </p>
        <ul className="mt-4 flex flex-col gap-2 text-[14px]">
          <li>
            <span className="text-ink-faint">Resume · </span>
            <Link
              href={`/dashboard/resumes/${app.resumeVersionId}`}
              className="font-medium text-ink hover:underline"
            >
              {resume?.name ?? 'View resume'}
            </Link>
          </li>
          <li>
            <span className="text-ink-faint">Job · </span>
            <Link
              href={`/dashboard/jobs/${app.jobDescriptionId}`}
              className="font-medium text-ink hover:underline"
            >
              {job ? `${job.roleTitle} · ${job.companyName}` : 'View job'}
            </Link>
          </li>
          {app.matchAnalysisId && (
            <li>
              <span className="text-ink-faint">Match · </span>
              <Link
                href={`/dashboard/matches/${app.matchAnalysisId}`}
                className="font-medium text-ink hover:underline"
              >
                View score snapshot
              </Link>
            </li>
          )}
        </ul>
        <p className="mt-4 font-mono text-[11px] text-ink-faint">
          Created {formatDateTime(app.createdAt)} · Updated {formatDateTime(app.updatedAt)}
        </p>
      </section>

      <form
        onSubmit={(e) => void onMoveStage(e)}
        className="mt-8 rounded-xl border border-line bg-card/60 p-5 sm:p-6"
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Move stage
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Changes are logged in history below.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="app-stage"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              New stage
            </label>
            <select
              id="app-stage"
              value={nextStage}
              onChange={(e) => {
                setNextStage(e.target.value as ApplicationStage | '')
                setStageError(null)
              }}
              required
              className={fieldClass}
            >
              <option value="">Select stage…</option>
              {otherStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="app-stage-note"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
            >
              Note{' '}
              <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
            </label>
            <input
              id="app-stage-note"
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              maxLength={1000}
              placeholder="Phone screen booked…"
              className={fieldClass}
            />
          </div>
        </div>
        {stageError && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
          >
            {stageError}
          </p>
        )}
        <button
          type="submit"
          disabled={stagePending || !nextStage}
          className={cn(
            'mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5',
            'text-sm font-medium text-accent-foreground transition-all',
            'hover:brightness-105 disabled:pointer-events-none disabled:opacity-60',
          )}
        >
          {stagePending ? 'Updating…' : 'Update stage'}
        </button>
      </form>

      <form onSubmit={(e) => void onSaveNotes(e)} className="mt-8">
        <label
          htmlFor="app-detail-notes"
          className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
        >
          Notes
        </label>
        <textarea
          id="app-detail-notes"
          value={notesDraft}
          onChange={(e) => {
            setNotesDraft(e.target.value)
            setNotesError(null)
          }}
          rows={4}
          maxLength={5000}
          placeholder="Add notes…"
          className={cn(fieldClass, 'resize-y min-h-[6rem] leading-relaxed')}
        />
        {notesError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
          >
            {notesError}
          </p>
        )}
        <button
          type="submit"
          disabled={notesPending || !notesDirty}
          className={cn(
            'mt-3 inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5',
            'text-sm font-medium text-ink transition-colors hover:bg-card',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {notesPending ? 'Saving…' : 'Save notes'}
        </button>
      </form>

      <section className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Stage history
        </p>
        {app.stageHistory.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-soft">No history yet.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-0 border-l border-line pl-4">
            {app.stageHistory.map((h, i) => (
              <li
                key={h.id}
                className={cn('relative pb-5', i === app.stageHistory.length - 1 && 'pb-0')}
              >
                <span className="absolute -left-[1.28rem] top-1.5 h-2 w-2 rounded-full bg-accent" />
                <div className="flex flex-wrap items-center gap-2">
                  {h.fromStage && (
                    <>
                      <Chip tone={stageTone(h.fromStage)}>{h.fromStage}</Chip>
                      <span className="font-mono text-[11px] text-ink-faint">→</span>
                    </>
                  )}
                  <Chip tone={stageTone(h.toStage)}>{h.toStage}</Chip>
                </div>
                {h.note && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{h.note}</p>
                )}
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  {formatDateTime(h.changedAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
