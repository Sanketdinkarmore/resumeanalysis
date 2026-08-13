'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { STAGES } from '@/lib/nextup-data'
import { StageView } from './hero-stage-views'
import { MetaLabel } from './primitives'
import { PrimaryCta } from './landing-auth-links'
import { cn } from '@/lib/utils'

const DWELL = 4600

export function Hero() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [interacted, setInteracted] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stage = STAGES[active]

  useEffect(() => {
    if (!playing) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    timer.current = setTimeout(() => {
      setActive((i) => (i + 1) % STAGES.length)
    }, DWELL)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [active, playing])

  const select = useCallback((i: number) => {
    setActive(i)
    setPlaying(false)
    setInteracted(true)
  }, [])

  return (
    <section id="top" className="relative overflow-hidden px-5 pt-28 md:px-8 md:pt-32">
      {/* faint technical grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grain opacity-70"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <MetaLabel>Career Operating System</MetaLabel>
          <span className="h-px flex-1 bg-line" />
          {/* <MetaLabel className="hidden sm:inline">v2 · live demo</MetaLabel> */}
        </div>

        {/* headline */}
        <div className="mt-8 max-w-4xl">
          <h1 className="text-balance text-5xl font-medium leading-[0.95] tracking-tight text-ink sm:text-6xl md:text-7xl">
            A better way to{' '}
            <span className="font-serif italic text-ink">get hired.</span>
          </h1>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-pretty text-[15px] leading-relaxed text-ink-soft md:text-base">
            Nextup turns the messy job search into a clear, intelligent system — from first
            draft to final offer.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryCta
              guestLabel="Build your system"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            />
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-card"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* interactive system */}
        <div className="mt-10 md:mt-14">
          <PipelineNav active={active} onSelect={select} />

          <div className="relative mt-4 overflow-hidden rounded-xl border border-line bg-card/70 shadow-[0_1px_0_0_var(--line-soft),0_24px_50px_-30px_rgba(40,30,15,0.28)]">
            {/* viewport header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-accent/70" />
                </span>
                <MetaLabel className="ml-1">
                  nextup.os / {stage.id}
                </MetaLabel>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-[10.5px] text-ink-faint sm:inline">
                  {stage.caption}
                </span>
                <button
                  onClick={() => {
                    setPlaying((p) => !p)
                    setInteracted(true)
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:text-ink"
                  aria-label={playing ? 'Pause demo' : 'Play demo'}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      playing ? 'animate-[pulse-dot_1.6s_ease-in-out_infinite] bg-accent' : 'bg-ink-faint',
                    )}
                  />
                  {playing ? 'Auto' : 'Paused'}
                </button>
              </div>
            </div>

            {/* viewport body */}
            <div className="relative min-h-[420px] p-4 sm:min-h-[400px] sm:p-6">
              <div key={stage.id} className="reveal in h-full [animation-duration:0.5s]">
                <StageView id={stage.id} active />
              </div>
            </div>
          </div>

          {!interacted && (
            <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-faint">
              Hover a stage to explore · playing automatically
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function PipelineNav({
  active,
  onSelect,
}: {
  active: number
  onSelect: (i: number) => void
}) {
  return (
    <div className="relative">
      {/* connecting rail */}
      <div
        aria-hidden
        className="absolute left-0 top-[22px] hidden h-px w-full bg-line md:block"
      >
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${(active / (STAGES.length - 1)) * 100}%` }}
        />
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:justify-between md:gap-0">
        {STAGES.map((s, i) => {
          const isActive = i === active
          const isDone = i < active
          return (
            <li key={s.id} className="md:relative md:flex md:flex-col md:items-center">
              <button
                onClick={() => onSelect(i)}
                onMouseEnter={() => onSelect(i)}
                onFocus={() => onSelect(i)}
                aria-current={isActive ? 'step' : undefined}
                className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-card md:w-auto md:flex-col md:items-center md:gap-1.5 md:border-0 md:bg-transparent md:px-3 md:hover:bg-transparent"
              >
                <span
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 md:h-3 md:w-3 md:border-2',
                    isActive
                      ? 'border-accent bg-accent md:scale-125'
                      : isDone
                        ? 'border-accent bg-accent/30'
                        : 'border-line bg-paper group-hover:border-ink/40',
                  )}
                >
                  <span className="h-1 w-1 rounded-full bg-accent-foreground md:hidden" />
                </span>
                <span className="flex flex-col md:items-center">
                  <span
                    className={cn(
                      'font-mono text-[10px] tabular tracking-wider transition-colors',
                      isActive ? 'text-accent' : 'text-ink-faint',
                    )}
                  >
                    {s.index}
                  </span>
                  <span
                    className={cn(
                      'text-[13px] font-medium transition-colors md:mt-0.5',
                      isActive ? 'text-ink' : 'text-ink-soft group-hover:text-ink',
                    )}
                  >
                    {s.label}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
