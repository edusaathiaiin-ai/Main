// JSCAD — open-source parametric CAD in JavaScript, runs in browser.
// openjscad.xyz. Free, no auth, fully embeddable.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const JSCAD_DEFAULT: ToolChip[] = [
  { label: 'JSCAD Editor', url: 'https://openjscad.xyz/', description: 'Full parametric CAD editor in browser' },
]

const JSCAD_BY_SAATHI: Record<string, ToolChip[]> = {
  mechsaathi: JSCAD_DEFAULT,
  civilsaathi: JSCAD_DEFAULT,
  archsaathi: JSCAD_DEFAULT,
  chemenggsaathi: JSCAD_DEFAULT,
  aerospacesaathi: JSCAD_DEFAULT,
}

export function getJscadChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return JSCAD_BY_SAATHI[key] ?? []
}
