import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // ── Auth — student JWT ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { phone, message, boardName, saathiSlug } = await req.json();
  if (!phone || !message) {
    return new Response(JSON.stringify({ error: 'phone and message required' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Verify user owns this phone number ────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from('profiles')
    .select('wa_phone')
    .eq('id', user.id)
    .single();

  if (profile?.wa_phone !== phone) {
    return new Response(JSON.stringify({ error: 'Phone number does not match profile' }), {
      status: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Rate limit — max 10 sends per student per day ──────────────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  // Shift to IST midnight: UTC 18:30 previous day
  todayStart.setTime(todayStart.getTime() - 5.5 * 60 * 60 * 1000);

  const { count } = await admin
    .from('whatsapp_sends')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('sent_at', todayStart.toISOString());

  if ((count ?? 0) >= 10) {
    return new Response(
      JSON.stringify({ error: 'rate_limit', message: 'Daily limit reached — max 10 sends per day' }),
      { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  // ── Send via WhatsApp Cloud API ───────────────────────────────────────────
  const cleanPhone = phone.replace(/\D/g, '');

  const waRes = await fetch(
    `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message.slice(0, 4096) },
      }),
    }
  );

  let waBody: Record<string, unknown> = {};
  try { waBody = await waRes.json(); } catch { /* not JSON */ }

  // Log full response for debugging
  console.log('[send-to-phone] WhatsApp response:', waRes.status, JSON.stringify(waBody));

  if (!waRes.ok) {
    const errCode = (waBody as { error?: { code?: number } })?.error?.code;
    console.error('[send-to-phone] WhatsApp API error:', JSON.stringify(waBody));

    if (errCode === 131047) {
      return new Response(JSON.stringify({
        error: 'outside_window',
        message: 'Open WhatsApp Saathi to activate sending, then try again.',
      }), {
        status: 422,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Send failed', detail: waBody }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Check for errors inside 200 response (Meta sometimes accepts but won't deliver)
  const messages = (waBody as { messages?: Array<{ message_status?: string }> })?.messages;
  if (messages?.[0]?.message_status === 'failed') {
    console.error('[send-to-phone] Message accepted but failed:', JSON.stringify(waBody));
    return new Response(JSON.stringify({
      error: 'outside_window',
      message: 'Message could not be delivered. Send "Hi" to +91 98255 93204 on WhatsApp first.',
    }), {
      status: 422,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Log the send (non-blocking) ───────────────────────────────────────────
  admin.from('whatsapp_sends').insert({
    user_id: user.id,
    type: 'chat_note',
    saathi_slug: saathiSlug ?? null,
    board_name: boardName ?? null,
    sent_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {});

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
