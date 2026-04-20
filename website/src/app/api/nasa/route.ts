import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * NASA API proxy — APOD, Image Search, NTRS Technical Reports.
 * NASA_API_KEY from env. Never exposed client-side.
 *
 * GET /api/nasa?action=apod
 * GET /api/nasa?action=images&q=mars+rover
 * GET /api/nasa?action=ntrs&q=aerodynamics
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = req.nextUrl.searchParams.get('action') ?? 'apod'
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NASA API not configured' }, { status: 503 })

  try {
    switch (action) {
      case 'apod': {
        const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`)
        if (!res.ok) return NextResponse.json({ error: 'APOD unavailable' }, { status: 502 })
        return NextResponse.json(await res.json())
      }

      case 'images': {
        if (!query) return NextResponse.json({ error: 'Provide ?q= for image search' }, { status: 400 })
        const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=6`)
        if (!res.ok) return NextResponse.json({ error: 'NASA Images unavailable' }, { status: 502 })
        const data = await res.json()
        const items = (data.collection?.items ?? []).slice(0, 6).map((item: Record<string, unknown>) => {
          const d = (item.data as Record<string, unknown>[])?.[0] ?? {}
          const link = (item.links as { href: string }[])?.[0]?.href ?? ''
          return { title: d.title, description: ((d.description as string) ?? '').slice(0, 200), thumbnail: link, nasa_id: d.nasa_id }
        })
        return NextResponse.json({ items })
      }

      case 'ntrs': {
        if (!query) return NextResponse.json({ error: 'Provide ?q= for NTRS search' }, { status: 400 })
        const res = await fetch(`https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query)}&page[size]=5`)
        if (!res.ok) return NextResponse.json({ error: 'NTRS unavailable' }, { status: 502 })
        const data = await res.json()
        const results = (data.results ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
          title: r.title, abstract: ((r.abstract as string) ?? '').slice(0, 250),
          id: r.id, url: `https://ntrs.nasa.gov/citations/${r.id}`,
        }))
        return NextResponse.json({ results })
      }

      default:
        return NextResponse.json({ error: 'action must be apod, images, or ntrs' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'NASA request failed' }, { status: 502 })
  }
}
