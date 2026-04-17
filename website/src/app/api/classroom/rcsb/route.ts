import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for RCSB Protein Data Bank.
 *
 * GET /api/classroom/rcsb?q=hemoglobin     → search by name
 * GET /api/classroom/rcsb?pdb=2HYY         → fetch specific structure
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q')
  const pdbId = searchParams.get('pdb')

  try {
    if (pdbId) {
      // Fetch specific structure metadata
      const res = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbId.toUpperCase()}`)
      if (!res.ok) return NextResponse.json({ error: `PDB ${pdbId} not found` }, { status: 404 })
      const data = await res.json()

      // Fetch PDB file for 3Dmol.js
      const pdbRes = await fetch(`https://files.rcsb.org/view/${pdbId.toUpperCase()}.pdb`)
      const pdbData = pdbRes.ok ? await pdbRes.text() : null

      return NextResponse.json({
        pdb_id: pdbId.toUpperCase(),
        title: data.struct?.title ?? '',
        organism: data.rcsb_entry_info?.organism_scientific_name ?? '',
        resolution: data.rcsb_entry_info?.resolution_combined?.[0] ?? null,
        deposition_date: data.rcsb_accession_info?.deposit_date ?? '',
        authors: data.audit_author?.map((a: { name: string }) => a.name).join(', ') ?? '',
        doi: data.rcsb_primary_citation?.pdbx_database_id_doi ?? '',
        pdb_data: pdbData,
      })
    }

    if (query) {
      // Search by name — returns top 5 results
      const searchBody = {
        query: {
          type: 'terminal',
          service: 'full_text',
          parameters: { value: query },
        },
        return_type: 'entry',
        request_options: { paginate: { start: 0, rows: 5 } },
      }

      const res = await fetch('https://search.rcsb.org/rcsbsearch/v2/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      })

      if (!res.ok) return NextResponse.json({ results: [] })
      const data = await res.json()

      const results = (data.result_set ?? []).map((r: { identifier: string; score: number }) => ({
        pdb_id: r.identifier,
        score: r.score,
      }))

      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: 'Provide ?q= or ?pdb=' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'RCSB request failed' }, { status: 502 })
  }
}
