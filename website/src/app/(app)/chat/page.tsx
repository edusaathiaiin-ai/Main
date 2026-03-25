import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatWelcomeGate } from '@/components/chat/WelcomeOverlay';

export const metadata = {
  title: 'Chat with your Saathi · EdUsaathiAI',
  description: 'Your personal AI learning companion',
};

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile — if not active yet, redirect to onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/onboard');
  }

  // Fetch soul data for welcome overlay (session_count)
  const { data: soul } = await supabase
    .from('student_soul')
    .select('session_count, academic_level, first_session_welcomed')
    .eq('user_id', user.id)
    .eq('saathi_id', profile.primary_saathi_id ?? '')
    .single();

  const showWelcome = soul && soul.session_count === 0 && !soul.first_session_welcomed;

  return (
    <ChatWelcomeGate
      userId={user.id}
      profileName={profile.full_name ?? user.email ?? 'Student'}
      saathiId={profile.primary_saathi_id ?? null}
      academicLevel={soul?.academic_level ?? 'bachelor'}
      sessionCount={showWelcome ? 0 : 1}
    >
      <ChatWindow />
    </ChatWelcomeGate>
  );
}
