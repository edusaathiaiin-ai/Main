// Google Trends — trends.google.com. Free, no auth.
// Allows iframe embedding via /trends/explore URLs.
//
// Strongest fit: MktSaathi (real-time search demand for marketing
// strategy), BizSaathi (industry trend research). Lighter use for
// EconSaathi (consumer behaviour trends).

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const TRENDS_DEFAULT: ToolChip[] = [
  { label: 'Google Trends home', url: 'https://trends.google.com/trends/' },
  { label: 'Trending now',       url: 'https://trends.google.com/trends/trendingsearches/daily?geo=IN' },
  { label: 'Compare topics',     url: 'https://trends.google.com/trends/explore?geo=IN' },
]

const TRENDS_BY_SAATHI: Record<string, ToolChip[]> = {
  mktsaathi:  TRENDS_DEFAULT,
  bizsaathi:  TRENDS_DEFAULT,
  econsaathi: TRENDS_DEFAULT,
}

export function getGoogleTrendsChipsFor(saathiSlug: string): ToolChip[] {
  return TRENDS_BY_SAATHI[saathiSlug] ?? []
}
