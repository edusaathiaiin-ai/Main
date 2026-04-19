import { corsHeaders } from '../_shared/cors.ts'

const NASA_API_KEY = Deno.env.get('NASA_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, query } = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action required: apod | images | ntrs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: Record<string, unknown> = {}

    switch (action) {
      case 'apod': {
        const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`)
        if (!res.ok) throw new Error(`APOD returned ${res.status}`)
        const data = await res.json()
        result = {
          title: data.title,
          explanation: data.explanation,
          url: data.url,
          hdurl: data.hdurl,
          media_type: data.media_type,
          date: data.date,
          copyright: data.copyright ?? null,
        }
        break
      }

      case 'images': {
        if (!query) throw new Error('query required for images')
        const res = await fetch(
          `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=6`
        )
        if (!res.ok) throw new Error(`NASA Images returned ${res.status}`)
        const data = await res.json()
        result = {
          items: (data.collection?.items ?? []).slice(0, 6).map((item: Record<string, unknown>) => {
            const d = (item.data as Record<string, unknown>[])?.[0] ?? {}
            const link = (item.links as { href: string }[])?.[0]?.href ?? ''
            return {
              title: d.title ?? '',
              description: ((d.description as string) ?? '').slice(0, 200),
              nasa_id: d.nasa_id ?? '',
              date_created: d.date_created ?? '',
              thumbnail: link,
            }
          }),
        }
        break
      }

      case 'ntrs': {
        if (!query) throw new Error('query required for ntrs')
        const res = await fetch(
          `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query)}&page[size]=5`
        )
        if (!res.ok) throw new Error(`NTRS returned ${res.status}`)
        const data = await res.json()
        result = {
          results: (data.results ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
            title: r.title ?? '',
            abstract: ((r.abstract as string) ?? '').slice(0, 250),
            id: r.id ?? '',
            subjectCategories: r.subjectCategories ?? [],
            created: r.created ?? '',
            url: `https://ntrs.nasa.gov/citations/${r.id}`,
          })),
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, action, query: query ?? null, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('fetch-nasa error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
