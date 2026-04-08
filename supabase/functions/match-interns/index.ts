import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';


// ── Types ─────────────────────────────────────────────────────────────────────

type Listing = {
  id: string;
  required_saathi_slug: string | null;
  required_academic_level: string | null;
  required_flame_stage: string;
  required_min_profile_pct: number;
  description: string;
  institution_name?: string;
  title: string;
};

type StudentSoul = {
  user_id: string;
  vertical_id: string;
  flame_stage: string | null;
  career_interest: string | null;
  future_research_area: string | null;
  passion_intensity: number | null;
  career_discovery_stage: string | null;
  top_topics: string[] | null;
};

type StudentProfile = {
  id: string;
  academic_level: string | null;
  profile_completeness_pct: number;
};

type ScoreBreakdown = Record<string, number>;

// ── Scoring helper ────────────────────────────────────────────────────────────

const FLAME_ORDER = ['cold', 'spark', 'flame', 'fire', 'wings'] as const;
type FlameStage = (typeof FLAME_ORDER)[number];

function flameScore(stage: string | null): number {
  const map: Record<FlameStage, number> = { cold: 0, spark: 5, flame: 10, fire: 15, wings: 15 };
  return map[(stage ?? 'cold') as FlameStage] ?? 0;
}

function flameAtLeast(candidateStage: string | null, requiredStage: string): boolean {
  const ci = FLAME_ORDER.indexOf((candidateStage ?? 'cold') as FlameStage);
  const ri = FLAME_ORDER.indexOf((requiredStage ?? 'spark') as FlameStage);
  return ci >= ri;
}

function matchAcademicLevel(studentLevel: string | null, requiredLevel: string | null): number {
  if (!requiredLevel) return 20; // no requirement — full points
  if (!studentLevel) return 0;
  return studentLevel === requiredLevel ? 20 : 0;
}

// ── Main matching function ────────────────────────────────────────────────────

async function matchStudents(listingId: string): Promise<number> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch listing
  const { data: listingRaw, error: listingErr } = await admin
    .from('intern_listings')
    .select('id, required_saathi_slug, required_academic_level, required_flame_stage, required_min_profile_pct, description, title')
    .eq('id', listingId)
    .single();

  if (listingErr || !listingRaw) throw new Error(`Listing not found: ${listingId}`);
  const listing: Listing = listingRaw as Listing;

  // 2. Fetch eligible student souls
  let soulQuery = admin
    .from('student_soul')
    .select('user_id, vertical_id, flame_stage, career_interest, future_research_area, passion_intensity, career_discovery_stage, top_topics');

  if (listing.required_saathi_slug) {
    soulQuery = soulQuery.eq('vertical_id', listing.required_saathi_slug);
  }

  const { data: souls } = await soulQuery.limit(500);
  if (!souls?.length) return 0;

  // 3. Fetch profiles for completeness filter
  const userIds = souls.map((s: StudentSoul) => s.user_id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, academic_level, profile_completeness_pct')
    .in('id', userIds);

  const profileMap: Record<string, StudentProfile> = Object.fromEntries(
    (profiles ?? []).map((p: StudentProfile) => [p.id, p])
  );

  // 4. Score each student
  const scored = souls.map((soul: StudentSoul) => {
    const profile = profileMap[soul.user_id];
    if (!profile) return null;

    // Profile completeness gate
    if (profile.profile_completeness_pct < listing.required_min_profile_pct) return null;

    let score = 0;
    const breakdown: ScoreBreakdown = {};

    // 5a. Saathi match (40 pts)
    if (!listing.required_saathi_slug || soul.vertical_id === listing.required_saathi_slug) {
      const pts = 40;
      score += pts;
      breakdown.saathi_match = pts;
    }

    // 5b. Academic level (20 pts)
    const levelPts = matchAcademicLevel(profile.academic_level, listing.required_academic_level);
    score += levelPts;
    if (levelPts > 0) breakdown.academic_level = levelPts;

    // 5c. Flame stage (15 pts)
    const flPts = flameScore(soul.flame_stage);
    const flameQualifies = flameAtLeast(soul.flame_stage, listing.required_flame_stage);
    if (flameQualifies && flPts > 0) {
      score += flPts;
      breakdown.flame_stage = flPts;
    }

    // 5d. Career interest alignment (15 pts)
    if (soul.career_interest && listing.description) {
      const keyword = soul.career_interest.toLowerCase().split(' ')[0];
      if (keyword && listing.description.toLowerCase().includes(keyword)) {
        score += 15;
        breakdown.career_alignment = 15;
      }
    }

    // 5e. Profile completeness bonus (10 pts)
    const pctBonus = Math.floor((profile.profile_completeness_pct / 100) * 10);
    score += pctBonus;
    if (pctBonus > 0) breakdown.profile_completeness = pctBonus;

    return {
      listing_id: listingId,
      student_user_id: soul.user_id,
      match_score: Math.min(100, score),
      score_breakdown: breakdown,
    };
  }).filter((m): m is NonNullable<typeof m> => m !== null && m.match_score >= 40);

  // 5. Sort and take top 100
  const topMatches = scored
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 100);

  if (!topMatches.length) return 0;

  // 6. Upsert matches
  await admin.from('intern_matches').upsert(topMatches, { onConflict: 'listing_id,student_user_id' });

  // 7. Notify top 50 students
  const listingTitle = listing.title;
  const toNotify = topMatches.slice(0, 50);
  if (toNotify.length > 0) {
    const notifications = toNotify.map((m) => ({
      user_id: m.student_id,
      type: 'internship_match',
      title: 'New internship matches your profile',
      body: `"${listingTitle}" — you are a ${m.match_score}% match.`,
      data: { listing_id: listingId, score: m.match_score },
      is_read: false,
    }));

    // Best-effort — table may not exist yet
    await admin.from('student_notifications').insert(notifications).then(() => {}).catch(() => {});
  }

  return topMatches.length;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as { listing_id?: string };
    const { listing_id } = body;

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'listing_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const matched = await matchStudents(listing_id);

    return new Response(
      JSON.stringify({ success: true, matched }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[match-interns] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
