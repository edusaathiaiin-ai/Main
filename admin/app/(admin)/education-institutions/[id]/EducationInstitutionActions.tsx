'use client'

import { useState } from 'react'
import {
  markDemoScheduled,
  activateTrial,
  extendTrial,
  activateBilling,
  suspendEducationInstitution,
  markChurned,
} from '../actions'

type Status =
  | 'pending'
  | 'demo'
  | 'trial'
  | 'active'
  | 'suspended'
  | 'churned'

type Props = {
  id: string
  status: Status
  principalEmail: string | null
}

/**
 * Status control surface. Each button is a `form action={serverAction}` so we
 * keep the progressive-enhancement guarantee — works even if JS is blocked.
 * Destructive actions (Suspend, Churn) open a reason prompt before firing;
 * everything else posts straight through.
 */
export function EducationInstitutionActions({ id, status }: Props) {
  const [confirmMode, setConfirmMode] = useState<'suspend' | 'churn' | null>(
    null
  )
  const [reason, setReason] = useState('')

  // Which transitions are available from the current status?
  const canMarkDemo = status === 'pending'
  const canActivateTrial = status === 'pending' || status === 'demo'
  const canExtendTrial = status === 'trial'
  const canActivateBilling = status === 'trial' || status === 'suspended'
  const canSuspend = status === 'trial' || status === 'active'
  const canChurn =
    status === 'trial' ||
    status === 'active' ||
    status === 'suspended' ||
    status === 'demo' ||
    status === 'pending'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h2 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4">
        Status controls
      </h2>

      <div className="flex flex-wrap gap-2.5">
        {canMarkDemo && (
          <ActionButton action={markDemoScheduled} id={id} tone="blue">
            Mark Demo Scheduled
          </ActionButton>
        )}
        {canActivateTrial && (
          <ActionButton action={activateTrial} id={id} tone="amber">
            Activate Trial · 7 days
          </ActionButton>
        )}
        {canExtendTrial && (
          <ActionButton action={extendTrial} id={id} tone="amber-soft">
            Extend Trial · +7 days
          </ActionButton>
        )}
        {canActivateBilling && (
          <ActionButton action={activateBilling} id={id} tone="emerald">
            Activate Billing
          </ActionButton>
        )}
        {canSuspend && (
          <button
            onClick={() => {
              setConfirmMode('suspend')
              setReason('')
            }}
            className="bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Suspend
          </button>
        )}
        {canChurn && (
          <button
            onClick={() => {
              setConfirmMode('churn')
              setReason('')
            }}
            className="bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Mark Churned
          </button>
        )}
      </div>

      {confirmMode && (
        <form
          action={confirmMode === 'suspend' ? suspendEducationInstitution : markChurned}
          className="mt-4 pt-4 border-t border-slate-800"
        >
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-slate-300 mb-3">
            {confirmMode === 'suspend'
              ? 'Reason for suspension (appended to admin notes with timestamp):'
              : 'Reason for churn (appended to admin notes with timestamp):'}
          </p>
          <textarea
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Optional — but helpful for future-you"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-2.5 mt-3">
            <button
              type="submit"
              className={
                confirmMode === 'suspend'
                  ? 'bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl px-5 py-2 text-sm transition-colors'
                  : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl px-5 py-2 text-sm transition-colors'
              }
            >
              Confirm {confirmMode === 'suspend' ? 'suspension' : 'churn'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmMode(null)}
              className="text-slate-400 hover:text-white text-sm px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Inline button ───────────────────────────────────────────────────────────

function ActionButton({
  action,
  id,
  tone,
  children,
}: {
  action: (formData: FormData) => Promise<void>
  id: string
  tone: 'blue' | 'amber' | 'amber-soft' | 'emerald'
  children: React.ReactNode
}) {
  const toneClass: Record<typeof tone, string> = {
    blue: 'bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25',
    amber:
      'bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-500',
    'amber-soft':
      'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25',
    emerald:
      'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30',
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${toneClass[tone]}`}
      >
        {children}
      </button>
    </form>
  )
}
