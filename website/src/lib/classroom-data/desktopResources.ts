// Desktop-only / non-iframable tool resources. These render via
// ResourcesPanel as honest "open in new tab" cards with download links
// and tutorial URLs. NOT embedded — embedding desktop apps isn't
// possible. Better to be honest about that than to fake it.

import type { ResourceChip } from '@/components/classroom/ResourcesPanel'

const RESOURCES_BY_SAATHI: Record<string, ResourceChip[]> = {
  civilsaathi: [
    {
      label: 'Bentley Education Suite',
      url: 'https://education.bentley.com/',
      description: 'Free MicroStation, STAAD.Pro, OpenRoads for students with institutional registration.',
      icon: '🏗️',
      tag: 'Desktop',
    },
    {
      label: 'FreeCAD',
      url: 'https://www.freecad.org/downloads.php',
      description: 'Open-source parametric BIM/3D CAD. Desktop install required.',
      icon: '📐',
      tag: 'Free',
    },
    {
      label: 'SketchUp Free',
      url: 'https://www.sketchup.com/plans-and-pricing/sketchup-free',
      description: 'Browser-based 3D modelling. Free tier available.',
      icon: '🏛️',
      tag: 'Web',
    },
  ],
  mechsaathi: [
    {
      label: 'FreeCAD',
      url: 'https://www.freecad.org/downloads.php',
      description: 'Open-source parametric CAD. Desktop install required.',
      icon: '📐',
      tag: 'Free',
    },
    {
      label: 'OnShape (Free Hobbyist)',
      url: 'https://www.onshape.com/en/free',
      description: 'Pro-grade web CAD. Free for students/hobbyists with public projects.',
      icon: '⚙️',
      tag: 'Web',
    },
    {
      label: 'Bentley Education Suite',
      url: 'https://education.bentley.com/',
      description: 'Free engineering software for students.',
      icon: '🏗️',
      tag: 'Desktop',
    },
  ],
  archsaathi: [
    {
      label: 'SketchUp Free',
      url: 'https://www.sketchup.com/plans-and-pricing/sketchup-free',
      description: 'Browser-based 3D modelling. Free tier available.',
      icon: '🏛️',
      tag: 'Web',
    },
    {
      label: 'FreeCAD',
      url: 'https://www.freecad.org/downloads.php',
      description: 'Open-source CAD with BIM workflows.',
      icon: '📐',
      tag: 'Free',
    },
  ],
  elecsaathi: [
    {
      label: 'Logisim Evolution',
      url: 'https://github.com/logisim-evolution/logisim-evolution',
      description: 'Active fork of the classic digital logic simulator. Desktop only.',
      icon: '⚡',
      tag: 'Desktop',
    },
    {
      label: 'CEDAR Logic Simulator',
      url: 'https://sourceforge.net/projects/cedarls/',
      description: 'Cedarville University digital logic simulator. Windows desktop.',
      icon: '🔌',
      tag: 'Desktop',
    },
    {
      label: 'KiCad EDA',
      url: 'https://www.kicad.org/download/',
      description: 'Open-source PCB design suite. Desktop install required.',
      icon: '🛠️',
      tag: 'Free',
    },
  ],
  electronicssaathi: [
    {
      label: 'Logisim Evolution',
      url: 'https://github.com/logisim-evolution/logisim-evolution',
      description: 'Active fork of the classic digital logic simulator.',
      icon: '⚡',
      tag: 'Desktop',
    },
    {
      label: 'CEDAR Logic Simulator',
      url: 'https://sourceforge.net/projects/cedarls/',
      description: 'Cedarville University digital logic simulator.',
      icon: '🔌',
      tag: 'Desktop',
    },
    {
      label: 'KiCad EDA',
      url: 'https://www.kicad.org/download/',
      description: 'Open-source PCB design.',
      icon: '🛠️',
      tag: 'Free',
    },
  ],
}

export function getDesktopResourcesFor(saathiSlug: string): ResourceChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return RESOURCES_BY_SAATHI[key] ?? []
}
