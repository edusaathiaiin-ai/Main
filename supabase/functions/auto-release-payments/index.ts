/**
 * supabase/functions/auto-release-payments/index.ts
 *
 * Admin-triggered endpoint (or cron) that releases faculty session payouts.
 *
 * Calls the existing release_faculty_payout(session_id) RPC (084_release_payout_rpc.sql),
 * then sends T13 edusaathiai_faculty_payout_released to the faculty on WhatsApp.
 *
 * Body:  { sessionId: string, upiId?: string }
 * Auth:  Bearer SUPABASE_CRON_SECRET (admin only, not user JWT)
 *
 * T13 — edusaathiai_faculty_payout_released
 * {{1}} faculty firstName
 * {{2}} topic
 * {{3}} session date (formatted as 14 April 2026)
 * {{4}} earnings formatted as ₹400 (net, after 20% platform fee)
 * {{5}} total fee formatted as ₹500 (gross)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName, fmtDate, fmtPaise } from '../_shared/whatsapp.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET') ?? '';

const LOG = 'auto-release-payments';

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Admin auth ───────────────────────────────────────────────────────────────
  if (CRON_SECRET) {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json() as { sessionId?: unknown; upiId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : null;
    const upiId     = typeof body.upiId === 'string' ? body.upiId.trim() : null;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Call the atomic payout RPC ────────────────────────────────────────────
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      'release_faculty_payout',
      { p_session_id: sessionId, p_upi_id: upiId ?? null },
    ) as { data: { ok: boolean; error?: string; payout_id?: string; net_paise?: number; tds_paise?: number } | null; error: unknown };

    if (rpcError || !rpcResult?.ok) {
      const reason = rpcResult?.error ?? (rpcError instanceof Error ? rpcError.message : String(rpcError));
      console.error(`${LOG}: RPC failed for session ${sessionId}: ${reason}`);
      return new Response(JSON.stringify({ error: reason }), {
        status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const netPaise = rpcResult.net_paise ?? 0;

    // ── Fetch session + faculty details for WA notification ───────────────────
    const { data: sessRow } = await admin
      .from('faculty_sessions')
      .select(`
        scheduled_at, topic, faculty_payout_paise,
        faculty:profiles!faculty_sessions_faculty_id_fkey(full_name, wa_phone)
      `)
      .eq('id', sessionId)
      .single();

    const faculty     = (sessRow?.faculty as Record<string, unknown> | null);
    const facultyName = (faculty?.full_name as string | null) ?? 'Faculty';
    const facultyWa   = (faculty?.wa_phone  as string | null);
    const topic       = (sessRow?.topic      as string | null) ?? 'Session';
    const scheduledAt = (sessRow?.scheduled_at as string | null) ?? new Date().toISOString();
    const grossPaise  = (sessRow?.faculty_payout_paise as number | null) ?? 0;

    // T13 — edusaathiai_faculty_payout_released
    // {{1}} faculty firstName, {{2}} topic, {{3}} session date,
    // {{4}} earnings (net), {{5}} total fee (gross)
    if (facultyWa) {
      void sendWhatsAppTemplate({
        templateName: 'edusaathiai_faculty_payout_released',
        to: stripPhone(facultyWa),
        params: [
          firstName(facultyName),
          topic,
          fmtDate(scheduledAt),
          fmtPaise(netPaise),
          fmtPaise(grossPaise),
        ],
        logPrefix: LOG,
      });
    }

    console.log(`${LOG}: payout released — session=${sessionId}, net=${fmtPaise(netPaise)}, wa=${facultyWa ? 'sent' : 'skipped'}`);

    return new Response(
      JSON.stringify({ ok: true, payoutId: rpcResult.payout_id, netPaise }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error(`${LOG}: unhandled error`, err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
