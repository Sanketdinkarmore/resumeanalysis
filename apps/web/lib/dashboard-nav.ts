export type DashboardNavItem = {
  href: string
  label: string
  index: string
}

/** Product areas — routes exist as shell destinations; feature UIs come later. */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Overview', index: '01' },
  { href: '/dashboard/resumes', label: 'Resumes', index: '02' },
  { href: '/dashboard/jobs', label: 'Jobs', index: '03' },
  { href: '/dashboard/matches', label: 'Matches', index: '04' },
  { href: '/dashboard/applications', label: 'Applications', index: '05' },
  { href: '/dashboard/interview', label: 'Interview', index: '06' },
]
