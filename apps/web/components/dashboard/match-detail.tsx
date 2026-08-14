'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ApiError,
  createApplication,
  createInterviewSet,
  getJob,
  getMatch,
  getResume,
  listApplications,
  listInterviewSets,
  mapApiError,
  type ApplicationListItem,
  type InterviewSetListItem,
  type JobDetail,
  type MatchAnalysis,
  type MatchRecommendation,
  type ResumeDetail,
} from '@/lib/api'
import { Bar, Chip } from '@/components/primitives'
import { cn } from '@/lib/utils'

function severityTone(s: MatchRecommendation['severity']): 'info' | 'accent' | 'neg' {
  if (s === 'CRITICAL') return 'neg'
  if (s === 'WARN') return 'accent'
  return 'info'
}

function formatScore(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return String(Math.round(n))
}

function SkillPills({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'pos' | 'neg' | 'default'
}) {
  const styles =
    tone === 'pos'
      ? 'border-pos/30 bg-pos/8 text-pos'
      : tone === 'neg'
        ? 'border-neg/30 bg-neg/8 text-neg'
        : 'border-line bg-paper text-ink-soft'

  return (
    <section className="mt-8">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-soft">None.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((s) => (
            <span
              key={s}
              className={cn('inline-flex rounded border px-2 py-1 font-mono text-[11px]', styles)}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export function MatchDetailView() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [job, setJob] = useState<JobDetail | null>(null)
  const [linkedApp, setLinkedApp] = useState<ApplicationListItem | null>(null)
  const [linkedInterview, setLinkedInterview] = useState<InterviewSetListItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [trackPending, setTrackPending] = useState(false)
  const [interviewPending, setInterviewPending] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const a = await getMatch(id)
      setAnalysis(a)
      const [r, j, apps, sets] = await Promise.all([
        getResume(a.resumeVersionId).catch(() => null),
        getJob(a.jobDescriptionId).catch(() => null),
        listApplications().catch(() => [] as ApplicationListItem[]),
        listInterviewSets().catch(() => [] as InterviewSetListItem[]),
      ])
      setResume(r)
      setJob(j)
      const app =
        apps.find(
          (row) =>
            row.resumeVersionId === a.resumeVersionId &&
            row.jobDescriptionId === a.jobDescriptionId,
        ) ?? null
      setLinkedApp(app)
      setLinkedInterview(
        app
          ? (sets.find((row) => row.applicationId === app.id) ?? null)
          : (sets.find(
              (row) =>
                row.jobDescriptionId === a.jobDescriptionId &&
                !row.applicationId,
            ) ?? null),
      )
    } catch (err) {
      setAnalysis(null)
      if (err instanceof ApiError) {
        setError(err.status === 404 ? 'Match not found.' : mapApiError(err, 'load'))
      } else {
        setError('Could not load this match.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function onTrackApplication() {
    if (!analysis || linkedApp) return
    setActionError(null)
    setTrackPending(true)
    try {
      const app = await createApplication({
        resumeVersionId: analysis.resumeVersionId,
        jobDescriptionId: analysis.jobDescriptionId,
        matchAnalysisId: analysis.id,
      })
      router.push(`/dashboard/applications/${app.id}`)
    } catch (err) {
      setActionError(mapApiError(err, 'application'))
    } finally {
      setTrackPending(false)
    }
  }

  async function onPrepInterview() {
    if (!analysis) return
    setActionError(null)
    setInterviewPending(true)
    try {
      let applicationId = linkedApp?.id
      if (!applicationId) {
        const app = await createApplication({
          resumeVersionId: analysis.resumeVersionId,
          jobDescriptionId: analysis.jobDescriptionId,
          matchAnalysisId: analysis.id,
        })
        applicationId = app.id
      }
      const created = await createInterviewSet({
        jobDescriptionId: analysis.jobDescriptionId,
        applicationId,
      })
      router.push(`/dashboard/interview/${created.questionSet.id}`)
    } catch (err) {
      setActionError(mapApiError(err, 'interview'))
    } finally {
      setInterviewPending(false)
    }
  }

  if (loading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Loading match…
      </p>
    )
  }

  if (error || !analysis) {
    return (
      <div>
        <p role="alert" className="text-[15px] text-neg">
          {error ?? 'Match not found.'}
        </p>
        <Link
          href="/dashboard/matches"
          className="mt-6 inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        >
          ← Matches
        </Link>
      </div>
    )
  }

  const breakdown = [
    { label: 'Must-have skills', value: analysis.mustHaveScore },
    { label: 'Preferred skills', value: analysis.preferredScore },
    { label: 'Keywords', value: analysis.keywordScore },
    { label: 'Seniority', value: analysis.seniorityScore },
  ]

  const matched = (analysis.matchedSkills ?? []).map(String)
  const missingMust = (analysis.missingMustHave ?? []).map(String)
  const missingPref = (analysis.missingPreferred ?? []).map(String)

  return (
    <div>
      <Link
        href="/dashboard/matches"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Matches
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Match snapshot
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-serif text-6xl italic leading-none tabular text-ink">
              {formatScore(analysis.overallScore)}
            </span>
            <span className="font-mono text-xl text-accent">%</span>
          </div>
          <p className="mt-3 text-[15px] text-ink-soft">
            <Link
              href={`/dashboard/resumes/${analysis.resumeVersionId}`}
              className="font-medium text-ink hover:underline"
            >
              {resume?.name ?? 'Resume'}
            </Link>
            <span className="mx-2 text-ink-faint">→</span>
            <Link
              href={`/dashboard/jobs/${analysis.jobDescriptionId}`}
              className="font-medium text-ink hover:underline"
            >
              {job ? `${job.roleTitle} · ${job.companyName}` : 'Job'}
            </Link>
          </p>
        </div>
        <Chip tone={analysis.status === 'COMPLETED' ? 'pos' : 'neg'}>{analysis.status}</Chip>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-card/60 p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Next steps
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Track this match in your pipeline or generate interview questions grounded in this resume
          and job.
        </p>
        {actionError && (
          <p role="alert" className="mt-3 text-[13px] text-neg">
            {actionError}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {linkedApp ? (
            <Link
              href={`/dashboard/applications/${linkedApp.id}`}
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5',
                'text-sm font-medium text-ink transition-colors hover:bg-card',
              )}
            >
              View application
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void onTrackApplication()}
              disabled={trackPending || interviewPending}
              className={cn(
                'inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5',
                'text-sm font-medium text-accent-foreground transition-all hover:brightness-105',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
            >
              {trackPending ? 'Tracking…' : 'Track application'}
            </button>
          )}
          {linkedInterview ? (
            <Link
              href={`/dashboard/interview/${linkedInterview.id}`}
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5',
                'text-sm font-medium text-ink transition-colors hover:bg-card',
              )}
            >
              View interview set
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void onPrepInterview()}
              disabled={trackPending || interviewPending}
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5',
                'text-sm font-medium text-ink transition-colors hover:bg-card',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
            >
              {interviewPending ? 'Starting prep…' : 'Prep for interview'}
            </button>
          )}
        </div>
      </section>

      {analysis.errorMessage && (
        <p className="mt-6 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg">
          {analysis.errorMessage}
        </p>
      )}

      <section className="mt-10 rounded-xl border border-line bg-card/60 p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Breakdown
        </p>
        <div className="mt-5 space-y-4">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[12px] text-ink-soft">
                <span>{b.label}</span>
                <span className="tabular text-ink">{formatScore(b.value)}%</span>
              </div>
              <Bar value={b.value ?? 0} active tone="accent" />
            </div>
          ))}
        </div>
      </section>

      <SkillPills label="Matched skills" items={matched} tone="pos" />
      <SkillPills label="Missing required" items={missingMust} tone="neg" />
      <SkillPills label="Missing preferred" items={missingPref} tone="default" />

      <section className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Recommendations
        </p>
        {analysis.recommendations.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-soft">No recommendations for this snapshot.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {analysis.recommendations.map((rec) => (
              <li
                key={rec.id}
                className="rounded-xl border border-line bg-paper/50 px-4 py-3.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={severityTone(rec.severity)}>{rec.severity}</Chip>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {rec.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-medium text-ink">{rec.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{rec.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
