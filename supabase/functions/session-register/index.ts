import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';


// Max sessions by plan
const MAX_SESSIONS: Record<string, number> = {
  'free': 1,
  'plus-monthly': 1,
  'plus-annual': 1,
  'pro-monthly': 2,
  'pro-annual': 2,
  'unlimited': 3,
};

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = 
      await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body
    type RequestBody = { 
      deviceInfo?: { 
        platform?: string; 
        model?: string; 
        os?: string; 
      } 
    };
    const body = await req.json() as RequestBody;
    const deviceInfo = body.deviceInfo ?? {};

    // Get current session from JWT
    const { data: { session } } = await userClient.auth.getSession();
    // Use the JWT's stable session_id claim instead of access token suffix.
    // The access token changes on every refresh; session_id stays constant
    // for the entire login session across all token refreshes.
    let currentSessionId: string = crypto.randomUUID();
    if (session?.access_token) {
      try {
        const b64 = session.access_token.split('.')[1] ?? '';
        const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
        const payload = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
        currentSessionId = (payload.session_id as string) ?? currentSessionId;
      } catch { /* use random UUID fallback */ }
    }

    // Get profile
    const { data: profile } = await admin
      .from('profiles')
      .select(
        'plan_id, active_session_id, forced_logout_count, ' +
        'session_count_today, session_date_ist'
      )
      .eq('id', user.id)
      .single();

    const planId = profile?.plan_id ?? 'free';
    const maxSessions = MAX_SESSIONS[planId] ?? 1;
    const todayIST_ = todayIST();

    // Reset daily count if new day
    const sessionCountToday = 
      profile?.session_date_ist === todayIST_
        ? (profile?.session_count_today ?? 0) + 1
        : 1;

    const forcedLogoutCount = profile?.forced_logout_count ?? 0;
    const isNewDevice = profile?.active_session_id !== currentSessionId;

    // Update profile
    await admin.from('profiles').update({
      active_session_id: currentSessionId,
      active_device_info: {
        ...deviceInfo,
        last_seen_at: new Date().toISOString(),
      },
      last_login_at: new Date().toISOString(),
      forced_logout_count: forcedLogoutCount,
      session_count_today: sessionCountToday,
      session_date_ist: todayIST_,
      login_count: (profile as Record<string, number>)?.login_count 
        ? (profile as Record<string, number>).login_count + 1 
        : 1,
    }).eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        deviceRegistered: true,
        forcedLogout: isNewDevice && maxSessions === 1,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
