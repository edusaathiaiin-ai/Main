import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Crossref DOI lookup — proxies api.crossref.org.
 *
 * One generic endpoint for every peer-reviewed journal that issues DOIs —
 * Physical Review Letters, Nature, Science, Cell, NEJM, Lancet, JAMA, BMJ,
 * American Economic Review, JACS, every law review, every ICAR journal.
 * No API key, no rate-limit ceiling for our traffic profile. Crossref asks
 * callers to send a mailto in the UA string so abuse is traceable — we
 * honour that with NEXT_PUBLIC_CROSSREF_MAILTO (falls back to support@).
 *
 * GET /api/crossref?doi=10.1103/PhysRevLett.131.231001
 *
 * Returns normalised metadata shaped for direct rendering by
 * PaperCitationCard. Abstract is best-effort — many publishers do not
 * deposit it with Crossref; null when absent.
 *
 * Auth-gated like /api/pubmed — callers must be signed in. Prevents
 * anonymous scraping via our endpoint.
 */

type CrossrefWork = {
  title?: string[]
  author?: { given?: string; family?: string }[]
  'container-title'?: string[]
  'short-container-title'?: string[]
  issued?: { 'date-parts'?: number[][] }
  published?: { 'date-parts'?: number[][] }
  DOI?: string
  URL?: string
  type?: string
  abstract?: string
  publisher?: string
}

type NormalisedPaper = {
  doi: string
  title: string
  authors: string[]
  journal: string
  year: number | null
  publisher: string | null
  abstract: string | null
  url: string
  type: string
}

// Crossref requires UA to include a contact email. Falls back gracefully.
function userAgent(): string {
  const mailto =
    process.env.NEXT_PUBLIC_CROSSREF_MAILTO ?? 'support@edusaathiai.in'
  return `EdUsaathiAI/1.0 (+https://edusaathiai.in; mailto:${mailto})`
}

// Strip JATS XML tags publishers sometimes bury in the abstract field.
function stripJats(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const doiRaw = req.nextUrl.searchParams.get('doi')?.trim()
  if (!doiRaw) {
    return NextResponse.json({ error: 'Provide ?doi=' }, { status: 400 })
  }

  // DOI syntax is permissive by spec (RFC 3986-ish with some additional
  // Unicode allowed). We accept anything starting with 10./ and encode it
  // for the URL — Crossref handles the rest. Reject obviously malformed
  // strings to avoid wasted round-trips.
  if (!/^10\.\d{4,9}\/[^\s]+$/.test(doiRaw)) {
    return NextResponse.json(
      { error: 'DOI must look like 10.XXXX/...' },
      { status: 400 },
    )
  }

  const url = `https://api.crossref.org/works/${encodeURIComponent(doiRaw)}`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent(),
      },
      // Crossref is cacheable — 24h is plenty for student-facing metadata.
      next: { revalidate: 86400 },
    })

    if (res.status === 404) {
      return NextResponse.json(
        { error: `No Crossref record for DOI ${doiRaw}` },
        { status: 404 },
      )
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Crossref returned ${res.status}` },
        { status: 502 },
      )
    }

    const json = (await res.json()) as { message?: CrossrefWork }
    const work = json.message
    if (!work) {
      return NextResponse.json(
        { error: 'Malformed Crossref response' },
        { status: 502 },
      )
    }

    const authors = (work.author ?? [])
      .map((a) =>
        [a.given, a.family].filter((p): p is string => Boolean(p)).join(' '),
      )
      .filter((name) => name.length > 0)

    const yearParts =
      work.issued?.['date-parts']?.[0] ?? work.published?.['date-parts']?.[0]
    const year =
      Array.isArray(yearParts) && typeof yearParts[0] === 'number'
        ? yearParts[0]
        : null

    const paper: NormalisedPaper = {
      doi: work.DOI ?? doiRaw,
      title: work.title?.[0]?.trim() ?? 'Untitled',
      authors,
      journal:
        work['short-container-title']?.[0] ??
        work['container-title']?.[0] ??
        '',
      year,
      publisher: work.publisher ?? null,
      abstract: work.abstract ? stripJats(work.abstract) : null,
      url: work.URL ?? `https://doi.org/${doiRaw}`,
      type: work.type ?? 'journal-article',
    }

    return NextResponse.json({ paper, source: 'Crossref' })
  } catch (err) {
    console.error('[api/crossref] fetch failed', err)
    return NextResponse.json(
      { error: 'Network error reaching Crossref' },
      { status: 502 },
    )
  }
}
