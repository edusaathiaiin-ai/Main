import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Force all protected routes to be server-rendered on demand (never statically collected)
export const dynamic = 'force-dynamic';

/**
 * Protected app layout.
 * Server-side auth check — middleware also protects, this is a second layer.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect('/login');
    }
    // Users who haven't completed onboarding (no Saathi selected) go back to onboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_saathi_id')
      .eq('id', user.id)
      .single();
    if (!profile?.primary_saathi_id) {
      redirect('/onboard');
    }
  } catch (e) {
    // Redirect errors are thrown by Next.js — rethrow them
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
    // If Supabase is unreachable or env vars missing, redirect to login
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar and Navbar — Step W3 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
