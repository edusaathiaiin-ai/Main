import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for NCBI PubMed E-utilities.
 *
 * GET /api/classroom/pubmed?q=CRISPR+gene+editing
 * Returns top 5 papers with title, authors, journal, PMID, abstract snippet.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Provide ?q= search term' }, { status: 400 })
  }

  try {
    // Step 1: Search for PMIDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    const pmids: string[] = searchData.esearchresult?.idlist ?? []

    if (pmids.length === 0) {
      return NextResponse.json({ papers: [] })
    }

    // Step 2: Fetch summaries for those PMIDs
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`
    const summaryRes = await fetch(summaryUrl)
    const summaryData = await summaryRes.json()

    const papers = pmids.map((pmid) => {
      const doc = summaryData.result?.[pmid]
      if (!doc) return null

      return {
        pmid,
        title: doc.title ?? '',
        authors: (doc.authors ?? []).map((a: { name: string }) => a.name),
        journal: doc.fulljournalname ?? doc.source ?? '',
        year: doc.pubdate?.split(' ')?.[0] ?? '',
        volume: doc.volume ?? '',
        issue: doc.issue ?? '',
        pages: doc.pages ?? '',
        doi: doc.elocationid ?? '',
      }
    }).filter(Boolean)

    return NextResponse.json({ papers })
  } catch {
    return NextResponse.json({ error: 'PubMed request failed' }, { status: 502 })
  }
}
