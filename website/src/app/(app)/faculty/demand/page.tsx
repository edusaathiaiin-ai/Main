'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type DepthPref = 'beginner' | 'intermediate' | 'advanced';
type FormatPref = 'lecture' | 'series' | 'workshop' | 'onetoone' | 'any';
type Urgency = 'this_month' | 'next_3_months' | 'anytime';

type LearningIntent = {
  id: string;
  student_id: string;
  vertical_id: string;
  topic: string;
  description: string | null;
  depth_preference: DepthPref;
  format_preference: FormatPref;
  max_price_paise: number;
  urgency: Urgency;
  tags: string[];
  joiner_count: number;
  status: string;
  expires_at: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<FormatPref, string> = {
  lecture: 'Lecture',
  series: 'Series',
  workshop: 'Workshop',
  onetoone: '1:1 Session',
  any: 'Any format',
};

const URGENCY_LABEL: Record<Urgency, string> = {
  this_month: 'This month',
  next_3_months: 'Next 3 months',
  anytime: 'Anytime',
};

const DEPTH_COLOR: Record<DepthPref, string> = {
  beginner: '#4ADE80',
  intermediate: '#C9993A',
  advanced: '#F87171',
};

const URGENCY_COLOR: Record<Urgency, string> = {
  this_month: '#F87171',
  next_3_months: '#FB923C',
  anytime: '#60A5FA',
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function formatPrice(paise: number): string {
  if (paise >= 200000) return '₹2,000+';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function saathiColor(verticalId: string): string {
  return SAATHIS.find((s) => s.id === verticalId)?.accent ?? '#C9993A';
}

function saathiName(verticalId: string): string {
  return SAATHIS.find((s) => s.id === verticalId)?.name ?? verticalId;
}

function saathiEmoji(verticalId: string): string {
  return SAATHIS.find((s) => s.id === verticalId)?.emoji ?? '📚';
}

// ── DemandCard ────────────────────────────────────────────────────────────────

function DemandCard({
  intent,
  onCreateSession,
  creating,
}: {
  intent: LearningIntent;
  onCreateSession: (intent: LearningIntent) => void;
  creating: string | null;
}) {
  const color = saathiColor(intent.vertical_id);
  const days = daysLeft(intent.expires_at);
  const isUrgent = intent.urgency === 'this_month';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#0D1B2E',
        border: `0.5px solid ${isUrgent ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Urgency pulse */}
      {isUrgent && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#F87171', animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#F87171' }}>
            URGENT
          </span>
        </div>
      )}

      {/* Saathi badge + fire */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          fontSize: '10px', fontWeight: '700', color: color,
          background: `${color}18`, border: `0.5px solid ${color}33`,
          padding: '3px 8px', borderRadius: '20px',
        }}>
          {saathiEmoji(intent.vertical_id)} {saathiName(intent.vertical_id)}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '700', color: '#FF6B35',
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          🔥 {intent.joiner_count} {intent.joiner_count === 1 ? 'student' : 'students'}
        </span>
      </div>

      {/* Topic */}
      <h3 style={{
        fontSize: '16px', fontWeight: '700', color: '#fff',
        margin: '0 0 6px', lineHeight: 1.3,
        paddingRight: isUrgent ? '80px' : '0',
      }}>
        {intent.topic}
      </h3>

      {/* Description */}
      {intent.description && (
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.5)',
          margin: '0 0 12px', lineHeight: 1.6,
        }}>
          {intent.description}
        </p>
      )}

      {/* Tags */}
      {intent.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
          {intent.tags.map((tag) => (
            <span key={tag} style={{
              fontSize: '10px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
              padding: '2px 7px', borderRadius: '20px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        <span style={{
          fontSize: '11px', fontWeight: '600',
          color: DEPTH_COLOR[intent.depth_preference],
          background: `${DEPTH_COLOR[intent.depth_preference]}15`,
          border: `0.5px solid ${DEPTH_COLOR[intent.depth_preference]}30`,
          padding: '3px 8px', borderRadius: '20px',
        }}>
          {intent.depth_preference}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.55)',
          background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
          padding: '3px 8px', borderRadius: '20px',
        }}>
          {FORMAT_LABEL[intent.format_preference]}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '600',
          color: URGENCY_COLOR[intent.urgency],
          background: `${URGENCY_COLOR[intent.urgency]}15`,
          border: `0.5px solid ${URGENCY_COLOR[intent.urgency]}30`,
          padding: '3px 8px', borderRadius: '20px',
        }}>
          {URGENCY_LABEL[intent.urgency]}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '700', color: '#4ADE80',
          background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.25)',
          padding: '3px 8px', borderRadius: '20px',
        }}>
          up to {formatPrice(intent.max_price_paise)}
        </span>
      </div>

      {/* Footer: days left + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {days} days left
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href={`/faculty/live/create?intent=${intent.id}&topic=${encodeURIComponent(intent.topic)}&saathi=${intent.vertical_id}`}
            style={{
              fontSize: '12px', fontWeight: '700', color: '#0B1F3A',
              background: color, padding: '9px 16px', borderRadius: '10px',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px',
              opacity: creating === intent.id ? 0.6 : 1,
              pointerEvents: creating === intent.id ? 'none' : 'auto',
              transition: 'all 0.2s',
            }}
            onClick={() => onCreateSession(intent)}
          >
            {creating === intent.id ? 'Opening...' : '+ Create Session'}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FacultyDemandPage() {
  const { profile } = useAuthStore();
  const [intents, setIntents] = useState<LearningIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSaathi, setFilterSaathi] = useState('all');
  const [filterFormat, setFilterFormat] = useState<FormatPref | 'all'>('all');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'all'>('all');
  const [sortBy, setSortBy] = useState<'most_wanted' | 'highest_budget' | 'expiring'>('most_wanted');
  const [creating, setCreating] = useState<string | null>(null);
  const [totalDemand, setTotalDemand] = useState(0);

  const supabase = createClient();

  const fetchIntents = useCallback(async () => {
    async function run() {
      setLoading(true);
      let query = supabase
        .from('learning_intents')
        .select('*')
        .eq('status', 'open');

      if (filterSaathi !== 'all') query = query.eq('vertical_id', filterSaathi);
      if (filterFormat !== 'all') query = query.eq('format_preference', filterFormat);
      if (filterUrgency !== 'all') query = query.eq('urgency', filterUrgency);

      if (sortBy === 'most_wanted') query = query.order('joiner_count', { ascending: false });
      else if (sortBy === 'highest_budget') query = query.order('max_price_paise', { ascending: false });
      else query = query.order('expires_at', { ascending: true });

      const { data } = await query.limit(50);
      setIntents(data ?? []);

      // Total demand across all
      const { count } = await supabase
        .from('learning_intents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      setTotalDemand(count ?? 0);

      setLoading(false);
    }
    void run();
  }, [filterSaathi, filterFormat, filterUrgency, sortBy, supabase]);

  useEffect(() => {
    function run() { void fetchIntents(); }
    run();
  }, [fetchIntents]);

  function handleCreateSession(intent: LearningIntent) {
    setCreating(intent.id);
    // Reset after navigation
    setTimeout(() => { setCreating(null); }, 3000);
  }

  // Faculty-specific: group by saathi for summary
  const demandBySaathi = intents.reduce<Record<string, number>>((acc, i) => {
    acc[i.vertical_id] = (acc[i.vertical_id] ?? 0) + i.joiner_count;
    return acc;
  }, {});

  const topSaathis = Object.entries(demandBySaathi)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (!profile) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link
          href="/faculty"
          style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
        >
          ← Faculty Dashboard
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '28px', fontWeight: '700', color: '#fff',
          margin: '0 0 8px', lineHeight: 1.2,
        }}>
          Student Demand Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {totalDemand} open learning intents · Students waiting for sessions like yours
        </p>
      </div>

      {/* Demand summary cards */}
      {topSaathis.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px', marginBottom: '32px',
        }}>
          {topSaathis.map(([verticalId, count]) => {
            const color = saathiColor(verticalId);
            return (
              <button
                key={verticalId}
                onClick={() => setFilterSaathi(verticalId)}
                style={{
                  background: filterSaathi === verticalId ? `${color}18` : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${filterSaathi === verticalId ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s',
                }}
              >
                <p style={{ fontSize: '18px', margin: '0 0 4px' }}>{saathiEmoji(verticalId)}</p>
                <p style={{ fontSize: '12px', fontWeight: '700', color: '#fff', margin: '0 0 2px' }}>
                  {saathiName(verticalId)}
                </p>
                <p style={{ fontSize: '11px', color: color, margin: 0, fontWeight: '600' }}>
                  {count} student{count !== 1 ? 's' : ''} waiting
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px',
        marginBottom: '24px', alignItems: 'center',
      }}>
        <select
          value={filterSaathi}
          onChange={(e) => setFilterSaathi(e.target.value)}
          style={{
            background: '#0D1B2E', border: '0.5px solid rgba(255,255,255,0.12)',
            color: '#fff', borderRadius: '10px', padding: '8px 12px',
            fontSize: '12px', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">All Saathis</option>
          {SAATHIS.map((s) => (
            <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
          ))}
        </select>

        <select
          value={filterFormat}
          onChange={(e) => setFilterFormat(e.target.value as FormatPref | 'all')}
          style={{
            background: '#0D1B2E', border: '0.5px solid rgba(255,255,255,0.12)',
            color: '#fff', borderRadius: '10px', padding: '8px 12px',
            fontSize: '12px', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">All formats</option>
          <option value="lecture">Lecture</option>
          <option value="series">Series</option>
          <option value="workshop">Workshop</option>
          <option value="onetoone">1:1 Session</option>
        </select>

        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value as Urgency | 'all')}
          style={{
            background: '#0D1B2E', border: '0.5px solid rgba(255,255,255,0.12)',
            color: '#fff', borderRadius: '10px', padding: '8px 12px',
            fontSize: '12px', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">Any urgency</option>
          <option value="this_month">This month</option>
          <option value="next_3_months">Next 3 months</option>
          <option value="anytime">Anytime</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {(['most_wanted', 'highest_budget', 'expiring'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              style={{
                fontSize: '11px', fontWeight: '600', padding: '7px 12px',
                borderRadius: '20px', cursor: 'pointer', border: 'none',
                background: sortBy === opt ? '#C9993A' : 'rgba(255,255,255,0.06)',
                color: sortBy === opt ? '#0B1F3A' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s',
              }}
            >
              {opt === 'most_wanted' ? '🔥 Most Wanted' : opt === 'highest_budget' ? '💰 Highest Budget' : '⏰ Expiring Soon'}
            </button>
          ))}
        </div>
      </div>

      {/* Intent list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: '180px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              animation: 'pulse 2s ease infinite',
            }} />
          ))}
        </div>
      ) : intents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>📭</p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            No open intents match your filters
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Try widening your filters — or check back tomorrow.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {intents.map((intent) => (
            <DemandCard
              key={intent.id}
              intent={intent}
              onCreateSession={handleCreateSession}
              creating={creating}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={{
        marginTop: '40px', padding: '20px',
        background: 'rgba(201,153,58,0.06)', border: '0.5px solid rgba(201,153,58,0.2)',
        borderRadius: '16px',
      }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.7 }}>
          <strong style={{ color: '#C9993A' }}>How this works:</strong> When you create a session from an intent,
          all students who joined that intent are notified first and get priority booking for 24 hours.
          After that, the session opens to all students. You earn per seat booked.
        </p>
      </div>
    </div>
  );
}
