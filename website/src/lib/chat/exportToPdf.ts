// ─────────────────────────────────────────────────────────────────────────────
// exportToPdf — chat conversation → PDF blob.
//
// Plain-text formatting only. KaTeX equations stay as raw LaTeX. Tool cards
// (`[MOLECULE:aspirin]`, `[MERMAID:...]`, `[CASE:...]` etc.) become honest
// placeholders that signal "open in app for live view." Standard PDF fonts
// (Helvetica) — no font embedding, no rendering surprises across devices.
//
// Renders at A4 with 50pt margins. Headers per Saathi (emoji + name + date).
// Footer has page numbers + "Generated via EdUsaathiAI". Unicode-safe via
// pdf-lib's StandardFonts subset; non-Latin script (Hindi/Gujarati names)
// renders as transliterated bytes — acceptable for this use case (English
// is the default chat language). Future enhancement: embed Noto Sans for
// full Indic script support.
//
// Returns a Uint8Array — caller chooses to download (Blob URL), upload to
// storage, or pass to email API as base64.
// ─────────────────────────────────────────────────────────────────────────────

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type ExportableMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export type ExportPdfInput = {
  saathiName:   string
  saathiEmoji?: string
  studentName:  string
  messages:     ExportableMessage[]
}

const PAGE_WIDTH  = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN      = 50
const LINE_HEIGHT = 14
const FONT_SIZE   = 10
const HEADER_FONT_SIZE = 12

// Replace inline tool tags with honest placeholder text.
// Pattern: [TOOL:value] → "🔧 Tool: value (open in app to view)"
// Stripping the brackets keeps recipients oriented while signalling
// that something interactive is missing.
function flattenToolTags(text: string): string {
  return text.replace(
    /\[(MOLECULE|MOLECULE3D|MECHANISM|ANATOMY|CIRCUIT|ARCHMODEL|SCENE360|MINDMAP|FLOORPLAN|PLOT|MERMAID|CASE|WOLFRAM|NASA|CHEMSPIDER|FORMULA):([^\]]+)\]/gi,
    (_match, tool: string, payload: string) => {
      const label = tool.replace(/_/g, ' ').toLowerCase()
      const trimmed = payload.split('|')[0].slice(0, 80).trim()
      return `\n📎 ${capitalise(label)}: ${trimmed} (open in app to view)\n`
    }
  )
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function wrapText(text: string, font: ReturnType<PDFDocument['embedFont']> extends Promise<infer T> ? T : never, fontSize: number, maxWidth: number): string[] {
  // Pdf-lib doesn't expose getTextWidth as async, so use the embedded font directly.
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push('')
      continue
    }
    const words = para.split(' ')
    let current = ''
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word
      const width = font.widthOfTextAtSize(tentative, fontSize)
      if (width <= maxWidth) {
        current = tentative
      } else {
        if (current) lines.push(current)
        // word itself longer than line — hard-break by character
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let chunk = ''
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, fontSize) > maxWidth) {
              lines.push(chunk)
              chunk = ch
            } else {
              chunk += ch
            }
          }
          current = chunk
        } else {
          current = word
        }
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function formatDate(d?: string): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// pdf-lib characters outside WinAnsi cannot render with Helvetica.
// Strip emoji + any high-codepoint char so the PDF doesn't error.
// We keep the meaning by tagging with a small ASCII marker where possible.
function sanitiseForWinAnsi(text: string): string {
  // eslint-disable-next-line no-misleading-character-class, no-control-regex
  return text.replace(/[^\x00-\xFF]/g, (ch) => {
    // Common emoji we know about → ASCII fallbacks.
    const map: Record<string, string> = {
      '📎': '[attached]',
      '🔧': '[tool]',
      '🛠️': '[tools]',
      '✦': '*',
      '✓': 'v',
      '·': '-',
      '—': '-',
      '–': '-',
      '‘': "'",
      '’': "'",
      '“': '"',
      '”': '"',
    }
    return map[ch] ?? '?'
  })
}

export async function exportChatToPdf(input: ExportPdfInput): Promise<Uint8Array> {
  const pdf  = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const usableWidth = PAGE_WIDTH - 2 * MARGIN
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  // ── Header (every page) ────────────────────────────────────────────────
  function drawHeader() {
    const titleText = sanitiseForWinAnsi(`${input.saathiName} chat`)
    page.drawText(titleText, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN + 6,
      size: HEADER_FONT_SIZE,
      font: bold,
      color: rgb(0.07, 0.12, 0.23),
    })
    const ts = formatDate(input.messages[0]?.created_at) || formatDate(new Date().toISOString())
    const right = sanitiseForWinAnsi(ts)
    const rightWidth = font.widthOfTextAtSize(right, FONT_SIZE)
    page.drawText(right, {
      x: PAGE_WIDTH - MARGIN - rightWidth,
      y: PAGE_HEIGHT - MARGIN + 6,
      size: FONT_SIZE,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 4 },
      end:   { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    })
    y = PAGE_HEIGHT - MARGIN - 18
  }

  drawHeader()

  // ── Messages ───────────────────────────────────────────────────────────
  for (const msg of input.messages) {
    const isUser = msg.role === 'user'
    const speaker = isUser ? input.studentName || 'You' : input.saathiName
    const speakerLabel = sanitiseForWinAnsi(`${speaker}:`)

    // Page-break check before each message header
    if (y < MARGIN + LINE_HEIGHT * 3) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      drawHeader()
    }

    // Speaker line (bold, role-coloured)
    page.drawText(speakerLabel, {
      x: MARGIN,
      y,
      size: FONT_SIZE + 1,
      font: bold,
      color: isUser ? rgb(0.31, 0.27, 0.90) : rgb(0.79, 0.60, 0.23),
    })
    y -= LINE_HEIGHT + 2

    // Message content
    const flattened = flattenToolTags(msg.content)
    const safe = sanitiseForWinAnsi(flattened)
    const lines = wrapText(safe, font, FONT_SIZE, usableWidth)
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        drawHeader()
      }
      page.drawText(line, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0.10, 0.10, 0.10),
      })
      y -= LINE_HEIGHT
    }

    y -= 8 // gap between messages
  }

  // ── Footer (last page) ─────────────────────────────────────────────────
  const totalPages = pdf.getPageCount()
  const allPages = pdf.getPages()
  for (let i = 0; i < totalPages; i++) {
    const p = allPages[i]
    const footer = sanitiseForWinAnsi(
      `Generated for ${input.studentName || 'student'} via EdUsaathiAI · Page ${i + 1} of ${totalPages}`
    )
    const w = font.widthOfTextAtSize(footer, 8)
    p.drawText(footer, {
      x: (PAGE_WIDTH - w) / 2,
      y: 24,
      size: 8,
      font,
      color: rgb(0.55, 0.55, 0.55),
    })
  }

  return pdf.save()
}

// Helper for callers: convert PDF bytes to base64 (for email API).
export function pdfToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
}

// Helper for callers: trigger browser download.
export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a small delay to avoid Safari aborts
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
