// ─────────────────────────────────────────────────────────────────────────────
// pdfPrint — renders a saved artifact as a Saathi-branded printable HTML,
// opens it in a new window, and triggers the browser print dialog. The user
// then saves as PDF via the native print dialog.
//
// Zero external deps. Works offline for already-saved artifacts. Preserves
// the Saathi emoji, name, tagline + a gold accent bar on every page.
// ─────────────────────────────────────────────────────────────────────────────

import type { SavedArtifact } from './artifactClient'
import {
  escapeHtml,
  renderArtifactPayloadHtml,
  renderSessionBundleHtml,
  resolveSaathiBrand,
} from './artifactRenderer'

export function printArtifactPdf(artifact: SavedArtifact, saathiSlug: string): void {
  const { emoji, name, tagline, primary } = resolveSaathiBrand(saathiSlug)

  const dateStr = new Date(artifact.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  const body = renderArtifactPayloadHtml(artifact.tool_id, artifact.payload_json)

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(artifact.title ?? artifact.tool_id)} · ${escapeHtml(name)} · EdUsaathiAI</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      color: #1A1814;
      margin: 0;
      font-size: 12pt;
      line-height: 1.55;
    }
    .accent {
      height: 4px;
      background: linear-gradient(90deg, ${primary} 0%, #C9993A 100%);
      margin-bottom: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E8E4DD;
      margin-bottom: 18px;
    }
    .brand-emoji { font-size: 28pt; line-height: 1; }
    .brand-text h1 {
      font-size: 16pt;
      margin: 0;
      font-weight: 700;
      color: ${primary};
      font-family: 'Fraunces', 'Playfair Display', serif;
    }
    .brand-text p {
      font-size: 10pt;
      margin: 2px 0 0;
      color: #7A7570;
      font-style: italic;
    }
    h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #1A1814;
      margin: 0 0 6px;
      font-family: 'Fraunces', 'Playfair Display', serif;
    }
    .tool-chip {
      display: inline-block;
      padding: 2px 8px;
      background: ${primary}22;
      color: ${primary};
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .meta {
      font-size: 8pt;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      font-weight: 700;
      color: #7A7570;
      margin: 10px 0 2px;
    }
    .value {
      font-size: 11pt;
      margin: 0 0 6px;
      color: #1A1814;
    }
    pre.value {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 9pt;
      white-space: pre-wrap;
      word-break: break-word;
      background: #FAF7F2;
      border: 1px solid #E8E4DD;
      border-radius: 6px;
      padding: 10px;
    }
    .source {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #E8E4DD;
      font-size: 9pt;
      color: #7A7570;
    }
    .source a { color: ${primary}; text-decoration: none; }
    footer {
      position: fixed;
      bottom: 10mm;
      left: 16mm;
      right: 16mm;
      padding-top: 6px;
      border-top: 0.5px solid #E8E4DD;
      font-size: 8pt;
      color: #A8A49E;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="accent"></div>
  <div class="brand">
    <span class="brand-emoji">${emoji}</span>
    <div class="brand-text">
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(tagline)}</p>
    </div>
  </div>

  <div class="tool-chip">${escapeHtml(artifact.tool_id)}</div>
  <h2>${escapeHtml(artifact.title ?? artifact.tool_id)}</h2>

  ${body}

  ${artifact.source_url ? `
    <div class="source">
      Source · <a href="${escapeHtml(artifact.source_url)}">${escapeHtml(artifact.source_url)}</a>
    </div>
  ` : ''}

  <footer>
    <span>Curated via EdUsaathiAI · ${escapeHtml(dateStr)}</span>
    <span>edusaathiai.in</span>
  </footer>

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=880,height=1100')
  if (!w) {
    alert('Please allow pop-ups for localhost to download PDFs.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

/**
 * Session-bundle PDF — all of today's artifacts in one Saathi-branded doc.
 * Reuses renderSessionBundleHtml so it stays visually identical to the
 * emailed bundle; we just append a tiny script that triggers window.print().
 */
export function printSessionBundlePdf(
  artifacts: SavedArtifact[],
  saathiSlug: string,
): void {
  if (!artifacts.length) return
  const base = renderSessionBundleHtml(artifacts, saathiSlug)
  // Append a print trigger. The bundle HTML is a full document, so we inject
  // the script right before </body>.
  const withPrint = base.replace(
    '</body>',
    `<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body>`,
  )
  const w = window.open('', '_blank', 'width=880,height=1100')
  if (!w) {
    alert('Please allow pop-ups for localhost to download PDFs.')
    return
  }
  w.document.open()
  w.document.write(withPrint)
  w.document.close()
}
