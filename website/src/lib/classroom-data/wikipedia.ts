// Wikipedia — embeddable, free, anonymous (no auth).
// English Wikipedia removed X-Frame-Options for `en.wikipedia.org` so
// articles iframe cleanly inside our chat sidebar / classroom panels.
//
// Default chip is the search interface — students type any topic and
// get the article inline. Per-Saathi additional chips deep-link into
// curated portal pages (Wikipedia's portal: namespace) so the first
// landing isn't a blank search.
//
// Wikipedia is the closest thing the open web has to a domain-agnostic
// "always good enough" reference. Used here to fill the chat-tools gap
// for Saathis (humanities, commerce, civics) where most subject-specific
// tools are paid / auth-walled / non-iframe.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const search = (suffix?: string): string =>
  suffix
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(suffix)}`
    : 'https://en.wikipedia.org/wiki/Special:Search'

const portal = (page: string): string =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(page)}`

const WIKIPEDIA_BY_SAATHI: Record<string, ToolChip[]> = {
  kanoonsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Law',                url: portal('Portal:Law') },
    { label: 'Constitution of India',      url: portal('Constitution_of_India') },
    { label: 'Bharatiya Nyaya Sanhita',    url: portal('Bharatiya_Nyaya_Sanhita') },
  ],
  historysaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: History',            url: portal('Portal:History') },
    { label: 'Portal: Indian History',     url: portal('Portal:Indian_history') },
    { label: 'Modern History of India',    url: portal('History_of_India') },
  ],
  polscisaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Politics',           url: portal('Portal:Politics') },
    { label: 'Indian Polity',              url: portal('Politics_of_India') },
    { label: 'Constitution of India',      url: portal('Constitution_of_India') },
  ],
  bizsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Business',           url: portal('Portal:Business') },
    { label: 'Strategic Management',       url: portal('Strategic_management') },
  ],
  finsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Finance',            url: portal('Portal:Finance') },
    { label: 'Indian Financial System',    url: portal('Financial_system_of_India') },
  ],
  mktsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Marketing',          url: portal('Portal:Marketing') },
    { label: 'Marketing Mix',              url: portal('Marketing_mix') },
  ],
  hrsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Human Resource Management',  url: portal('Human_resource_management') },
    { label: 'Industrial Relations India', url: portal('Industrial_relations') },
  ],
  accountsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Accounting',                 url: portal('Accounting') },
    { label: 'Indian GAAP / Ind AS',       url: portal('Indian_Accounting_Standards') },
  ],
  econsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Economics',          url: portal('Portal:Economics') },
    { label: 'Indian Economy',             url: portal('Economy_of_India') },
  ],
  statssaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Statistics',         url: portal('Portal:Statistics') },
    { label: 'Probability Theory',         url: portal('Probability_theory') },
  ],
  psychsaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Psychology',         url: portal('Portal:Psychology') },
    { label: 'Cognitive Psychology',       url: portal('Cognitive_psychology') },
  ],
  geosaathi: [
    { label: 'Search Wikipedia',           url: search() },
    { label: 'Portal: Geography',          url: portal('Portal:Geography') },
    { label: 'Geography of India',         url: portal('Geography_of_India') },
  ],
}

export function getWikipediaChipsFor(saathiSlug: string): ToolChip[] {
  return WIKIPEDIA_BY_SAATHI[saathiSlug] ?? []
}
