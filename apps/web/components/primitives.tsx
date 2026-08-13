import { cn } from '@/lib/utils'

export function MetaLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint',
        className,
      )}
    >
      {children}
    </span>
  )
}

type Tone = 'default' | 'pos' | 'neg' | 'info' | 'accent'

const toneMap: Record<Tone, string> = {
  default: 'border-line bg-paper text-ink-soft',
  pos: 'border-pos/30 bg-pos/8 text-pos',
  neg: 'border-neg/30 bg-neg/8 text-neg',
  info: 'border-info/30 bg-info/8 text-info',
  accent: 'border-accent/40 bg-accent/10 text-accent',
}

export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] tracking-tight',
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Bar({
  value,
  active,
  tone = 'ink',
  delay = 0,
}: {
  value: number
  active: boolean
  tone?: 'ink' | 'accent' | 'pos'
  delay?: number
}) {
  const color =
    tone === 'accent' ? 'bg-accent' : tone === 'pos' ? 'bg-pos' : 'bg-ink'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className={cn('h-full rounded-full transition-[width] duration-[1100ms] ease-out', color)}
        style={{
          width: active ? `${value}%` : '0%',
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  )
}
