import type { SupabaseClient } from '@supabase/supabase-js'
import { EXAM_REGISTRY } from '@/constants/exams'

// Idempotent — creates a pinned exam Board if and only if the student
// doesn't already have one for this (user × Saathi × exam). Safe to call
// on every profile save that touches exam_target_id.
//
// The focus_statement stays under 100 chars for every registry exam
// because the composer uses exam.name (short form), not full_name.
export async function createExamBoardIfMissing(
  supabase: SupabaseClient,
  params: {
    userId:          string
    saathiSlug:      string
    examTargetId:    string
    examTargetYear:  number | null
  },
): Promise<void> {
  const { userId, saathiSlug, examTargetId, examTargetYear } = params
  if (!userId || !saathiSlug || !examTargetId) return

  const exam = EXAM_REGISTRY.find((e) => e.id === examTargetId)
  if (!exam) return

  // Dedupe: skip if a Board for this exam already exists in this workspace
  // (archived or not). Changing exams creates a new Board, leaves the old.
  const { data: existing } = await supabase
    .from('chatboards')
    .select('id')
    .eq('user_id', userId)
    .eq('saathi_slug', saathiSlug)
    .eq('exam_target_id', examTargetId)
    .limit(1)
    .maybeSingle()
  if (existing) return

  const year = examTargetYear ?? new Date().getFullYear() + 1

  await supabase.from('chatboards').insert({
    user_id:         userId,
    saathi_slug:     saathiSlug,
    name:            `${exam.name} ${year} Prep`,
    emoji:           '🎯',
    board_type:      'exam',
    exam_target_id:  examTargetId,
    focus_statement: `Focused ${exam.name} preparation. Stay on syllabus.`,
    is_pinned:       true,
    position:        -1,
  })
}
