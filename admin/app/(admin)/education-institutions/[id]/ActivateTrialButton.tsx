'use client'

import { useActionState } from 'react'
import { activateTrial } from '../actions'
import type { ActivateResult } from '../result'

/**
 * Activate Trial gets its own button (not the generic ActionButton) because
 * it now provisions the principal's login + sends an email — operations that
 * can partially fail. useActionState surfaces the outcome inline so the
 * admin sees whether the principal was actually invited, instead of a
 * silent flip. On failure the institution stays `pending` (see actions.ts).
 */
export function ActivateTrialButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState<
    ActivateResult,
    FormData
  >(activateTrial, null)

  return (
    <div className="flex flex-col gap-1.5">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Activating…' : 'Activate Trial · 7 days'}
        </button>
      </form>
      {state && (
        <p
          className={`max-w-xs text-xs font-medium ${
            state.ok ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  )
}
