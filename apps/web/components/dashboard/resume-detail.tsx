'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ApiError,
  getResume,
  type ResumeDetail,
  type ResumeExperience,
  type ResumeTextItem,
} from '@/lib/api'
import { Chip } from '@/components/primitives'
import { cn } from '@/lib/utils'

function statusTone(status: ResumeDetail['parseStatus']) {
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

function asExperience(items: unknown[]): ResumeExperience[] {
  return items.filter((x): x is ResumeExperience => Boolean(x) && typeof x === 'object')
}

function asTextItems(items: unknown[]): ResumeTextItem[] {
  return items
    .map((x) => {
      if (typeof x === 'string' && x.trim()) return { text: x.trim() }
      if (x && typeof x === 'object' && 'text' in x && typeof (x as ResumeTextItem).text === 'string') {
        return { text: (x as ResumeTextItem).text }
      }
      return null
    })
    .filter((x): x is ResumeTextItem => Boolean(x))
}

function ExperienceBlock({ item }: { item: ResumeExperience }) {
  const title = item.title?.trim() || 'Role'
  const company = item.company?.trim()
  const dates = [item.startDate, item.endDate].filter(Boolean).join(' · ')
  const bullets = (item.bullets ?? [])
    .map((b) => (typeof b === 'string' ? b : b?.text))
    .filter((t): t is string => Boolean(t?.trim()))

  return (
    <article className="rounded-xl border border-line bg-card/60 p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-ink">{title}</h3>
          {company && <p className="mt-0.5 text-[13px] text-ink-soft">{company}</p>}
        </div>
        {dates && (
          <p className="shrink-0 font-mono text-[11px] text-ink-faint sm:pl-4">{dates}</p>
        )}
      </div>
      {bullets.length > 0 && (
        <ul className="mt-3 space-y-2">
          {bullets.map((text, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function TextListSection({
  label,
  items,
  emptyHint,
}: {
  label: string
  items: ResumeTextItem[]
  emptyHint: string
}) {
  return (
    <section className="mt-8">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-soft">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li
              key={`${item.text}-${i}`}
              className="rounded-lg border border-line-soft bg-paper/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-soft"
            >
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ResumeDetailView() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setResume(await getResume(id))
    } catch (err) {
      setResume(null)
      if (err instanceof ApiError) {
        setError(err.status === 404 ? 'Resume not found.' : err.message)
      } else {
        setError('Could not load this resume.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Loading resume…
      </p>
    )
  }

  if (error || !resume) {
    return (
      <div>
        <p role="alert" className="text-[15px] text-neg">
          {error ?? 'Resume not found.'}
        </p>
        <Link
          href="/dashboard/resumes"
          className="mt-6 inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        >
          ← Resumes
        </Link>
      </div>
    )
  }

  const skills = resume.parsedData?.skills ?? []
  const summary = resume.parsedData?.summary
  const contact = resume.parsedData?.contact
  const experience = asExperience(resume.parsedData?.experience ?? [])
  const education = asTextItems(resume.parsedData?.education ?? [])
  const projects = asTextItems(resume.parsedData?.projects ?? [])
  const certifications = asTextItems(resume.parsedData?.certifications ?? [])
  const afterParse = resume.parseStatus === 'COMPLETED'

  return (
    <div>
      <Link
        href="/dashboard/resumes"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Resumes
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            {resume.name}
          </h1>
          <p className="mt-2 truncate font-mono text-[12px] text-ink-faint">
            {resume.originalFilename}
          </p>
        </div>
        <Chip tone={statusTone(resume.parseStatus)}>{resume.parseStatus}</Chip>
      </div>

      {resume.parseError && (
        <p className="mt-6 rounded-lg border border-neg/25 bg-neg/[0.04] px-4 py-3 text-[13px] text-neg">
          {resume.parseError}
        </p>
      )}

      {summary && (
        <section className="mt-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
            Summary
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{summary}</p>
        </section>
      )}

      {contact && Object.keys(contact).length > 0 && (
        <section className="mt-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
            Contact
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(contact).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-line-soft bg-paper/50 px-3 py-2.5"
              >
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {k}
                </dt>
                <dd className="mt-0.5 truncate text-[13px] text-ink">{String(v ?? '—')}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Skills
        </p>
        {skills.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-soft">
            {afterParse ? 'No skills extracted.' : 'Skills appear after a successful parse.'}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
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

      <section className="mt-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
          Experience
        </p>
        {experience.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-soft">
            {afterParse ? 'No experience extracted.' : 'Experience appears after a successful parse.'}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {experience.map((item, i) => (
              <ExperienceBlock key={`${item.title}-${item.company}-${i}`} item={item} />
            ))}
          </div>
        )}
      </section>

      <TextListSection
        label="Education"
        items={education}
        emptyHint={afterParse ? 'No education extracted.' : 'Education appears after a successful parse.'}
      />
      <TextListSection
        label="Projects"
        items={projects}
        emptyHint={afterParse ? 'No projects extracted.' : 'Projects appear after a successful parse.'}
      />
      <TextListSection
        label="Certifications"
        items={certifications}
        emptyHint={afterParse ? 'No certifications extracted.' : 'Certifications appear after a successful parse.'}
      />
    </div>
  )
}
