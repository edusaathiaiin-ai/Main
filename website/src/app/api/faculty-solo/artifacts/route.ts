import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Faculty-solo artifact log — POST (save) + GET (list today's rows).
//
// Auth path uses the SSR-cookie Supabase client so the session is verified
// server-side. Writes use a service-role client because migration 129 scopes
// INSERT to service_role only (RLS). The service-role client never trusts
// client-supplied faculty_user_id — it overrides with auth.uid().
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

type ArtifactBody = {
  saathi_slug:        string
  tool_id:            string
  title?:             string
  payload_json:       Record<string, unknown>
  source_url?:        string
  session_bucket_id:  string
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'faculty') {
    return NextResponse.json({ error: 'faculty_only' }, { status: 403 })
  }

  let body: ArtifactBody
  try {
    body = (await req.json()) as ArtifactBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.saathi_slug || !body.tool_id || !body.payload_json || !body.session_bucket_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Resolve vertical_id from slug — must exist.
  const { data: vertical } = await supabase
    .from('verticals')
    .select('id')
    .eq('slug', body.saathi_slug)
    .maybeSingle()
  if (!vertical?.id) {
    return NextResponse.json({ error: 'unknown_saathi' }, { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await admin
    .from('faculty_solo_artifacts')
    .insert({
      faculty_user_id:   user.id,
      vertical_id:       vertical.id,
      saathi_slug:       body.saathi_slug,
      tool_id:           body.tool_id,
      title:             body.title ?? null,
      payload_json:      body.payload_json,
      source_url:        body.source_url ?? null,
      session_bucket_id: body.session_bucket_id,
    })
    .select('id, title, tool_id, saathi_slug, source_url, created_at, session_bucket_id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ artifact: data })
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since        = req.nextUrl.searchParams.get('since')        // 'today' | ISO timestamp
  const saathiSlug   = req.nextUrl.searchParams.get('saathi_slug')  // optional filter

  // Default: start of today in IST.
  let gte: string
  if (since && since !== 'today') {
    gte = since
  } else {
    const nowIst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    nowIst.setHours(0, 0, 0, 0)
    // Convert that IST midnight back to a UTC ISO string for DB comparison
    gte = new Date(nowIst.getTime() - (nowIst.getTimezoneOffset() - new Date().getTimezoneOffset()) * 60_000).toISOString()
  }

  let q = supabase
    .from('faculty_solo_artifacts')
    .select('id, saathi_slug, tool_id, title, source_url, payload_json, session_bucket_id, created_at')
    .eq('faculty_user_id', user.id)
    .gte('created_at', gte)
    .order('created_at', { ascending: false })
    .limit(50)

  if (saathiSlug) q = q.eq('saathi_slug', saathiSlug)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ artifacts: data ?? [] })
}
