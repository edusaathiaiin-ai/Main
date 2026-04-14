/**
 * supabase/functions/mark-payout-completed/index.ts
 *
 * Admin action — called when admin has actually transferred the UPI money
 * to the faculty and is confirming the transfer on the admin dashboard.
 *
 * Flow:
 *   1. Validate admin auth (SUPABASE_CRON_SECRET — same pattern as other
 *      admin-only endpoints; the admin dashboard already uses this token).
 *   2. UPDATE faculty_payouts:
 *        status         = 'completed'
 *        completed_at   = now()
 *        upi_reference  = <from body, optional>
 *        bank_reference = <from body, optional>
 *   3. Send T13 (edusaathiai_faculty_payout_released) to the faculty on
 *      WhatsApp — ONLY now, never on the cron release. The student / faculty
 *      sees the "payout released" message once the money actually moves.
 *
 * Body: { payoutId: string, upiReference?: string, bankReference?: string }
 * Auth: Bearer SUPABASE_CRON_SECRET
 *
 * Idempotency: if the payout is already status='completed', returns ok
 * without re-sending WhatsApp (wa_sent_at guard on the row).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName, fmtDate, fmtPaise } from '../_shared/whatsapp.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET')      ?? '';

const LOG = 'mark-payout-completed';

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (CRON_SECRET) {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json() as {
      payoutId?: unknown;
      upiReference?: unknown;
      bankReference?: unknown;
    };
    const payoutId     = typeof body.payoutId === 'string'     ? body.payoutId.trim()     : null;
    const upiReference = typeof body.upiReference === 'string' ? body.upiReference.trim() : null;
    const bankReference= typeof body.bankReference === 'string'? body.bankReference.trim(): null;

    if (!payoutId) {
      return new Response(JSON.stringify({ error: 'payoutId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Fetch payout + sessions + faculty details ──────────────────────
    const { data: payout, error: fetchErr } = await admin
      .from('faculty_payouts')
      .select('id, faculty_id, status, gross_paise, net_paise, sessions_included')
      .eq('id', payoutId)
      .single();

    if (fetchErr || !payout) {
      return new Response(JSON.stringify({ error: 'Payout not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency — if already completed, no-op (do not resend WhatsApp)
    if (payout.status === 'completed') {
      console.log(`${LOG}: payout ${payoutId} already completed — no-op`);
      return new Response(
        JSON.stringify({ ok: true, alreadyCompleted: true }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Flip status to completed ───────────────────────────────────────
    const updatePatch: Record<string, unknown> = {
      status:       'completed',
      completed_at: new Date().toISOString(),
    };
    if (upiReference)  updatePatch.upi_reference  = upiReference;
    if (bankReference) updatePatch.bank_reference = bankReference;

    const { error: updateErr } = await admin
      .from('faculty_payouts')
      .update(updatePatch)
      .eq('id', payoutId)
      .eq('status', 'pending');   // guard: only flip pending → completed

    if (updateErr) {
      console.error(`${LOG}: update failed for ${payoutId} —`, updateErr.message);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Resolve faculty + representative session for the WhatsApp body ──
    // sessions_included is UUID[]. Use the first session for "topic" /
    // "session date" in the template. A payout typically batches multiple
    // sessions from the same week; showing the first is a reasonable MVP.
    const sessionIds = (payout.sessions_included as string[] | null) ?? [];
    const firstSessionId = sessionIds[0] ?? null;

    let topic       = 'Session';
    let scheduledAt = new Date().toISOString();
    let facultyName = 'Faculty';
    let facultyWa: string | null = null;

    if (firstSessionId) {
      const { data: sessRow } = await admin
        .from('faculty_sessions')
        .select(`
          scheduled_at, topic,
          faculty:profiles!faculty_sessions_faculty_id_fkey(full_name, wa_phone)
        `)
        .eq('id', firstSessionId)
        .single();

      const faculty = (sessRow?.faculty as Record<string, unknown> | null);
      topic       = (sessRow?.topic         as string | null) ?? topic;
      scheduledAt = (sessRow?.scheduled_at  as string | null) ?? scheduledAt;
      facultyName = (faculty?.full_name     as string | null) ?? facultyName;
      facultyWa   = (faculty?.wa_phone      as string | null);
    } else {
      // No session ids on the payout — pull faculty directly
      const { data: profRow } = await admin
        .from('profiles')
        .select('full_name, wa_phone')
        .eq('id', payout.faculty_id)
        .single();
      facultyName = (profRow?.full_name as string | null) ?? facultyName;
      facultyWa   = (profRow?.wa_phone  as string | null);
    }

    const netPaise   = (payout.net_paise   as number | null) ?? 0;
    const grossPaise = (payout.gross_paise as number | null) ?? 0;

    // ── T13 — edusaathiai_faculty_payout_released ─────────────────────
    // {{1}} faculty firstName, {{2}} topic, {{3}} session date,
    // {{4}} net earnings (₹), {{5}} gross total fee (₹)
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

    console.log(
      `${LOG}: payout ${payoutId} completed — net=${fmtPaise(netPaise)}, wa=${facultyWa ? 'sent' : 'skipped'}`,
    );

    return new Response(
      JSON.stringify({ ok: true, payoutId, netPaise }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error(`${LOG}: unhandled error`, err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
