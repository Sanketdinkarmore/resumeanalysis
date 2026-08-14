'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ApiError,
  MAX_RESUME_PDF_BYTES,
  mapApiError,
  uploadResume,
} from '@/lib/api'
import { cn } from '@/lib/utils'

export function ResumeUploadForm({ onUploaded }: { onUploaded?: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function onFileChange(f: File | null) {
    setFile(f)
    setError(null)
    if (f && !name.trim()) {
      const base = f.name.replace(/\.pdf$/i, '').trim()
      if (base) setName(base)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give this resume a name.')
      return
    }
    if (!file) {
      setError('Choose a PDF file to upload.')
      return
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    if (file.size > MAX_RESUME_PDF_BYTES) {
      setError('PDF must be 5MB or smaller.')
      return
    }

    setPending(true)
    try {
      const resume = await uploadResume({
        file,
        name: trimmed,
        tags: tags.trim() || undefined,
      })
      setName('')
      setTags('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onUploaded?.()
      router.push(`/dashboard/resumes/${resume.id}`)
    } catch (err) {
      setError(mapApiError(err, 'resume-upload'))
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
        Upload PDF
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Max 5MB. We store the file and parse it into a structured profile (may take a few
        seconds).
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="resume-file"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            File
          </label>
          <input
            ref={fileRef}
            id="resume-file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className={cn(
              'mt-2 block w-full text-[13px] text-ink-soft',
              'file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2',
              'file:text-[12px] file:font-medium file:text-primary-foreground',
              'hover:file:bg-ink/90',
            )}
          />
          {file && (
            <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="resume-name"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Name
          </label>
          <input
            id="resume-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Full stack — 2026"
            className={cn(
              'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
              'placeholder:text-ink-faint outline-none transition-colors',
              'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="resume-tags"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-faint"
          >
            Tags <span className="normal-case tracking-normal text-ink-faint/80">(optional)</span>
          </label>
          <input
            id="resume-tags"
            name="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="backend, target"
            className={cn(
              'mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink',
              'placeholder:text-ink-faint outline-none transition-colors',
              'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
            )}
          />
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
        {pending ? 'Uploading & parsing…' : 'Upload resume'}
        {!pending && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
