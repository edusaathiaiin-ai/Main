import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatWelcomeGate } from '@/components/chat/WelcomeOverlay'
import { DailyChallengeWidget } from '@/components/chat/DailyChallengeWidget'
import { toSlug } from '@/constants/verticalIds'

export const metadata = {
  title: 'Chat with your Saathi · EdUsaathiAI',
  description: 'Your personal AI learning companion',
}

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile — if not active yet, redirect to onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    redirect('/onboard')
  }

  // Fetch soul data — only columns guaranteed to exist in DB
  // first_session_welcomed is managed client-side in WelcomeOverlay via localStorage
  // to avoid server errors from migration timing
  const { data: soul } = await supabase
    .from('student_soul')
    .select('session_count, academic_level')
    .eq('user_id', user.id)
    .eq('vertical_id', profile.primary_saathi_id ?? '')
    .maybeSingle()

  return (
    <>
      {/* WaLinkTip moved into ChatWindow (renders below the chat input
          after the student has actually had a chat exchange) */}
      <ChatWelcomeGate
        userId={user.id}
        profileName={profile.full_name ?? user.email ?? 'Student'}
        saathiId={toSlug(profile.primary_saathi_id) ?? null}
        academicLevel={soul?.academic_level ?? 'bachelor'}
        sessionCount={soul?.session_count ?? 1}
      >
        <ChatWindow />
      </ChatWelcomeGate>
      {toSlug(profile.primary_saathi_id) && (
        <DailyChallengeWidget
          saathiId={toSlug(profile.primary_saathi_id)!}
        />
      )}
    </>
  )
}
