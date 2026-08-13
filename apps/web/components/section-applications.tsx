'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MetaLabel } from './primitives'
import { PIPELINE_STAGES } from '@/lib/nextup-data'

const APPS = [
  { role: 'Full Stack Engineer', company: 'Northwind', score: 91, stage: 3, activity: '2h ago' },
  { role: 'Frontend Engineer', company: 'Aperto', score: 87, stage: 2, activity: '1d ago' },
  { role: 'Software Engineer', company: 'Meridian', score: 82, stage: 1, activity: '3d ago' },
  { role: 'Backend Engineer', company: 'Fathom', score: 74, stage: 0, activity: '5d ago' },
]

export function SectionApplications() {
  const [selected, setSelected] = useState(0)
  const app = APPS[selected]

  return (
    <section className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Applications
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Know where every application <span className="font-serif italic">stands.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* list */}
          <ul className="flex flex-col gap-2">
            {APPS.map((a, i) => (
              <li key={a.role}>
                <button
                  onMouseEnter={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-all',
                    selected === i
                      ? 'border-ink/25 bg-card shadow-sm'
                      : 'border-line bg-paper/40 hover:border-line hover:bg-card',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        selected === i ? 'bg-accent' : 'bg-ink-faint',
                      )}
                    />
                    <div>
                      <span className="text-[14px] font-medium text-ink">{a.role}</span>
                      <span className="ml-2 font-mono text-[11px] text-ink-faint">{a.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-ink-faint">
                      {PIPELINE_STAGES[a.stage]}
                    </span>
                    <span
                      className={cn(
                        'font-mono text-[12px] tabular',
                        a.score >= 85 ? 'text-pos' : 'text-ink-soft',
                      )}
                    >
                      {a.score}%
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* detail */}
          <div className="rounded-xl border border-line bg-card p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <MetaLabel>{app.company}</MetaLabel>
                <p className="mt-1.5 font-serif text-2xl italic text-ink">{app.role}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl tabular text-ink">{app.score}%</p>
                <span className="font-mono text-[10.5px] text-ink-faint">match</span>
              </div>
            </div>

            <div className="mt-8">
              <MetaLabel>Pipeline</MetaLabel>
              <div className="mt-4 flex items-center">
                {PIPELINE_STAGES.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full border-2 transition-all duration-500',
                          i <= app.stage ? 'border-accent bg-accent' : 'border-line bg-paper',
                        )}
                      />
                      <span
                        className={cn(
                          'font-mono text-[10px]',
                          i <= app.stage ? 'text-ink' : 'text-ink-faint',
                        )}
                      >
                        {s}
                      </span>
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div className="mx-1.5 -mt-5 h-px flex-1 bg-line-soft">
                        <div
                          className="h-full bg-accent transition-[width] duration-500"
                          style={{ width: i < app.stage ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-line-soft pt-4">
              <span className="font-mono text-[11px] text-ink-faint">
                Last activity · {app.activity}
              </span>
              <span className="font-mono text-[11px] text-ink-soft">
                Stage · {PIPELINE_STAGES[app.stage]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
