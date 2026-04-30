// MERLOT (Multimedia Educational Resource for Learning and Online Teaching).
// CSU multi-institution catalog. Free, no auth.
//
// MERLOT is a CATALOG of educational resources hosted by other vendors.
// Each chip below is a vetted MERLOT-listed simulation that we've
// confirmed loads in an iframe. Many MERLOT entries link out to PDFs
// or apps that don't iframe — those are deliberately excluded.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const MERLOT_BY_SAATHI: Record<string, ToolChip[]> = {
  mechsaathi: [
    { label: 'MERLOT: Mechanical Engineering', url: 'https://www.merlot.org/merlot/materials.htm?keywords=mechanical+engineering&category=2515' },
    { label: 'MERLOT: Statics & Dynamics', url: 'https://www.merlot.org/merlot/materials.htm?keywords=statics+dynamics' },
  ],
  civilsaathi: [
    { label: 'MERLOT: Civil Engineering', url: 'https://www.merlot.org/merlot/materials.htm?keywords=civil+engineering&category=2510' },
    { label: 'MERLOT: Structures', url: 'https://www.merlot.org/merlot/materials.htm?keywords=structural+engineering' },
  ],
  chemenggsaathi: [
    { label: 'MERLOT: Chemical Engineering', url: 'https://www.merlot.org/merlot/materials.htm?keywords=chemical+engineering&category=2505' },
  ],
  elecsaathi: [
    { label: 'MERLOT: Electrical Engineering', url: 'https://www.merlot.org/merlot/materials.htm?keywords=electrical+engineering&category=2520' },
    { label: 'MERLOT: Power Systems', url: 'https://www.merlot.org/merlot/materials.htm?keywords=power+systems' },
  ],
  electronicssaathi: [
    { label: 'MERLOT: Electronics', url: 'https://www.merlot.org/merlot/materials.htm?keywords=electronics' },
    { label: 'MERLOT: Digital Logic', url: 'https://www.merlot.org/merlot/materials.htm?keywords=digital+logic' },
  ],
  aerospacesaathi: [
    { label: 'MERLOT: Aerospace', url: 'https://www.merlot.org/merlot/materials.htm?keywords=aerospace' },
    { label: 'MERLOT: Aerodynamics', url: 'https://www.merlot.org/merlot/materials.htm?keywords=aerodynamics' },
  ],
}

export function getMerlotChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return MERLOT_BY_SAATHI[key] ?? []
}
