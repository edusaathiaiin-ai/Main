'use client'

import { useCallback } from 'react'

export type ArtifactType =
  | 'molecule_3d'
  | 'protein_structure'
  | 'wolfram_query'
  | 'geogebra_state'
  | 'phet_session'
  | 'pubmed_citation'
  | 'formula_katex'
  | 'pdf_annotation'
  | 'code_snapshot'
  | 'map_state'
  | 'canvas_snapshot'
  | 'command_log'

export interface ResearchArtifact {
  type: ArtifactType
  source: string
  source_url?: string
  data: Record<string, unknown>
  timestamp: string
}

export function useArtifactLog(sessionId: string) {
  const emit = useCallback(async (artifact: ResearchArtifact) => {
    try {
      await fetch('/api/classroom/log-artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, artifact }),
      })
    } catch { /* best-effort — don't block UI */ }
  }, [sessionId])

  return { emit }
}
