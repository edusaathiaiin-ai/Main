/**
 * supabase/functions/_shared/suspensions.ts
 *
 * Suspension enforcement service.
 * Records violations, checks thresholds, auto-suspends,
 * sends notification emails, and lifts expired suspensions.
 *
 * Imported by chat/index.ts and whatsapp-webhook/index.ts.
 */

import { SUSPENSION_THRESHOLDS } from './violations.ts';
import { sanitize } from './validate.ts';

// deno-lint-ignore no-explicit-any
type AdminClient = any;

// ── Check if user is currently suspended ───────────────────────────────────────

export async function checkSuspension(
  admin: AdminClient,
  userId: string,
): Promise<{
  isSuspended: boolean;
  tier: number | null;
  until: Date | null;
  reason: string | null;
  isBanned: boolean;
}> {
  const { data: profile } = await admin
    .from('profiles')
    .select('suspension_status, suspension_tier, suspended_until, suspension_reason, is_banned')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { isSuspended: false, tier: null, until: null, reason: null, isBanned: false };
  }

  // Permanent ban
  if (profile.is_banned) {
    return {
      isSuspended: true,
      tier: 4,
      until: null,
      reason: profile.suspension_reason,
      isBanned: true,
    };
  }

  if (!profile.suspension_status || profile.suspension_status === 'active') {
    return { isSuspended: false, tier: null, until: null, reason: null, isBanned: false };
  }

  // Check if suspension has expired → auto-lift
  if (profile.suspended_until) {
    const until = new Date(profile.suspended_until);
    if (until <= new Date()) {
      await admin.from('profiles').update({
        suspension_status: null,
        suspension_tier: null,
        suspended_until: null,
        suspension_reason: null,
      }).eq('id', userId);

      await admin.from('suspension_log').insert({
        user_id: userId,
        action: 'lift',
        tier: 0,
        reason: 'auto_expired',
        triggered_by: 'system',
      });

      return { isSuspended: false, tier: null, until: null, reason: null, isBanned: false };
    }
  }

  return {
    isSuspended: true,
    tier: profile.suspension_tier,
    until: profile.suspended_until ? new Date(profile.suspended_until) : null,
    reason: profile.suspension_reason,
    isBanned: false,
  };
}

// ── Record a violation and check if suspension should trigger ───────────────────

export async function recordViolationAndCheck(
  admin: AdminClient,
  userId: string,
  violationType: string,
  severity: string,
  messageContent: string,
  saathiId: string,
  channel: 'web' | 'whatsapp' = 'web',
): Promise<{
  shouldBlock: boolean;
  shouldSuspend: boolean;
  tier: number;
  warningCount: number;
}> {
  // 1. Log the violation to moderation_flags
  admin.from('moderation_flags').insert({
    reporter_user_id: userId,
    target_id: userId,
    reason: violationType,
    violation_type: violationType,
    details_json: {
      message: messageContent.slice(0, 200),
      saathi_id: saathiId,
      severity,
      channel,
    },
    status: 'auto_flagged',
  }).then(({ error }: { error: { message: string } | null }) => {
    if (error) console.warn('violation flag insert failed:', error.message);
  });

  // 2. Count violations of this type in last 24h
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { count } = await admin
    .from('moderation_flags')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_user_id', userId)
    .eq('violation_type', violationType)
    .gte('created_at', since.toISOString());

  const violationCount = (count ?? 0) + 1; // +1 for the one we just inserted
  const threshold = SUSPENSION_THRESHOLDS[violationType] ?? 3;

  // 3. Check if should auto-suspend
  const shouldSuspend =
    violationCount >= threshold ||
    severity === 'high' ||
    severity === 'critical';

  if (shouldSuspend) {
    await autoSuspend(admin, userId, violationType, violationCount, severity);
    return { shouldBlock: true, shouldSuspend: true, tier: 2, warningCount: violationCount };
  }

  return { shouldBlock: false, shouldSuspend: false, tier: 1, warningCount: violationCount };
}

// ── Auto-suspend a user ────────────────────────────────────────────────────────

