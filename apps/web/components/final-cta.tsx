import { PrimaryCta } from './landing-auth-links'

const FLOW = ['RESUME', 'MATCH', 'APPLY', 'INTERVIEW', 'OFFER']

export function FinalCta() {
  return (
    <section id="start" className="relative overflow-hidden bg-ink px-5 py-28 text-paper md:px-8 md:py-40">
      {/* subtle animated flow background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-10 opacity-[0.06]">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex whitespace-nowrap">
            <div
              className="flex shrink-0 items-center gap-8 font-serif text-6xl italic md:text-8xl"
              style={{
                animation: `marquee ${38 + row * 8}s linear infinite`,
                animationDirection: row % 2 ? 'reverse' : 'normal',
              }}
            >
              {[...FLOW, ...FLOW, ...FLOW, ...FLOW].map((w, i) => (
                <span key={i} className="flex items-center gap-8">
                  {w}
                  <span className="text-accent">→</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-balance text-4xl font-medium leading-[1.02] tracking-tight text-paper sm:text-5xl md:text-6xl">
          Your next role starts with{' '}
          <span className="font-serif italic text-accent">knowing where you stand.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-paper/70 md:text-base">
          Bring your resumes, roles, applications and interview preparation into one system.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryCta
            guestLabel="Build your system"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          />
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-paper/10"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  )
}
