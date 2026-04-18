'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { ArtifactModal } from './ArtifactModal'

type Archive = {
  id: string
  session_id: string | null
  saathi_slug: string
  session_date: string
  session_duration: string | null
  summary: string | null
  artifacts: Artifact[]
  faculty_id: string | null
  faculty_name?: string
}

type Artifact = {
  type: string
  source: string
  source_url?: string
  data: Record<string, unknown>
  timestamp: string
}

const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  molecule_3d:        { bg: '#DBEAFE', text: '#2563EB' },
  protein_structure:  { bg: '#CCFBF1', text: '#0D9488' },
  wolfram_query:      { bg: '#FEF3C7', text: '#D97706' },
  pubmed_citation:    { bg: '#F3F4F6', text: '#6B7280' },
  formula_katex:      { bg: '#EDE9FE', text: '#7C3AED' },
  pdf_annotation:     { bg: '#FEE2E2', text: '#EF4444' },
  code_snapshot:      { bg: '#D1FAE5', text: '#059669' },
  geogebra_state:     { bg: '#DBEAFE', text: '#2563EB' },
  map_state:          { bg: '#CCFBF1', text: '#0D9488' },
  phet_session:       { bg: '#F3F4F6', text: '#6B7280' },
  session_notes:      { bg: '#FEF3C7', text: '#92400E' },
}

function chipLabel(a: Artifact): string {
  switch (a.type) {
    case 'molecule_3d': return (a.data.compound_name as string) ?? 'Molecule'
    case 'protein_structure': return `PDB ${(a.data.pdb_id as string) ?? ''}`
    case 'wolfram_query': return `Wolfram: ${((a.data.plaintext_result as string) ?? '').slice(0, 20)}`
    case 'pubmed_citation': return `${((a.data.authors as string[])?.[0] ?? '').split(' ').pop() ?? ''} ${a.data.year ?? ''}`
    case 'formula_katex': return 'Formula'
    case 'pdf_annotation': return `PDF · ${((a.data.annotations as unknown[])?.length ?? 0)} notes`
    case 'code_snapshot': return `${a.data.language ?? ''} code`
    case 'geogebra_state': return 'GeoGebra'
    case 'map_state': return `Map: ${((a.data.context_note as string) ?? '').slice(0, 15)}`
    case 'phet_session': return `PhET: ${a.data.sim_display_name ?? ''}`
    case 'session_notes': return 'Notes'
    case 'command_log': return ''
    default: return a.type
  }
}

export default function ArchiveTab({ userId }: { userId: string }) {
  const [archives, setArchives] = useState<Archive[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('research_archives')
        .select('id, session_id, saathi_slug, session_date, session_duration, summary, artifacts, faculty_id')
        .eq('student_id', userId)
        .order('session_date', { ascending: false })
        .limit(50)

      if (!data?.length) { setArchives([]); setLoading(false); return }

      // Fetch faculty names
      const facultyIds = [...new Set(data.map(d => d.faculty_id).filter(Boolean))]
      let facultyMap: Record<string, string> = {}
      if (facultyIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', facultyIds)
        facultyMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name]))
      }

      setArchives(data.map(d => ({
        ...d,
        artifacts: (d.artifacts ?? []) as Artifact[],
        faculty_name: d.faculty_id ? facultyMap[d.faculty_id] ?? '' : '',
      })))
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10" style={{ borderTopColor: '#C9993A' }} />
      </div>
    )
  }

  if (archives.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-2 text-3xl">📓</p>
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>No research archives yet</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Join a classroom session — your scientific notebook starts building automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {archives.map(archive => {
        const saathi = SAATHIS.find(s => s.id === archive.saathi_slug)
        const visibleArtifacts = archive.artifacts.filter(a => a.type !== 'command_log')
        const chips = visibleArtifacts.slice(0, 5)
        const remaining = Math.max(0, visibleArtifacts.length - 5)

        return (
          <div
            key={archive.id}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header: Saathi dot + name + faculty + date */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                {saathi && (
                  <div className="h-3 w-3 rounded-full" style={{ background: saathi.primary }} />
                )}
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {saathi?.name ?? archive.saathi_slug}
                </span>
                {archive.faculty_name && (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    · {archive.faculty_name}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(archive.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {archive.session_duration && (
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {archive.session_duration}
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            {archive.summary && (
              <p className="mb-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {archive.summary}
              </p>
            )}

            {/* Artifact chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((a, i) => {
                  const label = chipLabel(a)
                  if (!label) return null
                  const colors = CHIP_COLORS[a.type] ?? { bg: '#F3F4F6', text: '#6B7280' }
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedArtifact(a)}
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: colors.bg, color: colors.text, cursor: 'pointer', border: 'none' }}
                    >
                      {label}
                    </button>
                  )
                })}
                {remaining > 0 && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                    + {remaining} more
                  </span>
                )}
              </div>
            )}

            {/* Reopen session link */}
            {archive.session_id && (
              <div className="mt-3">
                <a
                  href={`/classroom/${archive.session_id}?mode=review`}
                  className="text-xs font-semibold"
                  style={{ color: '#C9993A', textDecoration: 'none' }}
                >
                  Reopen session →
                </a>
              </div>
            )}
          </div>
        )
      })}

      {selectedArtifact && (
        <ArtifactModal artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
      )}
    </div>
  )
}
