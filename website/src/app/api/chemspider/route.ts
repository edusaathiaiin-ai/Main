import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ChemSpider compound search — proxies Royal Society of Chemistry API.
 * CHEMSPIDER_API_KEY from env. Never exposed client-side.
 *
 * GET /api/chemspider?q=aspirin
 * GET /api/chemspider?csid=2157
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')
  const csid = req.nextUrl.searchParams.get('csid')
  const apiKey = process.env.CHEMSPIDER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ChemSpider not configured' }, { status: 503 })

  const headers: Record<string, string> = { apikey: apiKey, Accept: 'application/json' }

  try {
    if (csid) {
      const res = await fetch(
        `https://api.rsc.org/compounds/v1/records/${csid}/details?fields=CommonName,Formula,MolecularWeight,SMILES,InChIKey`,
        { headers }
      )
      if (!res.ok) return NextResponse.json({ error: `ChemSpider returned ${res.status}` }, { status: 502 })
      const data = await res.json()
      return NextResponse.json({
        csid, name: data.commonName ?? '', formula: data.formula ?? '',
        molecularWeight: data.molecularWeight ?? null, smiles: data.smiles ?? '',
        url: `https://www.chemspider.com/Chemical-Structure.${csid}.html`,
        source: 'ChemSpider — Royal Society of Chemistry',
      })
    }

    if (!query) return NextResponse.json({ error: 'Provide ?q= or ?csid=' }, { status: 400 })

    const filterRes = await fetch('https://api.rsc.org/compounds/v1/filter/name', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: query, orderBy: 'recordId', orderDirection: 'ascending' }),
    })
    if (!filterRes.ok) return NextResponse.json({ error: 'ChemSpider search failed' }, { status: 502 })
    const { queryId } = await filterRes.json()

    // Poll
    for (let i = 0; i < 5; i++) {
      const statusRes = await fetch(`https://api.rsc.org/compounds/v1/filter/${queryId}/status`, { headers })
      const statusData = await statusRes.json()
      if (statusData.status === 'Complete') {
        const resultsRes = await fetch(`https://api.rsc.org/compounds/v1/filter/${queryId}/results?start=0&count=5`, { headers })
        const csids: number[] = await resultsRes.json()
        return NextResponse.json({
          results: csids.map(id => ({
            csid: id,
            url: `https://www.chemspider.com/Chemical-Structure.${id}.html`,
          })),
          source: 'ChemSpider — Royal Society of Chemistry',
        })
      }
      if (statusData.status === 'Failed') break
      await new Promise(r => setTimeout(r, 500))
    }

    return NextResponse.json({ results: [], source: 'ChemSpider — Royal Society of Chemistry' })
  } catch {
    return NextResponse.json({ error: 'ChemSpider request failed' }, { status: 502 })
  }
}
