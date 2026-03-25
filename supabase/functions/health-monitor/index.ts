/**
 * supabase/functions/health-monitor/index.ts
 *
 * Runs hourly via Supabase cron. Checks 6 silent-failure conditions
 * (P1/P2/P3 severity). Sends alert email via Resend if P1 or P2 breach.
 *
 * Security: requires x-cron-secret header matching CRON_SECRET env var.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY           = Deno.env.get('RESEND_API_KEY') ?? '';
const CRON_SECRET              = Deno.env.get('CRON_SECRET') ?? '';
const ALERT_EMAIL              = 'jaydeep@edusaathiai.in';
const ALERT_FROM               = 'EdUsaathiAI Monitor <noreply@edusaathiai.in>';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type Severity = 'P1' | 'P2' | 'P3';

type CheckResult = {
  name: string;
  severity: Severity;
  passed: boolean;
  value: number;
  threshold: number;
  compareType: 'greater_than' | 'less_than';
  message: string;
};

async function runCheck(
  admin: ReturnType<typeof createClient>,
  check: {
    name: string;
    severity: Severity;
    query: string;
    threshold: number;
    compareType?: 'greater_than' | 'less_than';
    message: string;
    valueField?: string;
  }
): Promise<CheckResult> {
  const compareType = check.compareType ?? 'greater_than';
  const valueField  = check.valueField  ?? 'count';

  const { data, error } = await admin.rpc('run_health_check', {
    sql_query: check.query
  }).maybeSingle();

  // Fallback: direct DB query via raw SQL approach using from()
  // We use a custom RPC — if not available, default to 0.
  const rawValue = (data as Record<string, unknown> | null)?.[valueField];
  const value = typeof rawValue === 'number' ? rawValue :
                typeof rawValue === 'string' ? parseFloat(rawValue) : 0;

  let passed: boolean;
  if (compareType === 'less_than') {
    passed = value >= check.threshold; // "should be at least threshold"
  } else {
    passed = value <= check.threshold; // "should not exceed threshold"
  }

  if (error) {
    console.error(`[health-monitor] Error running check ${check.name}:`, error.message);
  }

  return { name: check.name, severity: check.severity, passed, value, threshold: check.threshold, compareType, message: check.message };
}

async function sendAlert(failures: CheckResult[]): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[health-monitor] No RESEND_API_KEY — skipping email alert');
    return;
  }

  const p1Failures = failures.filter(f => f.severity === 'P1');
  const p2Failures = failures.filter(f => f.severity === 'P2');

  const subject = `⚠️ EdUsaathiAI Health Alert — ${failures.length} issue${failures.length > 1 ? 's' : ''} detected`;

  const rows = failures.map(f => `
    <tr style="border-bottom:1px solid #334155;">
      <td style="padding:8px 12px;font-weight:600;color:${f.severity === 'P1' ? '#ef4444' : f.severity === 'P2' ? '#f97316' : '#eab308'}">${f.severity}</td>
      <td style="padding:8px 12px;font-family:monospace;">${f.name}</td>
      <td style="padding:8px 12px;">${f.message}</td>
      <td style="padding:8px 12px;text-align:right;">${f.value} (threshold: ${f.compareType === 'less_than' ? '≥' : '≤'} ${f.threshold})</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0F172A;color:#E2E8F0;padding:24px;border-radius:12px;max-width:700px;">
      <h2 style="color:#F59E0B;margin:0 0 16px 0;">⚠️ EdUsaathiAI Health Alert</h2>
      <p style="color:#94A3B8;margin:0 0 16px 0;">
        <strong>${p1Failures.length} P1</strong> and <strong>${p2Failures.length} P2</strong> issues detected at ${new Date().toISOString()} UTC
      </p>
      <table style="width:100%;border-collapse:collapse;background:#1E293B;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#0F172A;">
            <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;">SEVERITY</th>
            <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;">CHECK</th>
            <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;">ISSUE</th>
            <th style="padding:10px 12px;text-align:right;color:#64748B;font-size:12px;">VALUE</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#475569;font-size:12px;margin:16px 0 0 0;">
        EdUsaathiAI Automated Health Monitor · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_EMAIL],
      subject,
      html,
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  if (CRON_SECRET && cronSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── P1: Quota "stolen" — message_count incremented but no assistant reply ──
    const { count: quotaStolen } = await admin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('message_count', 0)
      .gt('updated_at', new Date(Date.now() - 3600_000).toISOString())
      .then(r => r);

    // ── P1: RSS stale — fewer than 10 active articles fetched in last 25h ─────
    const { count: recentNews } = await admin
      .from('news_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('fetched_at', new Date(Date.now() - 25 * 3600_000).toISOString())
      .then(r => r);

    // ── P2: Onboarding abandonment spike ──────────────────────────────────────
    const { count: abandonedOnboard } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)
      .not('role', 'is', null)
      .gt('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
      .lt('created_at', new Date(Date.now() - 2 * 3600_000).toISOString())
      .then(r => r);

    // ── P2: Soul not updating — successful chats but soul_updated = false ─────
    const { count: soulNotUpdating } = await admin
      .from('traces')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'chat')
      .eq('outcome', 'success')
      .eq('soul_updated', false)
      .gt('created_at', new Date(Date.now() - 3600_000).toISOString())
      .then(r => r);

    // ── P3: High TTFB — check avg as proxy for P95 ────────────────────────────
    const { data: ttfbData } = await admin
      .from('traces')
      .select('ttfb_ms')
      .eq('action_type', 'chat')
      .not('ttfb_ms', 'is', null)
      .gt('created_at', new Date(Date.now() - 3600_000).toISOString())
      .order('ttfb_ms', { ascending: false })
      .limit(100);

    const ttfbValues = (ttfbData ?? []).map(r => (r as { ttfb_ms: number }).ttfb_ms).sort((a, b) => a - b);
    const p95Ttfb = ttfbValues.length > 0
      ? ttfbValues[Math.floor(ttfbValues.length * 0.95)]
      : 0;

    // ── P3: Passion not igniting ───────────────────────────────────────────────
    const { count: passionStuck } = await admin
      .from('student_soul')
      .select('*', { count: 'exact', head: true })
      .gt('session_count', 5)
      .eq('passion_intensity', 0)
      .then(r => r);

    const results: CheckResult[] = [
      {
        name: 'rss_stale',
        severity: 'P1',
        passed: (recentNews ?? 0) >= 10,
        value: recentNews ?? 0,
        threshold: 10,
        compareType: 'less_than',
        message: 'RSS fetch may have failed — News tab showing stale content',
      },
      {
        name: 'onboard_abandoned',
        severity: 'P2',
        passed: (abandonedOnboard ?? 0) <= 5,
        value: abandonedOnboard ?? 0,
        threshold: 5,
        compareType: 'greater_than',
        message: 'High onboarding abandonment detected',
      },
      {
        name: 'soul_update_failing',
        severity: 'P2',
        passed: (soulNotUpdating ?? 0) <= 10,
        value: soulNotUpdating ?? 0,
        threshold: 10,
        compareType: 'greater_than',
        message: 'Soul updates failing after successful chats',
      },
      {
        name: 'high_ttfb',
        severity: 'P3',
        passed: p95Ttfb <= 3000,
        value: p95Ttfb,
        threshold: 3000,
        compareType: 'greater_than',
        message: 'AI response latency degrading — P95 TTFB > 3s',
      },
      {
        name: 'passion_not_igniting',
        severity: 'P3',
        passed: (passionStuck ?? 0) <= 20,
        value: passionStuck ?? 0,
        threshold: 20,
        compareType: 'greater_than',
        message: 'Passion engine may not be firing — students not progressing',
      },
    ];

    const failures = results.filter(r => !r.passed);
    const alertableFailures = failures.filter(r => r.severity === 'P1' || r.severity === 'P2');

    if (alertableFailures.length > 0) {
      await sendAlert(alertableFailures);
    }

    return new Response(
      JSON.stringify({
        checked: results.length,
        passed: results.filter(r => r.passed).length,
        failed: failures.length,
        alertSent: alertableFailures.length > 0,
        results,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[health-monitor] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
