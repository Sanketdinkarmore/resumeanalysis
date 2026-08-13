import { Reveal, SectionHeading } from './reveal'
import { MetaLabel } from './primitives'
import { CANDIDATE } from '@/lib/nextup-data'

const SIGNALS = [
  { title: 'Structured profile', desc: 'Name, role, contact and summary mapped to fields.' },
  { title: 'Skill graph', desc: '6 skills linked to evidence in your experience.' },
  { title: 'Experience timeline', desc: 'Roles ordered, gaps and overlaps surfaced.' },
  { title: 'Project signals', desc: 'Impact language and scope extracted per project.' },
]

export function SectionResume() {
  return (
    <section className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading eyebrow="Resume intelligence">
            Your resume is data. <span className="font-serif italic">Make it useful.</span>
          </SectionHeading>
        </Reveal>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* raw resume */}
          <Reveal className="rounded-xl border border-line bg-card p-6">
            <MetaLabel>input · resume.pdf</MetaLabel>
            <p className="mt-4 font-serif text-2xl italic text-ink">{CANDIDATE.name}</p>
            <p className="text-sm text-ink-soft">{CANDIDATE.title}</p>
            <div className="mt-6 space-y-4">
              {['Experience', 'Skills', 'Projects', 'Education'].map((s) => (
                <div key={s} className="border-t border-line-soft pt-3">
                  <span className="text-[13px] font-medium text-ink">{s}</span>
                  <div className="mt-2 space-y-1.5">
                    <span className="block h-1.5 w-full rounded-full bg-line-soft" />
                    <span className="block h-1.5 w-4/5 rounded-full bg-line-soft" />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* structured signals */}
          <div className="grid gap-4 sm:grid-cols-2">
            {SIGNALS.map((sig, i) => (
              <Reveal
                key={sig.title}
                delay={i * 90}
                className="group flex flex-col justify-between rounded-xl border border-line bg-paper/50 p-5 transition-colors hover:border-ink/25 hover:bg-card"
              >
                <div>
                  <span className="font-mono text-[11px] tabular text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-base font-medium text-ink">{sig.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{sig.desc}</p>
                </div>
                {sig.title === 'Skill graph' && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {CANDIDATE.skills.slice(0, 5).map((s) => (
                      <span
                        key={s}
                        className="rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {sig.title === 'Experience timeline' && (
                  <div className="mt-4 flex items-center gap-1">
                    {[3, 5, 2, 4].map((h, k) => (
                      <span
                        key={k}
                        className="flex-1 rounded-sm bg-ink/70"
                        style={{ height: `${h * 6}px` }}
                      />
                    ))}
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
