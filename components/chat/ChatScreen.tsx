import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

import { BOTS } from '@/constants/bots';
import { SAATHIS } from '@/constants/saathis';
import { useAuth } from '@/hooks/useAuth';
import { useQuota } from '@/hooks/useQuota';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';
import { sendChatMessage, triggerSoulUpdate, type ChatError, type MessageParam } from '@/lib/ai';
import { CoolingBanner } from './CoolingBanner';
import { MessageBubble } from './MessageBubble';
import { PaywallBanner } from './PaywallBanner';
import { QuotaBanner } from './QuotaBanner';
import { ConversionModal } from '@/components/ui/ConversionModal';
import {
  checkConversionShouldShow,
  markConversionShown,
  markConversionDismissed,
  markConversionActedOn,
  fetchShownNudgeIds,
  markNudgeShown,
} from '@/hooks/useConversionTrigger';
import { selectNudge } from '@/lib/nudgeSelector';
import type { NudgeMessage } from '@/constants/nudges';
import type { TriggerType } from '@/constants/copy';

import { useSubscription } from '@/hooks/useSubscription';

import type { ChatMessage } from '@/types';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: makeId(), role, content, createdAt: new Date().toISOString() };
}

type ApiProviderBadgeProps = { provider: 'Claude' | 'Groq' };

function ApiProviderBadge({ provider }: ApiProviderBadgeProps) {
  const color = provider === 'Claude' ? '#8B5CF6' : '#059669';
  return (
    <View
      className="rounded-full px-2 py-0.5 ml-2"
      style={{ backgroundColor: color + '18' }}
    >
      <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color }}>{provider}</Text>
    </View>
  );
}

