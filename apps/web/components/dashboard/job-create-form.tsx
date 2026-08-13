'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, createJob } from '@/lib/api'
import { cn } from '@/lib/utils'

const MIN_RAW = 50

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'VALIDATION_ERROR') {
      return 'Check company, role title, and description (min 50 characters).'
    }
    return err.message || 'Could not save this job.'
  }
  return 'Could not reach the server. Is the API (and AI service) running?'
}

const fieldClass = cn(
  'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
  'placeholder:text-ink-faint outline-none transition-colors',
  'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
)

export function JobCreateForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const company = companyName.trim()
    const role = roleTitle.trim()
    const text = rawText.trim()

    if (!company || !role) {
      setError('Company name and role title are required.')
      return
    }
    if (text.length < MIN_RAW) {
      setError(`Job description must be at least ${MIN_RAW} characters.`)
      return
    }

    setPending(true)
    try {
      const job = await createJob({
        companyName: company,
        roleTitle: role,
        rawText: text,
        sourceUrl: sourceUrl.trim() || undefined,
      })
      setCompanyName('')
      setRoleTitle('')
      setSourceUrl('')
      setRawText('')
      onCreated?.()
      router.push(`/dashboard/jobs/${job.id}`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-xl border border-line bg-card/70 p-5 sm:p-6"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint">
        Add role
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Paste the full job description. We extract skills and requirements (may take a few
        seconds).
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="job-company"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Company
          </label>
          <input
            id="job-company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            maxLength={200}
            placeholder="Acme Corp"
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor="job-role"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Role title
          </label>
          <input
            id="job-role"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Full Stack Engineer"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="job-url"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Source URL{' '}
            <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
          </label>
          <input
            id="job-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="job-raw"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Job description
          </label>
          <textarea
            id="job-raw"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            required
            rows={8}
            minLength={MIN_RAW}
            placeholder="Paste the full posting here…"
            className={cn(fieldClass, 'resize-y min-h-[10rem] leading-relaxed')}
          />
          <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
            {rawText.trim().length} / {MIN_RAW}+ characters
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-neg/25 bg-neg/[0.04] px-3.5 py-2.5 text-[13px] text-neg"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3',
          'text-sm font-medium text-accent-foreground transition-all sm:w-auto',
          'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'disabled:pointer-events-none disabled:opacity-60',
        )}
      >
        {pending ? 'Saving & parsing…' : 'Save job'}
        {!pending && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
