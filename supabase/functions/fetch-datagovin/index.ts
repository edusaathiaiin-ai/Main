import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const DATAGOVIN_API_KEY = Deno.env.get('DATAGOVIN_API_KEY')!
const DATAGOVIN_BASE = 'https://api.data.gov.in/resource'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      resourceId,
      filters,
      limit = 10,
      offset = 0,
      fields,
      sort,
    } = await req.json()

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: 'resourceId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build URL
    const url = new URL(`${DATAGOVIN_BASE}/${resourceId}`)
    url.searchParams.set('api-key', DATAGOVIN_API_KEY)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    if (fields?.length) {
      url.searchParams.set('fields', fields.join(','))
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.set(`filters[${key}]`, String(value))
      })
    }

    if (sort) {
      url.searchParams.set('sort[desc]', sort)
    }

    console.log('Fetching:', url.toString())

    const res = await fetch(url.toString())

    if (!res.ok) {
      const err = await res.text()
      console.error('data.gov.in API error:', err)
      return new Response(
        JSON.stringify({ error: 'data.gov.in API error', detail: err }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({
        success: true,
        resourceId,
        total: data.total ?? data.count ?? 0,
        records: data.records ?? data.fields ?? [],
        fields: data.field ?? [],
        title: data.title ?? '',
        updated: data.updated ?? '',
        source: `https://data.gov.in/resource/${resourceId}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('fetch-datagovin error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
