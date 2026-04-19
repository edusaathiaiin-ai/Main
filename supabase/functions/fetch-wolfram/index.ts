import { corsHeaders } from '../_shared/cors.ts'

const WOLFRAM_APP_ID = Deno.env.get('WOLFRAM_ALPHA_APP_ID')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Wolfram Alpha Short Answers API — plain text result
    const shortUrl = new URL('https://api.wolframalpha.com/v1/result')
    shortUrl.searchParams.set('appid', WOLFRAM_APP_ID)
    shortUrl.searchParams.set('i', query)
    shortUrl.searchParams.set('units', 'metric')

    // Wolfram Alpha Full Results API — structured pods
    const fullUrl = new URL('https://api.wolframalpha.com/v2/query')
    fullUrl.searchParams.set('appid', WOLFRAM_APP_ID)
    fullUrl.searchParams.set('input', query)
    fullUrl.searchParams.set('output', 'JSON')
    fullUrl.searchParams.set('format', 'plaintext')
    fullUrl.searchParams.set('units', 'metric')
    // No podstate filter — return all available pods

    const [shortRes, fullRes] = await Promise.all([
      fetch(shortUrl.toString()),
      fetch(fullUrl.toString()),
    ])

    const shortAnswer = shortRes.ok ? await shortRes.text() : null

    let pods: { title: string; subpods: { plaintext: string }[] }[] = []
    if (fullRes.ok) {
      const fullData = await fullRes.json()
      pods = fullData?.queryresult?.pods ?? []
    }

    const result = {
      query,
      shortAnswer,
      pods: pods
        .filter((p) => p.subpods?.some((s) => s.plaintext))
        .slice(0, 4)
        .map((p) => ({
          title: p.title,
          content: p.subpods
            .map((s) => s.plaintext)
            .filter(Boolean)
            .join('\n'),
        })),
      wolframUrl: `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`,
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('fetch-wolfram error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
