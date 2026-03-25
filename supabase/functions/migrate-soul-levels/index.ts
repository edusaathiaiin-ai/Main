/**
 * supabase/functions/migrate-soul-levels/index.ts
 *
 * One-time migration: sets academic_level defaults and runs
 * instantCalibrate() for all existing student_soul rows
 * that were created before the instant calibration feature.
 *
 * SECURITY: Requires the Supabase service_role key.
 * USAGE:
 *   POST https://vpmpuxosyrijknbxautx.supabase.co/functions/v1/migrate-soul-levels
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Run ONCE. Then the function can be left or deleted.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// ── Inline calibration logic (mirrors lib/instantSoulCalibration.ts) ──────────
// Deno cannot import from the Next.js app layer, so we inline what we need.

type AcademicLevel =
  | 'diploma' | 'bachelor' | 'masters' | 'phd' | 'professional'
  | 'postdoc' | 'competitive' | 'professional_learner' | 'exploring';

type FlameStage = 'cold' | 'spark' | 'flame' | 'fire' | 'wings';
type CareerDiscoveryStage = 'unaware' | 'exploring' | 'interested' | 'committed';
type AmbitionLevel = 'low' | 'medium' | 'high' | 'very_high';

type InstantCalibration = {
  depth_calibration: number;
  peer_mode: boolean;
  exam_mode: boolean;
  ambition_level: AmbitionLevel;
  flame_stage: FlameStage;
  career_discovery_stage: CareerDiscoveryStage;
  prior_knowledge_base: string[];
};

const DEPTH_MAP: Record<AcademicLevel, number | null> = {
  diploma: 25, bachelor: null, masters: 70, phd: 88,
  professional: 55, postdoc: 92, competitive: 50,
  professional_learner: 60, exploring: 30,
};

const AMBITION_MAP: Record<AcademicLevel, AmbitionLevel> = {
  diploma: 'medium', bachelor: 'medium', masters: 'high',
  phd: 'very_high', professional: 'high', postdoc: 'very_high',
  competitive: 'high', professional_learner: 'medium', exploring: 'low',
};

const FLAME_MAP: Record<AcademicLevel, FlameStage> = {
  diploma: 'cold', bachelor: 'cold', masters: 'flame',
  phd: 'fire', professional: 'flame', postdoc: 'wings',
  competitive: 'flame', professional_learner: 'spark', exploring: 'cold',
};

const DISCOVERY_MAP: Record<AcademicLevel, CareerDiscoveryStage> = {
  diploma: 'unaware', bachelor: 'unaware', masters: 'interested',
  phd: 'committed', professional: 'interested', postdoc: 'committed',
  competitive: 'committed', professional_learner: 'exploring', exploring: 'unaware',
};

function instantCalibrate(level: AcademicLevel): InstantCalibration {
  const depth = DEPTH_MAP[level] ?? 40; // null (bachelor) → 40 = mid-default
  return {
    depth_calibration: depth,
    peer_mode: level === 'phd' || level === 'postdoc',
    exam_mode: level === 'competitive',
    ambition_level: AMBITION_MAP[level] ?? 'medium',
    flame_stage: FLAME_MAP[level] ?? 'cold',
    career_discovery_stage: DISCOVERY_MAP[level] ?? 'unaware',
    prior_knowledge_base:
      level === 'masters' || level === 'phd' || level === 'postdoc'
        ? ['undergraduate fundamentals']
        : [],
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // ── Security gate: require CRON_SECRET to prevent accidental re-runs ────────
  const providedSecret = req.headers.get('x-cron-secret');
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: CORS,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all soul rows that have no academic_level set yet
  const { data: souls, error: fetchErr } = await admin
    .from('student_soul')
    .select('id, academic_level, ambition_level, session_count')
    .is('academic_level', null);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: CORS,
    });
  }

  if (!souls || souls.length === 0) {
    return new Response(JSON.stringify({ message: 'All souls already calibrated.', updated: 0 }), {
      status: 200, headers: CORS,
    });
  }

  let updated = 0;
  let failed  = 0;
  const errors: string[] = [];

  for (const soul of souls) {
    // Safe default: bachelor for existing users
    const level: AcademicLevel = 'bachelor';
    const calibration = instantCalibrate(level);

    const { error: updateErr } = await admin
      .from('student_soul')
      .update({
        academic_level:          level,
        depth_calibration:       calibration.depth_calibration,
        peer_mode:               calibration.peer_mode,
        exam_mode:               calibration.exam_mode,
        flame_stage:             calibration.flame_stage,
        career_discovery_stage:  calibration.career_discovery_stage,
        prior_knowledge_base:    calibration.prior_knowledge_base,
        // Do NOT overwrite ambition_level if already set
        ...(soul.ambition_level === 'medium' || soul.ambition_level === null
          ? { ambition_level: calibration.ambition_level }
          : {}),
      })
      .eq('id', soul.id as string);

    if (updateErr) {
      failed++;
      errors.push(`soul ${soul.id as string}: ${updateErr.message}`);
    } else {
      updated++;
    }

    // Small delay to avoid overwhelming DB on large datasets
    if (updated % 50 === 0) await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`[migrate-soul-levels] updated=${updated} failed=${failed}`);

  return new Response(
    JSON.stringify({
      message: `Migration complete.`,
      updated,
      failed,
      errors: errors.slice(0, 10), // limit error list
    }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
