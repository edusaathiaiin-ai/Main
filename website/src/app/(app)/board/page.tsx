import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionFeed } from '@/components/board/QuestionFeed'

export const metadata = {
  title: 'Community Board · EdUsaathiAI',
  description: 'Ask questions and get AI + faculty-verified answers',
}

export default async function BoardPage() {
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

  return (
    <Suspense>
      <QuestionFeed />
    </Suspense>
  )
}
