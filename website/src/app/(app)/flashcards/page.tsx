import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlashcardsClient } from '@/components/flashcards/FlashcardsClient'

export const metadata = {
  title: 'My Flashcards · EdUsaathiAI',
  description: 'Review your saved flashcards with spaced repetition',
}

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_saathi_id, full_name, plan_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboard')

  return (
    <FlashcardsClient saathiId={profile.primary_saathi_id ?? 'kanoonsaathi'} />
  )
}
