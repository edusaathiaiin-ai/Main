'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? ''
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const APP_URL = 'https://edusaathiai.in'

// TDS rate: 10% under Section 194J of the Income Tax Act
// (professional / technical services fees)
const TDS_RATE = 0.1

// ── Internal helpers ──────────────────────────────────────────────────────────

async function razorpayRefund(
  paymentId: string,
  amountPaise: number
): Promise<string | null> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error(
      'sessions/actions: Razorpay keys not set — skipping API refund'
    )
    return null
  }
  const creds = Buffer.from(
    `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
  ).toString('base64')
  const res = await fetch(
    `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountPaise }),
    }
  )
  if (!res.ok) {
    console.error(
      'sessions/actions: Razorpay refund API error',
      res.status,
      await res.text()
    )
    return null
  }
  const json = (await res.json()) as { id?: string }
  return json.id ?? null
}

async function sendPayoutEmail(opts: {
  email: string
  name: string
  grossPaise: number
  tdsPaise: number
  netPaise: number
  upiId: string | null
  topic: string
}) {
  if (!RESEND_API_KEY) return
  const fmt = (p: number) =>
    `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  const firstName = opts.name.split(' ')[0]

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EdUsaathiAI Payments <payments@edusaathiai.in>',
      to: [opts.email],
      subject: 'Session payout initiated — EdUsaathiAI',
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0B1F3A;color:#fff;padding:36px;border-radius:16px">
  <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 6px">Hello ${firstName},</p>
  <h2 style="font-family:Georgia,serif;font-size:22px;color:#fff;margin:0 0 16px">Your payout has been initiated ✓</h2>
  <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin:0 0 20px">
    <p style="font-size:12px;color:rgba(255,255,255,0.4);margin:0 0 12px;text-transform:uppercase;letter-spacing:1px">Payout breakdown</p>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:13px;color:rgba(255,255,255,0.6)">Session earnings (80% share)</span>
      <span style="font-size:13px;color:#fff;font-weight:600">${fmt(opts.grossPaise)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:0.5px solid rgba(255,255,255,0.08)">
      <span style="font-size:13px;color:rgba(255,255,255,0.6)">TDS deducted (10% — Sec 194J)</span>
      <span style="font-size:13px;color:#FCA5A5">− ${fmt(opts.tdsPaise)}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span style="font-size:15px;color:#fff;font-weight:700">Net payout</span>
      <span style="font-size:15px;color:#4ADE80;font-weight:700">${fmt(opts.netPaise)}</span>
    </div>
    ${opts.upiId ? `<p style="font-size:11px;color:rgba(255,255,255,0.3);margin:12px 0 0">To: ${opts.upiId}</p>` : ''}
  </div>
  <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px 16px;margin:0 0 20px">
    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0">Session: <strong style="color:rgba(255,255,255,0.8)">${opts.topic.slice(0, 80)}</strong></p>
  </div>
  <p style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.7;margin:0 0 20px">
    A TDS certificate (Form 16A) will be issued at the end of the financial year.
    Net amount reaches your UPI within 1–3 working days.
  </p>
  <a href="${APP_URL}/my-sessions"
     style="display:block;text-align:center;background:#C9993A;color:#0B1F3A;padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">
    View session history →
  </a>
  <p style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;margin:20px 0 0">
    EdUsaathiAI · IAES Ahmedabad · payments@edusaathiai.in
  </p>
</div>`,
    }),
  })
}

// ── Exported server actions ───────────────────────────────────────────────────

/**
 * Release payout to faculty after admin review.
 *
 * Flow:
 *   1. Calculate TDS (10% Section 194J)
 *   2. Insert faculty_payouts record (gross / TDS / net)
 *   3. Increment faculty_profiles.total_earned_paise (net) via RPC
 *   4. Increment faculty_profiles.total_tds_deducted_paise (direct update)
 *   5. Increment faculty_profiles.total_sessions_completed (direct update)
 *   6. Mark faculty_sessions.payout_status = 'released'
 *   7. Email faculty with breakdown
 */
