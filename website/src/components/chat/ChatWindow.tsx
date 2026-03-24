'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { streamChat } from '@/lib/ai';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import { BOTS } from '@/constants/bots';
import { SaathiHeader } from './SaathiHeader';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { EmptyState } from './EmptyState';
import { QuotaBanner } from './QuotaBanner';
import { CoolingBanner } from './CoolingBanner';
import { ConversionModal } from './ConversionModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
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

  const [quota, setQuota] = useState<QuotaState>(DEFAULT_QUOTA);
  const [inputValue, setInputValue] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [soulBanner, setSoulBanner] = useState<SoulBanner | null>(null);
  const [showSoulBanner, setShowSoulBanner] = useState(true);
  const [conversionModal, setConversionModal] = useState<{ open: boolean; trigger: 'quota_hit' | 'plus_bot_tap'; botName?: string }>({
    open: false,
    trigger: 'quota_hit',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve active Saathi
  const saathiId = activeSaathiId ?? profile?.primary_saathi_id ?? SAATHIS[0].id;
  const activeSaathi: Saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0];
  const activeBot = BOTS.find((b) => b.slot === activeBotSlot) ?? BOTS[0];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

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
      .select('message_count, cooling_until, plan_id')
      .eq('user_id', userId)
      .eq('session_date', new Date().toISOString().slice(0, 10))
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
      .select('display_name, last_session_summary, session_count')
      .eq('user_id', userId)
      .eq('vertical_id', sid)
      .single();

    if (data?.last_session_summary && data.session_count > 0) {
      setSoulBanner({
        name: data.display_name ?? 'there',
        summary: data.last_session_summary.split('.')[0] ?? data.last_session_summary,
      });
    }
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
      setErrorBanner(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  }, [profile, isStreaming, quota, messages, saathiId, activeBotSlot, addMessage, setStreaming, appendStreamChunk, commitStreamedMessage, router]);

  // Starter click
  function handleStarterClick(text: string) {
    setInputValue(text);
  }

  // Sign out
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen w-full" style={{ background: '#060F1D' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden w-full" style={{ background: '#060F1D' }}>
      {/* Sidebar (desktop) */}
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        activeSlot={activeBotSlot}
        quota={quota}
        onSlotChange={handleSlotChange}
        onLockedTap={handleLockedTap}
        onSignOut={handleSignOut}
      />

      {/* Main chat area */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Saathi header */}
        <SaathiHeader
          saathi={activeSaathi}
          botName={activeBot.name}
          apiProvider={activeBot.apiProvider}
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
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
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

        {/* Cooling banner or input */}
        {quota.isCooling ? (
          <CoolingBanner quota={quota} saathiName={activeSaathi.name} />
        ) : (
          <InputArea
            quota={quota}
            isStreaming={isStreaming}
            primaryColor={activeSaathi.primary}
            apiProvider={activeBot.apiProvider}
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
    </div>
  );
}
