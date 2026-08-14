'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mapApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type DeleteResourceSectionProps = {
  title?: string
  description: string
  confirmText: string
  buttonLabel?: string
  redirectTo: string
  onDelete: () => Promise<void>
}

export function DeleteResourceSection({
  title = 'Delete',
  description,
  confirmText,
  buttonLabel = 'Delete',
  redirectTo,
  onDelete,
}: DeleteResourceSectionProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!window.confirm(confirmText)) return
    setError(null)
    setPending(true)
    try {
      await onDelete()
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(mapApiError(err, 'delete'))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-neg/25 bg-neg/4 p-5 sm:p-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-neg">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{description}</p>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-neg">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={pending}
        className={cn(
          'mt-4 inline-flex items-center justify-center rounded-full border border-neg/40 px-5 py-2.5',
          'text-sm font-medium text-neg transition-colors hover:bg-neg/10',
          'disabled:pointer-events-none disabled:opacity-60',
        )}
      >
        {pending ? 'Deleting…' : buttonLabel}
      </button>
    </section>
  )
}