async function autoSuspend(
  admin: AdminClient,
  userId: string,
  violationType: string,
  violationCount: number,
  severity: string,
) {
  const suspendedUntil = new Date();
  suspendedUntil.setHours(suspendedUntil.getHours() + 24);

  const reason = getSuspensionReason(violationType, violationCount);

  // Increment count atomically
  await admin.rpc('increment_suspension_count', { target_user_id: userId });

  // Update profile
  await admin.from('profiles').update({
    suspension_status: 'suspended',
    suspension_tier: 2,
    suspended_until: suspendedUntil.toISOString(),
    suspension_reason: reason,
    last_suspended_at: new Date().toISOString(),
  }).eq('id', userId);

  // Log the suspension
  await admin.from('suspension_log').insert({
    user_id: userId,
    action: 'suspend',
    tier: 2,
    reason: violationType,
    reason_detail: reason,
    suspended_until: suspendedUntil.toISOString(),
    duration_hours: 24,
    triggered_by: 'auto',
    violation_type: violationType,
    violation_count: violationCount,
  });

  // Get user email for notification
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  // Send emails — fire and forget
  if (profile?.email) {
    sendSuspensionEmail(profile.email, profile.full_name ?? 'Student', reason, suspendedUntil).catch(
      (e: Error) => console.warn('suspension email failed:', e.message),
    );
    notifyAdmin(userId, profile.full_name ?? 'Unknown', profile.email, violationType, violationCount, severity).catch(
      (e: Error) => console.warn('admin notify failed:', e.message),
    );
  }
}

// ── Email: notify student ──────────────────────────────────────────────────────

async function sendSuspensionEmail(
  email: string,
  name: string,
  reason: string,
  until: Date,
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return;

  const firstName = sanitize(name.split(' ')[0]);
  const safeReason = sanitize(reason);
  const untilFormatted = until.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EdUsaathiAI <support@edusaathiai.in>',
      to: [email],
      subject: 'Your EdUsaathiAI account has been temporarily suspended',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
  <h2 style="color:#F87171;font-family:Georgia,serif;margin:0 0 16px">Account Temporarily Suspended</h2>
  <p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 16px">Hello ${firstName},</p>
  <p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 16px">Your EdUsaathiAI account has been temporarily suspended due to a violation of our <a href="https://www.edusaathiai.in/terms" style="color:#C9993A">Terms of Service</a>.</p>
  <div style="background:rgba(239,68,68,0.1);border:0.5px solid rgba(239,68,68,0.3);border-radius:10px;padding:16px;margin:0 0 20px">
    <p style="color:#F87171;font-size:13px;margin:0 0 6px;font-weight:600">Reason:</p>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">${safeReason}</p>
    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:8px 0 0">Suspended until: <strong style="color:#fff">${untilFormatted} IST</strong></p>
  </div>
  <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.7;margin:0 0 20px">Your account will be automatically restored after the suspension period. During this time, you can still access your profile, news, and board.</p>
  <a href="mailto:support@edusaathiai.in?subject=Account Appeal - ${email}" style="display:inline-block;background:rgba(201,153,58,0.2);border:1px solid rgba(201,153,58,0.4);color:#C9993A;padding:10px 24px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600">Appeal this decision &rarr;</a>
  <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:24px;line-height:1.6">EdUsaathiAI is committed to being a safe, respectful learning environment for all students.<br><br>support@edusaathiai.in</p>
</div>`,
    }),
  });
}

// ── Email: notify admin ────────────────────────────────────────────────────────

async function notifyAdmin(
  userId: string,
  name: string,
  email: string,
  violationType: string,
  count: number,
  severity: string,
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return;

  const safeName = sanitize(name);
  const safeEmail = sanitize(email);

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EdUsaathiAI System <support@edusaathiai.in>',
      to: ['jaydeep@edusaathiai.in'],
      subject: `\u{26A0}\u{FE0F} User auto-suspended: ${safeName}`,
      html: `<div style="font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0">
  <h3 style="color:#F87171;margin:0 0 16px">Auto-suspension triggered</h3>
  <p>User: <strong>${safeName}</strong> (${safeEmail})</p>
  <p>User ID: <code>${userId}</code></p>
  <p>Violation: <strong>${violationType}</strong> (severity: ${severity})</p>
  <p>Count in 24h: <strong>${count}</strong></p>
  <p>Tier: <strong>2</strong> (24-hour auto-suspend)</p>
</div>`,
    }),
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getSuspensionReason(type: string, count: number): string {
  const reasons: Record<string, string> = {
    abuse: `Repeated use of abusive language (${count} violations in 24 hours)`,
    politics: `Repeated attempts to discuss political content (${count} attempts)`,
    injection: 'Attempted system prompt injection \u2014 intentional policy violation',
    inappropriate_content: 'Inappropriate content attempt \u2014 zero tolerance policy',
    academic_dishonesty: `Repeated attempts to use the platform for academic dishonesty (${count} attempts)`,
    harassment: 'Harassment or threatening behaviour',
    spam: 'Spam or automated message flooding',
  };
  return reasons[type] ?? 'Violation of EdUsaathiAI Terms of Service';
}
