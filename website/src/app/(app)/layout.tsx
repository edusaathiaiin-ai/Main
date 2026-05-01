import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TourManager } from '@/components/tour/TourManager'
import { ThemeBridge } from '@/components/layout/ThemeBridge'
import { RoleIntentBanner } from '@/components/layout/RoleIntentBanner'

// Force all protected routes to be server-rendered on demand (never statically collected)
export const dynamic = 'force-dynamic'

/**
 * Protected app layout.
 * Server-side auth check — middleware also protects, this is a second layer.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Name gate: if profile is active but has no valid name, force name collection
  // before any app page is accessible. Catches Google OAuth users with bad names.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('needs_name_update, is_active')
    .eq('id', user.id)
    .single()

  if (profileRow?.is_active && profileRow?.needs_name_update) {
    redirect('/onboard?step=name')
  }

  return (
    <>
      <ThemeBridge />
      <RoleIntentBanner />
      {children}
      <TourManager />
    </>
  )
}
