'use client'

import { IframePanel } from './IframePanel'

export function SageMathCellPanel() {
  return (
    <IframePanel
      src="https://sagecell.sagemath.org/?z=eJwL4OWS4OUCAAQcAQQ="
      openUrl="https://sagecell.sagemath.org"
      title="SageMathCell — symbolic & numeric compute"
      attribution="SageMath · Free · Open-source"
      emptyHint="Type a Sage/Python expression, press Evaluate."
    />
  )
}
