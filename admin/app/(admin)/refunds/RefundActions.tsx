'use client'

import { useState, useTransition } from 'react'
import { markRefundPaid } from './actions'

export function MarkRefundPaidButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [ref, setRef]   = useState('')
  const [pending, start] = useTransition()
  const [err, setErr]   = useState('')

  function handleSubmit() {
    setErr('')
    const fd = new FormData()
    fd.set('booking_id', bookingId)
    fd.set('upi_reference', ref.trim())
    start(async () => {
      try {
        await markRefundPaid(fd)
        setOpen(false)
        setRef('')
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950"
      >
        Mark paid
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Mark refund as paid</h3>
            <p className="text-xs text-slate-400 mb-4">
              Confirm you've sent the UPI transfer. The bank reference helps if the
              student disputes later.
            </p>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              UPI reference / UTR
            </label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="UPI ref number from your bank"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950"
              >
                {pending ? 'Saving…' : 'Confirm paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
