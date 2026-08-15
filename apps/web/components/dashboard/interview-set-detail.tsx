'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ApiError,
  deleteInterviewSet,
  generateAnswerOutline,
  getInterviewSet,
  getJob,
  getResume,
  mapApiError,
  type InterviewQuestion,
  type InterviewSetDetail,
  type JobDetail,
  type JobStatus,
  type QuestionCategory,
  type ResumeDetail,
} from '@/lib/api'
import { Chip } from '@/components/primitives'
import { DeleteResourceSection } from '@/components/dashboard/delete-resource-section'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER: QuestionCategory[] = ['TECHNICAL', 'BEHAVIORAL', 'PROJECT']

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

function categoryTone(c: QuestionCategory): 'info' | 'accent' | 'default' {
  if (c === 'TECHNICAL') return 'info'
  if (c === 'BEHAVIORAL') return 'accent'
  return 'default'
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

function groupByCategory(questions: InterviewQuestion[]) {
  const map = new Map<QuestionCategory, InterviewQuestion[]>()
  for (const cat of CATEGORY_ORDER) map.set(cat, [])
  for (const q of questions) {
    const list = map.get(q.category) ?? []
    list.push(q)
    map.set(q.category, list)
  }
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: map.get(cat) ?? [],
  })).filter((g) => g.items.length > 0)
}

function outlineError(err: unknown): string {
  return mapApiError(err, 'interview', 'Could not generate outline.')
}

export function InterviewSetDetailView() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [set, setSet] = useState<InterviewSetDetail | null>(null)
  const [job, setJob] = useState<JobDetail | null>(null)
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [outlinePendingId, setOutlinePendingId] = useState<string | null>(null)
  const [outlineErrors, setOutlineErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const row = await getInterviewSet(id)
      setSet(row)
      const [j, r] = await Promise.all([
        getJob(row.jobDescriptionId).catch(() => null),
        row.resumeVersionId
          ? getResume(row.resumeVersionId).catch(() => null)
          : Promise.resolve(null),
      ])
      setJob(j)
      setResume(r)
    } catch (err) {
      setSet(null)
      if (err instanceof ApiError) {
        setError(err.status === 404 ? 'Interview set not found.' : mapApiError(err, 'load'))
      } else {
        setError('Could not load this interview set.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(
    () => (set ? groupByCategory(set.questions) : []),
    [set],
  )

  async function onGenerateOutline(questionId: string) {
    if (!id) return
    setOutlinePendingId(questionId)
    setOutlineErrors((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
    try {
      const updated = await generateAnswerOutline(id, questionId)
      setSet((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) => (q.id === questionId ? updated : q)),
            }
          : prev,
      )
    } catch (err) {
      setOutlineErrors((prev) => ({ ...prev, [questionId]: outlineError(err) }))
    } finally {
      setOutlinePendingId(null)
    }
  }

  if (loading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Loading interview set…
      </p>
    )
  }

  if (error || !set) {
    return (
      <div>
        <p role="alert" className="text-[15px] text-neg">
          {error ?? 'Interview set not found.'}
        </p>
        <Link
          href="/dashboard/interview"
          className="mt-6 inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        >
          ← Interview
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/dashboard/interview"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Interview
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Question set
          </p>
          <h1 className="mt-2 text-balance text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl">
            {job ? job.roleTitle : 'Interview prep'}
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            {job?.companyName ?? 'Role'}
            {resume ? ` · grounded in ${resume.name}` : ' · JD only'}
          </p>
        </div>
        <Chip tone={statusTone(set.status)}>{set.status}</Chip>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-card/60 p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Linked
        </p>
        <ul className="mt-4 flex flex-col gap-2 text-[14px]">
          <li>
            <span className="text-ink-faint">Job · </span>
            <Link
              href={`/dashboard/jobs/${set.jobDescriptionId}`}
              className="font-medium text-ink hover:underline"
            >
              {job ? `${job.roleTitle} · ${job.companyName}` : 'View job'}
            </Link>
          </li>
          {set.resumeVersionId && (
            <li>
              <span className="text-ink-faint">Resume · </span>
              <Link
                href={`/dashboard/resumes/${set.resumeVersionId}`}
                className="font-medium text-ink hover:underline"
              >
                {resume?.name ?? 'View resume'}
              </Link>
            </li>
          )}
          {set.applicationId && (
            <li>
              <span className="text-ink-faint">Application · </span>
              <Link
                href={`/dashboard/applications/${set.applicationId}`}
                className="font-medium text-ink hover:underline"
              >
                View application
              </Link>
            </li>
          )}
        </ul>
        <p className="mt-4 font-mono text-[11px] text-ink-faint">
          {set.questions.length} question{set.questions.length === 1 ? '' : 's'} · Created{' '}
          {formatDateTime(set.createdAt)}
        </p>
      </section>

      {set.errorMessage && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg"
        >
          {set.errorMessage}
        </p>
      )}

      {set.questions.length === 0 ? (
        <p className="mt-10 text-[14px] text-ink-soft">
          No questions in this set yet
          {set.status === 'PROCESSING' ? ' — generation may still be running.' : '.'}
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((g) => (
            <section key={g.category}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
                {g.category}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {g.items.map((q, i) => {
                  const pending = outlinePendingId === q.id
                  const qErr = outlineErrors[q.id]
                  return (
                    <li
                      key={q.id}
                      className="rounded-xl border border-line bg-paper/50 px-4 py-4 sm:px-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] tabular text-ink-faint">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <Chip tone={categoryTone(q.category)}>{q.category}</Chip>
                        {q.answerOutline ? (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-pos">
                            Outline ready
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                            No outline yet
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{q.prompt}</p>

                      {q.answerOutline ? (
                        <div className="mt-3 rounded-lg border border-line bg-card/60 px-3.5 py-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                            Interview coach guide
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                            {q.answerOutline}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onGenerateOutline(q.id)}
                          disabled={pending || outlinePendingId !== null}
                          className={cn(
                            'mt-3 inline-flex items-center justify-center rounded-full border border-line px-4 py-2',
                            'font-mono text-[11px] uppercase tracking-wider text-ink transition-colors hover:bg-card',
                            'disabled:pointer-events-none disabled:opacity-50',
                          )}
                        >
                          {pending ? 'Generating coach guide…' : 'Generate coach guide'}
                        </button>
                      )}

                      {qErr && (
                        <p
                          role="alert"
                          className="mt-3 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
                        >
                          {qErr}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <DeleteResourceSection
        description="Remove this interview question set. You can generate a new set later from the application or match page."
        confirmText="Delete this interview set? This cannot be undone."
        redirectTo="/dashboard/interview"
        onDelete={() => deleteInterviewSet(set.id)}
      />
    </div>
  )
}
