'use client'

import { IframePanel } from './IframePanel'

// FRED's full REST requires a free API key. The public search/browse pages
// load fine inside an iframe, which covers the faculty use case (explore a
// series, hit "Open ↗" to pop out, copy data). We keep the API key route
// parked — worth wiring only when faculty ask for live chart embeds.

export function FredPanel() {
  return (
    <IframePanel
      src="https://fred.stlouisfed.org/"
      openUrl="https://fred.stlouisfed.org/"
      title="FRED — Federal Reserve economic data"
      attribution="St. Louis Fed · Free · 800K+ series"
    />
  )
}
