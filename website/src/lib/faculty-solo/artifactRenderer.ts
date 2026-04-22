// ─────────────────────────────────────────────────────────────────────────────
// Shared artifact HTML rendering — used by both PDF print and email export.
// Output is inline-CSS HTML so it works in the email clients that strip
// <style> blocks. PDF print uses the same snippets inside a styled shell.
// ─────────────────────────────────────────────────────────────────────────────

import { SAATHIS } from '@/constants/saathis'
import type { SavedArtifact } from './artifactClient'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderArtifactPayloadHtml(toolId: string, payload: Record<string, unknown>): string {
  switch (toolId) {
    case 'pubmed': {
      const authors = Array.isArray(payload.authors) ? (payload.authors as string[]).join(', ') : ''
      return `
        <p class="meta">Authors</p>
        <p class="value">${escapeHtml(authors || '—')}</p>
        <p class="meta">Journal · Year</p>
        <p class="value">${escapeHtml(String(payload.journal ?? '—'))} · ${escapeHtml(String(payload.year ?? '—'))}</p>
        <p class="meta">PMID</p>
        <p class="value">${escapeHtml(String(payload.pmid ?? '—'))}</p>
      `
    }
    case 'rcsb':
      return `
        <p class="meta">PDB ID</p>
        <p class="value">${escapeHtml(String(payload.pdb_id ?? '—'))}</p>
        <p class="meta">Organism</p>
        <p class="value">${escapeHtml(String(payload.organism ?? '—'))}</p>
        <p class="meta">Resolution</p>
        <p class="value">${escapeHtml(String(payload.resolution ?? '—'))} Å</p>
        <p class="meta">Authors</p>
        <p class="value">${escapeHtml(String(payload.authors ?? '—'))}</p>
        <p class="meta">DOI</p>
        <p class="value">${escapeHtml(String(payload.doi ?? '—'))}</p>
      `
    case 'uniprot':
      return `
        <p class="meta">Accession</p>
        <p class="value">${escapeHtml(String(payload.accession ?? '—'))}</p>
        <p class="meta">Gene</p>
        <p class="value">${escapeHtml(String(payload.gene ?? '—'))}</p>
        <p class="meta">Organism</p>
        <p class="value">${escapeHtml(String(payload.organism ?? '—'))}</p>
        <p class="meta">Function</p>
        <p class="value">${escapeHtml(String(payload.function_text ?? '—'))}</p>
      `
    case 'europepmc': {
      const oa = payload.isOpenAccess ? ' (open access)' : ''
      return `
        <p class="meta">Authors</p>
        <p class="value">${escapeHtml(String(payload.authorString ?? '—'))}</p>
        <p class="meta">Journal · Year</p>
        <p class="value">${escapeHtml(String(payload.journalTitle ?? '—'))} · ${escapeHtml(String(payload.pubYear ?? '—'))}${oa}</p>
        <p class="meta">IDs</p>
        <p class="value">${payload.pmid ? 'PMID: ' + escapeHtml(String(payload.pmid)) : ''}${payload.pmid && payload.pmcid ? ' · ' : ''}${payload.pmcid ? escapeHtml(String(payload.pmcid)) : ''}${payload.doi ? ' · DOI: ' + escapeHtml(String(payload.doi)) : ''}</p>
      `
    }
    case 'semantic-scholar': {
      const authors = Array.isArray(payload.authors)
        ? (payload.authors as Array<{ name?: string }>).map((a) => a.name ?? '').filter(Boolean).join(', ')
        : ''
      return `
        <p class="meta">Authors</p>
        <p class="value">${escapeHtml(authors || '—')}</p>
        <p class="meta">Venue · Year</p>
        <p class="value">${escapeHtml(String(payload.venue ?? '—'))} · ${escapeHtml(String(payload.year ?? '—'))}</p>
        <p class="meta">Citations</p>
        <p class="value">${escapeHtml(String(payload.citationCount ?? '—'))}</p>
        ${payload.abstract ? `<p class="meta">Abstract</p><p class="value">${escapeHtml(String(payload.abstract))}</p>` : ''}
      `
    }
    case 'openfda':
      return `
        <p class="meta">Brand</p>
        <p class="value">${escapeHtml(String(payload.brand ?? '—'))}</p>
        <p class="meta">Generic</p>
        <p class="value">${escapeHtml(String(payload.generic ?? '—'))}</p>
        <p class="meta">Manufacturer</p>
        <p class="value">${escapeHtml(String(payload.manufacturer ?? '—'))}</p>
        ${payload.indications ? `<p class="meta">Indications</p><p class="value">${escapeHtml(String(payload.indications))}</p>` : ''}
        ${payload.warnings    ? `<p class="meta">Warnings</p><p class="value">${escapeHtml(String(payload.warnings))}</p>`       : ''}
        ${payload.dosage      ? `<p class="meta">Dosage</p><p class="value">${escapeHtml(String(payload.dosage))}</p>`           : ''}
      `
    case 'nasa-images':
      return `
        ${payload.thumb ? `<p><img src="${escapeHtml(String(payload.thumb))}" style="max-width:100%;border-radius:6px;border:1px solid #E8E4DD;" alt="${escapeHtml(String(payload.title ?? ''))}" /></p>` : ''}
        <p class="meta">NASA ID</p>
        <p class="value">${escapeHtml(String(payload.nasa_id ?? '—'))}</p>
        <p class="meta">Date</p>
        <p class="value">${escapeHtml(String(payload.date_created ?? '—'))}</p>
        <p class="meta">Centre</p>
        <p class="value">${escapeHtml(String(payload.center ?? '—'))}</p>
        ${payload.description ? `<p class="meta">Description</p><p class="value">${escapeHtml(String(payload.description))}</p>` : ''}
      `
    case 'ncbi-gene':
      return `
        <p class="meta">Symbol</p>
        <p class="value">${escapeHtml(String(payload.symbol ?? '—'))}</p>
        <p class="meta">Organism</p>
        <p class="value">${escapeHtml(String(payload.organism ?? '—'))}</p>
        <p class="meta">Location</p>
        <p class="value">${payload.chromo ? `Chr ${escapeHtml(String(payload.chromo))}` : ''}${payload.chromo && payload.maploc ? ' · ' : ''}${escapeHtml(String(payload.maploc ?? ''))}</p>
        <p class="meta">NCBI UID</p>
        <p class="value">${escapeHtml(String(payload.uid ?? '—'))}</p>
        ${payload.summary ? `<p class="meta">Summary</p><p class="value">${escapeHtml(String(payload.summary))}</p>` : ''}
      `
    case 'ensembl':
      return `
        <p class="meta">Display name</p>
        <p class="value">${escapeHtml(String(payload.display_name ?? '—'))}</p>
        <p class="meta">Ensembl ID</p>
        <p class="value">${escapeHtml(String(payload.id ?? '—'))}</p>
        <p class="meta">Species</p>
        <p class="value">${escapeHtml(String(payload.species ?? '—').replace(/_/g, ' '))}</p>
        <p class="meta">Biotype</p>
        <p class="value">${escapeHtml(String(payload.biotype ?? '—'))}</p>
        <p class="meta">Location</p>
        <p class="value">${escapeHtml(String(payload.seq_region ?? ''))}:${escapeHtml(String(payload.start ?? ''))}–${escapeHtml(String(payload.end ?? ''))}${payload.strand === -1 ? ' (−)' : ''}</p>
        ${payload.description ? `<p class="meta">Description</p><p class="value">${escapeHtml(String(payload.description))}</p>` : ''}
      `
    case 'ntrs':
      return `
        ${payload.subtitle ? `<p class="meta">Subtitle</p><p class="value" style="font-style:italic;">${escapeHtml(String(payload.subtitle))}</p>` : ''}
        <p class="meta">Authors</p>
        <p class="value">${escapeHtml(String(payload.authors ?? '—'))}</p>
        <p class="meta">Centre · Date</p>
        <p class="value">${escapeHtml(String(payload.center_names ?? '—'))} · ${escapeHtml(String(payload.publication_date ?? '—'))}</p>
        ${payload.abstract ? `<p class="meta">Abstract</p><p class="value">${escapeHtml(String(payload.abstract))}</p>` : ''}
        ${payload.pdf_url ? `<p class="meta">PDF</p><p class="value"><a href="${escapeHtml(String(payload.pdf_url))}">${escapeHtml(String(payload.pdf_url))}</a></p>` : ''}
      `
    case 'usgs-quake': {
      const mag = typeof payload.mag === 'number' ? payload.mag.toFixed(1) : '—'
      const when = payload.time ? new Date(Number(payload.time)).toLocaleString('en-IN') : '—'
      return `
        <p class="meta">Magnitude</p>
        <p class="value">M ${escapeHtml(mag)}</p>
        <p class="meta">Location</p>
        <p class="value">${escapeHtml(String(payload.place ?? '—'))}</p>
        <p class="meta">When</p>
        <p class="value">${escapeHtml(when)}</p>
        ${payload.depth !== null && payload.depth !== undefined ? `<p class="meta">Depth</p><p class="value">${escapeHtml(String(payload.depth))} km</p>` : ''}
        <p class="meta">USGS ID</p>
        <p class="value">${escapeHtml(String(payload.id ?? '—'))}</p>
      `
    }
    case 'wikimedia-commons':
      return `
        ${payload.thumb ? `<p><img src="${escapeHtml(String(payload.thumb))}" style="max-width:100%;border-radius:6px;border:1px solid #E8E4DD;" alt="${escapeHtml(String(payload.title ?? ''))}" /></p>` : ''}
        <p class="meta">Title</p>
        <p class="value">${escapeHtml(String(payload.title ?? '—'))}</p>
        <p class="meta">Dimensions</p>
        <p class="value">${escapeHtml(String(payload.width ?? '—'))} × ${escapeHtml(String(payload.height ?? '—'))}</p>
        <p class="meta">MIME</p>
        <p class="value">${escapeHtml(String(payload.mime ?? '—'))}</p>
      `
    default:
      return `<pre class="value">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`
  }
}

