import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewsFeed } from '@/components/news/NewsFeed'

export const metadata = {
  title: 'Latest News · EdUsaathiAI',
  description: 'Curated news, research papers and exam alerts for your Saathi',
}

export default async function NewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) redirect('/onboard')

  return <NewsFeed />
}
