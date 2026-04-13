/**
 * supabase/functions/faculty-verify/index.ts
 *
 * Admin-only endpoint called when an admin marks a faculty as verified.
 *
 * 1. Sets faculty_profiles.verified_at = now() for the given user_id
 * 2. Sets faculty_profiles.is_verified = true
 * 3. Sends T14 edusaathiai_faculty_verified to the faculty's wa_phone
 * 4. Returns { ok: true }
 *
 * Body: { facultyId: string }   ← profiles.id (UUID)
 * Auth: Bearer SUPABASE_CRON_SECRET (admin only)
 *
 * T14 — edusaathiai_faculty_verified
 * {{1}} faculty firstName
 * {{2}} primary Saathi name (from verticals table via profiles.primary_saathi_id)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName } from '../_shared/whatsapp.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET') ?? '';

const LOG = 'faculty-verify';

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
    const body = await req.json() as { facultyId?: unknown };
    const facultyId = typeof body.facultyId === 'string' ? body.facultyId.trim() : null;

    if (!facultyId) {
      return new Response(JSON.stringify({ error: 'facultyId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Mark faculty as verified ───────────────────────────────────────────────
    const { error: fpErr } = await admin
      .from('faculty_profiles')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      })
      .eq('user_id', facultyId);

    if (fpErr) {
      console.error(`${LOG}: faculty_profiles update failed for ${facultyId}`, fpErr.message);
      return new Response(JSON.stringify({ error: fpErr.message }), {
        status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch profile + primary Saathi name ───────────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select(`
        full_name, wa_phone,
        primary_saathi:verticals!profiles_primary_saathi_id_fkey(name)
      `)
      .eq('id', facultyId)
      .single();

    const facultyName  = (profile?.full_name  as string | null) ?? 'Faculty';
    const facultyWa    = (profile?.wa_phone   as string | null);
    const saathiObj    = (profile?.primary_saathi as Record<string, unknown> | null);
    const saathiName   = (saathiObj?.name as string | null) ?? 'EdUsaathiAI';

    // T14 — edusaathiai_faculty_verified
    // {{1}} faculty firstName, {{2}} primary Saathi name
    if (facultyWa) {
      void sendWhatsAppTemplate({
        templateName: 'edusaathiai_faculty_verified',
        to: stripPhone(facultyWa),
        params: [firstName(facultyName), saathiName],
        logPrefix: LOG,
      });
    } else {
      console.log(`${LOG}: faculty ${facultyId} has no wa_phone — WA skipped`);
    }

    console.log(`${LOG}: faculty ${facultyId} (${facultyName}) verified — WA=${facultyWa ? 'sent' : 'skipped'}`);

    return new Response(
      JSON.stringify({ ok: true, facultyId, saathiName }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error(`${LOG}: unhandled error`, err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