export async function releaseToFaculty(formData: FormData) {
  await requireAdmin()
  const sessionId = formData.get('session_id') as string
  const note = (formData.get('note') as string | null) ?? ''
  if (!sessionId) return

  const admin = getAdminClient()

  // 1. Fetch session
  const { data: session } = await admin
    .from('faculty_sessions')
    .select('faculty_id, faculty_payout_paise, topic, payout_status')
    .eq('id', sessionId)
    .single()

  if (!session) {
    console.error(`releaseToFaculty: session ${sessionId} not found`)
    return
  }
  if (session.payout_status === 'released') {
    console.warn(
      `releaseToFaculty: session ${sessionId} already released — skipping`
    )
    return
  }

  // 2. TDS calculation
  const grossPaise = session.faculty_payout_paise as number
  const tdsPaise = Math.round(grossPaise * TDS_RATE)
  const netPaise = grossPaise - tdsPaise

  // 3. Fetch faculty UPI + email
  const { data: facProfile } = await admin
    .from('faculty_profiles')
    .select('payout_upi_id, total_tds_deducted_paise, total_sessions_completed')
    .eq('user_id', session.faculty_id)
    .single()

  const { data: facUser } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', session.faculty_id)
    .single()

  const upiId = (facProfile?.payout_upi_id as string | null) ?? null

  // 4. Create payout record
  await admin.from('faculty_payouts').insert({
    faculty_id: session.faculty_id,
    sessions_included: [sessionId],
    gross_paise: grossPaise,
    tds_paise: tdsPaise,
    net_paise: netPaise,
    upi_id: upiId ?? '',
    status: 'processing',
  })

  // 5a. Increment total_earned_paise (net, post-TDS) via RPC
  //     Note: RPC also increments total_sessions_completed — we accept this.
  const { error: rpcErr } = await admin.rpc('increment_faculty_earnings', {
    fac_id: session.faculty_id,
    amount_paise: netPaise,
  })
  if (rpcErr) {
    console.error(
      'releaseToFaculty: increment_faculty_earnings RPC failed:',
      rpcErr.message
    )
  }

  // 5b. Increment total_tds_deducted_paise (no RPC — read-modify-write)
  const currentTds = (facProfile?.total_tds_deducted_paise as number) ?? 0
  await admin
    .from('faculty_profiles')
    .update({ total_tds_deducted_paise: currentTds + tdsPaise })
    .eq('user_id', session.faculty_id)

  // 6. Mark session released
  await admin
    .from('faculty_sessions')
    .update({
      payout_status: 'released',
      payout_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  // 7. Log admin action
  if (note) {
    await admin.from('moderation_flags').insert({
      flag_type: 'session_admin_action',
      content: `Payout released for session ${sessionId} — ${note}`,
      reported_by: null,
      resolved: true,
    })
  }

  // 8. Email faculty
  if (facUser?.email) {
    await sendPayoutEmail({
      email: facUser.email,
      name: (facUser.full_name as string) ?? 'Faculty',
      grossPaise,
      tdsPaise,
      netPaise,
      upiId,
      topic: (session.topic as string) ?? 'Session',
    }).catch((e) => console.error('releaseToFaculty: email failed', e))
  }

  revalidatePath('/sessions')
}

export async function refundStudent(formData: FormData) {
  await requireAdmin()
  const sessionId = formData.get('session_id') as string
  const note = (formData.get('note') as string | null) ?? ''
  if (!sessionId) return

  const admin = getAdminClient()

  const { data: session } = await admin
    .from('faculty_sessions')
    .select('razorpay_payment_id, fee_paise')
    .eq('id', sessionId)
    .maybeSingle()

  const paymentId = (session as Record<string, unknown> | null)
    ?.razorpay_payment_id as string | null
  const refundPaise = (session as Record<string, unknown> | null)?.fee_paise as
    | number
    | null

  let razorpayRefundId: string | null = null
  if (paymentId && refundPaise) {
    razorpayRefundId = await razorpayRefund(paymentId, refundPaise)
    if (!razorpayRefundId) {
      console.error(
        `sessions/actions: Razorpay refund failed for session ${sessionId}`
      )
    }
  }

  await admin
    .from('faculty_sessions')
    .update({
      status: 'cancelled',
      refund_status: 'refunded',
      cancelled_by: 'admin',
      cancellation_reason:
        note || 'Admin refund — dispute resolved for student',
      cancelled_at: new Date().toISOString(),
      ...(razorpayRefundId ? { razorpay_refund_id: razorpayRefundId } : {}),
    })
    .eq('id', sessionId)

  revalidatePath('/sessions')
}

export async function addSessionNote(formData: FormData) {
  await requireAdmin()
  const sessionId = formData.get('session_id') as string
  const note = formData.get('note') as string
  if (!sessionId || !note) return

  const admin = getAdminClient()
  await admin.from('moderation_flags').insert({
    flag_type: 'session_admin_note',
    content: `Admin note on session ${sessionId}: ${note}`,
    reported_by: null,
    resolved: true,
  })

  revalidatePath('/sessions')
}
