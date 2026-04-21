'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'
import { FacultySidebar } from '@/components/faculty/FacultySidebar'
import { VerificationBanner } from '@/components/faculty/VerificationBanner'
import { MobileNav } from '@/components/layout/MobileNav'

type FacultyProfile = {
  id: string
  user_id: string
  institution_name: string
  department: string
  designation: string | null
  subject_expertise: string[]
  years_experience: number
  verification_status: 'pending' | 'verified' | 'rejected'
  employment_status: 'active' | 'retired' | 'independent' | null
  is_emeritus: boolean
  verification_doc_url: string | null
  payout_upi_id: string | null
}

type MissionItem = {
  type: 'requests' | 'sessions' | 'questions' | 'payout' | 'profile'
  icon: string
  title: string
  subtitle: string
  count?: number
  href: string
  accent?: string
}

export default function FacultyPage() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [faculty, setFaculty] = useState<FacultyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ sessions: 0, students: 0, earnings: 0 })
  const [mission, setMission] = useState<MissionItem[]>([])
  const [upiEditing, setUpiEditing] = useState(false)
  const [upiValue, setUpiValue] = useState('')
  const [upiSaving, setUpiSaving] = useState(false)

  const saathiSlug = toSlug(profile?.primary_saathi_id) ?? null
  const saathi = saathiSlug ? SAATHIS.find(s => s.id === saathiSlug) ?? null : null
  const color = saathi?.primary ?? 'var(--gold)'
  const firstName = (profile?.full_name ?? 'Professor').split(' ')[0]

  // Role guard
  useEffect(() => {
    if (profile && profile.role !== 'faculty') router.replace('/chat')
  }, [profile, router])

  // Apply Saathi theme
  useEffect(() => {
    if (saathiSlug) document.body.setAttribute('data-saathi', saathiSlug)
    return () => { document.body.removeAttribute('data-saathi') }
  }, [saathiSlug])

  // Load faculty profile + stats + mission items
  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      setLoading(true)

      // Faculty profile
      const { data: fp } = await supabase
        .from('faculty_profiles')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle()
      setFaculty(fp as FacultyProfile | null)

      // Stats: session count
      const { count: sessionCount } = await supabase
        .from('faculty_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', profile!.id)
        .in('status', ['completed', 'reviewed'])

      // Stats: unique students helped
      const { count: studentCount } = await supabase
        .from('faculty_sessions')
        .select('student_id', { count: 'exact', head: true })
        .eq('faculty_id', profile!.id)

      // Stats: earnings
      const { data: payouts } = await supabase
        .from('faculty_payouts')
        .select('faculty_payout_paise')
        .eq('faculty_id', profile!.id)
        .eq('status', 'released')
      const totalEarnings = (payouts ?? []).reduce((sum, p) => sum + (p.faculty_payout_paise ?? 0), 0)

      setStats({
        sessions: sessionCount ?? 0,
        students: studentCount ?? 0,
        earnings: Math.round(totalEarnings / 100),
      })

      // Mission Control items
      const items: MissionItem[] = []

      // 1. Pending requests
      const { count: pendingReqs } = await supabase
        .from('lecture_requests')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', profile!.id)
        .eq('status', 'pending')
      if (pendingReqs && pendingReqs > 0) {
        items.push({
          type: 'requests', icon: '📨',
          title: `${pendingReqs} pending request${pendingReqs > 1 ? 's' : ''}`,
          subtitle: 'Students are waiting for your response',
          count: pendingReqs, href: '/faculty/requests', accent: '#EF4444',
        })
      }

      // 2. Today's upcoming sessions
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: todaySessions } = await supabase
        .from('faculty_sessions')
        .select('id, topic, confirmed_slot')
        .eq('faculty_id', profile!.id)
        .in('status', ['confirmed', 'paid'])
        .gte('confirmed_slot', todayStart.toISOString())
        .order('confirmed_slot')
        .limit(3)
      if (todaySessions?.length) {
        items.push({
          type: 'sessions', icon: '📅',
          title: `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} today`,
          subtitle: todaySessions[0].topic ?? 'Upcoming session',
          href: '/faculty/sessions',
        })
      }

      // 3. Unanswered questions
      const { count: unansweredQ } = await supabase
        .from('board_questions')
        .select('*', { count: 'exact', head: true })
        .is('ai_answer', null)
        .eq('status', 'open')
      if (unansweredQ && unansweredQ > 5) {
        items.push({
          type: 'questions', icon: '❓',
          title: `${unansweredQ} unanswered questions`,
          subtitle: 'Students need your expertise',
          count: unansweredQ, href: '/faculty',
        })
      }

      // 4. Payout status
      const { count: pendingPayouts } = await supabase
        .from('faculty_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', profile!.id)
        .eq('status', 'pending')
      if (pendingPayouts && pendingPayouts > 0) {
        items.push({
          type: 'payout', icon: '💰',
          title: `${pendingPayouts} payout${pendingPayouts > 1 ? 's' : ''} pending`,
          subtitle: 'Check your earnings section',
          href: '/faculty/sessions#payouts', accent: '#16A34A',
        })
      }

      // 5. Profile completeness
      if (fp && !fp.payout_upi_id) {
        items.push({
          type: 'profile', icon: '⚠️',
          title: 'Set up your UPI ID',
          subtitle: 'Required to receive payouts',
          href: '/profile', accent: '#F59E0B',
        })
      }

      setMission(items)
      setLoading(false)
    }

    load()
  }, [profile])

  // UPI save
  async function handleUpiSave() {
    if (!profile || !upiValue.trim()) return
    setUpiSaving(true)
    const supabase = createClient()
    await supabase.from('faculty_profiles').update({ payout_upi_id: upiValue.trim() }).eq('user_id', profile.id)
    setFaculty(prev => prev ? { ...prev, payout_upi_id: upiValue.trim() } : prev)
    setUpiEditing(false)
    setUpiSaving(false)
  }

  if (!profile || loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border-medium)', borderTopColor: color }} />
      </div>
    )
  }

  return (
    <div
      data-saathi={saathiSlug ?? undefined}
      className="flex h-screen w-full overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <FacultySidebar
        saathi={saathi}
        facultyName={firstName}
        upiId={faculty?.payout_upi_id ?? null}
        onUpiEdit={() => { setUpiValue(faculty?.payout_upi_id ?? ''); setUpiEditing(true) }}
        pendingRequestCount={mission.find(m => m.type === 'requests')?.count ?? 0}
        unreadQuestionCount={mission.find(m => m.type === 'questions')?.count ?? 0}
      />

      <main className="h-full min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">

          {/* Verification banner */}
          {faculty && profile && faculty.verification_status !== 'verified' && (
            <VerificationBanner
              userId={profile.id}
              employmentStatus={faculty.employment_status ?? 'active'}
              verificationDocUrl={faculty.verification_doc_url ?? null}
              verificationStatus={faculty.verification_status}
            />
          )}

          {/* ── Welcome Hero Card ── */}
          <div style={{
            background: color,
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '4px' }}>
              {faculty?.institution_name ?? 'Faculty'}{faculty?.department ? ` · ${faculty.department}` : ''}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 800,
              margin: '0 0 8px',
            }}>
              Welcome, {firstName} 🙏
            </h1>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              {faculty?.subject_expertise?.join(', ') ?? 'Subject Expert'}
              {faculty?.years_experience ? ` · ${faculty.years_experience} yrs experience` : ''}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{stats.sessions}</p>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: 0 }}>Sessions</p>
              </div>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{stats.students}</p>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: 0 }}>Students helped</p>
              </div>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>₹{stats.earnings}</p>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: 0 }}>Earnings</p>
              </div>
            </div>
          </div>

          {/* ── Mission Control ── */}
          {mission.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: 'var(--text-xs)', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--text-ghost)', margin: '0 0 10px',
              }}>
                Needs your attention
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mission.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${item.accent ? `${item.accent}30` : 'var(--border-subtle)'}`,
                      textDecoration: 'none',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: 'var(--text-sm)', fontWeight: 600,
                        color: item.accent ?? 'var(--text-primary)', margin: 0,
                      }}>
                        {item.title}
                      </p>
                      <p style={{
                        fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '2px 0 0',
                      }}>
                        {item.subtitle}
                      </p>
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-ghost)' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions Grid ── */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{
              fontSize: 'var(--text-xs)', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-ghost)', margin: '0 0 10px',
            }}>
              Quick actions
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {[
                { icon: '🎙️', label: 'Create Live Session', href: '/faculty/live/create', accent: '#DC2626' },
                { icon: '📝', label: 'Create Question Paper', href: '/faculty/question-paper' },
                { icon: '📚', label: 'Upload Study Material', href: '/faculty/create-material' },
                { icon: '🔬', label: 'Post Research Opportunity', href: '/faculty/research' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '14px 16px', borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    transition: 'all 200ms ease',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{action.icon}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Saathi Chat CTA ── */}
          <div style={{
            padding: '20px', borderRadius: '14px',
            background: 'var(--saathi-bg)', border: '1.5px solid var(--saathi-border)',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {saathi && <span style={{ fontSize: '28px' }}>{saathi.emoji}</span>}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                  Chat with {saathi?.name ?? 'your Saathi'}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
                  Research help, teaching prep, academic queries — peer to peer.
                </p>
              </div>
              <Link
                href="/chat"
                style={{
                  padding: '8px 20px', borderRadius: '10px',
                  background: color, color: '#fff',
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Open Chat →
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* UPI Edit Modal */}
      {upiEditing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setUpiEditing(false)}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '16px',
            padding: '24px', width: '360px', maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              💳 UPI ID for Payouts
            </h3>
            <input
              value={upiValue}
              onChange={e => setUpiValue(e.target.value)}
              placeholder="yourname@upi"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                fontSize: '14px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                outline: 'none', marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setUpiEditing(false)} style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleUpiSave} disabled={upiSaving} style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: color, color: '#fff', border: 'none', cursor: 'pointer',
              }}>{upiSaving ? '...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
