/**
 * supabase/functions/resume-subscription/index.ts
 *
 * Auth-protected POST — resumes a paused Razorpay subscription.
 * Called either by the user manually or by the daily auto-resume cron.
 *
 * The cron uses the service role key directly and passes userId in body.
 * User calls pass a bearer token to authenticate themselves.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RAZORPAY_KEY_ID           = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET       = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';


type ProfileRow = {
  id: string;
  razorpay_subscription_id: string | null;
  subscription_status: string;
};

async function resumeUser(admin: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const { data: profileData } = await admin
    .from('profiles')
    .select('id, razorpay_subscription_id, subscription_status')
    .eq('id', userId)
    .single();

  if (!profileData) throw new Error(`Profile not found: ${userId}`);
  const profile = profileData as ProfileRow;

  if (profile.subscription_status !== 'paused') return; // idempotent

  const rzpSubId = profile.razorpay_subscription_id;
  if (rzpSubId) {
    const rzpCredentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${rzpSubId}/resume`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${rzpCredentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume_at: 'now' }),
      }
    );
    if (!rzpRes.ok) {
      const rzpErr = await rzpRes.json().catch(() => ({})) as { error?: { description?: string } };
      throw new Error(rzpErr?.error?.description ?? 'Razorpay resume failed');
    }
  }

  await admin
    .from('profiles')
    .update({ subscription_status: 'active', pause_until: null })
    .eq('id', userId);

  console.log(`resume-subscription: resumed user ${userId}`);
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Cron path: x-cron-secret header + optional userId in body ────────────
  const cronHeader = req.headers.get('x-cron-secret');
  if (cronHeader) {
    if (cronHeader !== CRON_SECRET) return json({ error: 'Forbidden' }, 403);

    // Auto-resume all overdue pauses
    const now = new Date().toISOString();
    const { data: paused } = await admin
      .from('profiles')
      .select('id')
      .eq('subscription_status', 'paused')
      .lt('pause_until', now);

    const users = (paused ?? []) as { id: string }[];
    const results = await Promise.allSettled(
      users.map((u) => resumeUser(admin, u.id))
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`resume-subscription cron: resumed ${users.length - failed}/${users.length}`);
    return json({ ok: true, resumed: users.length - failed, failed });
  }

  // ── User-initiated path: bearer token auth ────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  try {
    await resumeUser(admin, user.id);
    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Resume failed';
    console.error('resume-subscription:', message);
    return json({ error: message }, 502);
  }
});
