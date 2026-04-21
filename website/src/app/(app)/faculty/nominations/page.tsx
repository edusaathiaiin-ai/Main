'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import NominateFacultyModal from '@/components/faculty/NominateFacultyModal'

type Nomination = {
  id: string
  faculty_name: string
  faculty_email: string
  expertise_area: string
  status: string
  email_sent_at: string | null
  email_delivered: boolean | null
  reward_fired: boolean
  counts_toward_cap: boolean
  created_at: string
}

export default function FacultyNominationsPage() {
  const { profile } = useAuthStore()
  const [nominateOpen, setNominateOpen] = useState(false)
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [facultyProfileId, setFacultyProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadNominations = useCallback(async (fpId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('faculty_nominations')
      .select('*')
      .eq('nominated_by_faculty_id', fpId)
      .order('created_at', { ascending: false })
    setNominations((data ?? []) as Nomination[])
  }, [])

  useEffect(() => {
    async function load() {
      if (!profile) return

      const supabase = createClient()

      // Get faculty profile ID
      const { data: fp } = await supabase
        .from('faculty_profiles')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (fp) {
        setFacultyProfileId(fp.id as string)
        await loadNominations(fp.id as string)
      }

      setLoading(false)
    }
    load()
  }, [profile, loadNominations])

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-tertiary)' }}>
        Loading...
      </div>
    )
  }

  const successful = nominations.filter((n) =>
    ['verified', 'eminent'].includes(n.status)
  ).length

  const remaining =
    10 -
    nominations.filter(
      (n) => n.counts_toward_cap && n.status !== 'declined'
    ).length

  return (
    <div style={{ padding: '24px', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontSize: '22px',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Suggest a Colleague
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
          }}
        >
          Know a fellow expert who would be great on EdUsaathiAI? Your peer
          recommendation carries more weight than any cold outreach we could do.
        </p>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Nominated', value: nominations.length, color: 'var(--text-primary)' },
          { label: 'Verified', value: successful, color: '#10B981' },
          { label: 'Slots remaining', value: Math.max(0, remaining), color: '#C9993A' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              padding: '12px 20px',
              textAlign: 'center',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      {remaining > 0 ? (
        <button
          onClick={() => setNominateOpen(true)}
          style={{
            background: 'var(--saathi-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '13px 28px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Suggest a Colleague
        </button>
      ) : (
        <div
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '32px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          You have reached the maximum of 10 nominations. Thank you for building
          EdUsaathiAI's faculty network.
        </div>
      )}

      {/* Nominations list */}
      {nominations.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}
          >
            Your Nominations
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nominations.map((nom) => (
              <div
                key={nom.id}
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  borderLeft: `3px solid ${
                    nom.status === 'eminent' || nom.status === 'verified'
                      ? '#10B981'
                      : nom.status === 'applied'
                        ? '#8B5CF6'
                        : nom.status === 'declined'
                          ? '#EF4444'
                          : '#888'
                  }`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {nom.faculty_name}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}
                    >
                      {nom.expertise_area}
                      &nbsp;&middot;&nbsp;
                      {new Date(nom.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background:
                        nom.status === 'eminent' || nom.status === 'verified'
                          ? '#ECFDF5'
                          : nom.status === 'applied'
                            ? '#F5F3FF'
                            : nom.status === 'declined'
                              ? '#FEF2F2'
                              : 'var(--bg-base)',
                      color:
                        nom.status === 'eminent' || nom.status === 'verified'
                          ? '#10B981'
                          : nom.status === 'applied'
                            ? '#8B5CF6'
                            : nom.status === 'declined'
                              ? '#EF4444'
                              : '#888',
                      textTransform: 'capitalize',
                    }}
                  >
                    {nom.status === 'eminent' ? 'Eminent' : nom.status}
                  </span>
                </div>

                {/* Reward status */}
                {nom.reward_fired && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#C9993A' }}>
                    ₹50 wallet credit + 50 Saathi Points earned
                  </div>
                )}

                {/* Email status */}
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {nom.email_delivered
                    ? 'Invitation delivered'
                    : nom.email_sent_at
                      ? 'Invitation sent'
                      : 'Invitation pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {facultyProfileId && profile && (
        <NominateFacultyModal
          isOpen={nominateOpen}
          onClose={() => {
            setNominateOpen(false)
            if (facultyProfileId) loadNominations(facultyProfileId)
          }}
          nominatorType="faculty"
          nominatorId={facultyProfileId}
          nominatorName={profile.full_name ?? 'Faculty'}
        />
      )}
    </div>
  )
}
