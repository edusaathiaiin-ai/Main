'use client'

// ─────────────────────────────────────────────────────────────────────────────
// RcsbPanelSolo — faculty solo dock wrapper.
//
// The shared classroom RcsbPanel already emits onArtifact events when a
// structure is loaded. We plumb those into the faculty-solo artifact log.
// ─────────────────────────────────────────────────────────────────────────────

import { RcsbPanel } from '@/components/classroom/RcsbPanel'
import { saveArtifact, currentSessionBucketId } from '@/lib/faculty-solo/artifactClient'

type Props = {
  saathiSlug: string
}

export function RcsbPanelSolo({ saathiSlug }: Props) {
  return (
    <RcsbPanel
      onArtifact={async (a) => {
        const title = typeof a.data?.title === 'string'
          ? a.data.title
          : typeof a.data?.pdb_id === 'string'
            ? a.data.pdb_id
            : 'RCSB structure'
        await saveArtifact({
          saathi_slug:       saathiSlug,
          tool_id:           'rcsb',
          title,
          payload_json:      a.data,
          source_url:        a.source_url,
          session_bucket_id: currentSessionBucketId(),
        })
        window.dispatchEvent(new Event('faculty-artifacts:changed'))
      }}
    />
  )
}
