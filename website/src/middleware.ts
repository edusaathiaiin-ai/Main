import { type NextRequest, NextResponse, after } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  extractRequestContext,
  isAllowedOrigin,
  logSecurityEvent,
  sanitizeMetadata,
} from '@/lib/security'

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
  '/auth',            // PKCE callback handles its own auth
  '/api/contact',     // public contact form — anonymous visitors must be able to POST
  '/api/classroom',   // read-only proxies to public APIs (PubMed/NCBI, RCSB, PubChem, NASA, openFDA …)
  '/api/pubmed',      // direct biomedical search proxy
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // Week 1 security observability (observe only — never block).
  // Fire bad_origin for any /api/* hit whose Origin header is present but
  // not in the allowlist. Runs regardless of auth, so it catches scrapers
  // hitting public proxy routes too.
  if (isApi) {
    const origin = request.headers.get('origin')
    if (origin && !isAllowedOrigin(origin)) {
      const ctx = extractRequestContext(request.headers, pathname, request.method)
      after(
        logSecurityEvent({
          event_type: 'bad_origin',
          severity: 'warn',
          ...ctx,
        }),
      )
    }
  }

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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) {
    // Week 1 observability: record every anon hit on a protected route
    // before redirecting. This is the signal most likely to reveal leaks
    // or probes targeting endpoints that expect a session.
    if (isApi) {
      const ctx = extractRequestContext(request.headers, pathname, request.method)
      after(
        logSecurityEvent({
          event_type: 'anon_hit_protected',
          severity: 'warn',
          ...ctx,
          metadata: sanitizeMetadata({
            auth_error: authError?.message ?? 'no_session',
            path: pathname,
          }),
        }),
      )
    }

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
