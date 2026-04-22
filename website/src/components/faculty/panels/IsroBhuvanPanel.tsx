'use client'

import { IframePanel } from './IframePanel'

// ISRO Bhuvan frames its own 2D map viewer inside an iframe acceptably.
// The Geoid / 3D client wants a direct window and rejects embedding, so we
// send faculty to the 2D viewer here and rely on the "Open ↗" deep-link for
// the full client.

export function IsroBhuvanPanel() {
  return (
    <IframePanel
      src="https://bhuvan-app1.nrsc.gov.in/2dviewer/2dviewer.php"
      openUrl="https://bhuvan.nrsc.gov.in/home/index.php"
      title="ISRO Bhuvan — Indian earth observation"
      attribution="ISRO / NRSC · Free with token"
    />
  )
}
