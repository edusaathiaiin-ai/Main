'use client'

import { useState, useTransition, type ReactNode } from 'react'

interface ActionModalProps {
  trigger: ReactNode
  title: string
  description?: string
  danger?: boolean
  confirmLabel?: string
  /** Server action to call. Receives FormData. */
  action: (formData: FormData) => Promise<void>
  children?: ReactNode // extra form fields
}

export function ActionModal({
  trigger,
  title,
  description,
  danger = false,
  confirmLabel = 'Confirm',
  action,
  children,
}: ActionModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(fd)
      setOpen(false)
    })
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3
              className={`text-base font-bold mb-1 ${
                danger ? 'text-red-400' : 'text-white'
              }`}
            >
              {title}
            </h3>
            {description && (
              <p className="text-sm text-slate-400 mb-4">{description}</p>
            )}
            {danger && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-400">
                ⚠️ This action cannot be undone.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {children}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    danger
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isPending ? 'Working…' : confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
