'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function approveLiveSession(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  if (!sessionId) return;

  const admin = getAdminClient();
  await admin
    .from('live_sessions')
    .update({
      status: 'published',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  revalidatePath('/live');
}

export async function rejectLiveSession(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const reason = formData.get('reason') as string;
  if (!sessionId || !reason) return;

  const admin = getAdminClient();
  await admin
    .from('live_sessions')
    .update({
      status: 'cancelled',
      admin_note: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  revalidatePath('/live');
}

export async function cancelLiveSession(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const reason = formData.get('reason') as string;
  if (!sessionId || !reason) return;

  const admin = getAdminClient();

  // Cancel the session
  await admin
    .from('live_sessions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'admin',
      cancellation_reason: reason,
    })
    .eq('id', sessionId);

  // Mark all bookings as refunded
  await admin
    .from('live_bookings')
    .update({ refund_status: 'refunded' })
    .eq('session_id', sessionId);

  revalidatePath('/live');
}
