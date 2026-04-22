import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Faculty self-service payout release for a completed live_session.
 *
 * POST /api/faculty/payouts/release
 * Body: { sessionId: string, upiId?: string }
 *
 * Auth: JWT, faculty must own the session.
 *
 * Wraps release_live_session_payout() RPC (migration 132).
 * The RPC enforces: session exists, payout_status='pending', all
 * lectures are completed/cancelled, and computes 20% platform fee +
 * 10% TDS over ₹300 net automatically.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { sessionId?: string; upiId?: string }
  const sessionId = body.sessionId?.trim()
  const upiId     = body.upiId?.trim() || null
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Verify faculty owns the session
  const { data: sess } = await admin
    .from('live_sessions')
    .select('faculty_id, status')
    .eq('id', sessionId)
    .maybeSingle()
  if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (sess.faculty_id !== user.id) return NextResponse.json({ error: 'Not your session' }, { status: 403 })
  if (sess.status !== 'completed') {
    return NextResponse.json({ error: 'Session is not completed yet' }, { status: 400 })
  }

  // Persist UPI on faculty_profiles if provided (so future payouts auto-fill)
  if (upiId) {
    await admin
      .from('faculty_profiles')
      .update({ payout_upi_id: upiId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  const { data, error } = await admin.rpc('release_live_session_payout', {
    p_session_id: sessionId,
    p_upi_id:     upiId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result = data as { ok: boolean; error?: string; net_paise?: number; payout_id?: string }
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'release_failed' }, { status: 400 })

  return NextResponse.json(result)
}
