import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const currentSessionId = session?.access_token?.slice(-20) ?? 
      crypto.randomUUID();

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

    // Detect forced logout needed
    const existingSession = profile?.active_session_id;
    const isNewDevice = existingSession && 
      existingSession !== currentSessionId;
    
    let forcedLogoutCount = profile?.forced_logout_count ?? 0;

    if (isNewDevice && maxSessions === 1) {
      // Revoke all other sessions
      await admin.auth.admin.signOut(user.id, 'others' as never);
      forcedLogoutCount += 1;
    }

    // Abuse detection — flag if too many forced logouts
    if (forcedLogoutCount > 5) {
      await admin.from('moderation_flags').insert({
        reporter_user_id: user.id,
        target_type: 'account_sharing',
        target_id: user.id,
        reason: 'multiple_device_forced_logout',
        status: 'pending',
      });
    }

    // Abuse detection — too many logins today
    if (sessionCountToday > 10) {
      return new Response(
        JSON.stringify({ 
          error: 'too_many_sessions',
          message: 'Too many login attempts today. Try again tomorrow.'
        }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

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
