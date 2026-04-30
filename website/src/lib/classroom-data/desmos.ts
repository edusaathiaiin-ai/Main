// Desmos — graphing, geometry, 3D, and scientific calculators.
// Free, no auth, fully iframe-friendly via the standard product URLs.
// Source: desmos.com.
//
// Each chip points to a calculator surface. Faculty / students can
// also paste Desmos *graph share* URLs (desmos.com/calculator/<id>) as
// new chips for pre-built lessons later — same format.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const DESMOS_CALCULATORS: ToolChip[] = [
  {
    label: 'Graphing Calculator',
    url:   'https://www.desmos.com/calculator',
    description: 'Plot functions, sliders, animations.',
  },
  {
    label: 'Geometry',
    url:   'https://www.desmos.com/geometry',
    description: 'Construct, measure, transform.',
  },
  {
    label: '3D Calculator',
    url:   'https://www.desmos.com/3d',
    description: 'Plot surfaces, vector fields, parametric 3D.',
  },
  {
    label: 'Scientific Calculator',
    url:   'https://www.desmos.com/scientific',
    description: 'For step-through computation.',
  },
]

const DESMOS_BY_SAATHI: Record<string, ToolChip[]> = {
  maathsaathi:      DESMOS_CALCULATORS,
  physicsaathi:     DESMOS_CALCULATORS,
  econsaathi:       DESMOS_CALCULATORS,
  statssaathi:      DESMOS_CALCULATORS,
  civilsaathi:      DESMOS_CALCULATORS,
  chemenggsaathi:   DESMOS_CALCULATORS,
  aerospacesaathi:  DESMOS_CALCULATORS,
}

export function getDesmosChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return DESMOS_BY_SAATHI[key] ?? []
}
