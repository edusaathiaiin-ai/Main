/**
 * supabase/functions/pause-subscription/index.ts
 *
 * Auth-protected POST — pauses a user's Razorpay subscription.
 *
 * Body: { pauseDays: 7 | 14 | 30 | 60 }
 *
 * Validates:
 *   - User must be authenticated
 *   - Subscription must be active
 *   - Max 2 pauses per calendar year
 *   - pauseDays must be 7, 14, 30, or 60
 *
 * Side-effects:
 *   - Calls Razorpay POST /v1/subscriptions/{id}/pause
 *   - Updates profiles: subscription_status, pause_until, pause_count_this_year
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL               = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RAZORPAY_KEY_ID            = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET        = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

const ALLOWED_PAUSE_DAYS = new Set([7, 14, 30, 60]);
const MAX_PAUSES_PER_YEAR = 2;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

type ProfileRow = {
  id: string;
  razorpay_subscription_id: string | null;
  subscription_status: string;
  pause_count_this_year: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let pauseDays: number;
  try {
    const body = await req.json() as { pauseDays?: unknown };
    pauseDays = Number(body.pauseDays);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!ALLOWED_PAUSE_DAYS.has(pauseDays)) {
    return json({ error: 'pauseDays must be 7, 14, 30, or 60' }, 400);
  }

  // ── Load profile ──────────────────────────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profileData, error: profileError } = await admin
    .from('profiles')
    .select('id, razorpay_subscription_id, subscription_status, pause_count_this_year')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    return json({ error: 'Profile not found' }, 404);
  }

  const profile = profileData as ProfileRow;

  if (profile.subscription_status !== 'active') {
    return json({ error: 'Subscription is not active' }, 422);
  }

  if (!profile.razorpay_subscription_id) {
    return json({ error: 'No Razorpay subscription linked' }, 422);
  }

  if (profile.pause_count_this_year >= MAX_PAUSES_PER_YEAR) {
    return json({
      error: `You can only pause ${MAX_PAUSES_PER_YEAR} times per year. Limit reached.`,
    }, 422);
  }

  // ── Call Razorpay pause API ───────────────────────────────────────────────
  const rzpCredentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const rzpRes = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${profile.razorpay_subscription_id}/pause`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${rzpCredentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pause_at: 'now' }),
    }
  );

  if (!rzpRes.ok) {
    const rzpErr = await rzpRes.json().catch(() => ({})) as { error?: { description?: string } };
    console.error('pause-subscription: Razorpay error', JSON.stringify(rzpErr));
    return json({
      error: rzpErr?.error?.description ?? 'Razorpay pause failed',
    }, 502);
  }

  // ── Update profile ────────────────────────────────────────────────────────
  const pauseUntil = new Date(Date.now() + pauseDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      subscription_status: 'paused',
      pause_until: pauseUntil,
      pause_count_this_year: profile.pause_count_this_year + 1,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('pause-subscription: profile update failed', updateError.message);
    return json({ error: 'Profile update failed' }, 500);
  }

  console.log(`pause-subscription: user ${user.id} paused for ${pauseDays} days until ${pauseUntil}`);

  return json({ ok: true, pauseUntil, pauseDays });
});
