'use client'

import { motion } from 'framer-motion'
import FlameStageVisual from './FlameStageVisual'
import PassionMeter from './PassionMeter'

type FlameStage = 'cold' | 'spark' | 'flame' | 'fire' | 'wings'

interface SoulData {
  display_name: string | null
  academic_level: string | null
  depth_calibration: number | null
  peer_mode: boolean | null
  exam_mode: boolean | null
  flame_stage: string | null
  ambition_level: string | null
  preferred_tone: string | null
  top_topics: string[] | null
  struggle_topics: string[] | null
  last_session_summary: string | null
  session_count: number | null
  future_research_area: string | null
  career_interest: string | null
  career_discovery_stage: string | null
  shell_broken: boolean | null
  shell_broken_at: string | null
}

interface SoulTabProps {
  soul: SoulData | null
  onEditProfile: () => void
}

const TRAJECTORY_LABELS: Record<string, string> = {
  committed: '🎯 Committed to a direction',
  interested: '🌟 Building toward something',
  exploring: '🔍 Still discovering',
  unaware: '🌱 Open to everything',
}

export default function SoulTab({ soul, onEditProfile }: SoulTabProps) {
  if (!soul) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-4xl">🧠</div>
        <p className="mb-2 font-semibold text-white">
          Your soul profile is being built
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Start a conversation with your Saathi. After a few sessions,
          you&apos;ll see your living soul profile here.
        </p>
      </div>
    )
  }

  const topTopics = soul.top_topics ?? []
  const struggleTopics = soul.struggle_topics ?? []
  const sessionCount = soul.session_count ?? 0
  const depth = soul.depth_calibration ?? 40

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="font-playfair mb-1 text-2xl font-bold text-white">
          What your Saathi knows
        </h3>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Your Saathi builds this understanding over every session. This is your
          living soul profile.
        </p>
      </div>

      {/* ── Flame & Journey ─────────────────────────────────────── */}
      <section
        className="space-y-6 rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <h4
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Flame & Journey
        </h4>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <p
              className="mb-3 text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Your flame stage
            </p>
            <FlameStageVisual
              stage={(soul.flame_stage as FlameStage) ?? 'cold'}
            />
          </div>
          <div className="flex flex-col items-center justify-center">
            <PassionMeter value={depth} label="Depth calibration" />
            <p
              className="mt-2 text-center text-[10px]"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              0 = beginner → 100 = researcher
            </p>
          </div>
        </div>

        {/* Trajectory */}
        {soul.career_discovery_stage && (
          <div>
            <p
              className="mb-2 text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Predicted trajectory
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{
                  background: 'rgba(201,153,58,0.15)',
                  border: '1px solid rgba(201,153,58,0.35)',
                  color: '#C9993A',
                }}
              >
                {TRAJECTORY_LABELS[soul.career_discovery_stage] ??
                  soul.career_discovery_stage}
              </span>
              <span
                className="text-xs"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Based on your patterns across {sessionCount} session
                {sessionCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Peer / Exam mode pills */}
        <div className="flex flex-wrap gap-2">
          {soul.peer_mode && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#A78BFA',
              }}
            >
              🔬 Peer mode active
            </span>
          )}
          {soul.exam_mode && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#F87171',
              }}
            >
              🎯 Exam mode active
            </span>
          )}
          {soul.preferred_tone && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              💬 {soul.preferred_tone} tone detected
            </span>
          )}
        </div>
      </section>

      {/* ── Topics & Patterns ────────────────────────────────────── */}
      <section
        className="space-y-5 rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <h4
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Topics & Patterns
        </h4>

        <div>
          <p
            className="mb-2 text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Topics you return to most
          </p>
          {topTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topTopics.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: 'rgba(201,153,58,0.12)',
                    border: '1px solid rgba(201,153,58,0.3)',
                    color: '#C9993A',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p
              className="text-xs italic"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Emerges after a few sessions
            </p>
          )}
        </div>

        <div>
          <p
            className="mb-2 text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Topics we&apos;re working on together
          </p>
          {struggleTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {struggleTopics.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    color: '#FBBF24',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p
              className="text-xs italic"
              style={{ color: 'rgba(74,222,128,0.6)' }}
            >
              None identified yet — great!
            </p>
          )}
        </div>

        {soul.career_interest && (
          <div>
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Your declared direction
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-white">
                {soul.career_interest}
              </p>
              <button
                onClick={onEditProfile}
                className="text-xs underline"
                style={{ color: '#C9993A' }}
              >
                Edit →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Session Memory ───────────────────────────────────────── */}
      <section
        className="space-y-4 rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <h4
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Session Memory
        </h4>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
            style={{ background: 'rgba(201,153,58,0.15)', color: '#C9993A' }}
          >
            {sessionCount}
          </div>
          <p className="text-sm text-white">
            session{sessionCount !== 1 ? 's' : ''} together
          </p>
        </div>

        {soul.last_session_summary && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              className="mb-2 text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              From your last session
            </p>
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              &ldquo;{soul.last_session_summary}&rdquo;
            </p>
          </div>
        )}

        {/* Shell broken celebration */}
        {soul.shell_broken && soul.shell_broken_at && soul.career_interest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(201,153,58,0.1)',
              border: '1.5px solid rgba(201,153,58,0.35)',
            }}
          >
            <p className="mb-1 text-sm font-bold" style={{ color: '#E5B86A' }}>
              ✦ You found your direction
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              On{' '}
              {new Date(soul.shell_broken_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              , you declared your interest in{' '}
              <strong className="text-white">{soul.career_interest}</strong>.
              Your Saathi has been building toward this ever since.
            </p>
          </motion.div>
        )}
      </section>

      {/* ── Academic Context ─────────────────────────────────────── */}
      {soul.academic_level && (
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <h4
            className="mb-4 text-xs font-bold tracking-widest uppercase"
            style={{ color: '#C9993A' }}
          >
            Academic Context
          </h4>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-3 py-1.5 text-xs font-bold capitalize"
              style={{
                background: 'rgba(201,153,58,0.15)',
                border: '1px solid rgba(201,153,58,0.3)',
                color: '#C9993A',
              }}
            >
              {soul.academic_level.replace('_', ' ')}
            </span>
            {soul.peer_mode && (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Peer mode active — your Saathi treats you as an intellectual
                equal
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
