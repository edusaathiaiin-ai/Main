/**
 * supabase/functions/fire-nomination-reward/index.ts
 *
 * Fires when admin clicks "Mark Eminent" on a nomination.
 * Awards the nominating student:
 *   1. ₹50 wallet credit (5000 paise)
 *   2. 50 Saathi Points
 *   3. Badge: faculty_connector → faculty_champion (5+) → faculty_legend (10+)
 *   4. Milestone bonuses at 5 and 10 successful nominations
 *   5. WhatsApp notification
 *
 * Idempotent: skips if reward_fired is already true.
 * Auth: service role only (called from admin dashboard).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

const REWARD_WALLET_PAISE = 5000   // ₹50
const REWARD_SAATHI_POINTS = 50

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    // Auth: service role only
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized' }, 401, CORS)
    }

    const { nominationId } = await req.json()
    if (!nominationId) {
      return json({ error: 'nominationId required' }, 400, CORS)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Fetch nomination ───────────────────────────────────
    const { data: nomination, error: fetchErr } = await admin
      .from('faculty_nominations')
      .select('*')
      .eq('id', nominationId)
      .single()

    if (fetchErr || !nomination) {
      return json({ error: 'Nomination not found' }, 404, CORS)
    }

    // Guard — don't fire twice
    if (nomination.reward_fired) {
      return json({ skipped: true, reason: 'Reward already fired' }, 200, CORS)
    }

    // Guard — must have a student nominator
    if (!nomination.nominated_by_user_id) {
      return json({ skipped: true, reason: 'No student nominator' }, 200, CORS)
    }

    const studentId = nomination.nominated_by_user_id as string

    // ── Fetch student profile ──────────────────────────────
    const { data: student } = await admin
      .from('profiles')
      .select('id, full_name, email, wallet_balance_paise, badges, wa_phone')
      .eq('id', studentId)
      .single()

    if (!student) {
      return json({ error: 'Student profile not found' }, 404, CORS)
    }

    // ── Count successful nominations (for badge tier) ──────
    const { count: successCount } = await admin
      .from('faculty_nominations')
      .select('*', { count: 'exact', head: true })
      .eq('nominated_by_user_id', studentId)
      .eq('reward_fired', true)

    const newCount = (successCount ?? 0) + 1

    // Determine badge
    let badge = 'faculty_connector'
    if (newCount >= 10) badge = 'faculty_legend'
    else if (newCount >= 5) badge = 'faculty_champion'

    // ── 1. Add wallet credit ───────────────────────────────
    const currentWallet = (student.wallet_balance_paise as number) ?? 0
    await admin
      .from('profiles')
      .update({ wallet_balance_paise: currentWallet + REWARD_WALLET_PAISE })
      .eq('id', studentId)

    // ── 2. Add Saathi Points ───────────────────────────────
    // Insert transaction record
    await admin
      .from('point_transactions')
      .insert({
        user_id: studentId,
        points: REWARD_SAATHI_POINTS,
        action_type: 'nomination_reward',
        metadata: {
          nomination_id: nominationId,
          faculty_name: nomination.faculty_name,
          badge,
          count: newCount,
        },
      })

    // Update total on student_points (upsert — may not have a row yet)
    const { data: existingPoints } = await admin
      .from('student_points')
      .select('total_points, lifetime_points')
      .eq('user_id', studentId)
      .maybeSingle()

    if (existingPoints) {
      await admin
        .from('student_points')
        .update({
          total_points: (existingPoints.total_points as number) + REWARD_SAATHI_POINTS,
          lifetime_points: (existingPoints.lifetime_points as number) + REWARD_SAATHI_POINTS,
          last_earned_at: new Date().toISOString(),
        })
        .eq('user_id', studentId)
    } else {
      await admin
        .from('student_points')
        .insert({
          user_id: studentId,
          total_points: REWARD_SAATHI_POINTS,
          lifetime_points: REWARD_SAATHI_POINTS,
          last_earned_at: new Date().toISOString(),
        })
    }

    // ── 3. Award badge ─────────────────────────────────────
    const currentBadges: string[] = (student.badges as string[]) ?? []
    // Remove lower-tier badges when upgrading
    const badgeSet = new Set(currentBadges.filter(
      (b) => b !== 'faculty_connector' && b !== 'faculty_champion' && b !== 'faculty_legend'
    ))
    badgeSet.add(badge)

    await admin
      .from('profiles')
      .update({ badges: Array.from(badgeSet) })
      .eq('id', studentId)

    // ── 4. Mark reward as fired ────────────────────────────
    await admin
      .from('faculty_nominations')
      .update({
        reward_fired: true,
        reward_fired_at: new Date().toISOString(),
        status: 'eminent',
      })
      .eq('id', nominationId)

    // ── 5. WhatsApp notification (fire-and-forget) ─────────
    if (student.wa_phone && WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      const facultyFirst = (nomination.faculty_name as string)
        .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
        .split(' ')[0]

      const firstName = ((student.full_name as string) ?? 'there').split(' ')[0]

      const badgeLabel =
        badge === 'faculty_legend' ? 'Faculty Legend'
        : badge === 'faculty_champion' ? 'Faculty Champion'
        : 'Faculty Connector'

      const milestoneMsg =
        newCount === 10
          ? '\n\n\ud83c\udfc6 You have reached Faculty Legend status \u2014 3 months Pro activated.'
          : newCount === 5
            ? '\n\n\ud83c\udf1f You have reached Faculty Champion status \u2014 1 month Pro activated.'
            : ''

      const waPhone = (student.wa_phone as string).replace(/\D/g, '')

      fetch(
        `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waPhone,
            type: 'text',
            text: {
              body: `\ud83c\udf89 ${firstName} \u2014 ${facultyFirst} has been verified on EdUsaathiAI!\n\nYour recommendation made this happen.\n\n\u2726 \u20b950 added to your wallet\n\u2726 50 Saathi Points added\n\u2726 ${badgeLabel} badge earned${milestoneMsg}\n\nThank you for building EdUsaathiAI. \ud83d\ude4f`,
            },
          }),
        },
      ).catch((e) => console.error('[fire-nomination-reward] WhatsApp error:', e))
    }

    return json(
      {
        success: true,
        reward: {
          wallet_added_paise: REWARD_WALLET_PAISE,
          points_added: REWARD_SAATHI_POINTS,
          badge,
          nomination_count: newCount,
        },
      },
      200,
      CORS,
    )

  } catch (err) {
    console.error('[fire-nomination-reward] error:', err)
    return json({ error: String(err) }, 500, corsHeaders(req))
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
