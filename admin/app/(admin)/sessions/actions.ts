'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function releaseToFaculty(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId) return;

  const admin = getAdminClient();
  await admin
    .from('faculty_sessions')
    .update({
      payout_status: 'released',
      payout_released_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (note) {
    await admin.from('moderation_flags').insert({
      flag_type: 'session_admin_action',
      content: `Dispute resolved (release to faculty): session ${sessionId} — ${note}`,
      reported_by: null,
      resolved: true,
    });
  }

  revalidatePath('/sessions');
}

export async function refundStudent(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId) return;

  const admin = getAdminClient();
  await admin
    .from('faculty_sessions')
    .update({
      status: 'cancelled',
      refund_status: 'refunded',
      cancelled_by: 'admin',
      cancellation_reason: note || 'Admin refund — dispute resolved for student',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  revalidatePath('/sessions');
}

export async function addSessionNote(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId || !note) return;

  const admin = getAdminClient();
  await admin.from('moderation_flags').insert({
    flag_type: 'session_admin_note',
    content: `Admin note on session ${sessionId}: ${note}`,
    reported_by: null,
    resolved: true,
  });

  revalidatePath('/sessions');
}
