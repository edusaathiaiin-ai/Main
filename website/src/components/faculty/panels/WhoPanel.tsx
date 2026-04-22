'use client'

import { IframePanel } from './IframePanel'

export function WhoPanel() {
  return (
    <IframePanel
      src="https://www.who.int/health-topics"
      openUrl="https://www.who.int/"
      title="WHO — guidance, fact sheets, outbreaks"
      attribution="World Health Organization · Free"
    />
  )
}
