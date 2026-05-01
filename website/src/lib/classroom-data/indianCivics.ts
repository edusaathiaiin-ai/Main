// Indian civic / governance reference tools.
//
//   • India Code (indiacode.nic.in) — official Govt of India repository
//     of central Acts. Free, anonymous, iframe-friendly. Primary source
//     for KanoonSaathi, PolSciSaathi, AccountSaathi (tax laws).
//   • PRS India (prsindia.org) — non-profit parliamentary research, used
//     by UPSC aspirants + policy students. Embeddable.
//   • data.gov.in — Indian government open data platform. Useful for
//     Stats / Econ / Fin / PolSci data work. Iframe-friendly.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const INDIA_CODE = (page = ''): string =>
  `https://www.indiacode.nic.in${page || '/'}`

const CIVICS_BY_SAATHI: Record<string, ToolChip[]> = {
  kanoonsaathi: [
    { label: 'India Code (statutes)',      url: INDIA_CODE() },
    { label: 'Central Acts',               url: INDIA_CODE('/handle/123456789/2331') },
    { label: 'PRS India',                  url: 'https://prsindia.org/' },
    { label: 'Bills tracker',              url: 'https://prsindia.org/billtrack' },
  ],
  polscisaathi: [
    { label: 'India Code',                 url: INDIA_CODE() },
    { label: 'PRS India',                  url: 'https://prsindia.org/' },
    { label: 'Parliament of India',        url: 'https://sansad.in/' },
    { label: 'data.gov.in',                url: 'https://data.gov.in/' },
  ],
  accountsaathi: [
    { label: 'Income Tax Act',             url: INDIA_CODE('/handle/123456789/2435') },
    { label: 'GST (CGST Act)',             url: INDIA_CODE('/handle/123456789/2095') },
    { label: 'Companies Act',              url: INDIA_CODE('/handle/123456789/2114') },
    { label: 'India Code (statutes)',      url: INDIA_CODE() },
  ],
  finsaathi: [
    { label: 'PRS India (financial bills)', url: 'https://prsindia.org/billtrack' },
    { label: 'data.gov.in',                 url: 'https://data.gov.in/' },
    { label: 'India Code',                  url: INDIA_CODE() },
  ],
  statssaathi: [
    { label: 'data.gov.in',                url: 'https://data.gov.in/' },
    { label: 'MOSPI India',                url: 'https://mospi.gov.in/' },
  ],
  econsaathi: [
    { label: 'data.gov.in',                url: 'https://data.gov.in/' },
    { label: 'MOSPI India',                url: 'https://mospi.gov.in/' },
    { label: 'PRS India (econ bills)',     url: 'https://prsindia.org/billtrack' },
  ],
}

export function getIndianCivicsChipsFor(saathiSlug: string): ToolChip[] {
  return CIVICS_BY_SAATHI[saathiSlug] ?? []
}
