/**
 * supabase/functions/weekly-eval/index.ts
 *
 * Runs Sunday 9AM IST via Supabase cron.
 * Computes 8 product eval metrics and emails a formatted report via Resend.
 *
 * Security: requires x-cron-secret header matching CRON_SECRET env var.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';
const REPORT_EMAIL              = 'jaydeep@edusaathiai.in';
const REPORT_FROM               = 'EdUsaathiAI Evals <noreply@edusaathiai.in>';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type MetricRow = {
  name: string;
  value: string;
  target: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'N/A';
};

function statusColor(s: MetricRow['status']): string {
  return { PASS: '#22c55e', FAIL: '#ef4444', WARN: '#f97316', 'N/A': '#64748b' }[s];
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

// Minimum cohort size before a rate metric is reported as a number rather
// than N/A. With pre-launch traffic (single-digit users), a 0/0 cohort would
// otherwise render as 0% FAIL and bury real signal in spurious red pills.
const MIN_COHORT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '');
  const isAuthed   = (CRON_SECRET && cronSecret === CRON_SECRET)
                  || (authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const since7d = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const weekLabel = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const metrics: MetricRow[] = [];

    // ── 1. Session completion rate (soul_updated after chat) ──────────────────
    const [{ count: totalChats }, { count: soulUpdatedChats }] = await Promise.all([
      admin.from('traces').select('*', { count: 'exact', head: true })
        .eq('action_type', 'chat').gte('created_at', since7d),
      admin.from('traces').select('*', { count: 'exact', head: true })
        .eq('action_type', 'chat').eq('soul_updated', true).gte('created_at', since7d),
    ]);
    const totalChatsCount = totalChats ?? 0;
    const completionPct = pct(soulUpdatedChats ?? 0, totalChatsCount);
    const completionBelowFloor = totalChatsCount < MIN_COHORT;
    metrics.push({
      name: 'Session completion rate',
      value: completionBelowFloor ? `N/A (${totalChatsCount} chats)` : `${completionPct}%`,
      target: '≥ 80%',
      status: completionBelowFloor ? 'N/A'
            : completionPct >= 80 ? 'PASS'
            : completionPct >= 60 ? 'WARN'
            : 'FAIL',
    });

    // ── 2. Passion ignition rate (flame_stage != cold, 8–12 sessions) ─────────
    const [{ count: burningStudents }, { count: eligibleStudents }] = await Promise.all([
      admin.from('student_soul').select('*', { count: 'exact', head: true })
        .gte('session_count', 8).lte('session_count', 12).neq('flame_stage', 'cold'),
      admin.from('student_soul').select('*', { count: 'exact', head: true })
        .gte('session_count', 8).lte('session_count', 12),
    ]);
    const eligibleStudentsCount = eligibleStudents ?? 0;
    const ignitionPct = pct(burningStudents ?? 0, eligibleStudentsCount);
    const ignitionBelowFloor = eligibleStudentsCount < MIN_COHORT;
    metrics.push({
      name: 'Passion ignition rate (8–12 sessions)',
      value: ignitionBelowFloor ? `N/A (${eligibleStudentsCount} students)` : `${ignitionPct}%`,
      target: '≥ 60%',
      status: ignitionBelowFloor ? 'N/A'
            : ignitionPct >= 60 ? 'PASS'
            : ignitionPct >= 40 ? 'WARN'
            : 'FAIL',
    });

    // ── 3. Career discovery rate (career_discovery_stage != unaware) ──────────
    const [{ count: discoveredStudents }, { count: careerEligible }] = await Promise.all([
      admin.from('student_soul').select('*', { count: 'exact', head: true })
        .gte('session_count', 6).lte('session_count', 10).neq('career_discovery_stage', 'unaware'),
      admin.from('student_soul').select('*', { count: 'exact', head: true })
        .gte('session_count', 6).lte('session_count', 10),
    ]);
    const careerEligibleCount = careerEligible ?? 0;
    const discoveryPct = pct(discoveredStudents ?? 0, careerEligibleCount);
    const discoveryBelowFloor = careerEligibleCount < MIN_COHORT;
    metrics.push({
      name: 'Career discovery rate (6–10 sessions)',
      value: discoveryBelowFloor ? `N/A (${careerEligibleCount} students)` : `${discoveryPct}%`,
      target: '≥ 50%',
      status: discoveryBelowFloor ? 'N/A'
            : discoveryPct >= 50 ? 'PASS'
            : discoveryPct >= 30 ? 'WARN'
            : 'FAIL',
    });

    // ── 4. AI TTFB P50 / P95 by provider, plus chat prep latency ─────────────
    // ai_ttfb_ms isolates the actual AI fetch() → first chunk window. prep_ms
    // captures everything before that (auth, DB, system-prompt build). Pre-142
    // rows have null for both — we filter them out so the metric reflects the
    // post-instrumentation cohort only.
    const { data: ttfbRows } = await admin
      .from('traces')
      .select('ai_provider, ai_ttfb_ms, prep_ms')
      .gte('created_at', since7d)
      .not('ai_ttfb_ms', 'is', null)
      .limit(1000);

    type TtfbRow = { ai_provider: string; ai_ttfb_ms: number; prep_ms: number | null };
    const rows = (ttfbRows ?? []) as TtfbRow[];
    const groqTtfbs   = rows.filter(r => r.ai_provider === 'groq').map(r => r.ai_ttfb_ms).sort((a, b) => a - b);
    const claudeTtfbs = rows.filter(r => r.ai_provider === 'claude').map(r => r.ai_ttfb_ms).sort((a, b) => a - b);
    const prepMs      = rows.map(r => r.prep_ms).filter((n): n is number => n !== null).sort((a, b) => a - b);

    const percentile = (arr: number[], p: number) =>
      arr.length > 0 ? arr[Math.floor(arr.length * p)] : 0;

    const groqP50   = percentile(groqTtfbs,   0.5);
    const groqP95   = percentile(groqTtfbs,   0.95);
    const claudeP50 = percentile(claudeTtfbs, 0.5);
    const claudeP95 = percentile(claudeTtfbs, 0.95);
    const prepP50   = percentile(prepMs,      0.5);
    const prepP95   = percentile(prepMs,      0.95);

    metrics.push({
      name: 'Groq AI TTFB (P50 / P95)',
      value: groqTtfbs.length > 0 ? `${groqP50}ms / ${groqP95}ms` : 'No data',
      target: 'P95 < 2000ms',
      status: groqTtfbs.length === 0 ? 'N/A' : groqP95 < 2000 ? 'PASS' : groqP95 < 3000 ? 'WARN' : 'FAIL',
    });
    metrics.push({
      name: 'Claude AI TTFB (P50 / P95)',
      value: claudeTtfbs.length > 0 ? `${claudeP50}ms / ${claudeP95}ms` : 'No data',
      target: 'P95 < 4000ms',
      status: claudeTtfbs.length === 0 ? 'N/A' : claudeP95 < 4000 ? 'PASS' : claudeP95 < 6000 ? 'WARN' : 'FAIL',
    });
    metrics.push({
      name: 'Chat prep latency (P50 / P95)',
      value: prepMs.length > 0 ? `${prepP50}ms / ${prepP95}ms` : 'No data',
      target: 'P95 < 1500ms',
      status: prepMs.length === 0 ? 'N/A' : prepP95 < 1500 ? 'PASS' : prepP95 < 2500 ? 'WARN' : 'FAIL',
    });


    // ── 5. Guardrail violations ───────────────────────────────────────────────
    const { count: guardrailViolations } = await admin
      .from('moderation_flags')
      .select('*', { count: 'exact', head: true })
      .eq('reason', 'guardrail_violation')
      .gte('created_at', since7d);
    metrics.push({
      name: 'Guardrail violations (7d)',
      value: String(guardrailViolations ?? 0),
      target: '0',
      status: (guardrailViolations ?? 0) === 0 ? 'PASS' : 'FAIL',
    });

    // ── 6. Prompt injection attempts ─────────────────────────────────────────
    const { count: injectionAttempts } = await admin
      .from('moderation_flags')
      .select('*', { count: 'exact', head: true })
      .eq('reason', 'prompt_injection_attempt')
      .gte('created_at', since7d);
    metrics.push({
      name: 'Injection attempts (7d)',
      value: String(injectionAttempts ?? 0),
      target: '0',
      status: (injectionAttempts ?? 0) === 0 ? 'PASS' : (injectionAttempts ?? 0) <= 5 ? 'WARN' : 'FAIL',
    });

    // ── 7. Error rate by outcome ──────────────────────────────────────────────
    const { data: outcomeData } = await admin
      .from('traces')
      .select('outcome')
      .gte('created_at', since7d);

    type OutcomeRow = { outcome: string | null };
    const outcomeCounts: Record<string, number> = {};
    for (const row of (outcomeData ?? []) as OutcomeRow[]) {
      const key = row.outcome ?? 'unknown';
      outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
    }
    const totalTraces = Object.values(outcomeCounts).reduce((a, b) => a + b, 0);
    const errorCount = outcomeCounts['error'] ?? 0;
    const errorRate = totalTraces > 0 ? Math.round((errorCount / totalTraces) * 100) : 0;
    metrics.push({
      name: `Error rate (${totalTraces} total chats)`,
      value: `${errorRate}% — ${JSON.stringify(outcomeCounts)}`,
      target: '< 2%',
      status: totalTraces === 0 ? 'N/A' : errorRate < 2 ? 'PASS' : errorRate < 5 ? 'WARN' : 'FAIL',
    });

    // ── 8. Total active users (7d) ────────────────────────────────────────────
    const { data: activeUsersData } = await admin
      .from('traces')
      .select('user_id')
      .gte('created_at', since7d)
      .eq('action_type', 'chat');

    type UserRow = { user_id: string | null };
    const uniqueUsers = new Set((activeUsersData ?? []).map((r) => (r as UserRow).user_id)).size;
    metrics.push({
      name: 'Active users (7d)',
      value: String(uniqueUsers),
      target: 'Growing',
      status: 'N/A',
    });

    // ── Build and send email ──────────────────────────────────────────────────
    const failCount = metrics.filter(m => m.status === 'FAIL').length;
    const warnCount = metrics.filter(m => m.status === 'WARN').length;

    const metricRows = metrics.map(m => `
      <tr style="border-bottom:1px solid #1E293B;">
        <td style="padding:10px 14px;color:#CBD5E1;">${m.name}</td>
        <td style="padding:10px 14px;font-family:monospace;color:#F1F5F9;">${m.value}</td>
        <td style="padding:10px 14px;color:#64748B;font-size:13px;">${m.target}</td>
        <td style="padding:10px 14px;">
          <span style="background:${statusColor(m.status)}22;color:${statusColor(m.status)};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;">${m.status}</span>
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0F172A;color:#E2E8F0;padding:28px;border-radius:12px;max-width:780px;">
        <h2 style="color:#C9993A;margin:0 0 6px 0;">📊 EdUsaathiAI Weekly Eval</h2>
        <p style="color:#64748B;margin:0 0 20px 0;">Week of ${weekLabel} · ${failCount} fail${failCount !== 1 ? 's' : ''}, ${warnCount} warn${warnCount !== 1 ? 's' : ''}</p>
        <table style="width:100%;border-collapse:collapse;background:#1E293B;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#0F172A;">
              <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">METRIC</th>
              <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">VALUE</th>
              <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">TARGET</th>
              <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">STATUS</th>
            </tr>
          </thead>
          <tbody>${metricRows}</tbody>
        </table>
        <p style="color:#334155;font-size:11px;margin:16px 0 0 0;">
          EdUsaathiAI Weekly Eval · Auto-generated · Do not reply
        </p>
      </div>
    `;

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: REPORT_FROM,
          to: [REPORT_EMAIL],
          subject: `📊 EdUsaathiAI Weekly Eval — ${weekLabel}`,
          html,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, metricsComputed: metrics.length, failCount, warnCount }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[weekly-eval] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
