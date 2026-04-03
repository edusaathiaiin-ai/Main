'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'

type SoulRow = {
  display_name: string | null
  ambition_level: string | null
  session_count: number | null
  top_topics: string[] | null
  struggle_topics: string[] | null
  last_session_summary: string | null
  flame_stage: string | null
  passion_intensity: number | null
  depth_calibration: number | null
  learning_style: string | null
}

type SessionRow = {
  quota_date_ist: string
  message_count: number
  bot_slot: number
}

type CommunityStats = {
  total_students: number
  active_students: number
  avg_depth: number
  top_topics: string[]
  community_label: string
  last_refreshed_at: string
}

type DayActivity = {
  date: string
  count: number
}

type ProgressDashboardProps = {
  saathiId: string
  saathiName: string
  primaryColor: string
}

const SLOT_NAMES: Record<number, string> = {
  1: 'Study Notes',
  2: 'Exam Prep',
  3: 'Interest Explorer',
  4: 'UPSC Saathi',
  5: 'Citizen Guide',
}

const FLAME_LABELS: Record<string, string> = {
  cold: 'Just Starting',
  warm: 'Warming Up',
  burning: 'On Fire',
  blazing: 'Blazing',
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '16px 20px',
      }}
    >
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: '700', color, margin: 0, fontFamily: 'var(--font-playfair)' }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function ActivityGrid({ days, color }: { days: DayActivity[]; color: string }) {
  const maxCount = Math.max(...days.map(d => d.count), 1)

  return (
    <div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Last 14 days activity
      </p>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {days.map((day) => {
          const intensity = day.count / maxCount
          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} messages`}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: day.count === 0
                  ? 'rgba(255,255,255,0.04)'
                  : `${color}${Math.round(intensity * 200 + 30).toString(16).padStart(2, '0')}`,
                border: '0.5px solid rgba(255,255,255,0.06)',
                cursor: 'default',
                transition: 'all 0.2s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function TopicPill({ topic, type, color }: { topic: string; type: 'top' | 'struggle'; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        background: type === 'top' ? `${color}18` : 'rgba(239,68,68,0.12)',
        border: `0.5px solid ${type === 'top' ? `${color}40` : 'rgba(239,68,68,0.3)'}`,
        color: type === 'top' ? color : '#FCA5A5',
        marginRight: '6px',
        marginBottom: '6px',
      }}
    >
      {type === 'struggle' ? '⚡ ' : '✦ '}{topic}
    </span>
  )
}

export function ProgressDashboard({ saathiId, saathiName, primaryColor }: ProgressDashboardProps) {
  const [soul, setSoul] = useState<SoulRow | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [community, setCommunity] = useState<CommunityStats | null>(null)
  const [loading, setLoading] = useState(true)

  const saathi = SAATHIS.find(s => s.id === saathiId)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [soulRes, sessionRes, communityRes] = await Promise.all([
        supabase
          .from('student_soul')
          .select('display_name, ambition_level, session_count, top_topics, struggle_topics, last_session_summary, flame_stage, passion_intensity, depth_calibration, learning_style')
          .eq('user_id', user.id)
          .eq('vertical_id', saathiId)
          .maybeSingle(),
        supabase
          .from('chat_sessions')
          .select('quota_date_ist, message_count, bot_slot')
          .eq('user_id', user.id)
          .eq('vertical_id', saathiId)
          .order('quota_date_ist', { ascending: false })
          .limit(14),
        supabase
          .from('saathi_stats_cache')
          .select('total_students,active_students,avg_depth,top_topics,community_label,last_refreshed_at')
          .eq('vertical_id', saathiId)
          .single(),
      ])

      setSoul(soulRes.data ?? null)
      setSessions((sessionRes.data ?? []) as SessionRow[])
      if (communityRes.data) setCommunity(communityRes.data as CommunityStats)
      setLoading(false)
    }

    void load()
  }, [saathiId])

  // Build 14-day activity data
  const activityDays: DayActivity[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().split('T')[0]
    const found = sessions.find(s => s.quota_date_ist === dateStr)
    return { date: dateStr, count: found?.message_count ?? 0 }
  })

  // Bot slot usage breakdown
  const slotUsage: Record<number, number> = {}
  sessions.forEach(s => {
    slotUsage[s.bot_slot] = (slotUsage[s.bot_slot] ?? 0) + s.message_count
  })

  const totalMessages = sessions.reduce((sum, s) => sum + s.message_count, 0)
  const sessionCount = soul?.session_count ?? 0
  const flameLabel = FLAME_LABELS[soul?.flame_stage ?? 'cold'] ?? 'Just Starting'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${primaryColor}30`, borderTop: `2px solid ${primaryColor}`, animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
          Learning journey with
        </p>
        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-playfair)', color: '#fff', margin: 0 }}>
          <span style={{ color: primaryColor }}>{saathiName}</span> Progress
        </h1>
        {soul?.display_name && (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginTop: '6px' }}>
            {soul.display_name} · {flameLabel}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Sessions" value={sessionCount} sub="total with this Saathi" color={primaryColor} />
        <StatCard label="Messages" value={totalMessages} sub="last 14 days" color="#E5B86A" />
        <StatCard
          label="Depth level"
          value={`${soul?.depth_calibration ?? 40}/100`}
          sub={soul?.ambition_level ?? 'medium'}
          color="#10B981"
        />
        <StatCard
          label="Flame"
          value={soul?.passion_intensity !== null && soul?.passion_intensity !== undefined ? `${soul.passion_intensity}%` : '—'}
          sub={flameLabel}
          color="#F59E0B"
        />
      </div>

      {/* Activity heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
        }}
      >
        <ActivityGrid days={activityDays} color={primaryColor} />
      </motion.div>

      {/* Bot slot usage */}
      {Object.keys(slotUsage).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
            Bot usage breakdown
          </p>
          {Object.entries(slotUsage).map(([slot, count]) => {
            const pct = Math.round((count / Math.max(totalMessages, 1)) * 100)
            return (
              <div key={slot} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {SLOT_NAMES[Number(slot)] ?? `Bot ${slot}`}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {count} msgs · {pct}%
                  </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{ height: '100%', background: primaryColor, borderRadius: '4px' }}
                  />
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* Topics */}
      {((soul?.top_topics?.length ?? 0) > 0 || (soul?.struggle_topics?.length ?? 0) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          {(soul?.top_topics?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Topics you love
              </p>
              <div>
                {soul!.top_topics!.map(t => (
                  <TopicPill key={t} topic={t} type="top" color={primaryColor} />
                ))}
              </div>
            </div>
          )}
          {(soul?.struggle_topics?.length ?? 0) > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Topics to master
              </p>
              <div>
                {soul!.struggle_topics!.map(t => (
                  <TopicPill key={t} topic={t} type="struggle" color={primaryColor} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Community card */}
      {community && community.total_students > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          style={{
            background: `${primaryColor}08`,
            border: `0.5px solid ${primaryColor}25`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '22px' }}>{saathi?.emoji ?? '📚'}</span>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>
                Your Community
              </p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
                {community.total_students.toLocaleString('en-IN')}{' '}
                <span style={{ color: primaryColor }}>{saathiName} {community.community_label}</span>
              </p>
            </div>
          </div>

          {/* Depth comparison */}
          {soul?.depth_calibration != null && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Community avg depth
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {community.avg_depth}/100
                </span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${community.avg_depth}%`, background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Your depth
                </span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: soul.depth_calibration >= community.avg_depth ? '#4ADE80' : primaryColor }}>
                  {soul.depth_calibration}/100
                  {soul.depth_calibration >= community.avg_depth ? ' · above avg ✦' : ''}
                </span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${soul.depth_calibration}%` }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  style={{
                    height: '100%',
                    background: soul.depth_calibration >= community.avg_depth ? '#4ADE80' : primaryColor,
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Active students note */}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: community.top_topics.length > 0 ? '12px' : '0' }}>
            {community.active_students.toLocaleString('en-IN')} students studied {saathiName} in the last 30 days
          </p>

          {/* Community top topics */}
          {community.top_topics.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                What this community explores most
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {community.top_topics.map((t) => (
                  <span key={t} style={{
                    fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
                    background: `${primaryColor}12`, border: `0.5px solid ${primaryColor}30`,
                    color: primaryColor,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', marginTop: '12px', marginBottom: 0 }}>
            Data refreshed every 48h · {new Date(community.last_refreshed_at).toLocaleDateString('en-IN')}
          </p>
        </motion.div>
      )}

      {/* Last session summary */}
      {soul?.last_session_summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: `${primaryColor}0A`,
            border: `0.5px solid ${primaryColor}25`,
            borderRadius: '14px',
            padding: '20px',
          }}
        >
          <p style={{ fontSize: '11px', color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Last session memory
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            &ldquo;{soul.last_session_summary}&rdquo;
          </p>
        </motion.div>
      )}

      {/* No soul yet */}
      {!soul && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</p>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Your journey is just beginning</p>
          <p style={{ fontSize: '13px' }}>Start chatting with {saathiName} to build your soul profile.</p>
        </div>
      )}
    </div>
  )
}
