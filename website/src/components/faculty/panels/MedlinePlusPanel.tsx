'use client'

import { IframePanel } from './IframePanel'

export function MedlinePlusPanel() {
  return (
    <IframePanel
      src="https://medlineplus.gov/all_healthtopics.html"
      openUrl="https://medlineplus.gov/"
      title="MedlinePlus — patient-facing medical reference"
      attribution="US NIH/NLM · Free"
    />
  )
}
