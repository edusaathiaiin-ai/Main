import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProgressClient } from '@/components/progress/ProgressClient'
import { toSlug } from '@/constants/verticalIds'

export const metadata = {
  title: 'My Progress · EdUsaathiAI',
  description: 'Your learning journey',
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_saathi_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboard')

  // primary_saathi_id is a UUID — convert to slug before passing to ProgressClient
  const saathiSlug = toSlug(profile.primary_saathi_id) ?? 'kanoonsaathi'

  return (
    <ProgressClient saathiId={saathiSlug} />
  )
}
