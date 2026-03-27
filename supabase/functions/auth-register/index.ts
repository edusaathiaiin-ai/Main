import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const deviceId = body.deviceId?.trim() ?? '';

    if (action === 'precheck') {
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

    const fullNameRaw = user.user_metadata?.full_name;
    const fullName = typeof fullNameRaw === 'string' && fullNameRaw.trim().length > 0
      ? fullNameRaw.trim().slice(0, 120)
      : null;

    const { data: existing, error: existingError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingError) {
      return new Response(JSON.stringify({ error: existingError.message }), {
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

      const { data: updated, error: updateError } = await admin
        .from('profiles')
        .update({
          email,
          full_name: existing.full_name ?? fullName,
          device_id: nextDevice,
          registration_ip: nextIp,
          country_code: nextCountry,
          is_geo_limited: nextGeoLimited,
          registered_at: existing.registered_at ?? new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
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
        role: null,
        device_id: deviceId || null,
        registration_ip: ip,
        country_code: countryCode,
        is_geo_limited: isGeoLimited,
        registered_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('idx_profiles_device_id_unique') || msg.includes('duplicate key')) {
        return new Response(JSON.stringify({ error: 'Account exists on this device' }), {
          status: 409,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ profile: created }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
