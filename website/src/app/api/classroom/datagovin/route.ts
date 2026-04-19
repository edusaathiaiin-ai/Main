import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shared proxy for ALL data.gov.in APIs.
 * One route, any dataset — pass resource_id and optional filters.
 *
 * GET /api/classroom/datagovin?resource_id=XXX&limit=10&offset=0&filters[field]=value
 *
 * data.gov.in API pattern:
 *   https://api.data.gov.in/resource/{resource_id}?api-key={key}&format=json&limit=10
 *
 * Proof of concept: GST dataset
 *   resource_id = 4eef9e6a-7a22-4d0d-ba8c-e1e73e6a7e0c (GST collections)
 *
 * Source badge: "data.gov.in — Government of India Open Data"
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resourceId = req.nextUrl.searchParams.get('resource_id')
  if (!resourceId) {
    return NextResponse.json({ error: 'Provide ?resource_id= parameter' }, { status: 400 })
  }

  const apiKey = process.env.DATAGOVIN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'data.gov.in not configured' }, { status: 503 })
  }

  const limit = req.nextUrl.searchParams.get('limit') ?? '10'
  const offset = req.nextUrl.searchParams.get('offset') ?? '0'

  // Build filter params — any query param starting with filters[] is passed through
  const filterParams: string[] = []
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key.startsWith('filters[')) {
      filterParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  })

  const filterStr = filterParams.length > 0 ? `&${filterParams.join('&')}` : ''

  try {
    const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}${filterStr}`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({
        error: `data.gov.in returned ${res.status}`,
        hint: res.status === 403 ? 'API key may be invalid or resource restricted' : undefined,
      }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json({
      total: data.total ?? 0,
      count: data.count ?? 0,
      records: data.records ?? [],
      field: data.field ?? [],
      source: 'data.gov.in — Government of India Open Data',
      resource_id: resourceId,
    })
  } catch {
    return NextResponse.json({ error: 'data.gov.in request failed' }, { status: 502 })
  }
}
