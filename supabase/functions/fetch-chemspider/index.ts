import { corsHeaders } from '../_shared/cors.ts'

const CHEMSPIDER_API_KEY = Deno.env.get('CHEMSPIDER_API_KEY')!

/**
 * ChemSpider (Royal Society of Chemistry) — compound search + details.
 * 100M+ compounds. Free academic access.
 *
 * POST { query: "aspirin" }  → search by name
 * POST { query: "CC(=O)OC1=CC=CC=C1C(=O)O" } → search by SMILES
 * POST { csid: 2157 }       → fetch compound details by ChemSpider ID
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, csid } = await req.json()

    const headers: Record<string, string> = {
      apikey: CHEMSPIDER_API_KEY,
      Accept: 'application/json',
    }

    // Direct lookup by ChemSpider ID
    if (csid) {
      const res = await fetch(
        `https://api.rsc.org/compounds/v1/records/${csid}/details?fields=CommonName,Formula,MolecularWeight,SMILES,InChI,InChIKey,MonoisotopicMass`,
        { headers }
      )
      if (!res.ok) throw new Error(`ChemSpider returned ${res.status}`)
      const data = await res.json()
      return new Response(
        JSON.stringify({
          success: true, csid,
          name: data.commonName ?? '',
          formula: data.formula ?? '',
          molecularWeight: data.molecularWeight ?? null,
          smiles: data.smiles ?? '',
          inchi: data.inchi ?? '',
          inchiKey: data.inchiKey ?? '',
          monoisotopicMass: data.monoisotopicMass ?? null,
          url: `https://www.chemspider.com/Chemical-Structure.${csid}.html`,
          source: 'ChemSpider — Royal Society of Chemistry',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query or csid required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search by name — first get filter request ID
    const filterRes = await fetch(
      'https://api.rsc.org/compounds/v1/filter/name',
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query, orderBy: 'recordId', orderDirection: 'ascending' }),
      }
    )

    if (!filterRes.ok) {
      // Try SMILES search if name fails
      const smilesRes = await fetch(
        'https://api.rsc.org/compounds/v1/filter/smiles',
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ smiles: query }),
        }
      )
      if (!smilesRes.ok) throw new Error(`ChemSpider search failed: ${filterRes.status}`)
      const smilesData = await smilesRes.json()
      return await pollResults(smilesData.queryId, headers)
    }

    const filterData = await filterRes.json()
    return await pollResults(filterData.queryId, headers)
  } catch (err) {
    console.error('fetch-chemspider error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function pollResults(queryId: string, headers: Record<string, string>): Promise<Response> {
  // Poll for results (ChemSpider is async)
  for (let attempt = 0; attempt < 5; attempt++) {
    const statusRes = await fetch(
      `https://api.rsc.org/compounds/v1/filter/${queryId}/status`,
      { headers }
    )
    const statusData = await statusRes.json()

    if (statusData.status === 'Complete') {
      const resultsRes = await fetch(
        `https://api.rsc.org/compounds/v1/filter/${queryId}/results?start=0&count=5`,
        { headers }
      )
      const resultsData = await resultsRes.json()
      const csids: number[] = Array.isArray(resultsData) ? resultsData : resultsData.results ?? []

      if (csids.length === 0) {
        return new Response(
          JSON.stringify({ success: true, results: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch details for top results
      const detailsRes = await fetch(
        'https://api.rsc.org/compounds/v1/records/batch',
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordIds: csids.slice(0, 5),
            fields: ['CommonName', 'Formula', 'MolecularWeight', 'SMILES'],
          }),
        }
      )
      const details = await detailsRes.json()

      const results = (Array.isArray(details) ? details : details.records ?? []).map(
        (d: Record<string, unknown>) => ({
          csid: d.id ?? d.recordId,
          name: d.commonName ?? '',
          formula: d.formula ?? '',
          molecularWeight: d.molecularWeight ?? null,
          smiles: d.smiles ?? '',
          url: `https://www.chemspider.com/Chemical-Structure.${d.id ?? d.recordId}.html`,
        })
      )

      return new Response(
        JSON.stringify({ success: true, results, source: 'ChemSpider — Royal Society of Chemistry' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (statusData.status === 'Failed') break
    await new Promise((r) => setTimeout(r, 500))
  }

  return new Response(
    JSON.stringify({ success: true, results: [], note: 'Search timed out' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
