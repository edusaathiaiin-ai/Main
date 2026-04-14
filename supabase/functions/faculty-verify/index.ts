/**
 * supabase/functions/faculty-verify/index.ts
 *
 * Canonical "verify a faculty" admin action.
 *
 * Called by admin/app/(admin)/faculty/actions.ts for all three verify paths:
 *   - Standard verify       (badgeType='faculty_verified')
 *   - Independent expert    (badgeType='expert_verified')
 *   - Emeritus              (isEmeritus=true)
 *
 * Flow:
 *   1. Lookup current verification_status (idempotency)
 *   2. UPDATE faculty_profiles with correct columns (real DB columns, not
 *      phantom ones — verification_status, verified_at, verified_by,
 *      badge_type, institution_name, is_emeritus, retirement_year,
 *      former_institution)
 *   3. Log to moderation_flags with flag_type='faculty_verified'
 *   4. If NOT previously verified, send T14 WhatsApp + verification email.
 *      If already verified, skip notifications (no spam on re-verify).
 *
 * Body:  {
 *   facultyId:          string        // profiles.id (UUID)
 *   badgeType?:         'faculty_verified' | 'expert_verified'  (default: 'faculty_verified')
 *   institutionName?:   string        // optional confirm/update
 *   isEmeritus?:        boolean       // also set retirementYear + formerInstitution
 *   retirementYear?:    number
 *   formerInstitution?: string
 *   adminNote?:         string        // logged to moderation_flags
 * }
 *
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY (admin-only via server action).
 *
 * Returns: {
 *   ok:               boolean
 *   alreadyVerified?: boolean   // true = no notifications fired
 *   notifications?:   { wa: boolean; email: boolean }
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName } from '../_shared/whatsapp.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')            ?? '';
const RESEND_FROM_EMAIL    = Deno.env.get('RESEND_FROM_EMAIL')
                               ?? 'EdUsaathiAI <admin@edusaathiai.in>';

const LOG = 'faculty-verify';

type BadgeType = 'faculty_verified' | 'expert_verified';

function authorised(req: Request): boolean {
  const bearer = req.headers.get('Authorization') ?? '';
  if (SUPABASE_SERVICE_KEY && bearer === `Bearer ${SUPABASE_SERVICE_KEY}`) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!authorised(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as Record<string, unknown>;

    const facultyId         = typeof body.facultyId         === 'string' ? body.facultyId.trim()         : null;
    const badgeType         = typeof body.badgeType         === 'string' ? body.badgeType.trim() as BadgeType : 'faculty_verified';
    const institutionName   = typeof body.institutionName   === 'string' ? body.institutionName.trim()   : null;
    const isEmeritus        = body.isEmeritus === true;
    const retirementYear    = typeof body.retirementYear    === 'number' ? body.retirementYear           : null;
    const formerInstitution = typeof body.formerInstitution === 'string' ? body.formerInstitution.trim() : null;
    const adminNote         = typeof body.adminNote         === 'string' ? body.adminNote.trim()         : null;

    if (!facultyId) {
      return new Response(JSON.stringify({ error: 'facultyId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (badgeType !== 'faculty_verified' && badgeType !== 'expert_verified') {
      return new Response(JSON.stringify({ error: 'badgeType must be faculty_verified or expert_verified' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Check current state for idempotency ────────────────────────────────
    const { data: current, error: readErr } = await admin
      .from('faculty_profiles')
      .select('verification_status')
      .eq('user_id', facultyId)
      .maybeSingle();

    if (readErr) {
      console.error(`${LOG}: faculty_profiles read failed for ${facultyId}`, readErr.message);
      return new Response(JSON.stringify({ error: readErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!current) {
      return new Response(JSON.stringify({ error: 'Faculty profile not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const alreadyVerified = current.verification_status === 'verified';

    // ── Build UPDATE patch — only columns that ACTUALLY exist in the DB ────
    const patch: Record<string, unknown> = {
      verification_status: 'verified',
      verified_at:         new Date().toISOString(),
      badge_type:          badgeType,
      updated_at:          new Date().toISOString(),
    };
    if (institutionName)   patch.institution_name   = institutionName;
    if (isEmeritus)        patch.is_emeritus        = true;
    if (retirementYear)    patch.retirement_year    = retirementYear;
    if (formerInstitution) patch.former_institution = formerInstitution;

    const { error: updateErr } = await admin
      .from('faculty_profiles')
      .update(patch)
      .eq('user_id', facultyId);

    if (updateErr) {
      console.error(`${LOG}: update failed for ${facultyId}`, updateErr.message);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Audit log (matches the pattern used by actions.ts historically) ────
    const logContent = [
      `Faculty ${facultyId} verified`,
      badgeType === 'expert_verified' ? 'as independent expert' : null,
      isEmeritus                      ? 'as emeritus'           : null,
      adminNote                       ? `— ${adminNote}`        : null,
    ].filter(Boolean).join(' ');

    await admin.from('moderation_flags').insert({
      flag_type:   'faculty_verified',
      content:     logContent,
      reported_by: null,
      resolved:    true,
    });

    // ── Idempotency: if already verified, no notifications ─────────────────
    if (alreadyVerified) {
      console.log(`${LOG}: faculty ${facultyId} was already verified — metadata updated, no notifications`);
      return new Response(
        JSON.stringify({ ok: true, alreadyVerified: true }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch profile + primary Saathi name for notifications ──────────────
    const { data: profile } = await admin
      .from('profiles')
      .select(`
        full_name, email, wa_phone,
        primary_saathi:verticals!profiles_primary_saathi_id_fkey(name)
      `)
      .eq('id', facultyId)
      .single();

    const facultyName = (profile?.full_name as string | null) ?? 'Faculty';
    const facultyEmail = (profile?.email    as string | null);
    const facultyWa   = (profile?.wa_phone  as string | null);
    const saathiObj   = (profile?.primary_saathi as Record<string, unknown> | null);
    const saathiName  = (saathiObj?.name as string | null) ?? 'EdUsaathiAI';

    // ── T14 WhatsApp ───────────────────────────────────────────────────────
    let waSent = false;
    if (facultyWa) {
      try {
        await sendWhatsAppTemplate({
          templateName: 'edusaathiai_faculty_verified',
          to: stripPhone(facultyWa),
          params: [firstName(facultyName), saathiName],
          logPrefix: LOG,
        });
        waSent = true;
      } catch (err) {
        console.error(`${LOG}: WA send failed for ${facultyId}`, err instanceof Error ? err.message : err);
      }
    }

    // ── Verification email (Resend) ────────────────────────────────────────
    let emailSent = false;
    if (facultyEmail && RESEND_API_KEY) {
      try {
        emailSent = await sendVerificationEmail({
          to: facultyEmail,
          facultyName,
          saathiName,
          isEmeritus,
          isExpert: badgeType === 'expert_verified',
        });
      } catch (err) {
        console.error(`${LOG}: email send failed for ${facultyId}`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`${LOG}: faculty ${facultyId} (${facultyName}) verified — badge=${badgeType} wa=${waSent} email=${emailSent}`);

    return new Response(
      JSON.stringify({
        ok: true,
        facultyId,
        notifications: { wa: waSent, email: emailSent },
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error(`${LOG}: unhandled error`, err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

// ── Verification email via Resend ────────────────────────────────────────────

async function sendVerificationEmail(opts: {
  to:          string;
  facultyName: string;
  saathiName:  string;
  isEmeritus:  boolean;
  isExpert:    boolean;
}): Promise<boolean> {
  const { to, facultyName, saathiName, isEmeritus, isExpert } = opts;

  const greeting = firstName(facultyName);
  const badgeLabel = isExpert   ? 'Expert Verified'
                  : isEmeritus ? 'Emeritus Faculty'
                  : 'Faculty Verified';

  const body = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #FAFAF8;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
    <h1 style="font-family: Georgia, serif; font-size: 28px; color: #1A1814; margin: 0 0 8px 0;">
      Welcome to EdUsaathiAI, ${greeting}.
    </h1>
    <p style="font-size: 15px; color: #4A4740; margin: 0 0 24px 0;">
      Your faculty profile has been verified.
    </p>

    <div style="background: #FFFFFF; border: 1px solid rgba(184,134,11,0.3); border-radius: 14px; padding: 20px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #B8860B; font-weight: 600;">
        ${badgeLabel}
      </p>
      <p style="margin: 0; font-size: 14px; color: #1A1814;">
        Your badge is now live on your profile, and students studying
        <strong>${saathiName}</strong> can discover and book sessions with you.
      </p>
    </div>

    <p style="font-size: 14px; color: #4A4740; line-height: 1.6; margin: 0 0 20px 0;">
      What's next:
    </p>
    <ul style="font-size: 14px; color: #4A4740; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
      <li>Visit your <a href="https://www.edusaathiai.in/faculty" style="color: #B8860B;">faculty dashboard</a> to see incoming session requests.</li>
      <li>Update your session fees and availability on your <a href="https://www.edusaathiai.in/profile" style="color: #B8860B;">profile</a>.</li>
      <li>Students can now find you via <a href="https://www.edusaathiai.in/faculty-finder" style="color: #B8860B;">Faculty Finder</a>.</li>
    </ul>

    <p style="font-size: 13px; color: #7A7570; line-height: 1.6; margin: 0 0 8px 0;">
      Thank you for joining. Every student you teach carries that lesson forward.
    </p>
    <p style="font-size: 13px; color: #7A7570; margin: 0;">
      — Jaydeep<br>
      <span style="color: #A8A49E;">EdUsaathiAI · Ahmedabad</span>
    </p>
  </div>
</body>
</html>`;

  const subject = isExpert   ? `✦ You're verified as an independent expert on EdUsaathiAI`
                : isEmeritus ? `✦ Welcome, Emeritus Faculty — EdUsaathiAI`
                :              `✦ You're now verified on EdUsaathiAI`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    RESEND_FROM_EMAIL,
      to:      [to],
      subject,
      html:    body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`${LOG}: Resend error ${res.status}: ${text}`);
    return false;
  }
  return true;
}
