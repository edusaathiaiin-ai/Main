'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { streamChat } from '@/lib/ai';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import { BOTS } from '@/constants/bots';
import { getSaathiTheme } from '@/lib/saathiThemes';
import { useThemeStore } from '@/stores/themeStore';
import { ChatWatermark } from './ChatWatermark';
import { SaathiHeader } from './SaathiHeader';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { EmptyState } from './EmptyState';
import { QuotaBanner } from './QuotaBanner';
import { CoolingBanner } from './CoolingBanner';
import { ConversionModal } from './ConversionModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { UpgradeBanner } from '@/components/ui/UpgradeBanner';
import type { UpgradeTrigger } from '@/components/ui/UpgradeBanner';
import type { QuotaState, Saathi } from '@/types';

const DEFAULT_QUOTA: QuotaState = {
  limit: 5,
  used: 0,
  remaining: 5,
  coolingUntil: null,
  isCooling: false,
};

type SoulBanner = {
  name: string;
  summary: string;
};

// ─── Rich Feature Banner ──────────────────────────────────────────────────────

const RICH_FEATURE_SAATHIS: Record<string, { features: string[]; example: string }> = {
  maathsaathi:        { features: ['📐 Equations render as beautiful math'], example: 'Try: "What is the quadratic formula?"' },
  chemsaathi:         { features: ['🧪 Molecular structures appear inline', '📐 Chemical equations render beautifully'], example: 'Try: "Show me the structure of glucose"' },
  pharmasaathi:       { features: ['🧪 Drug molecular structures appear inline'], example: 'Try: "What does paracetamol look like?"' },
  biosaathi:          { features: ['🧬 Molecular structures appear inline', '📊 Biological processes become diagrams'], example: 'Try: "Show me the structure of DNA bases"' },
  archsaathi:         { features: ['📊 Design processes become visual flowcharts'], example: 'Try: "Show me a basic design process"' },
  compsaathi:         { features: ['💻 Code renders with syntax highlighting', '📊 System architecture becomes diagrams'], example: 'Try: "Show me a binary search algorithm"' },
  kanoonsaathi:       { features: ['📊 Legal processes become visual flows'], example: 'Try: "How does a case reach the Supreme Court?"' },
  mechsaathi:         { features: ['📐 Engineering equations render beautifully', '📊 Mechanisms become diagrams'], example: 'Try: "Show stress-strain relationship"' },
  civilsaathi:        { features: ['📊 Structural processes become diagrams', '📐 Engineering equations render beautifully'], example: 'Try: "Explain load distribution in a beam"' },
  physisaathi:        { features: ['📐 Physics equations render beautifully'], example: 'Try: "Show Maxwell\'s equations"' },
  biotechsaathi:      { features: ['🧬 Molecular structures appear inline', '📐 Biochemical equations render beautifully'], example: 'Try: "Show me ATP synthesis"' },
  aerosaathi:         { features: ['📐 Equations render beautifully', '📊 Flight processes become diagrams'], example: 'Try: "Show Bernoulli\'s equation"' },
  aerospacesaathi:    { features: ['📐 Equations render beautifully', '📊 Processes become diagrams'], example: 'Try: "Show orbital mechanics equations"' },
  elecsaathi:         { features: ['📐 Circuit equations render beautifully', '📊 Circuit flows become diagrams'], example: 'Try: "Show Kirchhoff\'s laws"' },
  envirosaathi:       { features: ['📐 Environmental equations render beautifully', '📊 Processes become diagrams'], example: 'Try: "Show the carbon cycle"' },
  econsaathi:         { features: ['📊 Economic processes become diagrams'], example: 'Try: "Show supply and demand flow"' },
};

