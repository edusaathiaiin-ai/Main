'use client'

import { ActionModal } from '@/components/ui/ActionModal'
import { markPayoutPaid } from './actions'

export function MarkAsPaidButton({
  payoutId,
  facultyName,
  netRupees,
  upiId,
}: {
  payoutId:   string
  facultyName: string
  netRupees:   string   // formatted, e.g. "₹4,500"
  upiId:       string | null
}) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          💰 Mark as Paid
        </button>
      }
      title={`Mark paid: ${facultyName}`}
      description={`Confirm you've transferred ${netRupees} to ${upiId ?? 'their UPI on file'}.`}
      confirmLabel="Confirm Payment"
      action={async (fd) => {
        fd.set('payout_id', payoutId)
        await markPayoutPaid(fd)
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            UPI reference <span className="text-slate-600">(recommended)</span>
          </label>
          <input
            name="upi_reference"
            placeholder="e.g. 426512345678"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Faculty sees this on their payout receipt.
          </p>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            Internal note <span className="text-slate-600">(optional)</span>
          </label>
          <input
            name="note"
            placeholder="e.g. Paid via PhonePe, confirmed by SMS"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Never shown to faculty — kept in admin audit log.
          </p>
        </div>
      </div>
    </ActionModal>
  )
}
