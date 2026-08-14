import { Reveal, SectionHeading } from './reveal'
import { MetaLabel } from './primitives'
import { CANDIDATE } from '@/lib/nextup-data'

const SIGNALS = [
  {
    title: 'Structured profile',
    desc: 'Name, role, contact and summary mapped to fields.',
  },
  {
    title: 'Skill graph',
    desc: '6 skills linked to evidence in your experience.',
  },
  {
    title: 'Experience timeline',
    desc: 'Roles ordered, gaps and overlaps surfaced.',
  },
  {
    title: 'Project signals',
    desc: 'Impact language and scope extracted per project.',
  },
]

export function SectionResume() {
  return (
    <section className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading eyebrow="Resume intelligence">
            Your resume is data.{' '}
            <span className="font-serif italic">Make it useful.</span>
          </SectionHeading>
        </Reveal>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          {/* raw resume */}
          <Reveal className="rounded-xl border border-line bg-card p-6 md:p-7">
            <div className="flex items-start justify-between">
              <div>
                <MetaLabel>input · resume.pdf</MetaLabel>

                <p className="mt-4 font-serif text-2xl italic text-ink">
                  {CANDIDATE.name}
                </p>

                <p className="mt-0.5 text-sm text-ink-soft">
                  {CANDIDATE.title}
                </p>
              </div>

              <span className="rounded border border-line bg-paper px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                parsed
              </span>
            </div>

            {/* resume metadata */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-y border-line-soft py-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                  Sections
                </span>

                <p className="mt-1 font-mono text-xs text-ink">
                  03
                </p>
              </div>

              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                  Skills
                </span>

                <p className="mt-1 font-mono text-xs text-ink">
                  {CANDIDATE.skills.length}
                </p>
              </div>

              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                  Format
                </span>

                <p className="mt-1 font-mono text-xs text-ink">
                  PDF
                </p>
              </div>
            </div>

            {/* resume sections */}
            <div className="mt-5 space-y-5">
              {[
                {
                  label: 'Experience',
                  width: 'w-full',
                  second: 'w-4/5',
                },
                {
                  label: 'Skills',
                  width: 'w-[92%]',
                  second: 'w-3/5',
                },
                {
                  label: 'Projects',
                  width: 'w-full',
                  second: 'w-[72%]',
                },
                // {
                //   label: 'Education',
                //   width: 'w-[88%]',
                //   second: 'w-1/2',
                // },
              ].map((s) => (
                <div
                  key={s.label}
                  className="border-t border-line-soft pt-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink">
                      {s.label}
                    </span>

                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                      detected
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <span
                      className={`block h-1.5 rounded-full bg-ink/10 ${s.width}`}
                    />

                    <span
                      className={`block h-1.5 rounded-full bg-line-soft ${s.second}`}
                    />

                    <span className="block h-1.5 w-2/5 rounded-full bg-line-soft/70" />
                  </div>
                </div>
              ))}
            </div>

            {/* parsing status */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              <span className="font-mono text-[10px] text-ink-faint">
                Resume structure detected
              </span>

              <span className="flex items-center gap-1.5 font-mono text-[10px] text-pos">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" />
                Ready
              </span>
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

                  <h3 className="mt-2 text-base font-medium text-ink">
                    {sig.title}
                  </h3>

                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                    {sig.desc}
                  </p>
                </div>

                {/* skill graph */}
                {sig.title === 'Skill graph' && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {CANDIDATE.skills.slice(0, 6).map((s) => (
                      <span
                        key={s}
                        className="rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* experience timeline */}
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