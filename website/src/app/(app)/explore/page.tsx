import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExploreClient } from '@/components/explore/ExploreClient'

export const metadata = {
  title: 'Explore Beyond · EdUsaathiAI',
  description:
    'Curated books, journals, tools, and channels for your Saathi — updated every week.',
}

export default async function ExplorePage() {
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

  return (
    <ExploreClient saathiId={profile.primary_saathi_id ?? 'kanoonsaathi'} />
  )
}
