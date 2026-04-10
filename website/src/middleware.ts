import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that never need an auth check — serve immediately
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/privacy',
  '/terms',
  '/pricing',
  '/about',
  '/_next',
  '/favicon',
  '/manifest',
  '/icon',
  '/robots',
  '/sw.js',
  '/offline',
  '/auth',   // PKCE callback handles its own auth
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Short-circuit: no Supabase round-trip for public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Protected routes — verify session
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files — never need auth)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml
     * - public files (icons, images, sw.js etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css)$).*)',
  ],
}
