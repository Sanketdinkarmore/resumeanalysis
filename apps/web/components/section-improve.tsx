import { Reveal, SectionHeading } from './reveal'
import { MetaLabel } from './primitives'

export function SectionImprove() {
  return (
    <section className="border-t border-line px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <Reveal>
          <SectionHeading eyebrow="Resume improvement">
            Make every line <span className="font-serif italic">earn its place.</span>
          </SectionHeading>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Nextup diagnoses weak writing and proposes tighter language — but it never invents
            numbers. If impact is missing, it asks you for the real result.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Weak verbs', 'Vague scope', 'No measurable impact'].map((t) => (
              <span
                key={t}
                className="rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[11px] text-ink-soft"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="rounded-xl border border-line bg-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <MetaLabel>experience · bullet 02</MetaLabel>
            <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[11px] text-accent">
              AI SUGGESTION
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-neg/25 bg-neg/[0.04] p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-neg">
                Before
              </span>
              <p className="mt-2 text-[15px] text-ink line-through decoration-neg/40">
                &ldquo;Worked on backend APIs.&rdquo;
              </p>
            </div>

            <div className="flex justify-center text-ink-faint">↓</div>

            <div className="rounded-lg border border-pos/25 bg-pos/[0.04] p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-pos">
                Suggested
              </span>
              <p className="mt-2 text-[15px] text-ink">
                &ldquo;Built and optimized REST APIs…&rdquo;
              </p>
              <div className="mt-3 rounded-md border border-accent/25 bg-accent/[0.06] px-3 py-2">
                <p className="font-mono text-[11px] text-accent">
                  Missing measurable impact — what was the real result?
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <MetaLabel className="mr-auto">Review</MetaLabel>
            <button className="rounded-md bg-pos px-3.5 py-1.5 font-mono text-[11px] text-white transition-opacity hover:opacity-90">
              Accept
            </button>
            <button className="rounded-md border border-line bg-paper px-3.5 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:text-ink">
              Edit
            </button>
            <button className="rounded-md border border-line bg-paper px-3.5 py-1.5 font-mono text-[11px] text-ink-faint transition-colors hover:text-neg">
              Reject
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
