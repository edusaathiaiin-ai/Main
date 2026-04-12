// scripts/generate-icons.mjs
// Run: node scripts/generate-icons.mjs
// Generates:
//   assets/icon.png             (1024×1024 — Expo app icon)
//   assets/icon-1024.png        (1024×1024 — explicit backup)
//   assets/whatsapp-profile.png (640×640  — WhatsApp Business profile photo)

import sharp from '../website/node_modules/sharp/lib/index.js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY  = '#0B1F3A'
const GOLD  = '#C9993A'
const CREAM = '#FAF7F2'

// ── SVG generator ─────────────────────────────────────────────────────────────
// Creates a square icon at `size` px.
// Layout: navy square → gold "E" monogram (Playfair-style) → "EdUsaathiAI" text below
function makeIconSVG(size) {
  const pad    = size * 0.10          // 10% padding on each side
  const center = size / 2

  // "E" glyph — drawn as thick geometric paths matching Playfair Display weight
  // Built from rectangles: top bar, mid bar, bottom bar, left stem
  const eLeft   = pad + size * 0.06
  const eRight  = center + size * 0.16
  const eTop    = size * 0.22
  const eBot    = size * 0.65
  const eH      = eBot - eTop
  const barH    = eH * 0.13           // bar thickness
  const stemW   = eH * 0.13          // stem width
  const midY    = eTop + eH * 0.44   // mid bar Y
  const midRight = eLeft + (eRight - eLeft) * 0.80  // mid bar is shorter

  // Small "AI" superscript in gold — positioned top-right of the E
  const aiX  = eRight + size * 0.02
  const aiY  = eTop + size * 0.04
  const aiFontSize = size * 0.095

  // Bottom wordmark "EdUsaathiAI"
  const wordY     = eBot + size * 0.095
  const wordSize  = size * 0.072

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0D2444"/>
      <stop offset="100%" stop-color="#071528"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#E8B96A"/>
      <stop offset="100%" stop-color="#B8832A"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- Subtle corner accent lines -->
  <line x1="0" y1="${size*0.08}" x2="${size*0.08}" y2="0"
        stroke="${GOLD}" stroke-width="${size*0.003}" opacity="0.25"/>
  <line x1="${size}" y1="${size*0.92}" x2="${size*0.92}" y2="${size}"
        stroke="${GOLD}" stroke-width="${size*0.003}" opacity="0.25"/>

  <!-- "E" — left stem -->
  <rect x="${eLeft}" y="${eTop}" width="${stemW}" height="${eH}"
        fill="url(#goldGrad)" rx="${stemW*0.18}"/>

  <!-- "E" — top bar -->
  <rect x="${eLeft}" y="${eTop}" width="${eRight - eLeft}" height="${barH}"
        fill="url(#goldGrad)" rx="${barH*0.3}"/>

  <!-- "E" — mid bar (shorter) -->
  <rect x="${eLeft}" y="${midY}" width="${midRight - eLeft}" height="${barH}"
        fill="url(#goldGrad)" rx="${barH*0.3}"/>

  <!-- "E" — bottom bar -->
  <rect x="${eLeft}" y="${eBot - barH}" width="${eRight - eLeft}" height="${barH}"
        fill="url(#goldGrad)" rx="${barH*0.3}"/>

  <!-- "AI" superscript -->
  <text x="${aiX}" y="${aiY + aiFontSize}" font-family="Georgia, serif"
        font-size="${aiFontSize}" font-weight="700" fill="${GOLD}" opacity="0.9"
        letter-spacing="${aiFontSize * 0.04}">AI</text>

  <!-- Bottom wordmark -->
  <text x="${center}" y="${wordY}" font-family="Georgia, 'Times New Roman', serif"
        font-size="${wordSize}" font-weight="700" fill="${CREAM}" opacity="0.88"
        text-anchor="middle" letter-spacing="${wordSize * 0.02}">EdUsaathiAI</text>

  <!-- Gold underline accent under wordmark -->
  <rect x="${center - wordSize*3.2}" y="${wordY + wordSize*0.18}"
        width="${wordSize*6.4}" height="${size*0.004}"
        fill="${GOLD}" opacity="0.55" rx="${size*0.002}"/>
</svg>`
}

// ── Render ────────────────────────────────────────────────────────────────────
async function render(svg, outPath, size) {
  const buf = Buffer.from(svg)
  await sharp(buf, { density: 72 })
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(outPath)
  console.log(`✓  ${outPath}  (${size}×${size})`)
}

const icon1024 = makeIconSVG(1024)
const icon640  = makeIconSVG(640)

await render(icon1024, resolve(ROOT, 'assets/icon.png'),          1024)
await render(icon1024, resolve(ROOT, 'assets/icon-1024.png'),     1024)
await render(icon640,  resolve(ROOT, 'assets/whatsapp-profile.png'), 640)

console.log('\nDone. Upload:')
console.log('  assets/icon.png             → Expo EAS / Google Play')
console.log('  assets/whatsapp-profile.png → WhatsApp Business Manager > Profile > Photo')
