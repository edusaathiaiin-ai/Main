'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { SAATHIS } from '@/constants/saathis';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import ProfileTab from '@/components/profile/ProfileTab';
import SoulTab from '@/components/profile/SoulTab';
import DataTab from '@/components/profile/DataTab';
import SubscriptionCard from '@/components/profile/SubscriptionCard';
import type { QuotaState, Saathi } from '@/types';

const DEFAULT_QUOTA: QuotaState = { limit: 5, used: 0, remaining: 5, coolingUntil: null, isCooling: false };

type Tab = 'profile' | 'soul' | 'data';

interface RawSoul {
  academic_level: string | null;
  depth_calibration: number | null;
  peer_mode: boolean | null;
  exam_mode: boolean | null;
  flame_stage: string | null;
  ambition_level: string | null;
  preferred_tone: string | null;
  top_topics: string[] | null;
  struggle_topics: string[] | null;
  last_session_summary: string | null;
  session_count: number | null;
  future_research_area: string | null;
  career_interest: string | null;
  career_discovery_stage: string | null;
  shell_broken: boolean | null;
  shell_broken_at: string | null;
  display_name: string | null;
  enrolled_subjects: string[] | null;
  future_subjects: string[] | null;
}

export function ProfileClient() {
  const { profile } = useAuthStore();
  const { activeSaathiId, activeBotSlot, setActiveBotSlot } = useChatStore();

  const saathiId = activeSaathiId ?? profile?.primary_saathi_id ?? SAATHIS[0].id;
  const activeSaathi: Saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0];

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [soul, setSoul] = useState<RawSoul | null>(null);
  const [soulLoading, setSoulLoading] = useState(true);

  const fetchSoul = useCallback(async () => {
    if (!profile?.id || !profile.primary_saathi_id) { setSoulLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('student_soul')
      .select('academic_level, depth_calibration, peer_mode, exam_mode, flame_stage, ambition_level, preferred_tone, top_topics, struggle_topics, last_session_summary, session_count, future_research_area, career_interest, career_discovery_stage, shell_broken, shell_broken_at, display_name, enrolled_subjects, future_subjects')
      .eq('user_id', profile.id)
      .eq('vertical_id', profile.primary_saathi_id)
      .maybeSingle();
    setSoul(data as RawSoul | null);
    setSoulLoading(false);
  }, [profile?.id, profile?.primary_saathi_id]);

  useEffect(() => { fetchSoul(); }, [fetchSoul]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#060F1D' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'My Profile' },
    { id: 'soul', label: 'My Soul' },
    { id: 'data', label: 'My Data' },
  ];

  return (
    <div className="flex h-screen overflow-hidden w-full" style={{ background: '#060F1D' }}>
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        activeSlot={activeBotSlot}
        quota={DEFAULT_QUOTA}
        onSlotChange={(slot) => setActiveBotSlot(slot)}
        onLockedTap={() => {}}
        onSignOut={async () => { const s = createClient(); await s.auth.signOut(); }}
      />

      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* ── Page header ─────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="font-playfair text-3xl font-bold text-white mb-1">Your Space</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Control your profile, understand your soul, and manage your data.
            </p>
          </div>

          {/* ── Tab navigation ──────────────────────────────────── */}
          <div
            className="flex gap-1 mb-8 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-150"
                  style={{ color: active ? '#060F1D' : 'rgba(255,255,255,0.45)' }}
                >
                  {active && (
                    <motion.div
                      layoutId="profile-tab-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: '#C9993A' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Tab content ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && (
                <ProfileTab
                  profile={profile}
                  soul={soul}
                  onSaved={() => fetchSoul()}
                />
              )}
              {activeTab === 'soul' && (
                soulLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
                  </div>
                ) : (
                  <SoulTab soul={soul} onEditProfile={() => setActiveTab('profile')} />
                )
              )}
              {activeTab === 'data' && (
                <DataTab userId={profile.id} onEditProfile={() => setActiveTab('profile')} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Subscription card — always shown below tabs ─────── */}
          <div className="mt-10">
            <SubscriptionCard profile={profile} />
          </div>

        </div>
      </main>

      <MobileNav />
    </div>
  );
}
