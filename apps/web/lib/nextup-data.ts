export type StageId =
  | 'resume'
  | 'job'
  | 'match'
  | 'improve'
  | 'apply'
  | 'interview'
  | 'offer'

export type Stage = {
  id: StageId
  index: string
  label: string
  caption: string
}

export const STAGES: Stage[] = [
  { id: 'resume', index: '01', label: 'Resume', caption: 'Parse & structure' },
  { id: 'job', index: '02', label: 'Job', caption: 'Read the role' },
  { id: 'match', index: '03', label: 'Match', caption: 'Know why' },
  { id: 'improve', index: '04', label: 'Improve', caption: 'Earn every line' },
  { id: 'apply', index: '05', label: 'Apply', caption: 'Track everything' },
  { id: 'interview', index: '06', label: 'Interview', caption: 'Prepare precisely' },
  { id: 'offer', index: '07', label: 'Offer', caption: 'Land it' },
]

export const CANDIDATE = {
  name: 'Sanket More',
  title: 'Full Stack Developer',
  skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'TypeScript', 'Redis'],
  sections: ['Experience', 'Projects', 'Education'],
}

export const ROLE = {
  title: 'Full Stack Engineer',
  meta: 'Remote · Full-time',
  required: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'GraphQL'],
  responsibilities: [
    'Build scalable APIs',
    'Develop frontend systems',
    'Improve platform reliability',
  ],
}

export const MATCH = {
  score: 87,
  breakdown: [
    { label: 'Skills', value: 91 },
    { label: 'Keywords', value: 84 },
    { label: 'Experience', value: 86 },
  ],
  matched: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
  missing: [
    { skill: 'Kubernetes', note: 'appears 3× in the role requirements' },
    { skill: 'GraphQL', note: 'listed under required skills' },
  ],
}

export const APPLICATIONS = [
  { role: 'Full Stack Engineer', company: 'Northwind', score: 91, stage: 'Interview' },
  { role: 'Frontend Engineer', company: 'Aperto', score: 87, stage: 'Screening' },
  { role: 'Software Engineer', company: 'Meridian', score: 82, stage: 'Applied' },
  { role: 'Backend Engineer', company: 'Fathom', score: 74, stage: 'Saved' },
]

export const PIPELINE_STAGES = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
] as const
