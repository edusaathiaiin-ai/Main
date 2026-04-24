/**
 * invisible-text-regression.test.ts
 *
 * Locks the anti-pattern that has bitten us across five separate
 * incidents (commits 8f8157d, 7e94e25, 5ac32e6, 4797c19, 5cf9c26):
 *   - text-white / text-white/<n>     Tailwind classes
 *   - color: '#fff' / '#FFF' / '#FFFFFF' / '#ffffff' / 'white'
 *   - color: 'rgba(255, 255, 255, ...)'
 *
 * Every single recurrence was the same root cause: a developer (often
 * past-me) wrote hex-white or Tailwind-white as a TEXT color assuming
 * the platform was dark-themed. The platform has been light-first since
 * April 2026 (website/CLAUDE.md: "The platform is LIGHT THEME. Not dark.").
 * Those hex-whites became invisible bombs that only fire when a student
 * lands on that specific page.
 *
 * ── BASELINE-GRANDFATHERED MODE ──
 *
 * The codebase has hundreds of pre-existing usages — many legitimate
 * (buttons with colored backgrounds, modals on dark panels, user bubbles
 * on saathi-primary). Fixing every one at once is a sprawling cleanup;
 * what we need tonight is to STOP THE BLEEDING.
 *
 * So: this test snapshots current usages into invisible-text-baseline.json
 * and fails only when a NEW usage appears that is not in the baseline.
 * Future invisible-text bombs surface immediately; legacy usages get
 * chipped away in dedicated passes (each pass trims the baseline).
 *
 * Commands:
 *   npm test invisible-text                                  # normal check
 *   UPDATE_INVISIBLE_TEXT_BASELINE=1 npm test invisible-text # regen baseline
 *     (use after you've intentionally fixed / allowlisted items so the
 *      baseline shrinks — never to silence a genuine new bomb)
 *
 * When this test fails on a new finding, pick one:
 *   (a) Fix the color: replace with var(--text-primary) / var(--text-secondary)
 *       / var(--text-tertiary) / var(--text-ghost) — or remove the color
 *       entirely and let the cascade apply the Saathi theme.
 *   (b) If the surrounding element genuinely has a dark-hue background
 *       (a colored button, a modal's dark panel, a user bubble), allowlist:
 *         - Line-level:  put  // @allow-text-white  on the same line OR the
 *           line immediately above the offending statement.
 *         - File-level:  put  // @allow-text-white-file  in the top 15
 *           lines of the file (for an entire deliberately-dark surface).
 *
 * Never weaken the PATTERNS list to make this test pass.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

// ── Surfaces we DO scan (authenticated student/faculty surfaces) ────────
const SCAN_ROOTS = [
  'app/(app)',
  'components/chat',
  'components/classroom',
  'components/faculty',
  'components/profile',
  'components/board',
  'components/live',
  'components/institutions',
  'components/settings',
  'components/progress',
  'components/flashcards',
  'components/layout',
  'components/sessions',
  'components/news',
  'components/shared',
  'components/ui',
]

// ── Surfaces we DO NOT scan (legitimately dark by design) ───────────────
const SKIP_PREFIXES = [
  'components/chat/WelcomeOverlay.tsx',
  'components/chat/SuspensionScreen.tsx',
  'components/chat/ThinkingBubble.tsx',
  'components/live/BookingConsentModal.tsx',
  'components/tour/',
  'components/ui/UpgradeBanner.tsx',
  'components/ui/CookieBanner.tsx',
  'components/contact/',
  'components/onboard/',
]

// ── Forbidden patterns ──────────────────────────────────────────────────
const PATTERNS: { label: string; re: RegExp }[] = [
  {
    label: 'text-white Tailwind class',
    re: /\b(?:text-white\/\d+|text-white)\b/,
  },
  {
    label: 'hex white used as a color (#fff/#FFF/#FFFFFF/#ffffff)',
    re: /\bcolor:\s*['"`]#(?:fff|FFF|FFFFFF|ffffff)['"`]/,
  },
  {
    label: "string 'white' used as a color",
    re: /\bcolor:\s*['"`]white['"`]/,
  },
  {
    label: 'rgba(255,255,255,x) used as a color',
    re: /\bcolor:\s*['"`]rgba\(\s*255\s*,\s*255\s*,\s*255/,
  },
]

const BASELINE_PATH = join(__dirname, 'invisible-text-baseline.json')

// ── Helpers ──────────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  let out: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  for (const name of entries) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out = out.concat(walk(full))
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full)
  }
  return out
}

function relPath(srcRoot: string, file: string): string {
  return relative(srcRoot, file).replace(/\\/g, '/')
}

function isSkipped(rel: string): boolean {
  return SKIP_PREFIXES.some((p) => rel.startsWith(p))
}

function hasFilePragma(content: string): boolean {
  return /@allow-text-white-file/.test(
    content.split('\n').slice(0, 15).join('\n'),
  )
}

function hasLinePragma(lines: string[], idx: number): boolean {
  const sameLine = /@allow-text-white\b/.test(lines[idx])
  const previousLine =
    idx > 0 && /@allow-text-white\b/.test(lines[idx - 1])
  return sameLine || previousLine
}

type Finding = { file: string; line: number; label: string; snippet: string }

function collectFindings(srcRoot: string): Finding[] {
  const files: string[] = []
  for (const root of SCAN_ROOTS) files.push(...walk(join(srcRoot, root)))
  const scanned = files.filter((f) => !isSkipped(relPath(srcRoot, f)))

  const findings: Finding[] = []
  for (const file of scanned) {
    const content = readFileSync(file, 'utf-8')
    if (hasFilePragma(content)) continue
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (hasLinePragma(lines, i)) continue
      for (const p of PATTERNS) {
        if (p.re.test(lines[i])) {
          findings.push({
            file: relPath(srcRoot, file),
            line: i + 1,
            label: p.label,
            snippet: lines[i].trim().slice(0, 200),
          })
        }
      }
    }
  }
  return findings
}

// Baseline is a map `file:line:label -> snippet`. Exact (file, line, label)
// triples are matched — if the line shifts due to edits, the old entry no
// longer matches. That's intentional: moving a line counts as "new" and
// forces re-review. Run UPDATE_INVISIBLE_TEXT_BASELINE=1 to regen.
type BaselineEntry = {
  file: string
  line: number
  label: string
  snippet: string
}

function loadBaseline(): BaselineEntry[] {
  if (!existsSync(BASELINE_PATH)) return []
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as BaselineEntry[]
  } catch {
    return []
  }
}

function saveBaseline(findings: Finding[]): void {
  const sorted = [...findings].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
  )
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(sorted, null, 2) + '\n',
    'utf-8',
  )
}

function key(e: { file: string; line: number; label: string }): string {
  return `${e.file}::${e.line}::${e.label}`
}

// ── The test ─────────────────────────────────────────────────────────────
describe('Invisible-text regression — new usages must be fixed or allowlisted', () => {
  const srcRoot = join(__dirname, '..')
  const shouldUpdate = process.env.UPDATE_INVISIBLE_TEXT_BASELINE === '1'

  it('scanned at least one file (sanity check)', () => {
    const files: string[] = []
    for (const root of SCAN_ROOTS) files.push(...walk(join(srcRoot, root)))
    expect(files.length).toBeGreaterThan(20)
  })

  it('no NEW white-as-text patterns beyond the grandfathered baseline', () => {
    const findings = collectFindings(srcRoot)

    if (shouldUpdate) {
      saveBaseline(findings)
      console.log(
        `[invisible-text] Baseline regenerated with ${findings.length} entries at ${relative(dirname(srcRoot), BASELINE_PATH)}`,
      )
      return
    }

    const baseline = loadBaseline()
    const baselineKeys = new Set(baseline.map(key))
    const newFindings = findings.filter((f) => !baselineKeys.has(key(f)))

    // Also report baseline entries that are no longer present — nice to
    // know so we can trim the baseline when someone fixes a legacy usage.
    const currentKeys = new Set(findings.map(key))
    const resolvedBaseline = baseline.filter((b) => !currentKeys.has(key(b)))

    if (resolvedBaseline.length > 0) {
      console.log(
        `[invisible-text] ${resolvedBaseline.length} baseline entries are no longer triggered — run \`UPDATE_INVISIBLE_TEXT_BASELINE=1 npm test invisible-text\` to trim.`,
      )
    }

    if (newFindings.length > 0) {
      const grouped: Record<string, Finding[]> = {}
      for (const f of newFindings) {
        ;(grouped[f.file] ??= []).push(f)
      }
      const report = Object.entries(grouped)
        .map(([file, rows]) => {
          const body = rows
            .map(
              (r) =>
                `    L${String(r.line).padStart(4)}  ${r.label}\n           ${r.snippet}`,
            )
            .join('\n')
          return `  ${file}\n${body}`
        })
        .join('\n\n')
      const header =
        `\n${newFindings.length} NEW invisible-text pattern${newFindings.length === 1 ? '' : 's'} introduced beyond the grandfathered baseline.\n` +
        `Fix with theme tokens (var(--text-primary), var(--text-secondary), var(--text-tertiary), var(--text-ghost))\n` +
        `— OR allowlist with  // @allow-text-white  (inline) or  // @allow-text-white-file  (top of file)\n` +
        `when the surrounding element truly has a dark-hue background.\n\n`
      throw new Error(header + report + '\n')
    }
    expect(newFindings).toHaveLength(0)
  })
})
