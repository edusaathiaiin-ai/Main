import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Proxy for ISRO Bhuvan APIs — geoid data, satellite imagery, Indian geo data.
 * ISRO_BHUVAN_TOKEN read from env. Token expires daily — handle 401 gracefully.
 *
 * GET /api/classroom/bhuvan?action=geoid&lat=23.03&lng=72.58
 * GET /api/classroom/bhuvan?action=layers
 * GET /api/classroom/bhuvan?action=geocode&q=Ahmedabad
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = req.nextUrl.searchParams.get('action') ?? 'layers'
  const token = process.env.ISRO_BHUVAN_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'ISRO Bhuvan not configured' }, { status: 503 })
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  try {
    let url: string
    switch (action) {
      case 'geoid': {
        const lat = req.nextUrl.searchParams.get('lat') ?? '23.03'
        const lng = req.nextUrl.searchParams.get('lng') ?? '72.58'
        url = `https://bhuvan-app1.nrsc.gov.in/api/geoid?lat=${lat}&lon=${lng}`
        break
      }
      case 'geocode': {
        const q = req.nextUrl.searchParams.get('q') ?? ''
        url = `https://bhuvan-app1.nrsc.gov.in/api/geocode?q=${encodeURIComponent(q)}`
        break
      }
      case 'layers':
      default:
        url = 'https://bhuvan-app1.nrsc.gov.in/api/layers'
        break
    }

    const res = await fetch(url, { headers })

    if (res.status === 401) {
      return NextResponse.json({
        error: 'ISRO data temporarily unavailable — token refreshing',
        token_expired: true,
      }, { status: 401 })
    }

    if (!res.ok) {
      return NextResponse.json({
        error: `Bhuvan API returned ${res.status}`,
      }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Bhuvan request failed' }, { status: 502 })
  }
}