/** Saathi metadata lookup. Falls back to neutral gold theme when slug unknown. */
export function resolveSaathiBrand(saathiSlug: string): {
  emoji:   string
  name:    string
  tagline: string
  primary: string
} {
  const s = SAATHIS.find((x) => x.id === saathiSlug)
  return {
    emoji:   s?.emoji   ?? '🧰',
    name:    s?.name    ?? 'EdUsaathiAI',
    tagline: s?.tagline ?? 'Your learning companion',
    primary: s?.primary ?? '#C9993A',
  }
}

/** Inline-CSS email body. Saathi-branded. Accepts an optional prepend blurb. */
export function renderArtifactEmailHtml(artifact: SavedArtifact, blurb?: string): string {
  const { emoji, name, tagline, primary } = resolveSaathiBrand(artifact.saathi_slug)
  const dateStr = new Date(artifact.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const body = renderArtifactPayloadHtml(artifact.tool_id, artifact.payload_json)

  // Email-friendly: all inline styles, table-ish structure, web-safe fonts.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(artifact.title ?? artifact.tool_id)} · ${escapeHtml(name)}</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:640px;margin:0 auto;padding:24px 20px;">
    <div style="height:4px;background:linear-gradient(90deg,${primary} 0%,#C9993A 100%);border-radius:2px;"></div>
    <div style="display:flex;align-items:center;gap:12px;padding:16px 0 10px;border-bottom:1px solid #E8E4DD;">
      <div style="font-size:32px;line-height:1;">${emoji}</div>
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:700;color:${primary};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(name)}</h1>
        <p style="margin:2px 0 0;font-size:13px;color:#7A7570;font-style:italic;">${escapeHtml(tagline)}</p>
      </div>
    </div>

    ${blurb ? `<p style="margin:18px 0 12px;font-size:14px;color:#4A4740;line-height:1.55;">${escapeHtml(blurb)}</p>` : ''}

    <div style="display:inline-block;padding:3px 10px;background:${primary}22;color:${primary};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:18px 0 10px;">${escapeHtml(artifact.tool_id)}</div>
    <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1A1814;font-family:Georgia,'Times New Roman',serif;line-height:1.35;">${escapeHtml(artifact.title ?? artifact.tool_id)}</h2>

    <div style="font-size:14px;line-height:1.55;">
      <style>
        .meta {margin:10px 0 2px;font-size:10px;letter-spacing:0.6px;text-transform:uppercase;font-weight:700;color:#7A7570;}
        .value {margin:0 0 6px;font-size:14px;color:#1A1814;}
        pre.value {font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:#FAF7F2;border:1px solid #E8E4DD;border-radius:6px;padding:12px;}
      </style>
      ${body}
    </div>

    ${artifact.source_url ? `
      <div style="margin-top:20px;padding-top:12px;border-top:1px solid #E8E4DD;font-size:13px;color:#7A7570;">
        Source · <a href="${escapeHtml(artifact.source_url)}" style="color:${primary};text-decoration:none;">${escapeHtml(artifact.source_url)}</a>
      </div>
    ` : ''}

    <div style="margin-top:32px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:11px;color:#A8A49E;display:flex;justify-content:space-between;">
      <span>Curated via EdUsaathiAI · ${escapeHtml(dateStr)}</span>
      <span>edusaathiai.in</span>
    </div>
  </div>
</body>
</html>`
}

/** Plain-text WhatsApp body. Short. No HTML. Saathi emoji inline. */
export function renderArtifactWhatsAppText(artifact: SavedArtifact): string {
  const { emoji, name } = resolveSaathiBrand(artifact.saathi_slug)
  const title   = artifact.title ?? artifact.tool_id
  const tool    = artifact.tool_id.toUpperCase()
  const payload = artifact.payload_json as Record<string, unknown>

  let body = ''
  if (artifact.tool_id === 'pubmed') {
    const authors = Array.isArray(payload.authors) ? (payload.authors as string[]).slice(0, 3).join(', ') : ''
    body = `${authors}${authors ? ' et al.\n' : ''}${payload.journal ?? ''} · ${payload.year ?? ''}\nPMID: ${payload.pmid ?? '—'}`
  } else if (artifact.tool_id === 'rcsb') {
    body = `PDB: ${payload.pdb_id ?? '—'} · ${payload.resolution ?? '?'}Å\n${payload.organism ?? ''}`
  } else if (artifact.tool_id === 'uniprot') {
    body = `Accession: ${payload.accession ?? '—'}\nGene: ${payload.gene ?? '—'} · ${payload.organism ?? ''}`
  } else if (artifact.tool_id === 'europepmc') {
    const authors = String(payload.authorString ?? '').split(',').slice(0, 3).join(', ')
    body = `${authors}\n${payload.journalTitle ?? ''} · ${payload.pubYear ?? ''}${payload.isOpenAccess ? ' (OA)' : ''}\n${payload.pmid ? 'PMID: ' + payload.pmid : ''}`
  } else if (artifact.tool_id === 'semantic-scholar') {
    const authors = Array.isArray(payload.authors)
      ? (payload.authors as Array<{ name?: string }>).slice(0, 3).map((a) => a.name).filter(Boolean).join(', ')
      : ''
    body = `${authors}\n${payload.venue ?? ''} · ${payload.year ?? ''}\nCitations: ${payload.citationCount ?? '—'}`
  } else if (artifact.tool_id === 'openfda') {
    body = `Brand: ${payload.brand ?? '—'}\nGeneric: ${payload.generic ?? '—'}\n${payload.indications ?? ''}`
  } else if (artifact.tool_id === 'nasa-images') {
    body = `NASA ID: ${payload.nasa_id ?? '—'}\n${payload.center ?? ''} · ${payload.date_created ?? ''}`
  } else if (artifact.tool_id === 'ncbi-gene') {
    body = `Symbol: ${payload.symbol ?? '—'}\n${payload.organism ?? ''}\nUID: ${payload.uid ?? '—'}`
  } else if (artifact.tool_id === 'ensembl') {
    const species = String(payload.species ?? '').replace(/_/g, ' ')
    body = `${payload.display_name ?? payload.id ?? '—'}\n${species} · ${payload.biotype ?? ''}\nID: ${payload.id ?? '—'}`
  } else if (artifact.tool_id === 'ntrs') {
    body = `${payload.authors ?? ''}\n${payload.center_names ?? ''} · ${payload.publication_date ?? ''}`
  } else if (artifact.tool_id === 'usgs-quake') {
    const mag = typeof payload.mag === 'number' ? payload.mag.toFixed(1) : '—'
    const when = payload.time ? new Date(Number(payload.time)).toLocaleString('en-IN') : '—'
    body = `M ${mag} · ${payload.place ?? '—'}\n${when}${payload.depth !== null && payload.depth !== undefined ? ` · ${payload.depth} km` : ''}`
  } else if (artifact.tool_id === 'wikimedia-commons') {
    body = `${payload.title ?? '—'}\n${payload.width ?? '—'} × ${payload.height ?? '—'} · ${payload.mime ?? ''}`
  }

  const source = artifact.source_url ? `\n\n🔗 ${artifact.source_url}` : ''
  return `${emoji} *${name}* · ${tool}\n\n*${title}*\n\n${body}${source}\n\n— Curated via EdUsaathiAI`
}

// ── Session-bundle renderers ─────────────────────────────────────────────────
// One-shot export of many artifacts saved in a single day. Header banner +
// a short preface + stacked artifact blocks + footer. Reused across PDF, email
// and (as compact text) WhatsApp so branding is uniform.

/** Short summary of one artifact used inside bundle layouts. */
function renderBundleArtifactBlock(artifact: SavedArtifact, primary: string): string {
  const time = new Date(artifact.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const inner = renderArtifactPayloadHtml(artifact.tool_id, artifact.payload_json)
  return `
    <article style="margin:0 0 18px;padding:14px 16px;border:1px solid #E8E4DD;border-left:3px solid ${primary};border-radius:8px;background:#fff;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:9px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:1px 7px;border-radius:4px;background:${primary}22;color:${primary};font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(artifact.tool_id)}</span>
        <span style="font-size:10px;color:#A8A49E;font-family:ui-monospace,Menlo,Consolas,monospace;margin-left:auto;">${escapeHtml(time)}</span>
      </div>
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1A1814;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(artifact.title ?? artifact.tool_id)}</p>
      <div style="font-size:12px;line-height:1.5;color:#1A1814;">
        <style>
          article .meta {margin:6px 0 1px;font-size:9px;letter-spacing:0.6px;text-transform:uppercase;font-weight:700;color:#7A7570;}
          article .value {margin:0 0 4px;font-size:12px;color:#1A1814;}
        </style>
        ${inner}
      </div>
      ${artifact.source_url ? `<p style="margin:8px 0 0;font-size:10px;color:#7A7570;">Source · <a href="${escapeHtml(artifact.source_url)}" style="color:${primary};text-decoration:none;">${escapeHtml(artifact.source_url)}</a></p>` : ''}
    </article>
  `
}

/**
 * Full bundle HTML — print-ready or email-ready. Same shell both ways since
 * the email client tolerates the @media print hints safely.
 */
export function renderSessionBundleHtml(
  artifacts: SavedArtifact[],
  saathiSlug: string,
  blurb?: string,
): string {
  const { emoji, name, tagline, primary } = resolveSaathiBrand(saathiSlug)
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const count   = artifacts.length

  const blocks = artifacts.map((a) => renderBundleArtifactBlock(a, primary)).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(name)} · Today's Research · ${escapeHtml(dateStr)}</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:720px;margin:0 auto;padding:24px 20px;">
    <div style="height:4px;background:linear-gradient(90deg,${primary} 0%,#C9993A 100%);border-radius:2px;"></div>

    <div style="display:flex;align-items:center;gap:12px;padding:16px 0 12px;border-bottom:1px solid #E8E4DD;">
      <div style="font-size:34px;line-height:1;">${emoji}</div>
      <div style="flex:1;">
        <h1 style="margin:0;font-size:21px;font-weight:700;color:${primary};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(name)}</h1>
        <p style="margin:2px 0 0;font-size:13px;color:#7A7570;font-style:italic;">${escapeHtml(tagline)}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#A8A49E;letter-spacing:0.4px;text-transform:uppercase;font-weight:700;">Today&apos;s Research</p>
        <p style="margin:2px 0 0;font-size:13px;color:#1A1814;font-weight:600;">${escapeHtml(dateStr)}</p>
      </div>
    </div>

    ${blurb ? `<p style="margin:16px 0 8px;font-size:14px;color:#4A4740;line-height:1.6;">${escapeHtml(blurb)}</p>` : ''}

    <p style="margin:18px 0 14px;font-size:12px;color:${primary};font-weight:600;">✦ ${count} ${count === 1 ? 'item' : 'items'} saved — free, yours to keep.</p>

    ${blocks}

    <div style="margin-top:28px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:11px;color:#A8A49E;display:flex;justify-content:space-between;">
      <span>Curated via EdUsaathiAI · ${escapeHtml(dateStr)}</span>
      <span>edusaathiai.in</span>
    </div>
  </div>
</body>
</html>`
}

/**
 * Compact WhatsApp summary. Lists titles with tool prefix. Max 10 lines so
 * the message isn't a wall of text; overflow shows "… + N more saved today".
 */
export function renderSessionBundleWhatsAppText(
  artifacts: SavedArtifact[],
  saathiSlug: string,
): string {
  const { emoji, name } = resolveSaathiBrand(saathiSlug)
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const head    = `${emoji} *${name}* · Today's Research · ${dateStr}`
  const visible = artifacts.slice(0, 10)
  const lines   = visible.map((a, i) => {
    const tool  = a.tool_id.toUpperCase()
    const title = (a.title ?? a.tool_id).slice(0, 110)
    return `${i + 1}. [${tool}] ${title}`
  })
  const overflow = artifacts.length > 10 ? `\n… + ${artifacts.length - 10} more saved today` : ''
  return `${head}\n\n${lines.join('\n')}${overflow}\n\n— Curated via EdUsaathiAI`
}
