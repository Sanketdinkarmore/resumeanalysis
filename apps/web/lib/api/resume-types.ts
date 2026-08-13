export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type ResumeListItem = {
  id: string
  name: string
  tags: string[]
  originalFilename: string
  mimeType: string
  sizeBytes: number
  parseStatus: JobStatus
  parseError: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ResumeBullet = {
  id?: string
  text: string
}

export type ResumeExperience = {
  company?: string
  title?: string
  startDate?: string
  endDate?: string
  bullets?: ResumeBullet[]
}

export type ResumeTextItem = {
  text: string
}

export type ParsedResumeSummary = {
  id: string
  resumeVersionId: string
  contact: Record<string, unknown> | null
  summary: string | null
  skills: string[]
  experience: ResumeExperience[]
  education: ResumeTextItem[]
  projects: ResumeTextItem[]
  certifications: ResumeTextItem[]
  rawExtract: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type ResumeUploadResult = {
  id: string
  name: string
  tags: string[]
  originalFilename: string
  mimeType: string
  sizeBytes: number
  parseStatus: JobStatus
  parseError: string | null
  createdAt: string
  parsedData: {
    skills: string[]
    summary: string | null
    contact: Record<string, unknown> | null
  } | null
}

export type ResumeDetail = ResumeListItem & {
  deletedAt: string | null
  parsedData: ParsedResumeSummary | null
}
