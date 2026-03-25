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
  } catch {
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
