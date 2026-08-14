'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { Chip } from '@/components/primitives'
import {
  ApiError,
  listApplications,
  listInterviewSets,
  listJobs,
  listMatches,
  listResumes,
  mapApiError,
  type ApplicationListItem,
  type ApplicationStage,
  type InterviewSetListItem,
  type JobListItem,
  type JobStatus,
  type MatchListItem,
  type ResumeListItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type OverviewData = {
  resumes: ResumeListItem[]
  jobs: JobListItem[]
  matches: MatchListItem[]
  applications: ApplicationListItem[]
  interviewSets: InterviewSetListItem[]
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatScore(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${Math.round(n)}%`
}

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
    default:
      return 'default'
  }
}

const ACTIVE_STAGES: ApplicationStage[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
]

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value: number | string
  hint?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-xl border border-line bg-card/60 p-4 transition-colors hover:border-ink/25 hover:bg-card sm:p-5"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint sm:text-[10.5px] sm:tracking-[0.22em]">
        {label}
      </span>
      <span className="mt-1.5 font-serif text-3xl italic tabular leading-none text-ink sm:mt-2 sm:text-4xl">
        {value}
      </span>
      {hint && (
        <span className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink-soft transition-colors group-hover:text-ink sm:mt-2 sm:text-[12px]">
          {hint} →
        </span>
      )}
    </Link>
  )
}

export function DashboardHome() {
  const { user } = useAuth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [resumes, jobs, matches, applications, interviewSets] = await Promise.all([
        listResumes(),
        listJobs(),
        listMatches(),
        listApplications(),
        listInterviewSets(),
      ])
      setData({ resumes, jobs, matches, applications, interviewSets })
    } catch (err) {
      setData(null)
      if (err instanceof ApiError) {
        setError(mapApiError(err, 'load'))
      } else {
        setError('Could not load overview. Is the API running on :4000?')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    if (!data) return null
    const completedResumes = data.resumes.filter((r) => r.parseStatus === 'COMPLETED').length
    const completedJobs = data.jobs.filter((j) => j.parseStatus === 'COMPLETED').length
    const activeApps = data.applications.filter((a) => ACTIVE_STAGES.includes(a.stage)).length
    const pipelineApps = data.applications.filter(
      (a) => a.stage !== 'REJECTED' && a.stage !== 'WITHDRAWN',
    ).length
    const completedSets = data.interviewSets.filter((s) => s.status === 'COMPLETED').length

    return {
      completedResumes,
      completedJobs,
      activeApps,
      pipelineApps,
      completedSets,
      readyToMatch: Math.min(completedResumes, completedJobs),
    }
  }, [data])

  const recentApplications = useMemo(() => {
    if (!data) return []
    return [...data.applications]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 4)
  }, [data])

  const recentMatches = useMemo(() => {
    if (!data) return []
    const resumeMap = new Map(data.resumes.map((r) => [r.id, r]))
    const jobMap = new Map(data.jobs.map((j) => [j.id, j]))
    return [...data.matches]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 3)
      .map((m) => ({
        ...m,
        resumeName: resumeMap.get(m.resumeVersionId)?.name ?? 'Resume',
        jobLabel: (() => {
          const j = jobMap.get(m.jobDescriptionId)
          return j ? `${j.roleTitle} · ${j.companyName}` : 'Job'
        })(),
      }))
  }, [data])

  const stageCounts = useMemo(() => {
    if (!data) return []
    const counts = new Map<ApplicationStage, number>()
    for (const stage of ACTIVE_STAGES) counts.set(stage, 0)
    for (const app of data.applications) {
      if (ACTIVE_STAGES.includes(app.stage)) {
        counts.set(app.stage, (counts.get(app.stage) ?? 0) + 1)
      }
    }
    return ACTIVE_STAGES.map((stage) => ({
      stage,
      count: counts.get(stage) ?? 0,
    })).filter((s) => s.count > 0)
  }, [data])

  const isEmpty =
    data &&
    data.resumes.length === 0 &&
    data.jobs.length === 0 &&
    data.matches.length === 0 &&
    data.applications.length === 0

  return (
    <div className="min-w-0 overflow-x-hidden">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">01 · Overview</p>
      <h1 className="mt-3 text-balance text-2xl font-medium leading-[1.08] tracking-tight text-ink sm:text-3xl md:text-4xl">
        Your career system,{' '}
        <span className="font-serif italic">in one place.</span>
      </h1>
      {user?.email && (
        <p className="mt-3 min-w-0 text-[13px] text-ink-soft sm:text-[14px]">
          Signed in as{' '}
          <span className="block truncate font-medium text-ink sm:inline" title={user.email}>
            {user.email}
          </span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-neg/25 bg-neg/4 px-4 py-3 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      {loading && !data && (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading overview…
        </p>
      )}

      {data && stats && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            <StatCard
              label="Resumes"
              value={data.resumes.length}
              hint={`${stats.completedResumes} parsed`}
              href="/dashboard/resumes"
            />
            <StatCard
              label="Jobs"
              value={data.jobs.length}
              hint={`${stats.completedJobs} parsed`}
              href="/dashboard/jobs"
            />
            <StatCard
              label="Matches"
              value={data.matches.length}
              hint={stats.readyToMatch > 0 ? 'Run a score' : 'Parsed resume + job needed'}
              href="/dashboard/matches"
            />
            <StatCard
              label="Applications"
              value={data.applications.length}
              hint={`${stats.activeApps} active`}
              href="/dashboard/applications"
            />
            <StatCard
              label="Interview"
              value={data.interviewSets.length}
              hint={`${stats.completedSets} ready`}
              href="/dashboard/interview"
            />
            <StatCard
              label="Pipeline"
              value={stats.pipelineApps}
              hint="Open applications"
              href="/dashboard/applications"
            />
          </div>

          {isEmpty && (
            <div className="mt-8 rounded-xl border border-dashed border-line bg-paper/40 px-4 py-8 text-center sm:mt-10 sm:px-5 sm:py-10">
              <p className="text-[15px] font-medium text-ink">Start with the basics</p>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
                Upload a resume and add a job first. Then run a match, track an application, and
                generate interview questions.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                <Link
                  href="/dashboard/resumes"
                  className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:brightness-105 sm:w-auto"
                >
                  Upload resume
                </Link>
                <Link
                  href="/dashboard/jobs"
                  className="inline-flex w-full items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card sm:w-auto"
                >
                  Add job
                </Link>
              </div>
            </div>
          )}

          {!isEmpty && stageCounts.length > 0 && (
            <section className="mt-10 rounded-xl border border-line bg-card/60 p-5 sm:p-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
                Application pipeline
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {stageCounts.map(({ stage, count }) => (
                  <Link
                    key={stage}
                    href="/dashboard/applications"
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-paper/50 px-2.5 py-1.5 transition-colors hover:bg-paper sm:px-3 sm:py-2"
                  >
                    <Chip tone={stageTone(stage)} className="shrink-0 text-[10px] sm:text-[11px]">
                      {stage}
                    </Chip>
                    <span className="shrink-0 font-mono text-[12px] tabular text-ink">{count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isEmpty && (
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <section className="min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
                    Recent applications
                  </p>
                  <Link
                    href="/dashboard/applications"
                    className="shrink-0 font-mono text-[11px] text-ink-faint transition-colors hover:text-ink"
                  >
                    View all →
                  </Link>
                </div>
                {recentApplications.length === 0 ? (
                  <p className="mt-3 text-[13px] text-ink-soft">
                    None yet.{' '}
                    <Link href="/dashboard/applications" className="text-ink underline-offset-2 hover:underline">
                      Start tracking →
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {recentApplications.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/dashboard/applications/${a.id}`}
                          className={cn(
                            'flex flex-col gap-2 rounded-xl border border-line bg-paper/50 px-3 py-3 transition-colors hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">{a.roleTitle}</p>
                            <p className="truncate font-mono text-[11px] text-ink-faint">
                              {a.companyName} · {formatDate(a.updatedAt)}
                            </p>
                          </div>
                          <Chip tone={stageTone(a.stage)} className="w-fit shrink-0 self-start sm:self-center">
                            {a.stage}
                          </Chip>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
                    Recent matches
                  </p>
                  <Link
                    href="/dashboard/matches"
                    className="shrink-0 font-mono text-[11px] text-ink-faint transition-colors hover:text-ink"
                  >
                    View all →
                  </Link>
                </div>
                {recentMatches.length === 0 ? (
                  <p className="mt-3 text-[13px] text-ink-soft">
                    None yet.{' '}
                    <Link href="/dashboard/matches" className="text-ink underline-offset-2 hover:underline">
                      Run a match →
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {recentMatches.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/dashboard/matches/${m.id}`}
                          className="flex flex-col gap-2 rounded-xl border border-line bg-paper/50 px-3 py-3 transition-colors hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] text-ink">
                              {m.resumeName}{' '}
                              <span className="text-ink-faint">→</span> {m.jobLabel}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                              {formatDate(m.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                            <span className="font-serif text-xl italic tabular text-ink sm:text-2xl">
                              {formatScore(m.overallScore)}
                            </span>
                            <Chip tone={statusTone(m.status)} className="text-[10px] sm:text-[11px]">
                              {m.status}
                            </Chip>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {!isEmpty && stats.readyToMatch > 0 && data.matches.length === 0 && (
            <p className="mt-8 rounded-lg border border-line bg-paper/50 px-4 py-3 text-[13px] text-ink-soft">
              You have parsed resumes and jobs —{' '}
              <Link href="/dashboard/matches" className="font-medium text-ink hover:underline">
                run your first match
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  )
}
