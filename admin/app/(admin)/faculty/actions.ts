'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function verifyFaculty(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('user_id') as string;
  const institution = formData.get('institution') as string;
  const note = formData.get('note') as string;
  if (!userId) return;

  const admin = getAdminClient();

  await admin
    .from('faculty_profiles')
    .update({
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      ...(institution ? { institution } : {}),
    })
    .eq('user_id', userId);

  await admin.from('moderation_flags').insert({
    flag_type: 'faculty_verified',
    content: `Faculty verified: ${userId}${note ? ` — ${note}` : ''}`,
    reported_by: null,
    resolved: true,
  });

  revalidatePath('/faculty');
}

export async function rejectFaculty(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('user_id') as string;
  const reason = formData.get('reason') as string;
  const custom = formData.get('custom') as string;
  if (!userId || !reason) return;

  const admin = getAdminClient();

  await admin
    .from('faculty_profiles')
    .update({
      verification_status: 'rejected',
      rejection_reason: custom || reason,
    })
    .eq('user_id', userId);

  revalidatePath('/faculty');
}

export async function markEmeritus(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('user_id') as string;
  const retirementYear = parseInt(formData.get('retirement_year') as string, 10);
  const formerInstitution = formData.get('former_institution') as string;
  if (!userId) return;

  const admin = getAdminClient();

  await admin
    .from('faculty_profiles')
    .update({
      is_emeritus: true,
      verification_status: 'verified',
      ...(retirementYear ? { retirement_year: retirementYear } : {}),
      ...(formerInstitution ? { institution: formerInstitution } : {}),
    })
    .eq('user_id', userId);

  revalidatePath('/faculty');
}

export async function revokeFacultyVerification(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('user_id') as string;
  if (!userId) return;

  const admin = getAdminClient();

  await admin
    .from('faculty_profiles')
    .update({ verification_status: 'pending' })
    .eq('user_id', userId);

  revalidatePath('/faculty');
}
