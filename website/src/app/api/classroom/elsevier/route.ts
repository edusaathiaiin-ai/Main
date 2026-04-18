import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Provide ?q= search term' }, { status: 400 })

  const apiKey = process.env.ELSEVIER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ScienceDirect not configured' }, { status: 503 })

  try {
    const url = `https://api.elsevier.com/content/search/sciencedirect?query=${encodeURIComponent(query)}&apiKey=${apiKey}&count=5`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'ScienceDirect API error', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    const entries = data['search-results']?.entry ?? []

    const articles = entries.map((e: Record<string, unknown>) => ({
      title: (e['dc:title'] as string) ?? '',
      authors: (e['dc:creator'] as string) ?? '',
      publication: (e['prism:publicationName'] as string) ?? '',
      date: (e['prism:coverDate'] as string) ?? '',
      doi: (e['prism:doi'] as string) ?? '',
      pii: (e['pii'] as string) ?? '',
      url: (e['prism:url'] as string) ?? '',
      link: `https://doi.org/${(e['prism:doi'] as string) ?? ''}`,
    }))

    return NextResponse.json({ articles })
  } catch {
    return NextResponse.json({ error: 'ScienceDirect request failed' }, { status: 502 })
  }
}
