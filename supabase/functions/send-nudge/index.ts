/**
 * supabase/functions/send-nudge/index.ts
 * Admin-only bulk nudge sender. Uses nudge_campaigns table.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in';
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') ?? '';
const ADMIN_EMAIL = 'admin@edusaathiai.in';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1100;

type Channel = 'inapp' | 'email' | 'whatsapp';

interface NudgeRequest {
  nudgeCampaignId?: string;
  segment: string;
  subject: string;
  message: string;
  channels: Channel[];
  senderName?: string;
  userId?: string;           // required when segment = 'specific_user'
}

interface UserTarget {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
}

serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, CORS_HEADERS);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401, CORS_HEADERS);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') return json({ error: 'Forbidden' }, 403, CORS_HEADERS);

    const body: NudgeRequest = await req.json();
    const { nudgeCampaignId, segment, subject, message, channels, senderName = 'EdUsaathiAI Team', userId } = body;

    if (!segment || !message || !channels?.length) {
      return json({ error: 'Missing required fields' }, 400, CORS_HEADERS);
    }
    if (segment === 'specific_user' && !userId) {
      return json({ error: 'userId is required for specific_user segment' }, 400, CORS_HEADERS);
    }

    const users = await getSegmentUsers(admin, segment, userId);
    const targeted = users.length;
    console.log(`[send-nudge] segment=${segment} targeted=${targeted}`);

    if (targeted === 0) {
      if (nudgeCampaignId) await admin.from('nudge_campaigns').update({ status: 'sent', reach: 0 }).eq('id', nudgeCampaignId);
      return json({ ok: true, reach: 0, failed: 0, targeted: 0 }, 200, CORS_HEADERS);
    }

    if (nudgeCampaignId) await admin.from('nudge_campaigns').update({ status: 'sending' }).eq('id', nudgeCampaignId);

    let reach = 0;
    let failed = 0;

    if (channels.includes('email') && RESEND_API_KEY) {
      const { sent, errors } = await sendEmailBatches(users, subject, message, senderName);
      reach += sent;
      failed += errors;
      console.log(`[send-nudge] email sent=${sent} errors=${errors}`);
    }

    if (channels.includes('whatsapp') && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_ID) {
      const { sent, errors } = await sendWhatsAppBatches(users, message);
      reach += sent;
      failed += errors;
    }

    if (channels.includes('inapp')) reach += targeted;

    if (nudgeCampaignId) {
      await admin.from('nudge_campaigns').update({
        status: 'sent', reach, sent_at: new Date().toISOString(),
      }).eq('id', nudgeCampaignId);
    }

    if (RESEND_API_KEY) await sendAdminConfirmation({ senderName, segment, subject, targeted, reach, failed, channels });

    return json({ ok: true, reach, failed, targeted }, 200, CORS_HEADERS);
  } catch (err) {
    console.error('[send-nudge] Error:', err);
    return json({ error: 'Internal error' }, 500, CORS_HEADERS);
  }
});

async function getSegmentUsers(admin: ReturnType<typeof createClient>, segment: string, userId?: string): Promise<UserTarget[]> {
  // Single-user fast path — no limit needed
  if (segment === 'specific_user' && userId) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, full_name, phone_number')
      .eq('id', userId)
      .single();
    if (error || !data) return [];
    return [{
      id: data.id as string,
      email: data.email as string | null,
      full_name: data.full_name as string | null,
      phone_number: data.phone_number as string | null,
    }];
  }

  let query = admin
    .from('profiles')
    .select('id, email, full_name, phone_number')
    .limit(500);

  switch (segment) {
    case 'all_students': query = query.eq('role', 'student'); break;
    case 'all_faculty': query = query.eq('role', 'faculty'); break;
    case 'free_plan': query = query.eq('role', 'student').or('plan_id.is.null,plan_id.eq.free'); break;
    case 'paid_plan': query = query.not('plan_id', 'is', null).neq('plan_id', 'free'); break;
    case 'inactive_7d': {
      const cutoff = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const { data: a } = await admin.from('chat_sessions').select('user_id').gte('created_at', cutoff);
      const ids = (a ?? []).map((r: { user_id: string }) => r.user_id);
      query = query.not('role', 'eq', 'admin');
      if (ids.length > 0) query = query.not('id', 'in', `(${ids.map((id: string) => `"${id}"`).join(',')})`);
      break;
    }
    case 'inactive_30d': {
      const cutoff = new Date(Date.now() - 30*24*60*60*1000).toISOString();
      const { data: a } = await admin.from('chat_sessions').select('user_id').gte('created_at', cutoff);
      const ids = (a ?? []).map((r: { user_id: string }) => r.user_id);
      query = query.not('role', 'eq', 'admin');
      if (ids.length > 0) query = query.not('id', 'in', `(${ids.map((id: string) => `"${id}"`).join(',')})`);
      break;
    }
    case 'low_completeness': query = query.lt('profile_completeness_pct', 50); break;
    case 'pending_verification': query = query.eq('role', 'faculty').eq('faculty_verified', false); break;
    case 'no_session_30d': {
      const cutoff = new Date(Date.now() - 30*24*60*60*1000).toISOString();
      const { data: a } = await admin.from('chat_sessions').select('user_id').gte('created_at', cutoff);
      const ids = (a ?? []).map((r: { user_id: string }) => r.user_id);
      query = query.eq('role', 'student');
      if (ids.length > 0) query = query.not('id', 'in', `(${ids.map((id: string) => `"${id}"`).join(',')})`);
      break;
    }
    default: query = query.not('role', 'eq', 'admin'); break;
  }

  const { data, error } = await query;
  if (error) {
    console.error('[send-nudge] Segment query error:', JSON.stringify(error));
    return [];
  }
  console.log(`[send-nudge] Query returned ${(data ?? []).length} rows`);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    email: row.email as string | null,
    full_name: row.full_name as string | null,
    phone_number: row.phone_number as string | null,
  }));
}

function personalise(t: string, u: UserTarget): string {
  return t
    .replace(/\{name\}/g, u.full_name?.split(' ')[0] ?? 'there')
    .replace(/\{saathi_name\}/g, 'your Saathi');
}

async function sendEmailBatches(users: UserTarget[], subject: string, message: string, senderName: string): Promise<{ sent: number; errors: number }> {
  let sent = 0; let errors = 0;
  const eu = users.filter((u) => u.email);
  for (let i = 0; i < eu.length; i += BATCH_SIZE) {
    await Promise.all(eu.slice(i, i + BATCH_SIZE).map(async (u) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${senderName} <${RESEND_FROM}>`,
            to: [u.email!],
            subject: personalise(subject, u),
            html: buildNudgeHtml(u, personalise(message, u)),
          }),
        });
        if (res.ok) { sent++; } else {
          errors++;
          const t = await res.text();
          console.error('[send-nudge] Resend error', u.email, res.status, t);
        }
      } catch (e) { errors++; console.error('[send-nudge] fetch error', e); }
    }));
    if (i + BATCH_SIZE < eu.length) await delay(BATCH_DELAY_MS);
  }
  return { sent, errors };
}

async function sendWhatsAppBatches(users: UserTarget[], message: string): Promise<{ sent: number; errors: number }> {
  let sent = 0; let errors = 0;
  const wu = users.filter((u) => u.phone_number);
  for (let i = 0; i < wu.length; i += BATCH_SIZE) {
    await Promise.all(wu.slice(i, i + BATCH_SIZE).map(async (u) => {
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: u.phone_number!.replace(/\D/g, ''), type: 'text', text: { body: personalise(message, u) } }),
        });
        if (res.ok) sent++; else errors++;
      } catch { errors++; }
    }));
    if (i + BATCH_SIZE < wu.length) await delay(BATCH_DELAY_MS);
  }
  return { sent, errors };
}

async function sendAdminConfirmation(opts: { senderName: string; segment: string; subject: string; targeted: number; reach: number; failed: number; channels: Channel[] }) {
  const { senderName, segment, subject, targeted, reach, failed, channels } = opts;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `EdUsaathiAI <${RESEND_FROM}>`,
      to: [ADMIN_EMAIL],
      subject: `Nudge sent: "${subject}" → ${reach} users`,
      html: `<div style="font-family:sans-serif;padding:24px;background:#0B1F3A;border-radius:12px;color:#fff;"><h2 style="color:#C9993A;">✅ Nudge Sent</h2><p>Sender: ${senderName}</p><p>Segment: ${segment}</p><p>Subject: ${subject}</p><p>Channels: ${channels.join(', ')}</p><p>Targeted: ${targeted}</p><p style="color:#C9993A;font-weight:bold">Reached: ${reach}</p>${failed > 0 ? `<p style="color:#F87171">Failed: ${failed}</p>` : ''}</div>`,
    }),
  });
}

function buildNudgeHtml(u: UserTarget, body: string): string {
  const name = u.full_name?.split(' ')[0] ?? 'there';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#060F1D;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#0B1F3A;border-radius:14px;overflow:hidden;"><tr><td style="padding:24px 32px 20px;border-bottom:1px solid rgba(201,153,58,0.2);text-align:center;"><span style="font-size:22px;font-weight:700;color:#C9993A;">EdUsaathiAI</span></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:16px;color:#fff;font-weight:600;">Hi ${name},</p><p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;">${body}</p><table cellpadding="0" cellspacing="0"><tr><td style="background:#C9993A;border-radius:10px;padding:12px 28px;"><a href="https://edusaathiai.in/chat" style="color:#0B1F3A;font-size:14px;font-weight:700;text-decoration:none;">Continue Learning →</a></td></tr></table></td></tr><tr><td style="padding:16px 32px;border-top:1px solid rgba(201,153,58,0.1);text-align:center;"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);"><a href="https://edusaathiai.in" style="color:#C9993A;text-decoration:none;">edusaathiai.in</a> · Registered EdUsaathiAI user</p></td></tr></table></td></tr></table></body></html>`;
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
function json(b: unknown, s: number, h: Record<string, string>): Response {
  return new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
}
