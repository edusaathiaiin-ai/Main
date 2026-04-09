/**
 * supabase/functions/admin-digest/index.ts
 *
 * Sends admin digest emails to jaydeep@edusaathiai.in
 *
 * Daily digest  — every day at 8:00 AM IST (2:30 AM UTC)
 * Weekly digest — every Monday at 9:00 AM IST (3:30 AM UTC)
 *
 * Cron expressions (Supabase Dashboard → Edge Functions → Schedule):
 *   Daily:  30 2 * * *
 *   Weekly: 30 3 * * 1
 *
 * Can also be triggered manually via POST with body { force: 'daily' } or { force: 'weekly' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM               = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in';
const ADMIN_EMAIL               = Deno.env.get('ADMIN_DIGEST_EMAIL') ?? 'jaydeep@edusaathiai.in';
const ADMIN_DASHBOARD_URL       = Deno.env.get('ADMIN_DASHBOARD_URL') ?? '${ADMIN_DASHBOARD_URL}';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Supabase admin client ────────────────────────────────────────────────────

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Metrics helpers ──────────────────────────────────────────────────────────

async function fetchDailyMetrics(admin: ReturnType<typeof getAdmin>, since: string) {
  const [
    { count: newUsers },
    { count: messages },
    { count: sessions },
    { data: payments },
    { count: newPostings },
    { count: newApplications },
    { count: boardPosts },
    { data: errors },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', since).eq('role', 'user'),
    admin.from('chat_sessions').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('subscriptions').select('amount').gte('created_at', since).eq('status', 'paid'),
    admin.from('internship_postings').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('intern_applications').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('board_questions').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('edge_function_errors').select('function_name, error_message').gte('created_at', since).limit(5),
  ]);

  const revenue = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    newUsers: newUsers ?? 0,
    messages: messages ?? 0,
    sessions: sessions ?? 0,
    revenue,
    newPostings: newPostings ?? 0,
    newApplications: newApplications ?? 0,
    boardPosts: boardPosts ?? 0,
    recentErrors: errors ?? [],
  };
}

async function fetchTotals(admin: ReturnType<typeof getAdmin>) {
  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalFaculty },
    { count: paidSubscriptions },
    { count: openPostings },
    { count: pendingModeration },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    admin.from('internship_postings').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('moderation_flags').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return { totalUsers: totalUsers ?? 0, totalStudents: totalStudents ?? 0, totalFaculty: totalFaculty ?? 0, paidSubscriptions: paidSubscriptions ?? 0, openPostings: openPostings ?? 0, pendingModeration: pendingModeration ?? 0 };
}

// ── Email builders ───────────────────────────────────────────────────────────

function buildDailyHtml(metrics: Awaited<ReturnType<typeof fetchDailyMetrics>>, dateLabel: string): string {
  const errorRows = metrics.recentErrors.length === 0
    ? '<tr><td colspan="2" style="padding:8px;color:#10b981;text-align:center;">✓ No errors in last 24h</td></tr>'
    : metrics.recentErrors.map(e =>
        `<tr><td style="padding:6px 10px;font-family:monospace;font-size:12px;color:#f59e0b;">${e.function_name}</td><td style="padding:6px 10px;color:#ef4444;font-size:12px;">${(e.error_message ?? '').slice(0, 80)}</td></tr>`
      ).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EdUsaathiAI Daily Digest</title></head>
<body style="background:#0b1f3a;color:#e2e8f0;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="margin-bottom:24px;">
    <h1 style="color:#c9993a;font-size:22px;margin:0 0 4px;">EdUsaathiAI</h1>
    <p style="color:#64748b;font-size:13px;margin:0;">Daily Digest · ${dateLabel}</p>
  </div>

  <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
    <tr>
      ${[
        ['New Users', metrics.newUsers],
        ['Messages', metrics.messages],
        ['Revenue', `₹${metrics.revenue.toLocaleString('en-IN')}`],
        ['Board Posts', metrics.boardPosts],
      ].map(([label, val]) => `
      <td width="25%" style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <p style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${val}</p>
        <p style="font-size:11px;color:#64748b;margin:0;">${label}</p>
      </td>`).join('')}
    </tr>
    <tr>
      ${[
        ['New Postings', metrics.newPostings],
        ['Applications', metrics.newApplications],
        ['Chat Sessions', metrics.sessions],
        ['Errors', metrics.recentErrors.length === 0 ? '✓ 0' : String(metrics.recentErrors.length)],
      ].map(([label, val]) => `
      <td width="25%" style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <p style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${val}</p>
        <p style="font-size:11px;color:#64748b;margin:0;">${label}</p>
      </td>`).join('')}
    </tr>
  </table>

  <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:24px;">
    <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Recent Errors</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tbody>${errorRows}</tbody>
    </table>
  </div>

  <div style="text-align:center;padding-top:16px;border-top:1px solid #1e293b;">
    <a href="${ADMIN_DASHBOARD_URL}/platform-health" style="color:#c9993a;font-size:12px;text-decoration:none;">View Platform Health →</a>
  </div>
</div>
</body>
</html>`;
}

function buildWeeklyHtml(
  metrics7d: Awaited<ReturnType<typeof fetchDailyMetrics>>,
  totals: Awaited<ReturnType<typeof fetchTotals>>,
  dateLabel: string
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EdUsaathiAI Weekly Digest</title></head>
<body style="background:#0b1f3a;color:#e2e8f0;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="margin-bottom:24px;">
    <h1 style="color:#c9993a;font-size:22px;margin:0 0 4px;">EdUsaathiAI</h1>
    <p style="color:#64748b;font-size:13px;margin:0;">Weekly Digest · Week ending ${dateLabel}</p>
  </div>

  <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Platform Totals</h3>
  <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
    <tr>
      ${[
        ['Total Users', totals.totalUsers],
        ['Students', totals.totalStudents],
        ['Faculty', totals.totalFaculty],
        ['Paid Subscriptions', totals.paidSubscriptions],
      ].map(([label, val]) => `
      <td width="25%" style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <p style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${val}</p>
        <p style="font-size:11px;color:#64748b;margin:0;">${label}</p>
      </td>`).join('')}
    </tr>
    <tr>
      ${[
        ['Open Postings', totals.openPostings],
        ['Pending Flags', totals.pendingModeration],
        ['This Week Revenue', `₹${metrics7d.revenue.toLocaleString('en-IN')}`],
        ['This Week Users', metrics7d.newUsers],
      ].map(([label, val]) => `
      <td width="25%" style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <p style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${val}</p>
        <p style="font-size:11px;color:#64748b;margin:0;">${label}</p>
      </td>`).join('')}
    </tr>
  </table>

  <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">This Week Activity</h3>
  <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
    <tr>
      ${[
        ['Messages Sent', metrics7d.messages],
        ['Chat Sessions', metrics7d.sessions],
        ['New Postings', metrics7d.newPostings],
        ['Applications', metrics7d.newApplications],
      ].map(([label, val]) => `
      <td width="25%" style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <p style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${val}</p>
        <p style="font-size:11px;color:#64748b;margin:0;">${label}</p>
      </td>`).join('')}
    </tr>
  </table>

  ${totals.pendingModeration > 0 ? `
  <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px;margin-bottom:24px;">
    <p style="color:#ef4444;font-size:13px;margin:0;">⚠️ ${totals.pendingModeration} content flag${totals.pendingModeration !== 1 ? 's' : ''} pending review.</p>
    <a href="${ADMIN_DASHBOARD_URL}/moderation" style="color:#ef4444;font-size:12px;">Review now →</a>
  </div>` : ''}

  <div style="text-align:center;padding-top:16px;border-top:1px solid #1e293b;">
    <a href="${ADMIN_DASHBOARD_URL}" style="color:#c9993a;font-size:12px;text-decoration:none;">Open Admin Dashboard →</a>
  </div>
</div>
</body>
</html>`;
}

// ── Resend sender ────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  return res.ok;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const cronSecret = req.headers.get('x-cron-secret')
      ?? new URL(req.url).searchParams.get('cron_secret')
    const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '')
    const isAuthed   = (cronSecret === Deno.env.get('CRON_SECRET'))
                    || (authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const admin = getAdmin();
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const nowUTC  = new Date();
    const hourIST = (nowUTC.getUTCHours() + 5) % 24 + (nowUTC.getUTCMinutes() >= 30 ? 1 : 0);
    const dayIST  = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000).getDay(); // 0=Sun, 1=Mon

    const isWeekly = body.force === 'weekly' || (dayIST === 1 && hourIST === 9);
    const isDaily  = body.force === 'daily'  || (!isWeekly && hourIST === 8);

    if (!isDaily && !isWeekly && !body.force) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not digest time', hourIST, dayIST }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const now        = new Date();
    const since24h   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since7d    = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since      = isWeekly ? since7d : since24h;

    const metrics = await fetchDailyMetrics(admin, since);

    let sent = false;

    if (isWeekly) {
      const totals  = await fetchTotals(admin);
      const dateLabel = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const html    = buildWeeklyHtml(metrics, totals, dateLabel);
      sent = await sendEmail(ADMIN_EMAIL, `EdUsaathiAI Weekly Digest — ${dateLabel}`, html);
    } else {
      const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      const html    = buildDailyHtml(metrics, dateLabel);
      sent = await sendEmail(ADMIN_EMAIL, `EdUsaathiAI Daily Digest — ${dateLabel}`, html);
    }

    // Update cron log
    const jobId = isWeekly ? 'admin-weekly-digest' : 'admin-daily-digest';
    await admin.from('cron_job_log').upsert(
      {
        job_id: jobId,
        last_run_at: now.toISOString(),
        status: sent ? 'ok' : 'error',
        records_affected: 1,
      },
      { onConflict: 'job_id' }
    );

    return new Response(JSON.stringify({ ok: sent, type: isWeekly ? 'weekly' : 'daily' }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('admin-digest error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
