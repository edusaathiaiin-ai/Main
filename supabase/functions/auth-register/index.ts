import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { isOneOf } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { safeError } from '../_shared/errors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const BLOCKED_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'trashmail.com',
];


type RequestBody = {
  action?: 'precheck' | 'register_profile';
  email?: string;
  deviceId?: string;
};

function extractCountryCode(req: Request): string | null {
  const cfCountry = req.headers.get('cf-ipcountry')?.trim().toUpperCase();
  if (cfCountry && cfCountry.length === 2) return cfCountry;

  const vercelCountry = req.headers.get('x-vercel-ip-country')?.trim().toUpperCase();
  if (vercelCountry && vercelCountry.length === 2) return vercelCountry;

  return null;
}

function isGeoLimitedCountry(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return countryCode !== 'IN';
}

function extractDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return '';
  return normalized.slice(at + 1);
}

function extractClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return null;
  const first = xff.split(',')[0]?.trim();
  return first || null;
}

async function isDisposableDomain(admin: ReturnType<typeof createClient>, email: string): Promise<boolean> {
  const domain = extractDomain(email);
  if (!domain) return true;

  if (BLOCKED_DOMAINS.includes(domain)) return true;

  const { data, error } = await admin
    .from('disposable_email_domains')
    .select('domain')
    .eq('domain', domain)
    .maybeSingle();

  if (error) {
    // Fail closed on table read issues to prevent abuse bypass.
    return true;
  }

  return Boolean(data);
}

function isValidName(name: string): boolean {
  if (!name || name.trim().length < 2) return false
  if (name.trim().length > 40) return false
  if (/^\d+$/.test(name.trim())) return false
  const letters = (name.match(/[a-zA-Z\u0900-\u097F]/g) ?? []).length
  if (letters < 2) return false
  const blocked = ['test','user','admin','guest','demo',
    'na','none','null','abc','xyz','asdf','qwerty',
    'undefined','anon','anonymous','temp']
  if (blocked.includes(name.trim().toLowerCase())) return false
  return true
}

async function deviceExists(admin: ReturnType<typeof createClient>, deviceId: string): Promise<boolean> {
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  if (error) {
    return true;
  }

  return (count ?? 0) > 0;
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = (await req.json()) as RequestBody;
    const action = body.action ?? 'precheck';
    if (!isOneOf(action, ['precheck', 'register_profile'] as const)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const deviceId = (body.deviceId?.trim() ?? '').slice(0, 128);

    if (action === 'precheck') {
      // Rate limit precheck by IP — 20 per minute (unauthenticated endpoint)
      const ip = extractClientIp(req) ?? 'unknown';
      const precheckAllowed = await checkRateLimit('auth-precheck', ip, 20, 60);
      if (!precheckAllowed) return rateLimitResponse(CORS_HEADERS);

      // Block device during precheck (new registrations only — user not yet authenticated)
      if (deviceId.length > 0 && (await deviceExists(admin, deviceId))) {
        return new Response(JSON.stringify({ error: 'Account exists on this device' }), {
          status: 409,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const email = body.email?.trim().toLowerCase() ?? '';
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      if (await isDisposableDomain(admin, email)) {
        return new Response(
          JSON.stringify({ error: 'Please use a permanent email address to register.' }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // register_profile path requires authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit register_profile by user ID — 5 per minute
    const registerAllowed = await checkRateLimit('auth-register', user.id, 5, 60);
    if (!registerAllowed) return rateLimitResponse(CORS_HEADERS);

    // Block only if device belongs to a DIFFERENT user (returning users on their own device must pass)
    if (deviceId.length > 0) {
      const { data: deviceOwner } = await admin
        .from('profiles')
        .select('id')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (deviceOwner && (deviceOwner as { id: string }).id !== user.id) {
        return new Response(JSON.stringify({ error: 'Account exists on this device' }), {
          status: 409,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    const email = user.email?.trim().toLowerCase() ?? '';
    if (!email || (await isDisposableDomain(admin, email))) {
      return new Response(
        JSON.stringify({ error: 'Please use a permanent email address to register.' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const ip = extractClientIp(req);
    const countryCode = extractCountryCode(req);
    const isGeoLimited = isGeoLimitedCountry(countryCode);

    // Resolve name — works for both email OTP (body) and Google OAuth (user_metadata)
    const fullNameRaw = user.user_metadata?.full_name ?? user.user_metadata?.name;
    const fullNameCandidate = typeof fullNameRaw === 'string' && fullNameRaw.trim().length > 0
      ? fullNameRaw.trim().slice(0, 120)
      : null;
    const fullName       = fullNameCandidate && isValidName(fullNameCandidate) ? fullNameCandidate : null;
    const needsNameUpdate = fullName === null;

    const { data: existing, error: existingError } = await admin
      .from('profiles')
      .select('id, role, full_name, email, plan_id, subscription_status, primary_saathi_id, is_active, device_id, registration_ip, country_code, is_geo_limited, registered_at')
      .eq('id', user.id)
      .maybeSingle();

    if (existingError) {
      return new Response(JSON.stringify({ error: safeError(existingError, 'Profile lookup failed. Please try again.') }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (existing) {
      const nextDevice = existing.device_id ?? (deviceId || null);
      const nextIp = existing.registration_ip ?? ip;
      const nextCountry = existing.country_code ?? countryCode;
      const nextGeoLimited = typeof existing.is_geo_limited === 'boolean'
        ? existing.is_geo_limited
        : isGeoLimited;

      // Only promote a valid name if the profile doesn't already have one
      const resolvedName = existing.full_name ?? fullName;
      const { data: updated, error: updateError } = await admin
        .from('profiles')
        .update({
          email,
          full_name: resolvedName,
          needs_name_update: resolvedName === null,
          device_id: nextDevice,
          registration_ip: nextIp,
          country_code: nextCountry,
          is_geo_limited: nextGeoLimited,
          registered_at: existing.registered_at ?? new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('id, role, full_name, email, plan_id, subscription_status, primary_saathi_id, is_active, needs_name_update')
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: safeError(updateError, 'Profile update failed. Please try again.') }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ profile: updated }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: created, error: insertError } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email,
        full_name: fullName,
        needs_name_update: needsNameUpdate,
        role: null,
        device_id: deviceId || null,
        registration_ip: ip,
        country_code: countryCode,
        is_geo_limited: isGeoLimited,
        registered_at: new Date().toISOString(),
      })
      .select('id, role, full_name, email, plan_id, subscription_status, primary_saathi_id, is_active, needs_name_update')
      .single();

    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('idx_profiles_device_id_unique') || msg.includes('duplicate key')) {
        return new Response(JSON.stringify({ error: 'Account exists on this device' }), {
          status: 409,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: safeError(insertError, 'Registration failed. Please try again.') }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Fire welcome email — pass user JWT so the function can identify the caller.
    // Non-blocking, never delays registration response.
    fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ profile: created }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: safeError(error, 'An unexpected error occurred. Please try again.') }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
