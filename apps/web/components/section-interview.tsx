import { Reveal, SectionHeading } from './reveal'
import { MetaLabel } from './primitives'

const ITEMS = [
  {
    req: 'REST API Design',
    kind: 'Technical',
    q: 'How would you design a scalable REST API for a high-traffic application?',
    prep: ['Architecture', 'Caching', 'Rate limits'],
  },
  {
    req: 'Platform reliability',
    kind: 'Behavioral',
    q: 'Tell me about a time you improved reliability under pressure.',
    prep: ['Incident', 'Trade-offs', 'Outcome'],
  },
  {
    req: 'Frontend systems',
    kind: 'Project',
    q: 'Walk through a frontend system you built and the decisions behind it.',
    prep: ['State', 'Performance', 'Testing'],
  },
]

export function SectionInterview() {
  return (
    <section id="interview" className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading eyebrow="Interview prep">
            Prepare for the role. <span className="font-serif italic">Not the internet.</span>
          </SectionHeading>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Every question is generated from the actual job requirements — technical, behavioral
            and project — 15 questions total (5 per section), each with a focused prep outline.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal
              key={item.req}
              delay={i * 100}
              className="flex flex-col rounded-xl border border-line bg-card p-6 transition-colors hover:border-ink/25"
            >
              <div className="flex items-center justify-between">
                <MetaLabel>Job requirement</MetaLabel>
                <span className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {item.kind}
                </span>
              </div>
              <p className="mt-2 font-mono text-[13px] text-ink">{item.req}</p>

              <div className="my-4 h-8 w-px self-center bg-gradient-to-b from-line to-accent" />

              <p className="font-serif text-lg italic leading-snug text-ink">{item.q}</p>

              <div className="mt-auto pt-6">
                <MetaLabel>Prepare</MetaLabel>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {item.prep.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-[10.5px] text-ink-soft"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
