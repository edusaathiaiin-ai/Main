'use client'

import { IframePanel } from './IframePanel'

export function OpenAnatomyPanel() {
  return (
    <IframePanel
      src="https://www.openanatomy.org/atlases/"
      openUrl="https://www.openanatomy.org/"
      title="OpenAnatomy — Harvard 3D atlases"
      attribution="Harvard Medical School · Free · CC"
    />
  )
}
