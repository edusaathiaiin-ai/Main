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

  // Try free-form text first (works inside 24hr window)
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
  console.log('[send-to-phone] WhatsApp response:', waRes.status, JSON.stringify(waBody));

  const errCode = !waRes.ok ? (waBody as { error?: { code?: number } })?.error?.code : null;

  // If outside 24hr window (131047) — fallback to template message
  if (errCode === 131047 || errCode === 131026) {
    console.log('[send-to-phone] Outside window, falling back to template');

    // Truncate content for template parameter (max 1024 chars per param)
    const noteContent = message
      .replace(/📒.*\n─+\n/s, '')
      .replace(/\n─+\n.*$/s, '')
      .trim()
      .slice(0, 900);

    const templateRes = await fetch(
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
          type: 'template',
          template: {
            name: 'edusaathiai_study_notes',
            language: { code: 'en' },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: saathiSlug ?? 'Saathi' },
                { type: 'text', text: boardName ?? 'General' },
                { type: 'text', text: noteContent },
              ],
            }],
          },
        }),
      }
    );

    let templateBody: Record<string, unknown> = {};
    try { templateBody = await templateRes.json(); } catch { /* */ }
    console.log('[send-to-phone] Template response:', templateRes.status, JSON.stringify(templateBody));

    if (templateRes.ok) {
      // Template sent — log and return success
      admin.from('whatsapp_sends').insert({
        user_id: user.id, type: 'chat_note_template',
        saathi_slug: saathiSlug ?? null, board_name: boardName ?? null,
        sent_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({ success: true, method: 'template' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Template also failed — likely not approved yet
    console.error('[send-to-phone] Template also failed:', JSON.stringify(templateBody));
    return new Response(JSON.stringify({
      error: 'outside_window',
      message: 'Send "Hi" to +91 98255 93204 on WhatsApp to activate, then try again.',
    }), {
      status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!waRes.ok) {
    console.error('[send-to-phone] WhatsApp API error:', JSON.stringify(waBody));
    return new Response(JSON.stringify({ error: 'Send failed', detail: waBody }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
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
