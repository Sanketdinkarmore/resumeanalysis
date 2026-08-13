'use client'

import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'
import { FileText, Sheet, Mail, Calendar, MessageSquare, Briefcase } from 'lucide-react'

const OBJECTS = [
  { label: 'resume-final.pdf', icon: FileText, x: -140, y: -50, r: -8 },
  { label: 'resume-v3.pdf', icon: FileText, x: 150, y: -70, r: 7 },
  { label: 'Job Description', icon: FileText, x: -200, y: 40, r: -5 },
  { label: 'Tracking Sheet', icon: Sheet, x: 190, y: 30, r: 6 },
  { label: 'Interview Notes', icon: FileText, x: -90, y: 90, r: 4 },
  { label: 'LinkedIn', icon: Briefcase, x: 90, y: 100, r: -6 },
  { label: 'ChatGPT', icon: MessageSquare, x: -230, y: -110, r: 9 },
  { label: 'Email', icon: Mail, x: 230, y: -30, r: -9 },
  { label: 'Calendar', icon: Calendar, x: 40, y: -120, r: 5 },
]

export function SectionFragmented() {
  const { ref, inView } = useInView({ threshold: 0.35 })

  return (
    <section id="how" className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            The problem
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Your job search shouldn&apos;t live in{' '}
            <span className="font-serif italic">12 tabs.</span>
          </h2>
        </div>

        <div
          ref={ref}
          className="relative mx-auto mt-16 flex min-h-[340px] max-w-3xl flex-wrap items-center justify-center gap-3"
        >
          {OBJECTS.map((o, i) => {
            const Icon = o.icon
            return (
              <div
                key={o.label}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2.5 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                )}
                style={{
                  transform: inView
                    ? 'translate(0,0) rotate(0deg)'
                    : `translate(${o.x}px, ${o.y}px) rotate(${o.r}deg)`,
                  opacity: inView ? 1 : 0.65,
                  transitionDelay: `${i * 70}ms`,
                }}
              >
                <Icon className="h-4 w-4 text-ink-faint" strokeWidth={1.5} />
                <span className="font-mono text-[12px] text-ink-soft">{o.label}</span>
              </div>
            )
          })}
        </div>

        <div
          className="mt-14 flex flex-col items-center gap-1 text-center transition-opacity duration-700"
          style={{ opacity: inView ? 1 : 0, transitionDelay: '700ms' }}
        >
          <p className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            One system. <span className="font-serif italic text-accent">Every step connected.</span>
          </p>
        </div>
      </div>
    </section>
  )
}
