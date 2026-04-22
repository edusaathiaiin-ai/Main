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
  }

  const source = artifact.source_url ? `\n\n🔗 ${artifact.source_url}` : ''
  return `${emoji} *${name}* · ${tool}\n\n*${title}*\n\n${body}${source}\n\n— Curated via EdUsaathiAI`
}
