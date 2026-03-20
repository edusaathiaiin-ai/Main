/**
 * lib/nudgeSelector.ts
 *
 * Smart nudge selector for Hinglish conversion popups.
 * Applies contextual priority: exam type, city, days until exam,
 * tone preference, and full deduplication across a user's history.
 */

import { NUDGE_LIBRARY } from '@/constants/nudges';
import type { NudgeMessage } from '@/constants/nudges';
import { interpolateCopy } from '@/constants/copy';

const GUJARAT_CITIES = new Set([
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar',
  'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Navsari',
]);

const MUMBAI_CITIES = new Set([
  'Mumbai', 'Thane', 'Navi Mumbai', 'Pune',
]);

const UPSC_DELHI_CITIES = new Set([
  'Delhi', 'New Delhi', 'Noida', 'Gurgaon', 'Gurugram',
]);

const UPSC_EXAM_TYPES = new Set(['UPSC', 'IAS', 'IPS', 'IFS']);
const NEET_JEE_TYPES = new Set(['NEET', 'JEE', 'JEE Main', 'JEE Advanced', 'AIIMS']);

export type NudgeSelectParams = {
  userId: string;
  triggerType: string;
  userProfile: {
    displayName: string;
    city: string | null;
    examTarget: string | null;
    preferredTone: string | null;
    daysUntilExam: number | null;
  };
  /** IDs of nudges already shown to this user for this trigger */
  shownNudgeIds: number[];
  /** ID of the last nudge shown — never repeat consecutively */
  lastNudgeId: number | null;
};

/** Score a nudge for this user — higher = more preferred */
function scoreNudge(nudge: NudgeMessage, params: NudgeSelectParams): number {
  let score = 0;
  const { userProfile } = params;
  const city = userProfile.city ?? '';
  const examTarget = userProfile.examTarget ?? '';
  const tone = userProfile.preferredTone ?? 'neutral';
  const daysUntilExam = userProfile.daysUntilExam;

  // Regional boosts
  if (nudge.targetCities) {
    if (GUJARAT_CITIES.has(city) && nudge.targetCities.some((c) => GUJARAT_CITIES.has(c))) {
      score += 20;
    }
    if (MUMBAI_CITIES.has(city) && nudge.targetCities.some((c) => MUMBAI_CITIES.has(c))) {
      score += 20;
    }
  }

  // Exam type boosts
  if (nudge.targetExamTypes) {
    if (
      UPSC_EXAM_TYPES.has(examTarget) &&
      nudge.targetExamTypes.some((e) => UPSC_EXAM_TYPES.has(e))
    ) {
      score += 15;
      // Additional bonus for Delhi + UPSC → Mukherjee Nagar nudge
      if (UPSC_DELHI_CITIES.has(city)) score += 10;
    }
    if (
      NEET_JEE_TYPES.has(examTarget) &&
      nudge.targetExamTypes.some((e) => NEET_JEE_TYPES.has(e))
    ) {
      score += 15;
    }
  }

  // Exam urgency boost
  if (daysUntilExam !== null && daysUntilExam < 21 && nudge.tone === 'urgent') {
    score += 12;
  }

  // Tone preference
  if (tone === 'casual' && nudge.tone === 'funny') score += 8;
  if (tone === 'formal' && nudge.tone === 'logical') score += 8;
  if (tone === 'neutral') score += 2; // slight boost to any nudge for neutral

  return score;
}

/**
 * Select the best nudge for this user at this moment.
 * - Filters to compatible trigger types
 * - Excludes shown nudge IDs (resets when all seen)
 * - Applies contextual scoring
 * - Interpolates [Name] placeholder
 * - Never repeats same nudge consecutively
 */
export function selectNudge(params: NudgeSelectParams): NudgeMessage {
  const { triggerType, shownNudgeIds, lastNudgeId, userProfile } = params;

  // Step 1: Filter by trigger compatibility
  let candidates = NUDGE_LIBRARY.filter((n) => n.triggerTypes.includes(triggerType));

  if (candidates.length === 0) {
    // Fallback — return a safe default
    return interpolateNudge(NUDGE_LIBRARY[0], userProfile.displayName);
  }

  // Step 2: Exclude already-shown IDs; if all shown, reset (reshuffle)
  const shownSet = new Set(shownNudgeIds);
  let unseen = candidates.filter((n) => !shownSet.has(n.id));
  if (unseen.length === 0) {
    // All shown — full reset, but still exclude the last one to avoid consecutive repeat
    unseen = candidates;
  }

  // Step 3: Never repeat last shown consecutively (if possible)
  const withoutLast = lastNudgeId !== null
    ? unseen.filter((n) => n.id !== lastNudgeId)
    : unseen;
  const pool = withoutLast.length > 0 ? withoutLast : unseen;

  // Step 4: Score all candidates
  const scored = pool.map((n) => ({ nudge: n, score: scoreNudge(n, params) }));

  // Step 5: Sort descending by score, then pick top (with tie-break shuffle)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: random shuffle for variety
    return Math.random() - 0.5;
  });

  const selected = scored[0].nudge;

  return interpolateNudge(selected, userProfile.displayName);
}

/** Replace [Name] placeholder and return a new nudge object */
function interpolateNudge(nudge: NudgeMessage, displayName: string): NudgeMessage {
  return {
    ...nudge,
    hindi: interpolateCopy(nudge.hindi, { name: displayName }),
    english: interpolateCopy(nudge.english, { name: displayName }),
    cta: interpolateCopy(nudge.cta, { name: displayName }),
  };
}
