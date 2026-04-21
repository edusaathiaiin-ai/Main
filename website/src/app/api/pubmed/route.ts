import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PubMed literature search — proxies NCBI E-utilities.
 * No API key required for basic throughput (< 3 rps).
 * Add NCBI_API_KEY env var to raise the limit to 10 rps.
 *
 * GET /api/pubmed?q=BCR-ABL+imatinib&limit=5
 *
 * Returns normalised citations suitable for direct rendering by PubmedCitationCard.
 */

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

type PubmedRecord = {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: number | null
  doi: string | null
  abstract: string | null
  url: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 5), 10)
  if (!query) return NextResponse.json({ error: 'Provide ?q=' }, { status: 400 })

  const apiKey = process.env.NCBI_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''

  try {
    const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&sort=relevance&term=${encodeURIComponent(query)}${keyParam}`
    const searchRes = await fetch(searchUrl, { headers: { Accept: 'application/json' } })
    if (!searchRes.ok) {
      return NextResponse.json({ error: `PubMed search returned ${searchRes.status}` }, { status: 502 })
    }
    const searchJson = await searchRes.json() as { esearchresult?: { idlist?: string[] } }
    const pmids: string[] = searchJson.esearchresult?.idlist ?? []
    if (pmids.length === 0) {
      return NextResponse.json({ results: [], source: 'PubMed / NCBI' })
    }

    const summaryUrl = `${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${pmids.join(',')}${keyParam}`
    const summaryRes = await fetch(summaryUrl, { headers: { Accept: 'application/json' } })
    if (!summaryRes.ok) {
      return NextResponse.json({ error: `PubMed summary returned ${summaryRes.status}` }, { status: 502 })
    }
    const summaryJson = await summaryRes.json() as { result?: Record<string, unknown> }
    const result = summaryJson.result ?? {}

    const records: PubmedRecord[] = pmids
      .map((pmid) => {
        const row = result[pmid] as
          | { title?: string; authors?: Array<{ name: string }>; fulljournalname?: string; pubdate?: string; articleids?: Array<{ idtype: string; value: string }> }
          | undefined
        if (!row) return null
        const year = typeof row.pubdate === 'string' ? parseInt(row.pubdate.slice(0, 4), 10) : null
        const doi = row.articleids?.find((a) => a.idtype === 'doi')?.value ?? null
        return {
          pmid,
          title: row.title ?? '',
          authors: (row.authors ?? []).map((a) => a.name).slice(0, 6),
          journal: row.fulljournalname ?? '',
          year: Number.isFinite(year) ? year : null,
          doi,
          abstract: null,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        } as PubmedRecord
      })
      .filter((r): r is PubmedRecord => r !== null)

    return NextResponse.json({
      results: records,
      source: 'PubMed / NCBI',
      attribution: 'Citations from PubMed, courtesy of the U.S. National Library of Medicine.',
    })
  } catch {
    return NextResponse.json({ error: 'PubMed request failed' }, { status: 502 })
  }
}
