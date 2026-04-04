'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export async function removeRequest(formData: FormData) {
  await requireAdmin()
  const requestId = formData.get('request_id') as string
  if (!requestId) return

  const admin = getAdminClient()
  await admin
    .from('lecture_requests')
    .update({ status: 'declined', is_public: false })
    .eq('id', requestId)

  revalidatePath('/requests')
}

export async function reassignRequest(formData: FormData) {
  await requireAdmin()
  const requestId = formData.get('request_id') as string
  const newFacultyId = formData.get('faculty_id') as string
  if (!requestId || !newFacultyId) return

  const admin = getAdminClient()
  await admin
    .from('lecture_requests')
    .update({ faculty_id: newFacultyId })
    .eq('id', requestId)

  revalidatePath('/requests')
}
