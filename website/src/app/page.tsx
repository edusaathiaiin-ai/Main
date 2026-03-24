import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Root page — redirects:
 *   authenticated → /chat
 *   guest         → /login
 *
 * The static landing page lives at edusaathiai.in (separate Vercel project).
 */
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/chat');
  } else {
    redirect('/login');
  }
}