export function ChatScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);
  const { isPremium } = useSubscription();
  const [selectedBotSlot, setSelectedBotSlot] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Conversion modal state
  const [conversionNudge, setConversionNudge] = useState<NudgeMessage | null>(null);
  const [conversionTrigger, setConversionTrigger] = useState<TriggerType>('quota_hit');

  const saathi = currentSaathiId ? SAATHIS.find((s) => s.id === currentSaathiId) : null;
  const canShowCheckin = (soul?.sessionCount ?? 0) >= 5;

  const allowedBots = useMemo(() => {
    const role = profile?.role ?? 'student';
    return BOTS.filter((bot) => bot.availableTo.includes(role));
  }, [profile?.role]);

  const {
    remaining,
    limit,
    coolingUntil,
    isCooling,
    consumeOne,
    refresh: refreshQuota,
  } = useQuota({
    userId: user?.id ?? null,
    saathiId: currentSaathiId,
    botSlot: selectedBotSlot,
  });

  const activeBot = useMemo(
    () => allowedBots.find((bot) => bot.slot === selectedBotSlot) ?? allowedBots[0],
    [allowedBots, selectedBotSlot]
  );

  const canSend =
    !sending &&
    !isCooling &&
    remaining > 0 &&
    input.trim().length > 0 &&
    Boolean(user?.id) &&
    Boolean(currentSaathiId) &&
    Boolean(activeBot);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const onSend = async () => {
    const text = input.replace(/[<>]/g, '').trim().slice(0, 2000);
    if (!canSend || !activeBot || !currentSaathiId) return;

    setSending(true);
    setInput('');
    setChatError(null);

    const userMsg = createMessage('user', text);
    const assistantId = makeId();
    const assistantMsg = createMessage('assistant', '');
    assistantMsg.id = assistantId;

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreamingId(assistantId);
    scrollToBottom();

    // Optimistic local quota decrement for immediate UI feedback
    await consumeOne();

    // Build conversation history (last 10, excluding current turn)
    const history: MessageParam[] = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    await sendChatMessage({
      saathiId: currentSaathiId,
      botSlot: activeBot.slot,
      message: text,
      history,
      onChunk: (_delta, fullText) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
        );
        scrollToBottom();
      },
      onComplete: (fullText) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
        );
        setSending(false);
        setStreamingId(null);
        void refreshQuota();
        scrollToBottom();
        // Fire-and-forget soul update — never blocks the UI
        if (currentSaathiId) {
          const sessionMsgs: MessageParam[] = [
            ...messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'assistant' as const, content: fullText },
          ];
          void triggerSoulUpdate({ saathiId: currentSaathiId, sessionMessages: sessionMsgs });
        }
        // quota_hit trigger — wait 1.5s so student reads the response first
        if (!user?.id || !profile) return;
        const uid = user.id;
        setTimeout(() => {
          // remaining is stale here — check the refreshed value via DB
          checkConversionShouldShow(uid, 'quota_hit')
            .then(async (should) => {
              // Extra guard: only fire when quota is actually 0 after refresh
              if (!should || remaining > 1) return;
              const trigger: TriggerType = 'quota_hit';
              const { shownNudgeIds, lastNudgeId } = await fetchShownNudgeIds(uid, trigger);
              const nudge = selectNudge({
                userId: uid,
                triggerType: trigger,
                userProfile: {
                  displayName: profile.full_name?.split(' ')[0] ?? 'Friend',
                  city: profile.city,
                  examTarget: profile.exam_target,
                  preferredTone: soul?.preferredTone ?? null,
                  daysUntilExam: null,
                },
                shownNudgeIds,
                lastNudgeId,
              });
              setConversionTrigger(trigger);
              setConversionNudge(nudge);
              await markConversionShown(uid, trigger);
              await markNudgeShown(uid, trigger, nudge.id, shownNudgeIds);
            })
            .catch((err: unknown) =>
              Sentry.captureException(err, { tags: { action: 'quota_hit_check' } })
            );
        }, 1500);
      },
      onError: (err: ChatError) => {
        setSending(false);
        setStreamingId(null);
        // Remove empty assistant placeholder
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));

        if (err.type === 'error') {
          setChatError(err.message);
          Sentry.captureMessage(err.message, { tags: { action: 'chat_send_error' } });
        }
        void refreshQuota();
      },
    });
  };

  if (!currentSaathiId || allowedBots.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#C9993A" />
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View className="flex-1 px-4 pt-4">
        {/* Saathi identity bar */}
        {saathi ? (
          <View
            className="rounded-2xl px-4 py-3 mb-4 flex-row items-center"
            style={{ backgroundColor: saathi.bg }}
          >
            <Text className="text-2xl mr-3">{saathi.emoji}</Text>
            <View className="flex-1">
              <Text
                style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: saathi.primary }}
              >
                {saathi.name}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-Regular',
                  fontSize: 12,
                  color: saathi.primary + 'AA',
                }}
              >
                {saathi.tagline}
              </Text>
            </View>

            {canShowCheckin ? (
              <Pressable
                onPress={() => router.push('/(tabs)/checkin')}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: '#C9993A' }}
              >
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#0B1F3A' }}>
                  ✦ Check-in
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Bot slot tabs */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {allowedBots.map((bot) => {
            const active = bot.slot === selectedBotSlot;
            return (
              <Pressable
                key={bot.slot}
                onPress={() => {
                  // plus_bot_tap: block free users from switching to Plus bots
                  if (!isPremium && bot.slot >= 2 && bot.slot <= 4) {
                    if (!user?.id || !profile) return;
                    const uid = user.id;
                    const trigger: TriggerType = 'plus_bot_tap';
                    checkConversionShouldShow(uid, trigger)
                      .then(async (should) => {
                        if (!should) return;
                        const { shownNudgeIds, lastNudgeId } = await fetchShownNudgeIds(uid, trigger);
                        const nudge = selectNudge({
                          userId: uid,
                          triggerType: trigger,
                          userProfile: {
                            displayName: profile.full_name?.split(' ')[0] ?? 'Friend',
                            city: profile.city,
                            examTarget: profile.exam_target,
                            preferredTone: soul?.preferredTone ?? null,
                            daysUntilExam: null,
                          },
                          shownNudgeIds,
                          lastNudgeId,
                        });
                        setConversionTrigger(trigger);
                        setConversionNudge(nudge);
                        await markConversionShown(uid, trigger);
                        await markNudgeShown(uid, trigger, nudge.id, shownNudgeIds);
                      })
                      .catch((err: unknown) =>
                        Sentry.captureException(err, { tags: { action: 'plus_bot_tap_check' } })
                      );
                    return; // ← do NOT switch slot
                  }
                  setSelectedBotSlot(bot.slot);
                  setChatError(null);
                }}
                className={`flex-row items-center px-3 py-2 rounded-full border ${
                  active ? 'border-gold' : 'bg-white border-navy/10'
                }`}
                style={active && saathi ? { backgroundColor: saathi.bg, borderColor: saathi.accent } : undefined}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans-Medium',
                    fontSize: 13,
                    color: active && saathi ? saathi.primary : '#0B1F3A',
                  }}
                >
                  {bot.name}
                </Text>
                <ApiProviderBadge provider={bot.apiProvider} />
              </Pressable>
            );
          })}
        </View>

        {/* Active bot info */}
        {activeBot ? (
          <View className="bg-white rounded-xl px-4 py-3 mb-3 border border-navy/10">
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#0B1F3A' }}>
              {activeBot.name}
            </Text>
            <Text
              style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A80', marginTop: 2 }}
            >
              {activeBot.purpose}
            </Text>
          </View>
        ) : null}

        {/* Paywall banner for premium bot slots */}
        {!isPremium && selectedBotSlot >= 2 && selectedBotSlot <= 4 ? (
          <PaywallBanner botSlot={selectedBotSlot} saathiPrimary={saathi?.primary} />
        ) : null}

        {/* Quota + cooling banners */}
        <QuotaBanner remaining={remaining} limit={limit} />
        {isCooling && coolingUntil ? (
          <CoolingBanner coolingUntil={coolingUntil} saathiName={saathi?.name} />
        ) : null}

        {/* Error banner */}
        {chatError ? (
          <View
            className="rounded-xl px-4 py-2 mb-3"
            style={{ backgroundColor: '#FEF2F2' }}
          >
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#991B1B' }}>
              {chatError}
            </Text>
          </View>
        ) : null}

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages.filter((m) => m.role !== 'system')}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isStreaming={sending && item.id === streamingId}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          className="flex-1"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-12">
              <Text className="text-4xl mb-3">{saathi?.emoji ?? '🤖'}</Text>
              <Text
                style={{
                  fontFamily: 'DMSans-Regular',
                  fontSize: 14,
                  color: '#0B1F3A60',
                  textAlign: 'center',
                }}
              >
                Start a conversation with {activeBot?.name ?? 'your Saathi'}
              </Text>
            </View>
          }
        />

        {/* Streaming indicator */}
        {sending ? (
          <View className="flex-row items-center px-1 py-1">
            <ActivityIndicator size="small" color="#C9993A" />
            <Text
              style={{
                fontFamily: 'DMSans-Regular',
                fontSize: 12,
                color: '#0B1F3A60',
                marginLeft: 8,
              }}
            >
              {activeBot?.name ?? 'Saathi'} is thinking…
            </Text>
          </View>
        ) : null}
      </View>

      {/* Input area */}
      <View
        className="px-4 py-3 flex-row items-end"
        style={{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#0B1F3A0A',
        }}
      >
        <TextInput
          className="flex-1 rounded-2xl px-4 py-3 mr-2"
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 15,
            color: '#0B1F3A',
            backgroundColor: '#FAF7F2',
            maxHeight: 120,
            borderWidth: 1,
            borderColor: isCooling ? '#0B1F3A10' : '#0B1F3A18',
          }}
          placeholder={
            isCooling ? 'Chat resumes after your break…' : 'Ask your Saathi anything…'
          }
          placeholderTextColor="#0B1F3A40"
          multiline
          value={input}
          onChangeText={(t) => setInput(t.replace(/[<>]/g, '').slice(0, 2000))}
          editable={!isCooling && remaining > 0}
          returnKeyType="default"
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: canSend ? (saathi?.primary ?? '#0B1F3A') : '#0B1F3A18',
          }}
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: 'DMSans-Bold',
              fontSize: 15,
              color: canSend ? '#FAF7F2' : '#0B1F3A40',
            }}
          >
            →
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>

    {/* Conversion modal — quota_hit and plus_bot_tap */}
    {conversionNudge ? (
      <ConversionModal
        visible
        triggerType={conversionTrigger}
        nudge={conversionNudge}
        accentColor={saathi?.accent ?? '#C9993A'}
        onDismiss={async () => {
          if (user?.id) await markConversionDismissed(user.id, conversionTrigger);
          setConversionNudge(null);
        }}
        onCta={async () => {
          if (user?.id) await markConversionActedOn(user.id, conversionTrigger);
          setConversionNudge(null);
          router.push('/(tabs)/pricing');
        }}
      />
    ) : null}
    </>
  );
}
