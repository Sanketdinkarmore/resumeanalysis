'use client'

import { useInView } from '@/hooks/use-in-view'
import { useCountUp } from '@/hooks/use-count-up'
import { MetaLabel } from './primitives'
import { cn } from '@/lib/utils'

function Stat({
  value,
  suffix,
  label,
  active,
  delay = 0,
}: {
  value: number
  suffix: string
  label: string
  active: boolean
  delay?: number
}) {
  const n = useCountUp(value, active, 1100)
  return (
    <div
      className="transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0, transitionDelay: `${delay}ms` }}
    >
      <p className="font-serif text-4xl italic tabular text-ink sm:text-5xl">
        {n}
        <span className="font-mono text-xl not-italic text-accent">{suffix}</span>
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
    </div>
  )
}

const TREND = [58, 63, 61, 70, 74, 79, 84, 87]
const MISSING = [
  { skill: 'Kubernetes', count: 7 },
  { skill: 'GraphQL', count: 5 },
  { skill: 'System design', count: 4 },
  { skill: 'Docker', count: 3 },
]

export function SectionAnalytics() {
  const { ref, inView } = useInView({ threshold: 0.3 })

  return (
    <section ref={ref} className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Career intelligence
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Your job search gets <span className="font-serif italic">smarter over time.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* stats + trend */}
          <div className="rounded-xl border border-line bg-card p-6 md:p-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <Stat value={42} suffix="" label="Applications" active={inView} />
              <Stat value={38} suffix="%" label="Interview rate" active={inView} delay={80} />
              <Stat value={12} suffix="%" label="Offer rate" active={inView} delay={160} />
              <Stat value={87} suffix="%" label="Avg match" active={inView} delay={240} />
            </div>

            <div className="mt-10 border-t border-line-soft pt-6">
              <div className="flex items-center justify-between">
                <MetaLabel>Average match score · trend</MetaLabel>
                <span className="font-mono text-[11px] text-pos">↑ improving</span>
              </div>


              {/* <div className="mt-5 flex h-28 items-end gap-2">
                {TREND.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={cn(
                          'w-full rounded-t-sm transition-[height] duration-700 ease-out',
                          i === TREND.length - 1 ? 'bg-accent' : 'bg-ink/70',
                        )}
                        style={{
                          height: inView ? `${v}%` : '0%',
                          transitionDelay: `${i * 80}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div> */}

              <div className="mt-6 h-28">
  <svg
    viewBox="0 0 800 120"
    className="h-full w-full overflow-visible"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>

    <path
      d="M0 92 L114 78 L228 84 L342 58 L456 48 L570 34 L684 20 L800 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-accent"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={inView ? 0 : 1}
      style={{
        transition: 'stroke-dashoffset 1.4s ease-out',
      }}
    />

    <path
      d="M0 92 L114 78 L228 84 L342 58 L456 48 L570 34 L684 20 L800 10 L800 120 L0 120 Z"
      fill="url(#trendFill)"
      className="text-accent"
    />

    {TREND.map((_, i) => {
      const x = i * (800 / 7)
      const y = [92, 78, 84, 58, 48, 34, 20, 10][i]

      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === TREND.length - 1 ? 4 : 3}
          className={
            i === TREND.length - 1
              ? 'fill-accent'
              : 'fill-paper stroke-accent'
          }
          strokeWidth="2"
        />
      )
    })}
  </svg>

  <div className="mt-3 flex justify-between font-mono text-[10px] text-ink-faint">
    <span>Week 1</span>
    <span>Week 2</span>
    <span>Week 3</span>
    <span>Week 4</span>
  </div>
</div>
            </div>
          </div>

          {/* common missing skills */}
          <div className="rounded-xl border border-line bg-paper/50 p-6 md:p-8">
            <MetaLabel>Common missing skills</MetaLabel>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              Patterns across roles you target — where a little upskilling moves the most matches.
            </p>
            <ul className="mt-6 space-y-4">
              {MISSING.map((m, i) => (
                <li key={m.skill}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[12px] text-ink">{m.skill}</span>
                    <span className="font-mono text-[11px] text-ink-faint">{m.count} roles</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full bg-accent/80 transition-[width] duration-700 ease-out"
                      style={{
                        width: inView ? `${(m.count / 7) * 100}%` : '0%',
                        transitionDelay: `${i * 120}ms`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
