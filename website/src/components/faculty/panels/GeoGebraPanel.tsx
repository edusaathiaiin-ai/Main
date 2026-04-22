'use client'

import { IframePanel } from './IframePanel'

export function GeoGebraPanel() {
  return (
    <IframePanel
      src="https://www.geogebra.org/classic?lang=en&embed=true"
      openUrl="https://www.geogebra.org/classic"
      title="GeoGebra — graph, compute, explore"
      attribution="GeoGebra · Free · Embedded"
    />
  )
}
