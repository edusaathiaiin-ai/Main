'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type CompletedSession = {
  id: string
  title: string
  completed_at: string | null
  payout_status: string
  payout_released_at: string | null
  gross_revenue_paise: number | null
  faculty_payout_paise: number | null
  // computed at runtime if not yet released
  preview_gross_paise: number
  preview_net_paise: number
  preview_tds_paise: number
  paid_count: number
}

type FacultyProfileLite = {
  payout_upi_id: string | null
  total_earned_paise: number
  total_tds_deducted_paise: number
}

type PayoutRow = {
  id: string
  sessions_included: string[]
  gross_paise: number
  tds_paise: number
  net_paise: number
  upi_id: string | null
  status: string
  initiated_at: string
  completed_at: string | null
}

function rupees(paise: number | null | undefined): string {
  return `\u20B9${(((paise ?? 0)) / 100).toLocaleString('en-IN')}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FacultyEarningsPage() {
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [facData, setFacData] = useState<FacultyProfileLite | null>(null)
  const [sessions, setSessions] = useState<CompletedSession[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [upiInput, setUpiInput] = useState('')
  const [releasing, setReleasing] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState('')

  async function load() {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const userId = profile.id

      // Faculty profile (UPI + lifetime totals)
      const { data: fp } = await supabase
        .from('faculty_profiles')
        .select('payout_upi_id, total_earned_paise, total_tds_deducted_paise')
        .eq('user_id', userId)
        .maybeSingle()
      const fac: FacultyProfileLite = {
        payout_upi_id: (fp?.payout_upi_id as string | null) ?? null,
        total_earned_paise: (fp?.total_earned_paise as number | null) ?? 0,
        total_tds_deducted_paise: (fp?.total_tds_deducted_paise as number | null) ?? 0,
      }
      setFacData(fac)
      setUpiInput(fac.payout_upi_id ?? '')

      // Completed live sessions
      const { data: sessRows, error: sessErr } = await supabase
        .from('live_sessions')
        .select('id, title, completed_at, payout_status, payout_released_at, gross_revenue_paise, faculty_payout_paise')
        .eq('faculty_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
      if (sessErr) throw new Error(sessErr.message)
      const sList = (sessRows ?? []) as Omit<CompletedSession, 'preview_gross_paise' | 'preview_net_paise' | 'preview_tds_paise' | 'paid_count'>[]

      // Compute live preview for each pending session: gross from paid bookings.
      const enriched: CompletedSession[] = []
      for (const s of sList) {
        const { count: paidCount } = await supabase
          .from('live_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', s.id)
          .eq('payment_status', 'paid')
        let gross = s.gross_revenue_paise ?? 0
        if (s.payout_status === 'pending' && gross === 0) {
          const { data: bk } = await supabase
            .from('live_bookings')
            .select('amount_paid_paise')
            .eq('session_id', s.id)
            .eq('payment_status', 'paid')
          gross = (bk ?? []).reduce((acc, r) => acc + ((r.amount_paid_paise as number | null) ?? 0), 0)
        }
        const facultyGross = s.faculty_payout_paise ?? Math.round(gross * 0.8)
        const tds = facultyGross > 30000 ? Math.round(facultyGross * 0.1) : 0
        const net = facultyGross - tds
        enriched.push({
          ...s,
          preview_gross_paise: gross,
          preview_net_paise: net,
          preview_tds_paise: tds,
          paid_count: paidCount ?? 0,
        })
      }
      setSessions(enriched)

      // Payouts list
      const { data: pRows } = await supabase
        .from('faculty_payouts')
        .select('id, sessions_included, gross_paise, tds_paise, net_paise, upi_id, status, initiated_at, completed_at')
        .eq('faculty_id', userId)
        .order('initiated_at', { ascending: false })
        .limit(50)
      setPayouts((pRows ?? []) as PayoutRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [profile])

  async function handleRelease(sessionId: string) {
    if (!upiInput.trim()) {
      setActionMsg('Please save your UPI ID before releasing a payout.')
      return
    }
    setReleasing(sessionId)
    setActionMsg('')
    try {
      const res = await fetch('/api/faculty/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, upiId: upiInput.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Release failed')
      setActionMsg(`Released ${rupees(json.net_paise)}. UPI transfer initiated — admin will confirm shortly.`)
      await load()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setReleasing(null)
    }
  }

  const pending = sessions.filter((s) => s.payout_status === 'pending')
  const pendingTotal = pending.reduce((a, s) => a + s.preview_net_paise, 0)

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <nav className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--bg-elevated)' }}>
        <Link href="/faculty" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>
          EdUsaathiAI
        </Link>
        <Link href="/faculty/live" className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          ← Back to sessions
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-playfair mb-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Earnings & Payouts
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          80% of every booking is yours. Platform fee is 20%. TDS 10% applies if a single payout exceeds ₹300.
        </p>

        {loading && <p style={{ color: 'var(--text-tertiary)' }}>Loading…</p>}
        {error && (
          <div className="mb-6 rounded-xl p-4" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
          </div>
        )}

        {!loading && !error && facData && (
          <>
            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Lifetime received',  value: rupees(facData.total_earned_paise),       color: '#15803D' },
                { label: 'TDS deducted',        value: rupees(facData.total_tds_deducted_paise), color: '#A16207' },
                { label: 'Pending release',     value: rupees(pendingTotal),                     color: '#C9993A' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* UPI input */}
            <div
              className="mb-8 rounded-xl p-5"
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                UPI for payouts
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  placeholder="yourname@bank"
                  className="flex-1 rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Saved automatically when you release a payout. We never expose this UPI publicly.
              </p>
            </div>

            {actionMsg && (
              <div className="mb-6 rounded-xl p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-sm" style={{ color: '#166534' }}>{actionMsg}</p>
              </div>
            )}

            {/* Completed sessions */}
            <h2 className="font-playfair mb-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Completed sessions
            </h2>
            {sessions.length === 0 && (
              <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No completed sessions yet. They appear here once a session ends.
              </p>
            )}
            <div className="mb-10 flex flex-col gap-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {s.paid_count} paid student{s.paid_count === 1 ? '' : 's'} · completed {fmtDate(s.completed_at)}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        background: s.payout_status === 'released' ? '#DCFCE7' : 'rgba(201,153,58,0.12)',
                        color:      s.payout_status === 'released' ? '#15803D' : '#C9993A',
                      }}
                    >
                      {s.payout_status === 'released' ? 'Released' : 'Pending'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <Cell label="Gross"        value={rupees(s.preview_gross_paise)} />
                    <Cell label="Platform 20%" value={rupees(Math.round(s.preview_gross_paise * 0.2))} />
                    <Cell label="TDS"          value={rupees(s.preview_tds_paise)} />
                    <Cell label="Net to you"   value={rupees(s.preview_net_paise)} highlight />
                  </div>

                  {s.payout_status === 'pending' && s.preview_net_paise > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRelease(s.id)}
                      disabled={releasing !== null}
                      className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold"
                      style={{
                        background: '#C9993A',
                        color: '#060F1D',
                        opacity: releasing === s.id ? 0.6 : 1,
                        cursor: releasing !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {releasing === s.id ? 'Releasing…' : `Release ${rupees(s.preview_net_paise)}`}
                    </button>
                  )}
                  {s.payout_status === 'released' && s.payout_released_at && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Released on {fmtDate(s.payout_released_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Past payouts */}
            <h2 className="font-playfair mb-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Past payouts
            </h2>
            {payouts.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No payouts initiated yet.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {rupees(p.net_paise)} net
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Initiated {fmtDate(p.initiated_at)} · UPI {p.upi_id || '—'}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: p.status === 'completed' ? '#DCFCE7' : 'rgba(96,165,250,0.12)',
                      color:      p.status === 'completed' ? '#15803D' : '#1D4ED8',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </p>
      <p
        style={{
          color: highlight ? '#15803D' : 'var(--text-primary)',
          fontSize: 14,
          fontWeight: highlight ? 700 : 600,
        }}
      >
        {value}
      </p>
    </div>
  )
}
