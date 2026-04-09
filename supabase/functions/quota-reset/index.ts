/**
 * supabase/functions/quota-reset/index.ts
 *
 * Quota Reset Edge Function — runs via cron at midnight IST daily.
 * Resets expired cooling periods and clears yesterday's message counts
 * so users start fresh each day.
 *
 * Two reset operations:
 *  1. Clear message_count to 0 for all rows where quota_date_ist < today IST
 *  2. Clear cooling_until for all rows where cooling_until is in the past
 *
 * Also performs cleanup: delete chat_session rows older than 90 days.
 *
 * Trigger via Supabase cron:
 *   select cron.schedule('quota-reset-daily', '30 18 * * *', $$
 *     select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/quota-reset',
 *       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
 *     );
 *   $$);
 *   (18:30 UTC = 00:00 IST = midnight IST)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000); // UTC+5:30
  return ist.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret')
      ?? new URL(req.url).searchParams.get('cron_secret')
    const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '')
    const isAuthed   = (cronSecret === Deno.env.get('CRON_SECRET'))
                    || (authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = todayIST();
    const now = new Date().toISOString();

    const results: Record<string, unknown> = {};

    // 1. Reset message counts for yesterday's quota rows
    //    (quota_date_ist is set by the chat Edge Function as the IST date of the session)
    const { error: resetCountError, count: resetCount } = await admin
      .from('chat_sessions')
      .update({ message_count: 0 })
      .lt('quota_date_ist', today)
      .gt('message_count', 0)
      .select('id', { count: 'exact', head: true });

    if (resetCountError) {
      results.resetCountError = resetCountError.message;
    } else {
      results.messageCountsReset = resetCount ?? 0;
    }

    // 2. Clear expired cooling_until timestamps
    const { error: coolingError, count: coolingCount } = await admin
      .from('chat_sessions')
      .update({ cooling_until: null })
      .lt('cooling_until', now)
      .not('cooling_until', 'is', null)
      .select('id', { count: 'exact', head: true });

    if (coolingError) {
      results.coolingError = coolingError.message;
    } else {
      results.coolingPeriodsCleared = coolingCount ?? 0;
    }

    // 3. Hard delete chat_session rows older than 90 days (housekeeping)
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupError, count: cleanupCount } = await admin
      .from('chat_sessions')
      .delete()
      .lt('created_at', cutoff90)
      .select('id', { count: 'exact', head: true });

    if (cleanupError) {
      results.cleanupError = cleanupError.message;
    } else {
      results.oldSessionsDeleted = cleanupCount ?? 0;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        runAt: now,
        todayIST: today,
        ...results,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
