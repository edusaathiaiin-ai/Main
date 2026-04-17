import { NextRequest, NextResponse } from 'next/server'

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'apod') {
      const res = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`,
        { next: { revalidate: 3600 } }
      )
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (action === 'images') {
      const q = searchParams.get('q') ?? 'spacecraft'
      const res = await fetch(
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=12`
      )
      const data = await res.json()
      const items = (data.collection?.items ?? []).slice(0, 12).map(
        (item: { data?: { title?: string; description?: string; nasa_id?: string }[]; links?: { href?: string }[] }) => ({
          title: item.data?.[0]?.title ?? '',
          description: (item.data?.[0]?.description ?? '').slice(0, 200),
          nasa_id: item.data?.[0]?.nasa_id ?? '',
          thumb: item.links?.[0]?.href ?? '',
        })
      )
      return NextResponse.json({ items })
    }

    if (action === 'ntrs') {
      const q = searchParams.get('q') ?? 'aerodynamics'
      const res = await fetch(
        `https://ntrs.nasa.gov/api/citations?q=${encodeURIComponent(q)}&page=1&pageSize=10`
      )
      const data = await res.json()
      const results = (data.results ?? []).slice(0, 10).map(
        (r: { id?: number; title?: string; abstract?: string; downloads?: { links?: { http?: string }[] }[] }) => ({
          id: r.id,
          title: r.title ?? '',
          abstract: (r.abstract ?? '').slice(0, 300),
          pdf: r.downloads?.[0]?.links?.[0]?.http ?? null,
        })
      )
      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: 'Unknown action. Use: apod, images, ntrs' }, { status: 400 })
  } catch (err) {
    console.error('[classroom/nasa] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NASA API error' },
      { status: 500 }
    )
  }
}
