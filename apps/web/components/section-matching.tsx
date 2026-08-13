'use client'

import { useInView } from '@/hooks/use-in-view'
import { useCountUp } from '@/hooks/use-count-up'
import { Chip, MetaLabel } from './primitives'
import { MATCH } from '@/lib/nextup-data'

export function SectionMatching() {
  const { ref, inView } = useInView({ threshold: 0.3 })
  const score = useCountUp(MATCH.score, inView, 1300)

  return (
    <section
      id="matching"
      ref={ref}
      className="border-t border-line bg-ink px-5 py-24 text-paper md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Matching
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-paper sm:text-4xl md:text-5xl">
            Don&apos;t just get a score.{' '}
            <span className="font-serif italic text-accent">Know why.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          {/* score */}
          <div>
            <div className="flex items-end gap-4">
              <div className="flex items-baseline">
                <span className="font-serif text-[7rem] italic leading-[0.8] tabular text-paper">
                  {score}
                </span>
                <span className="font-mono text-3xl text-accent">%</span>
              </div>
              <span className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">
                match
              </span>
            </div>
            <div className="mt-8 space-y-4">
              {MATCH.breakdown.map((b, i) => (
                <div key={b.label}>
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[12px] text-paper/70">
                    <span>{b.label}</span>
                    <span className="tabular text-paper">{b.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper/15">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-[1200ms] ease-out"
                      style={{
                        width: inView ? `${b.value}%` : '0%',
                        transitionDelay: `${300 + i * 200}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-paper/15 bg-paper/[0.04] p-5">
              <MetaLabel className="text-paper/50">Matched</MetaLabel>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {MATCH.matched.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-pos/40 bg-pos/15 px-2 py-1 font-mono text-[11px] text-[color:oklch(0.82_0.1_155)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/[0.04] p-5">
              <MetaLabel className="text-paper/50">Missing</MetaLabel>
              <div className="mt-4 space-y-3">
                {MATCH.missing.map((m) => (
                  <div key={m.skill}>
                    <span className="rounded-md border border-neg/40 bg-neg/15 px-2 py-1 font-mono text-[11px] text-[color:oklch(0.78_0.12_27)]">
                      {m.skill}
                    </span>
                    <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-paper/50">
                      ↳ {m.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Chip tone="accent" className="border-accent/40 bg-accent/15 text-accent">
                Evidence decides — not vibes.
              </Chip>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
