/**
 * lib/auth.ts
 * Server-side session guard. Returns the admin user or null.
 */
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

// Allowed admin emails — keep in sync with login/page.tsx
const ADMIN_EMAILS = ['edusaathiai.in@gmail.com']

export async function getAdminSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Server Components cannot write cookies — silently skip.
          // Token refresh happens in the auth/callback Route Handler.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Expected in Server Component context — safe to ignore.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Check email allowlist (no DB query required)
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) return null

  return { user }
}

export async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  return session
}
