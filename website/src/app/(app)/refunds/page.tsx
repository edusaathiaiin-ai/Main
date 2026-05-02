'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type RefundRow = {
  id: string
  amount_paid_paise: number
  refund_status: 'pending' | 'ready' | 'paid'
  refund_upi_id: string | null
  refund_initiated_at: string | null
  refund_reason: string | null
  paid_at: string | null
  // joined session
  session_title: string
  cancelled_at: string | null
}

function rupees(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StudentRefundsPage() {
  const { profile } = useAuthStore()
  const [rows, setRows] = useState<RefundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: qErr } = await supabase
        .from('live_bookings')
        .select(`
          id, amount_paid_paise, refund_status, refund_upi_id,
          refund_initiated_at, refund_reason, paid_at,
          live_sessions!inner(title, cancelled_at)
        `)
        .eq('student_id', profile.id)
        .neq('refund_status', 'none')
        .order('refund_initiated_at', { ascending: false })

      if (qErr) throw new Error(qErr.message)

      const mapped: RefundRow[] = (data ?? []).map((r) => {
        const ls = Array.isArray(r.live_sessions) ? r.live_sessions[0] : r.live_sessions
        return {
          id: r.id,
          amount_paid_paise: r.amount_paid_paise,
          refund_status: r.refund_status,
          refund_upi_id: r.refund_upi_id,
          refund_initiated_at: r.refund_initiated_at,
          refund_reason: r.refund_reason,
          paid_at: r.paid_at,
          session_title: (ls?.title as string) ?? 'Cancelled session',
          cancelled_at: (ls?.cancelled_at as string | null) ?? null,
        }
      })
      setRows(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [profile])

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link href="/" className="font-display text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>
          EdUsaathiAI
        </Link>
        <Link href="/profile" className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          ← Profile
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display mb-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Refunds
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          When a session is cancelled, your booking shows up here. Share your UPI and we'll transfer the refund within 48 hours.
        </p>

        {loading && <p style={{ color: 'var(--text-tertiary)' }}>Loading…</p>}
        {error && (
          <div className="rounded-xl p-4" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No refunds pending. Your bookings are all in good shape.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <RefundCard key={r.id} row={r} onUpdated={load} />
          ))}
        </div>
      </div>
    </main>
  )
}

function RefundCard({ row, onUpdated }: { row: RefundRow; onUpdated: () => void }) {
  const [upi, setUpi] = useState(row.refund_upi_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const isPaid = row.refund_status === 'paid'
  const isReady = row.refund_status === 'ready'

  async function handleSubmit() {
    setMsg('')
    setErr('')
    if (!upi.trim()) {
      setErr('Please enter your UPI ID.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/refunds/submit-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: row.id, upiId: upi.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      setMsg('Saved. Admin will transfer your refund within 48 hours.')
      onUpdated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Cancelled session
          </p>
          <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {row.session_title}
          </p>
          {row.cancelled_at && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Cancelled on {fmtDate(row.cancelled_at)}
            </p>
          )}
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: isPaid ? '#DCFCE7' : isReady ? 'rgba(96,165,250,0.15)' : 'rgba(201,153,58,0.15)',
            color:      isPaid ? '#15803D' : isReady ? '#1D4ED8' : '#A16207',
          }}
        >
          {isPaid ? 'Refunded' : isReady ? 'UPI received' : 'Awaiting UPI'}
        </span>
      </div>

      {row.refund_reason && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Reason:</strong> {row.refund_reason}
        </p>
      )}

      <p className="mt-3 text-sm" style={{ color: 'var(--text-primary)' }}>
        Refund amount: <strong>{rupees(row.amount_paid_paise)}</strong>
      </p>

      {!isPaid && (
        <>
          <label className="mt-4 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {isReady ? 'Update your UPI' : 'Your UPI ID'}
            <input
              type="text"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="yourname@bank"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </label>
          {err && <p className="mt-2 text-xs" style={{ color: '#B91C1C' }}>{err}</p>}
          {msg && <p className="mt-2 text-xs" style={{ color: '#15803D' }}>{msg}</p>}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold"
              style={{
                background: '#C9993A',
                color: '#060F1D',
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving…' : isReady ? 'Update UPI' : 'Submit UPI'}
            </button>
          </div>
        </>
      )}

      {isPaid && (
        <p className="mt-3 text-xs" style={{ color: '#15803D' }}>
          Refund of {rupees(row.amount_paid_paise)} sent to your UPI. Thanks for your patience.
        </p>
      )}
    </div>
  )
}
