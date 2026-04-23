// ─────────────────────────────────────────────────────────────────────────────
// GET /api/institutions/search?q=<2+ chars>
//
// Public "Find My Institution" endpoint. Returns up to 8 institutions whose
// status is 'trial' or 'active', matched on name OR city via ilike. Rate
// limited to 30 requests per minute per client IP via Upstash (fails open
// when Upstash env vars are absent so local dev stays unobstructed).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/ratelimit'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  // Rate limit first — cheap and keeps scraper traffic off the DB.
  const ok = await checkRateLimit('institutions-search', clientIp(req), 30, 60)
  if (!ok) return rateLimitResponse()

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Anon key suffices — RLS already restricts SELECT to active/trial rows.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Escape Postgres `%` / `_` wildcards in user input so they can't expand
  // the search unintentionally.
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`)
  const pattern = `%${escaped}%`

  const { data, error } = await supabase
    .from('institutions')
    .select('id, slug, name, city, affiliation')
    .in('status', ['trial', 'active'])
    .or(`name.ilike.${pattern},city.ilike.${pattern}`)
    .order('name', { ascending: true })
    .limit(8)

  if (error) {
    return NextResponse.json(
      { error: 'search_failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ results: data ?? [] })
}
