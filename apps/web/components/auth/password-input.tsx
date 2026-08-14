'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type PasswordInputProps = {
  id: string
  name?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: 'current-password' | 'new-password'
  minLength?: number
  required?: boolean
  placeholder?: string
}

export function PasswordInput({
  id,
  name = 'password',
  value,
  onChange,
  autoComplete = 'current-password',
  minLength,
  required,
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative mt-2">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border border-line bg-card py-2.5 pl-3.5 pr-11 text-[15px] text-ink',
          'placeholder:text-ink-faint',
          'outline-none transition-colors',
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
        )}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={cn(
          'absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center',
          'font-mono text-[10px] uppercase tracking-wider text-ink-faint transition-colors hover:text-ink',
        )}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
