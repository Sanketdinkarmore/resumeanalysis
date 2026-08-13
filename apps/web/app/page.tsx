import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { SectionFragmented } from '@/components/section-fragmented'
import { SectionResume } from '@/components/section-resume'
import { SectionMatching } from '@/components/section-matching'
import { SectionImprove } from '@/components/section-improve'
import { SectionApplications } from '@/components/section-applications'
import { SectionInterview } from '@/components/section-interview'
import { SectionPhilosophy } from '@/components/section-philosophy'
import { SectionAnalytics } from '@/components/section-analytics'
import { FinalCta } from '@/components/final-cta'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <SectionFragmented />
      <SectionResume />
      <SectionMatching />
      <SectionImprove />
      <SectionApplications />
      <SectionInterview />
      <SectionPhilosophy />
      <SectionAnalytics />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}
