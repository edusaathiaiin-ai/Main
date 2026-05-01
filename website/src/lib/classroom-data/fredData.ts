// FRED — Federal Reserve Economic Data, St. Louis Fed.
// fred.stlouisfed.org. Free, no auth, iframe-friendly via /series/<id>.
// Already used in faculty-side dock for EconSaathi/StatsSaathi/FinSaathi.
//
// Each chip points to a series page or browse view. Students can
// search additional series within the iframe. Default landing is the
// FRED homepage so the search bar is the first thing they see.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const FRED_DEFAULT: ToolChip[] = [
  { label: 'FRED home',          url: 'https://fred.stlouisfed.org/' },
  { label: 'India series',       url: 'https://fred.stlouisfed.org/searchresults/?st=india' },
  { label: 'GDP (US)',           url: 'https://fred.stlouisfed.org/series/GDP' },
  { label: 'Inflation (US CPI)', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
]

const FRED_BY_SAATHI: Record<string, ToolChip[]> = {
  econsaathi:  FRED_DEFAULT,
  statssaathi: FRED_DEFAULT,
  finsaathi:   FRED_DEFAULT,
  bizsaathi:   FRED_DEFAULT,
}

export function getFredChipsFor(saathiSlug: string): ToolChip[] {
  return FRED_BY_SAATHI[saathiSlug] ?? []
}
