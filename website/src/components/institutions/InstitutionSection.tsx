'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InstitutionSection — single drop-in for student-facing surfaces.
//
//   If profile.institution_id is NULL  → "Is your college on EdUsaathiAI?" card
//                                         that opens InstitutionJoinModal
//   If profile.institution_id is SET   → compact institution badge with
//                                         name, city, and a subtle "Leave" link
//                                         that opens InstitutionLeaveModal
//
// Self-refreshes after join/leave via window.location.reload() — explicit,
// no stale Zustand cache, matches the "page refreshes, institution badge
// appears" UX in the brief.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { InstitutionJoinModal } from './InstitutionJoinModal'
import { InstitutionLeaveModal } from './InstitutionLeaveModal'

type InstSnapshot = {
  name:        string
  city:        string
  affiliation: string | null
} | null

type Props = {
  /** 'dashboard' leans warm + inviting; 'profile' reads a notch more formal. */
  variant?: 'dashboard' | 'profile'
}

export function InstitutionSection({ variant = 'dashboard' }: Props) {
  const { profile } = useAuthStore()
  const [inst, setInst]             = useState<InstSnapshot>(null)
  const [instLoading, setInstLoading] = useState(false)
  const [joinOpen, setJoinOpen]     = useState(false)
  const [leaveOpen, setLeaveOpen]   = useState(false)

  const institutionId = profile?.institution_id ?? null

  const fetchInst = useCallback(async () => {
    if (!institutionId) { setInst(null); return }
    setInstLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('name, city, affiliation')
      .eq('id', institutionId)
      .maybeSingle()
    setInst(data ? {
      name:        (data.name as string) ?? '',
      city:        (data.city as string) ?? '',
      affiliation: (data.affiliation as string | null) ?? null,
    } : null)
    setInstLoading(false)
  }, [institutionId])

  useEffect(() => { void fetchInst() }, [fetchInst])

  // Only students benefit from this surface; hide for faculty, public, or
  // institution roles whose relationship is established through other flows.
  if (!profile) return null
  if (profile.role === 'institution' || profile.role === 'faculty') return null

  // ── Not linked → prompt card ────────────────────────────────────────────
  if (!institutionId) {
    return (
      <>
        <section
          className="card"
          style={{
            padding: 22,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--saathi-light)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 22,
          }}
               aria-hidden="true">
            🏛️
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
            }}>
              Institution membership
            </p>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17, fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '4px 0 4px', lineHeight: 1.35,
            }}>
              Is your college on EdUsaathiAI?
            </h3>
            <p style={{
              fontSize: 13, color: 'var(--text-secondary)',
              margin: 0, lineHeight: 1.6,
            }}>
              {variant === 'profile'
                ? 'Link your account to your institution — unlocks classroom sessions and Research Archive.'
                : 'Link your account to unlock institutional classrooms and research tools.'}
            </p>
          </div>
          <button
            onClick={() => setJoinOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              textDecoration: 'none',
            }}
          >
            Find My Institution →
          </button>
        </section>

        <InstitutionJoinModal
          open={joinOpen}
          onClose={() => setJoinOpen(false)}
          onJoined={() => {
            // Force a full reload — authStore picks up the new institution_id
            // and downstream surfaces refetch cleanly.
            if (typeof window !== 'undefined') window.location.reload()
          }}
        />
      </>
    )
  }

  // ── Linked → badge + subtle leave affordance ────────────────────────────
  return (
    <>
      <section
        className="card"
        style={{
          padding: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--saathi-light)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: 22,
        }}
             aria-hidden="true">
          🎓
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
          }}>
            Your institution
          </p>
          {instLoading ? (
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '4px 0 0', fontStyle: 'italic' }}>
              Loading…
            </p>
          ) : inst ? (
            <>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17, fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '4px 0 2px', lineHeight: 1.35,
              }}>
                {inst.name}
              </p>
              <p style={{
                fontSize: 12, color: 'var(--text-tertiary)',
                margin: 0, lineHeight: 1.5,
              }}>
                {inst.city}{inst.affiliation ? ` · ${inst.affiliation}` : ''}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              Linked.
            </p>
          )}
        </div>
        <button
          onClick={() => setLeaveOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-ghost)',
            padding: '6px 10px',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-ghost)' }}
        >
          Leave institution
        </button>
      </section>

      <InstitutionLeaveModal
        open={leaveOpen}
        institutionName={inst?.name ?? 'this institution'}
        onClose={() => setLeaveOpen(false)}
        onLeft={() => {
          if (typeof window !== 'undefined') window.location.reload()
        }}
      />
    </>
  )
}
