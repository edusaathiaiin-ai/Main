import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must be called before any redirects
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // ── Always allow these paths ──────────────────────────────────────────────
  // /auth/* — PKCE callback & OAuth exchange
  // /login  — sign-in page (always public, even for logged-in users)
  // /       — landing page (page.tsx handles its own auth-based redirect)
  // /privacy, /terms, /pricing — public marketing pages
  if (
    url.pathname.startsWith('/auth') ||
    url.pathname === '/login' ||
    url.pathname === '/' ||
    url.pathname === '/privacy' ||
    url.pathname === '/terms' ||
    url.pathname === '/pricing'
  ) {
    return supabaseResponse;
  }

  // ── Protected routes — redirect to /login if not authenticated ────────────
  // NOTE: /onboard is in this list but onboard/page.tsx manages ALL its own
  // internal routing (academic → saathi → profile → chat). Middleware only
  // gates the door; it does NOT redirect onboard → chat.
  const PROTECTED = ['/chat', '/board', '/news', '/profile', '/onboard'];
  const isProtected = PROTECTED.some((p) => url.pathname.startsWith(p));

  if (!user && isProtected) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Everything else — pass through ───────────────────────────────────────
  return supabaseResponse;
}
