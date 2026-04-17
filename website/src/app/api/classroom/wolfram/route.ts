import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for Wolfram Alpha Short Answers + Full Results API.
 * WOLFRAM_ALPHA_APP_ID is read from env — never exposed client-side.
 *
 * GET /api/classroom/wolfram?q=integrate+x^2+dx
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Provide ?q= query' }, { status: 400 })
  }

  const appId = process.env.WOLFRAM_ALPHA_APP_ID
  if (!appId) {
    return NextResponse.json({ error: 'Wolfram Alpha not configured' }, { status: 503 })
  }

  try {
    // Use Full Results API for pods
    const url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&format=plaintext,image&output=JSON&appid=${appId}`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'Wolfram Alpha request failed' }, { status: 502 })
    }

    const data = await res.json()
    const queryResult = data.queryresult

    if (!queryResult?.success) {
      return NextResponse.json({
        success: false,
        input: query,
        pods: [],
        error: queryResult?.tips?.text ?? 'No result found',
      })
    }

    const pods = (queryResult.pods ?? []).map((pod: {
      title: string
      subpods: Array<{
        plaintext?: string
        img?: { src: string; width: number; height: number }
      }>
    }) => ({
      title: pod.title,
      content: pod.subpods?.[0]?.plaintext ?? '',
      image_url: pod.subpods?.[0]?.img?.src ?? null,
    }))

    return NextResponse.json({
      success: true,
      input: query,
      pods,
      timing: queryResult.timing ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Wolfram Alpha request failed' }, { status: 502 })
  }
}