function RichFeatureBanner({ saathiSlug }: { saathiSlug: string }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('feature_banner_dismissed') === 'true';
  });

  const features = RICH_FEATURE_SAATHIS[saathiSlug];
  if (!features || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        margin: '0 16px 12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(201,153,58,0.08)',
        border: '0.5px solid rgba(201,153,58,0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>✦</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#C9993A', margin: '0 0 4px', fontFamily: 'var(--font-dm-sans)' }}>
          This Saathi has rich features
        </p>
        {features.features.map((f, i) => (
          <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0', fontFamily: 'var(--font-dm-sans)' }}>{f}</p>
        ))}
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', fontStyle: 'italic', fontFamily: 'var(--font-dm-sans)' }}>
          {features.example}
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem('feature_banner_dismissed', 'true'); setDismissed(true); }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '16px', padding: 0, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  );
}

export function ChatWindow() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    activeSaathiId,
    activeBotSlot,
    messages,
    isStreaming,
    streamingText,
    setActiveSaathi,
    setActiveBotSlot,
    addMessage,
    setStreaming,
    appendStreamChunk,
    commitStreamedMessage,
    clearMessages,
  } = useChatStore();

  const { mode } = useThemeStore();
  const searchParams = useSearchParams();

  const [quota, setQuota] = useState<QuotaState>(DEFAULT_QUOTA);
  const [inputValue, setInputValue] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [soulBanner, setSoulBanner] = useState<SoulBanner | null>(null);
  const [showSoulBanner, setShowSoulBanner] = useState(true);
  const [conversionModal, setConversionModal] = useState<{ open: boolean; trigger: 'quota_hit' | 'plus_bot_tap'; botName?: string }>({
    open: false,
    trigger: 'quota_hit',
  });
  const [soulData, setSoulData] = useState<{ sessionCount: number; shellBroken: boolean } | null>(null);
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve active Saathi
  const saathiId = activeSaathiId ?? profile?.primary_saathi_id ?? SAATHIS[0].id;
  const activeSaathi: Saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0];
  const activeBot = BOTS.find((b) => b.slot === activeBotSlot) ?? BOTS[0];
  const theme = getSaathiTheme(saathiId, mode);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Post-upgrade celebration
  useEffect(() => {
    if (searchParams.get('upgraded') !== 'true') return;
    setShowCelebration(true);
    router.replace('/chat', { scroll: false });
    const t = setTimeout(() => setShowCelebration(false), 2500);
    return () => clearTimeout(t);
  }, [searchParams, router]);

  // Upgrade banner trigger logic — free plan only
  useEffect(() => {
    if (profile?.plan_id !== 'free') return;
    if (bannerDismissed || !soulData) return;

    // Cooling — highest priority
    if (quota.isCooling) {
      if (!sessionStorage.getItem('banner_dismissed_cooling')) {
        setUpgradeTrigger('cooling');
      }
      return;
    }

    // Quota low
    if (quota.remaining <= 3 && quota.remaining > 0) {
      if (!sessionStorage.getItem('banner_dismissed_quota_low')) {
        setUpgradeTrigger('quota_low');
      }
      return;
    }

    // Shell broken — passion moment
    if (soulData.shellBroken && !sessionStorage.getItem('shell_banner_shown')) {
      sessionStorage.setItem('shell_banner_shown', '1');
      setUpgradeTrigger('shell_broken');
      return;
    }

    // Session milestones
    if (
      [3, 5, 10].includes(soulData.sessionCount) &&
      !sessionStorage.getItem('banner_dismissed_session_milestone')
    ) {
      setUpgradeTrigger('session_milestone');
    }
  }, [quota, soulData, bannerDismissed, profile?.plan_id]);

  // Init: set saathi + fetch quota + soul banner
  useEffect(() => {
    if (!profile) return;
    const sid = profile.primary_saathi_id ?? SAATHIS[0].id;
    setActiveSaathi(sid);

    fetchQuota(profile.id);
    fetchSoulBanner(profile.id, sid);
  }, [profile, setActiveSaathi]);

  async function fetchQuota(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('chat_sessions')
      .select('message_count, cooling_until')
      .eq('user_id', userId)
      .eq('quota_date_ist', new Date().toISOString().slice(0, 10))
      .single();

    if (!data) return;

    const planLimits: Record<string, number> = {
      free: 5, plus: 20, pro: 50, unlimited: 9999,
    };
    const limit = planLimits[profile?.plan_id ?? 'free'] ?? 5;
    const used = data.message_count ?? 0;
    const coolingUntil = data.cooling_until ? new Date(data.cooling_until) : null;
    const isCooling = coolingUntil ? coolingUntil > new Date() : false;

    setQuota({
      limit,
      used,
      remaining: Math.max(0, limit - used),
      coolingUntil,
      isCooling,
    });
  }

  async function fetchSoulBanner(userId: string, sid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('student_soul')
      .select('display_name, last_session_summary, session_count, shell_broken')
      .eq('user_id', userId)
      .eq('vertical_id', sid)
      .single();

    if (data?.last_session_summary && data.session_count > 0) {
      setSoulBanner({
        name: data.display_name ?? 'there',
        summary: data.last_session_summary.split('.')[0] ?? data.last_session_summary,
      });
    }
    setSoulData({
      sessionCount: (data?.session_count as number) ?? 0,
      shellBroken: Boolean(data?.shell_broken),
    });
  }

  // Switch saathi
  function handleSaathiChange(saathi: Saathi) {
    if (saathi.id === saathiId) return;
    setActiveSaathi(saathi.id);
    clearMessages();
    setSoulBanner(null);
    if (profile) {
      fetchSoulBanner(profile.id, saathi.id);
    }
  }

  // Switch bot slot
  function handleSlotChange(slot: 1 | 2 | 3 | 4 | 5) {
    setActiveBotSlot(slot);
  }

  // Locked bot tap
  function handleLockedTap(botName: string) {
    setConversionModal({ open: true, trigger: 'plus_bot_tap', botName });
  }

  // Flag a message
  async function handleFlag(messageId: string) {
    const supabase = createClient();
    await supabase.from('moderation_flags').insert({
      message_id: messageId,
      user_id: profile?.id,
      reason: 'user_flag',
    });
  }

  // Send message
  const handleSend = useCallback(async (text: string) => {
    if (!profile || isStreaming || quota.isCooling || quota.remaining === 0) return;

    const supabase = createClient();
    // getUser() validates the JWT server-side and triggers a refresh if expired,
    // then getSession() returns the guaranteed-fresh token.
    const { error: authErr } = await supabase.auth.getUser();
    if (authErr) { router.push('/login'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const userMsgId = `user-${Date.now()}`;
    addMessage({ id: userMsgId, role: 'user', content: text, createdAt: new Date().toISOString() });
    setInputValue('');
    setErrorBanner(null);
    setStreaming(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      for await (const delta of streamChat({
        saathiId,
        botSlot: activeBotSlot,
        message: text,
        history,
        accessToken: session.access_token,
      })) {
        appendStreamChunk(delta);
      }

      const assistantId = `asst-${Date.now()}`;
      commitStreamedMessage(assistantId);

      // Refresh quota
      await fetchQuota(profile.id);

      // Show conversion modal after quota hit
      const updatedRemaining = quota.remaining - 1;
      if (updatedRemaining <= 0) {
        conversionTimeoutRef.current = setTimeout(() => {
          setConversionModal({ open: true, trigger: 'quota_hit' });
        }, 1500);
      }
    } catch (err) {
      setStreaming(false);
      // Distinguish forced logout (another device) from normal errors
      if (
        err instanceof Error &&
        (err as Error & { code?: string }).code === 'FORCED_LOGOUT'
      ) {
        // Sign out silently and redirect to login with forced=1 flag
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace('/login?forced=1');
        return;
      }
      setErrorBanner(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  }, [profile, isStreaming, quota, messages, saathiId, activeBotSlot, addMessage, setStreaming, appendStreamChunk, commitStreamedMessage, router]);

  // Starter click
  function handleStarterClick(text: string) {
    setInputValue(text);
  }

  // Sign out — returns to hero page
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen w-full" style={{ background: '#060F1D' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden w-full"
      style={{
        ...theme,
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        transition: 'background 0.4s ease, color 0.3s ease',
      }}
    >
      {/* Sidebar (desktop) */}
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        activeSlot={activeBotSlot}
        quota={quota}
        onSlotChange={handleSlotChange}
        onLockedTap={handleLockedTap}
        onSignOut={handleSignOut}
        sessionCount={soulData?.sessionCount ?? 0}
      />

      {/* Main chat area */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Saathi header */}
        <SaathiHeader
          saathi={activeSaathi}
          botName={activeBot.name}
          sessionCount={0}
        />

        {/* Quota banner */}
        <QuotaBanner quota={quota} />

        {/* Soul welcome banner */}
        <AnimatePresence>
          {soulBanner && showSoulBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start justify-between px-5 py-3 text-sm"
              style={{
                background: `${activeSaathi.primary}18`,
                borderBottom: `0.5px solid ${activeSaathi.primary}22`,
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="font-semibold text-white">Welcome back, {soulBanner.name}.</span>{' '}
                Last time we covered: {soulBanner.summary}
              </p>
              <button
                onClick={() => setShowSoulBanner(false)}
                className="ml-4 text-xs shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-5 py-2.5 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '0.5px solid rgba(239,68,68,0.2)' }}
            >
              <span style={{ color: '#FCA5A5' }}>⚠️ {errorBanner}</span>
              <button onClick={() => setErrorBanner(null)} className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6" style={{ position: 'relative' }}>
          <ChatWatermark saathiSlug={saathiId} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {messages.length === 0 && !isStreaming ? (
              <EmptyState
                saathiId={saathiId}
                saathiEmoji={activeSaathi.emoji}
                botName={activeBot.name}
                onStarterClick={handleStarterClick}
              />
            ) : (
              <div>
                {messages.map((msg, i) => {
                  const prevMsg = messages[i - 1];
                  const showBotLabel = msg.role === 'assistant' && prevMsg?.role !== 'assistant';
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      showBotLabel={showBotLabel}
                      botName={activeBot.name}
                      onFlag={handleFlag}
                      primaryColor={activeSaathi.primary}
                    />
                  );
                })}

                {/* Streaming bubble */}
                {isStreaming && (
                  <MessageBubble
                    key="streaming"
                    message={{ id: 'streaming', role: 'assistant', content: '', createdAt: new Date().toISOString() }}
                    isStreaming={true}
                    streamingText={streamingText}
                    showBotLabel={messages[messages.length - 1]?.role !== 'assistant'}
                    botName={activeBot.name}
                    primaryColor={activeSaathi.primary}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Rich feature discovery banner — shown once on first session */}
        <AnimatePresence>
          <RichFeatureBanner saathiSlug={saathiId} />
        </AnimatePresence>

        {/* Cooling banner or input */}
        {quota.isCooling ? (
          <CoolingBanner quota={quota} saathiName={activeSaathi.name} />
        ) : (
          <InputArea
            quota={quota}
            isStreaming={isStreaming}
            primaryColor={activeSaathi.primary}
            onSend={handleSend}
            inputValue={inputValue}
            setInputValue={setInputValue}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Conversion modal */}
      <ConversionModal
        open={conversionModal.open}
        trigger={conversionModal.trigger}
        botName={conversionModal.botName}
        onClose={() => setConversionModal((p) => ({ ...p, open: false }))}
      />

      {/* Upgrade banner */}
      <AnimatePresence>
        {upgradeTrigger && !bannerDismissed && (
          <UpgradeBanner
            trigger={upgradeTrigger}
            studentName={profile.full_name ?? undefined}
            onDismiss={() => {
              sessionStorage.setItem(`banner_dismissed_${upgradeTrigger}`, 'true');
              setBannerDismissed(true);
              setUpgradeTrigger(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Post-upgrade celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6,15,29,0.92)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>✦</div>
              <h2
                className="font-playfair"
                style={{ fontSize: '28px', fontWeight: 700, color: '#C9993A', marginBottom: '12px' }}
              >
                Welcome to Plus, {profile.full_name?.split(' ')[0] ?? 'friend'}! 🎉
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '320px', lineHeight: 1.6 }}>
                No more limits. Your Saathi is fully yours.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
