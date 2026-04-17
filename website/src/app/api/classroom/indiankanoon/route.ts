import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for Indian Kanoon API.
 * INDIANKANOON_API_KEY is read from env — never exposed client-side.
 *
 * GET /api/classroom/indiankanoon?q=Section+302+murder
 * GET /api/classroom/indiankanoon?docid=12345
 *
 * Indian Kanoon API uses POST with form-encoded body for search,
 * and Token-based auth in the Authorization header.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  const docId = req.nextUrl.searchParams.get('docid')

  const apiKey = process.env.INDIANKANOON_API_KEY

  if (!apiKey || apiKey === 'PENDING') {
    return NextResponse.json({
      pending: true,
      message: 'Indian Kanoon integration coming soon. Key pending approval.',
      results: [],
    })
  }

  const headers = { Authorization: `Token ${apiKey}` }

  try {
    if (docId) {
      const res = await fetch(`https://api.indiankanoon.org/doc/${docId}/`, { headers })

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          pending: true,
          message: 'Indian Kanoon integration coming soon. Key pending approval.',
        })
      }

      if (!res.ok) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const data = await res.json()
      return NextResponse.json({
        docid: docId,
        title: data.title ?? '',
        doc: data.doc ?? '',
        court: data.courtname ?? '',
        date: data.datestr ?? '',
      })
    }

    if (query) {
      // Indian Kanoon API uses POST with form-encoded body
      const formBody = new URLSearchParams()
      formBody.set('formInput', query)
      formBody.set('pagenum', '0')

      const res = await fetch('https://api.indiankanoon.org/search/', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      })

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          pending: true,
          message: 'Indian Kanoon integration coming soon. Key pending approval.',
          results: [],
        })
      }

      if (!res.ok) {
        return NextResponse.json({ results: [] })
      }

      const data = await res.json()
      const results = (data.docs ?? []).slice(0, 10).map((d: {
        tid: number
        title: string
        headline: string
        docsource: string
        publishdate: string
        citation: string
      }) => ({
        docid: d.tid,
        title: d.title ?? '',
        headline: d.headline ?? '',
        court: d.docsource ?? '',
        date: d.publishdate ?? '',
        citation: d.citation ?? '',
      }))

      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: 'Provide ?q= or ?docid=' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Indian Kanoon request failed' }, { status: 502 })
  }
}
