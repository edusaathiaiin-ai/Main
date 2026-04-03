/**
 * intern-matching.ts
 *
 * Soul-based match scoring for internship_postings.
 * Called client-side at apply time to embed a score in intern_applications.
 *
 * Scoring breakdown (max 100 pts):
 *   30 — Saathi/vertical match
 *   25 — Depth calibration
 *   20 — Research dream alignment (research postings only)
 *   15 — Subject overlap with top_topics + enrolled_subjects
 *   10 — Academic level meets minimum requirement
 */

import type { Profile } from '@/types';

// ── Posting snapshot (columns we need from internship_postings) ───────────────

export type PostingForMatch = {
  posting_type: 'institution' | 'research';
  vertical_id: string | null;
  min_depth: number;
  min_academic_level: string;
  preferred_subjects: string[];
  research_area: string | null;
};

// ── Soul snapshot (from student_soul row or soul_snapshot JSONB) ──────────────

export type SoulForMatch = {
  depth_calibration: number | null;
  future_research_area: string | null;
  top_topics: string[] | null;
  enrolled_subjects: string[] | null;
};

// ── Academic level ordering ───────────────────────────────────────────────────

const LEVEL_RANK: Record<string, number> = {
  any:      0,
  bachelor: 1,
  masters:  2,
  phd:      3,
};

function levelRank(level: string | null | undefined): number {
  return LEVEL_RANK[level ?? 'bachelor'] ?? 1;
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function computeMatchScore(
  posting: PostingForMatch,
  soul: SoulForMatch,
  profile: Profile,
): number {
  let score = 0;

  // 1. Saathi / vertical match (30 pts)
  if (posting.vertical_id) {
    if (profile.primary_saathi_id === posting.vertical_id) {
      score += 30;
    } else if (profile.wa_saathi_id === posting.vertical_id) {
      score += 15;
    }
  }

  // 2. Depth calibration (25 pts)
  const depth = soul.depth_calibration ?? 0;
  const minDepth = posting.min_depth ?? 0;
  if (depth >= minDepth) {
    const excess = Math.min(depth - minDepth, 30);
    score += 15 + Math.floor(excess / 3);
  }

  // 3. Research dream alignment (20 pts) — research postings only
  if (
    posting.posting_type === 'research' &&
    posting.research_area &&
    soul.future_research_area
  ) {
    const keyword = posting.research_area.toLowerCase().split(' ')[0];
    const matches = soul.future_research_area.toLowerCase().includes(keyword);
    score += matches ? 20 : 5; // partial credit for showing interest
  }

  // 4. Subject overlap (15 pts)
  if (posting.preferred_subjects.length > 0) {
    const studentTopics = [
      ...(soul.top_topics ?? []),
      ...(soul.enrolled_subjects ?? []),
    ].map((t) => t.toLowerCase());

    const overlap = posting.preferred_subjects.filter((s) =>
      studentTopics.some((t) => t.includes(s.toLowerCase()))
    ).length;

    score += Math.min(overlap * 5, 15);
  }

  // 5. Academic level (10 pts)
  const studentLevel = levelRank(profile.academic_level);
  const requiredLevel = levelRank(posting.min_academic_level);
  if (studentLevel >= requiredLevel) {
    score += 10;
  }

  return Math.min(score, 100);
}

// ── Build soul_snapshot JSONB for storing at apply time ──────────────────────

export function buildSoulSnapshot(soul: SoulForMatch): Record<string, unknown> {
  return {
    depth: soul.depth_calibration ?? 0,
    top_topics: soul.top_topics ?? [],
    future_research_area: soul.future_research_area ?? null,
    enrolled_subjects: soul.enrolled_subjects ?? [],
  };
}
