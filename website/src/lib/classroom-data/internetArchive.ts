// Internet Archive — archive.org. Free, anonymous, official iframe support
// via /details/<id> URLs (no /embed needed for browsing the archive).
//
// Strongest fit for HistorySaathi (primary sources, scanned books,
// historical newspapers) and GeoSaathi (historical maps, atlases).
// Also useful for ArchSaathi (architectural reference imagery, old plans)
// but ArchSaathi already has Sketchfab + StoryMaps coverage in classroom.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const ARCHIVE_BY_SAATHI: Record<string, ToolChip[]> = {
  historysaathi: [
    { label: 'Internet Archive home',      url: 'https://archive.org/' },
    { label: 'Texts (books, papers)',      url: 'https://archive.org/details/texts' },
    { label: 'Indian National Archives',   url: 'https://archive.org/search.php?query=India%20history' },
    { label: 'Wayback Machine',            url: 'https://web.archive.org/' },
  ],
  geosaathi: [
    { label: 'Internet Archive home',      url: 'https://archive.org/' },
    { label: 'Historical Maps',            url: 'https://archive.org/search.php?query=historical+maps' },
    { label: 'Atlases',                    url: 'https://archive.org/details/atlases' },
  ],
  polscisaathi: [
    { label: 'Internet Archive home',      url: 'https://archive.org/' },
    { label: 'Indian Constitution debates', url: 'https://archive.org/search.php?query=Indian+Constituent+Assembly' },
  ],
}

export function getInternetArchiveChipsFor(saathiSlug: string): ToolChip[] {
  return ARCHIVE_BY_SAATHI[saathiSlug] ?? []
}
