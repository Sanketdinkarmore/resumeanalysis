'use client'

import { cn } from '@/lib/utils'
import { Bar, Chip, MetaLabel } from './primitives'
import { useCountUp } from '@/hooks/use-count-up'
import {
  APPLICATIONS,
  CANDIDATE,
  MATCH,
  PIPELINE_STAGES,
  ROLE,
  type StageId,
} from '@/lib/nextup-data'

function Frame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex h-full flex-col gap-4', className)}>{children}</div>
}

/* -------------------------------------------------- RESUME */
function ResumeView({ active }: { active: boolean }) {
  const pct = useCountUp(100, active, 900)
  return (
    <Frame className="sm:grid sm:grid-cols-[1.35fr_1fr] sm:gap-5">
      <div className="flex flex-col rounded-lg border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <MetaLabel>resume.pdf</MetaLabel>
          <Chip tone={pct >= 100 ? 'pos' : 'accent'}>
            {pct >= 100 ? 'PARSED' : 'PARSING'}
          </Chip>
        </div>
        <div className="mt-4">
          <p className="font-serif text-2xl italic leading-none text-ink">{CANDIDATE.name}</p>
          <p className="mt-1 text-sm text-ink-soft">{CANDIDATE.title}</p>
        </div>
        <div className="mt-5">
          <MetaLabel>Skills</MetaLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CANDIDATE.skills.map((s, i) => (
              <span
                key={s}
                className="reveal in inline-flex rounded border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink-soft"
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
          {CANDIDATE.sections.map((sec) => (
            <div key={sec} className="rounded-md border border-line-soft bg-paper px-2 py-2.5">
              <span className="text-[12px] text-ink-soft">{sec}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col justify-between rounded-lg border border-line bg-paper/60 p-5 sm:mt-0">
        <div>
          <MetaLabel>Extraction</MetaLabel>
          <p className="mt-3 font-mono text-4xl tabular text-ink">{pct}%</p>
          <div className="mt-3">
            <Bar value={pct} active={active} tone="accent" />
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-[12px] text-ink-soft">
          {['6 skills detected', '3 sections mapped', 'Structured profile ready'].map((t, i) => (
            <li
              key={t}
              className="reveal in flex items-center gap-2"
              style={{ animationDelay: `${400 + i * 180}ms` }}
            >
              <span className="h-1 w-1 rounded-full bg-pos" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- JOB */
function JobView({ active }: { active: boolean }) {
  return (
    <Frame>
      <div className="flex items-start justify-between">
        <div>
          <MetaLabel>role · req_4821</MetaLabel>
          <p className="mt-2 font-serif text-2xl italic leading-none text-ink">{ROLE.title}</p>
          <p className="mt-1.5 text-sm text-ink-soft">{ROLE.meta}</p>
        </div>
        <Chip tone="info">READING</Chip>
      </div>
      <div className="grid flex-1 gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-line bg-card p-4">
          <MetaLabel>Required</MetaLabel>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ROLE.required.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'reveal in inline-flex rounded border px-2 py-1 font-mono text-[11px]',
                  active && 'in',
                  ['Kubernetes', 'GraphQL'].includes(s)
                    ? 'border-accent/40 bg-accent/8 text-accent'
                    : 'border-line bg-paper text-ink-soft',
                )}
                style={{ animationDelay: `${100 + i * 55}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <MetaLabel>Responsibilities</MetaLabel>
          <ul className="mt-3 space-y-2.5">
            {ROLE.responsibilities.map((r, i) => (
              <li
                key={r}
                className="reveal in flex items-start gap-2 text-[13px] text-ink-soft"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- MATCH */
function MatchRow({
  skill,
  matched,
  active,
  delay,
}: {
  skill: string
  matched: boolean
  active: boolean
  delay: number
}) {
  return (
    <div
      className="reveal in flex items-center gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="flex-1 rounded border border-line bg-paper px-2 py-1 text-right font-mono text-[11px] text-ink-soft">
        {matched ? skill : '—'}
      </span>
      <span className="relative flex h-4 w-8 items-center justify-center">
        <span className="h-px w-full bg-line" />
        <span
          className={cn(
            'absolute h-2 w-2 rounded-full transition-all duration-500',
            matched ? 'scale-100 bg-pos' : 'scale-100 bg-neg',
          )}
          style={{ transitionDelay: `${delay + 200}ms` }}
        />
      </span>
      <span
        className={cn(
          'flex-1 rounded border px-2 py-1 font-mono text-[11px]',
          matched
            ? 'border-pos/30 bg-pos/8 text-pos'
            : 'border-neg/30 bg-neg/8 text-neg',
        )}
      >
        {skill}
      </span>
    </div>
  )
}

function MatchView({ active }: { active: boolean }) {
  const score = useCountUp(MATCH.score, active, 1200)
  const rows = [
    ...MATCH.matched.map((s) => ({ skill: s, matched: true })),
    ...MATCH.missing.map((m) => ({ skill: m.skill, matched: false })),
  ]
  return (
    <Frame className="sm:grid sm:grid-cols-[1fr_0.85fr] sm:gap-5">
      <div className="flex flex-col rounded-lg border border-line bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <MetaLabel>resume</MetaLabel>
          <MetaLabel>role</MetaLabel>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <MatchRow
              key={r.skill}
              skill={r.skill}
              matched={r.matched}
              active={active}
              delay={200 + i * 110}
            />
          ))}
        </div>
        <p className="mt-auto pt-4 font-mono text-[11px] text-accent">
          ↳ Kubernetes appears 3× in the role requirements.
        </p>
      </div>

      <div className="mt-4 flex flex-col rounded-lg border border-line bg-paper/60 p-5 sm:mt-0">
        <MetaLabel>Overall match</MetaLabel>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-serif text-6xl italic leading-none text-ink tabular">
            {score}
          </span>
          <span className="font-mono text-xl text-accent">%</span>
        </div>
        <div className="mt-5 space-y-3">
          {MATCH.breakdown.map((b, i) => (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-ink-soft">
                <span>{b.label}</span>
                <span className="tabular text-ink">{b.value}%</span>
              </div>
              <Bar value={b.value} active={active} delay={300 + i * 200} />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- IMPROVE */
function ImproveView({ active }: { active: boolean }) {
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <MetaLabel>experience · bullet 02</MetaLabel>
        <Chip tone="accent">AI SUGGESTION</Chip>
      </div>
      <div className="grid flex-1 gap-3">
        <div className="rounded-lg border border-neg/25 bg-neg/[0.04] p-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-neg">
              Before
            </span>
          </div>
          <p className="mt-2 text-[15px] text-ink line-through decoration-neg/40">
            &ldquo;Worked on backend APIs for the application.&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Weak action verb', 'No measurable impact', 'Vague scope'].map((d, i) => (
              <span
                key={d}
                className="reveal in inline-flex rounded border border-neg/25 bg-paper px-2 py-0.5 font-mono text-[10.5px] text-neg"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        <div
          className="reveal in rounded-lg border border-pos/25 bg-pos/[0.04] p-4"
          style={{ animationDelay: '520ms' }}
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-pos">
            Suggested
          </span>
          <p className="mt-2 text-[15px] text-ink">
            &ldquo;Built and optimized REST APIs for the application.&rdquo;
          </p>
          <div className="mt-3 rounded-md border border-accent/25 bg-accent/[0.06] px-3 py-2">
            <p className="font-mono text-[11px] text-accent">
              Missing measurable impact — what was the real result?
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MetaLabel className="mr-auto">Review</MetaLabel>
        <button className="rounded-md bg-pos px-3 py-1.5 font-mono text-[11px] text-white transition-opacity hover:opacity-90">
          Accept
        </button>
        <button className="rounded-md border border-line bg-paper px-3 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:text-ink">
          Edit
        </button>
        <button className="rounded-md border border-line bg-paper px-3 py-1.5 font-mono text-[11px] text-ink-faint transition-colors hover:text-neg">
          Reject
        </button>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- APPLY */
function ApplyView({ active }: { active: boolean }) {
  const currentStage = 3 // Interview
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <MetaLabel>pipeline · 4 active</MetaLabel>
        <Chip tone="info">TRACKING</Chip>
      </div>
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Full Stack Engineer</p>
          <span className="font-mono text-[11px] text-pos">91% match</span>
        </div>
        <div className="mt-4 flex items-center">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border transition-all duration-500',
                    i <= currentStage
                      ? 'border-accent bg-accent'
                      : 'border-line bg-paper',
                  )}
                  style={{ transitionDelay: `${i * 160}ms` }}
                />
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    i <= currentStage ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {s}
                </span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="mx-1 -mt-4 h-px flex-1 overflow-hidden bg-line-soft">
                  <div
                    className="h-full bg-accent transition-[width] duration-500"
                    style={{
                      width: active && i < currentStage ? '100%' : '0%',
                      transitionDelay: `${i * 160 + 80}ms`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid flex-1 gap-2">
        {APPLICATIONS.slice(1).map((a, i) => (
          <div
            key={a.role}
            className="reveal in group flex items-center justify-between rounded-md border border-line-soft bg-paper/60 px-4 py-2.5 transition-colors hover:border-line hover:bg-card"
            style={{ animationDelay: `${300 + i * 130}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-ink">{a.role}</span>
              <span className="font-mono text-[10.5px] text-ink-faint">{a.company}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10.5px] text-ink-faint">{a.stage}</span>
              <span
                className={cn(
                  'font-mono text-[11px] tabular',
                  a.score >= 85 ? 'text-pos' : 'text-ink-soft',
                )}
              >
                {a.score}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- INTERVIEW */
function InterviewView({ active }: { active: boolean }) {
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <MetaLabel>generated from role</MetaLabel>
        <Chip tone="accent">PREP</Chip>
      </div>
      <div className="rounded-lg border border-line bg-paper/60 p-4">
        <MetaLabel>Job requirement</MetaLabel>
        <p className="mt-1.5 font-mono text-[13px] text-ink">REST API Design</p>
        <div className="my-3 flex justify-center text-ink-faint">↓</div>
        <div
          className="reveal in rounded-md border border-line bg-card p-3"
          style={{ animationDelay: '250ms' }}
        >
          <MetaLabel>Question</MetaLabel>
          <p className="mt-1.5 font-serif text-lg italic leading-snug text-ink">
            How would you design a scalable REST API for a high-traffic application?
          </p>
        </div>
      </div>
      <div className="flex-1">
        <MetaLabel>Prepare</MetaLabel>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Architecture', 'Trade-offs', 'Caching', 'Authentication', 'Database'].map((t, i) => (
            <span
              key={t}
              className="reveal in inline-flex rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-[11px] text-ink-soft"
              style={{ animationDelay: `${400 + i * 110}ms` }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------- OFFER */
function OfferView({ active }: { active: boolean }) {
  const journey = [
    { label: 'Resume', tone: 'ink' },
    { label: 'Match 87%', tone: 'ink' },
    { label: 'Applied', tone: 'ink' },
    { label: 'Interview', tone: 'ink' },
    { label: 'Offer', tone: 'accent' },
  ]
  return (
    <Frame className="items-center justify-center text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <span
          className="reveal in relative flex h-2.5 w-2.5"
          style={{ animationDelay: '100ms' }}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <p
          className="reveal in mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint"
          style={{ animationDelay: '200ms' }}
        >
          Full Stack Engineer
        </p>
        <p
          className="reveal in mt-2 font-serif text-4xl italic leading-none text-ink"
          style={{ animationDelay: '320ms' }}
        >
          Offer received.
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-2 border-t border-line pt-5">
        {journey.map((j, i) => (
          <span key={j.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                'reveal in rounded border px-2 py-1 font-mono text-[11px]',
                j.tone === 'accent'
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line bg-paper text-ink-soft',
              )}
              style={{ animationDelay: `${450 + i * 130}ms` }}
            >
              {j.label}
            </span>
            {i < journey.length - 1 && <span className="text-ink-faint">→</span>}
          </span>
        ))}
      </div>
    </Frame>
  )
}

export function StageView({ id, active }: { id: StageId; active: boolean }) {
  switch (id) {
    case 'resume':
      return <ResumeView active={active} />
    case 'job':
      return <JobView active={active} />
    case 'match':
      return <MatchView active={active} />
    case 'improve':
      return <ImproveView active={active} />
    case 'apply':
      return <ApplyView active={active} />
    case 'interview':
      return <InterviewView active={active} />
    case 'offer':
      return <OfferView active={active} />
  }
}
