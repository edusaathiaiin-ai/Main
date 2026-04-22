import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Provide ?q= search term' }, { status: 400 })

  const apiKey = process.env.SCOPUS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Scopus not configured' }, { status: 503 })

  try {
    const url = `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(query)}&apiKey=${apiKey}&count=5`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Scopus API error', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    const entries = data['search-results']?.entry ?? []

    const citations = entries.map((e: Record<string, unknown>) => ({
      title: (e['dc:title'] as string) ?? '',
      authors: (e['dc:creator'] as string) ?? '',
      publication: (e['prism:publicationName'] as string) ?? '',
      date: (e['prism:coverDate'] as string) ?? '',
      doi: (e['prism:doi'] as string) ?? '',
      citedByCount: (e['citedby-count'] as string) ?? '0',
      scopusId: (e['dc:identifier'] as string)?.replace('SCOPUS_ID:', '') ?? '',
      link: (e['prism:doi'] as string) ? `https://doi.org/${e['prism:doi']}` : '',
    }))

    return NextResponse.json({ citations })
  } catch {
    return NextResponse.json({ error: 'Scopus request failed' }, { status: 502 })
  }
}
