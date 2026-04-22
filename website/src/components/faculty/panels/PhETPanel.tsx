'use client'

// A landing picker for PhET — the portal page lets faculty browse sims.
// Direct sim embeds can be added per-Saathi later.

import { IframePanel } from './IframePanel'

export function PhETPanel() {
  return (
    <IframePanel
      src="https://phet.colorado.edu/en/simulations/filter?type=html"
      openUrl="https://phet.colorado.edu/en/simulations/filter?type=html"
      title="PhET Interactive Simulations"
      attribution="PhET · University of Colorado Boulder · Free"
    />
  )
}
