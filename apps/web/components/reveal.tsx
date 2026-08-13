'use client'

import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section'
}) {
  const { ref, inView } = useInView()
  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', inView && 'in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

export function SectionHeading({
  eyebrow,
  children,
  className,
}: {
  eyebrow: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('max-w-3xl', className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
        {children}
      </h2>
    </div>
  )
}
