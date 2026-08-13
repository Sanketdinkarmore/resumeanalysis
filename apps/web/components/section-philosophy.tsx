'use client'

import { useEffect, useState } from 'react'
import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

const CYCLE = ['AI', 'Suggestion', 'Review', 'Decision']
const PRINCIPLES = [
  'No fabricated metrics.',
  'No invented experience.',
  'No blind rewrites.',
  'Every suggestion is reviewable.',
]

export function SectionPhilosophy() {
  const { ref, inView } = useInView({ threshold: 0.4 })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const id = setInterval(() => setStep((s) => (s + 1) % CYCLE.length), 1600)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section
      id="philosophy"
      ref={ref}
      className="border-t border-line px-5 py-28 md:px-8 md:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-balance text-5xl font-medium leading-[0.95] tracking-tight text-ink sm:text-6xl md:text-7xl">
          AI suggests.
          <br />
          <span className="font-serif italic">You decide.</span>
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1fr] md:items-end">
          <ul className="space-y-3">
            {PRINCIPLES.map((p, i) => (
              <li
                key={p}
                className="flex items-center gap-3 text-lg text-ink-soft transition-all duration-500"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'none' : 'translateX(-10px)',
                  transitionDelay: `${i * 120}ms`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {p}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-sm">
            {CYCLE.map((word, i) => (
              <span key={word} className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-md border px-3 py-1.5 uppercase tracking-wider transition-all duration-500',
                    step === i
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-paper text-ink-faint',
                  )}
                >
                  {word}
                </span>
                {i < CYCLE.length - 1 && <span className="text-ink-faint">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
