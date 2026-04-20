import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Indian Kanoon case law search — proxies api.indiankanoon.org.
 * INDIANKANOON_API_KEY from env. Never exposed client-side.
 *
 * GET /api/indiankanoon?q=Section+302+IPC&pagenum=0
 * GET /api/indiankanoon?docid=123456  (fetch full case document)
 *
 * Source badge: "Indian Kanoon — Supreme Court & High Courts"
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.INDIANKANOON_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Indian Kanoon not configured' }, { status: 503 })
  }

  const query = req.nextUrl.searchParams.get('q')
  const docid = req.nextUrl.searchParams.get('docid')
  const pagenum = req.nextUrl.searchParams.get('pagenum') ?? '0'

  try {
    if (docid) {
      // Fetch specific case document
      const res = await fetch(`https://api.indiankanoon.org/doc/${docid}/`, {
        headers: { Authorization: `Token ${apiKey}` },
      })
      if (!res.ok) return NextResponse.json({ error: `Indian Kanoon returned ${res.status}` }, { status: 502 })
      const data = await res.json()
      return NextResponse.json({
        docid,
        title: data.title ?? '',
        doc: data.doc ?? '',
        headline: data.headline ?? '',
        court: data.docsource ?? '',
        date: data.publishdate ?? '',
        citations: data.citations ?? [],
        source: 'Indian Kanoon — Supreme Court & High Courts',
      })
    }

    if (!query) {
      return NextResponse.json({ error: 'Provide ?q= search or ?docid= for document' }, { status: 400 })
    }

    // Search cases
    const res = await fetch(
      `https://api.indiankanoon.org/search/?formInput=${encodeURIComponent(query)}&pagenum=${pagenum}`,
      { headers: { Authorization: `Token ${apiKey}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Indian Kanoon returned ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const docs = (data.docs ?? []).map((d: Record<string, unknown>) => ({
      tid: d.tid,
      title: d.title ?? '',
      headline: d.headline ?? '',
      court: d.docsource ?? '',
      date: d.publishdate ?? '',
      citation: d.citation ?? '',
      url: `https://indiankanoon.org/doc/${d.tid}/`,
    }))

    return NextResponse.json({
      query,
      total: data.total ?? docs.length,
      docs,
      source: 'Indian Kanoon — Supreme Court & High Courts',
    })
  } catch {
    return NextResponse.json({ error: 'Indian Kanoon request failed' }, { status: 502 })
  }
}
