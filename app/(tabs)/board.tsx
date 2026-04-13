import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { useAuth } from '@/hooks/useAuth';
import { useSaathi } from '@/hooks/useSaathi';
import { supabase } from '@/lib/supabase';
import { trackBoardPosted } from '@/lib/analytics';

type QuestionRow = {
  id: string;
  user_id: string;
  vertical_id: string | null;
  title: string;
  body: string;
  created_at: string;
};

type AnswerRow = {
  id: string;
  question_id: string;
  body: string;
  is_ai: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type QuestionView = {
  id: string;
  userId: string;
  title: string;
  topic: string;
  createdAt: string;
  aiAnswer: string;
  humanAnswerCount: number;
  authorName: string;
  authorRole: string | null;
};

type BoardFilter = 'all' | 'unanswered' | 'mine';

const TOPIC_TAXONOMY: Record<string, string[]> = {
  kanoonsaathi: ['Constitution', 'IPC', 'Civil Law', 'Current Affairs'],
  medicosaathi: ['Anatomy', 'Physiology', 'Clinical Cases', 'NEET-PG'],
  compsaathi: ['DSA', 'System Design', 'Web Dev', 'AI/ML'],
  default: ['Concepts', 'Practice', 'Current Affairs', 'Career'],
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseTopic(body: string): string {
  const match = body.match(/^\[topic:([^\]]+)\]\s*/i);
  return match?.[1]?.trim() || 'General';
}

type FilterBarProps = {
  selected: BoardFilter;
  onSelect: (value: BoardFilter) => void;
  saathiPrimary: string;
  saathiBg: string;
};

function FilterBar({ selected, onSelect, saathiPrimary, saathiBg }: FilterBarProps) {
  const filters: Array<{ id: BoardFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'unanswered', label: 'Unanswered' },
    { id: 'mine', label: 'My Questions' },
  ];

  return (
    <View className="flex-row mb-3">
      {filters.map((filter) => {
        const active = selected === filter.id;
        return (
          <Pressable
            key={filter.id}
            onPress={() => onSelect(filter.id)}
            className="mr-2 px-3 py-2 rounded-full border"
            style={{
              borderColor: active ? saathiPrimary : '#0B1F3A1A',
              backgroundColor: active ? saathiBg : '#FFFFFF',
            }}
          >
            <Text
              style={{
                fontFamily: active ? 'DMSans-Bold' : 'DMSans-Medium',
                fontSize: 12,
                color: active ? saathiPrimary : '#0B1F3A',
              }}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type QuestionCardProps = {
  item: QuestionView;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onFlag: () => Promise<void>;
};

function QuestionCard({ item, isExpanded, onToggleExpanded, onFlag }: QuestionCardProps) {
  const initial = item.authorName.trim().charAt(0).toUpperCase() || 'S';
  const answerLines = isExpanded ? undefined : 3;
  const aiPreview = item.aiAnswer || 'AI answer is being generated...';

  return (
    <View className="rounded-2xl bg-white px-4 py-4 mb-3" style={{ borderWidth: 1, borderColor: '#0B1F3A14' }}>
      <View className="flex-row items-center mb-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
          style={{ backgroundColor: '#E8F0FE' }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#1E3A5F' }}>{initial}</Text>
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#0B1F3A' }}>
            {item.authorName}
          </Text>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 11, color: '#0B1F3A80' }}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        {item.authorRole === 'faculty' ? (
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#DCFCE7' }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 10, color: '#166534' }}>✓ Faculty Verified</Text>
          </View>
        ) : null}
      </View>

      <View className="self-start rounded-full px-2 py-1 mb-2" style={{ backgroundColor: '#0B1F3A12' }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: '#0B1F3A' }}>{item.topic}</Text>
      </View>

      <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: '#0B1F3A', marginBottom: 8 }}>
        {item.title}
      </Text>

      <View className="rounded-xl px-3 py-3" style={{ backgroundColor: '#FFFBEB' }}>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#C9993A', marginBottom: 4 }}>
          AI Answer
        </Text>
        <Text numberOfLines={answerLines} style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#0B1F3A' }}>
          {aiPreview}
        </Text>
        <Pressable onPress={onToggleExpanded} className="self-start mt-2">
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#C9993A' }}>
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A80' }}>
          {item.humanAnswerCount} {item.humanAnswerCount === 1 ? 'answer' : 'answers'}
        </Text>
        <Pressable onPress={onFlag} className="px-2 py-1">
          <Text style={{ fontSize: 13 }}>🚩</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function BoardScreen() {
  const { user, profile } = useAuth();
  const { currentSaathiId } = useSaathi();
  const saathi = currentSaathiId ? SAATHIS.find((s) => s.id === currentSaathiId) : null;

  const [questions, setQuestions] = useState<QuestionView[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const listRef = useRef<FlatList<QuestionView>>(null);

  const topicOptions = useMemo(() => {
    if (!currentSaathiId) return TOPIC_TAXONOMY.default;
    return TOPIC_TAXONOMY[currentSaathiId] ?? TOPIC_TAXONOMY.default;
  }, [currentSaathiId]);

  const loadBoard = useCallback(async () => {
    if (!currentSaathiId) {
      setQuestions([]);
      return;
    }

    setRefreshing(true);

    try {
      const { data: questionRows, error: questionErr } = await supabase
        .from('board_questions')
        .select('id, user_id, vertical_id, title, body, created_at')
        .eq('vertical_id', currentSaathiId)
        .order('created_at', { ascending: false });

      if (questionErr) {
        Sentry.captureException(questionErr, { tags: { action: 'board_questions_fetch' } });
        setQuestions([]);
        return;
      }

      const qRows = (questionRows ?? []) as QuestionRow[];
      const questionIds = qRows.map((q) => q.id);
      const userIds = Array.from(new Set(qRows.map((q) => q.user_id)));

      const [answersRes, profilesRes] = await Promise.all([
        questionIds.length
          ? supabase
              .from('board_answers')
              .select('id, question_id, body, is_ai')
              .in('question_id', questionIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabase.from('profiles').select('id, full_name, role').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (answersRes.error) {
        Sentry.captureException(answersRes.error, { tags: { action: 'board_answers_fetch' } });
      }
      if (profilesRes.error) {
        Sentry.captureException(profilesRes.error, { tags: { action: 'board_profiles_fetch' } });
      }

      const answers = ((answersRes.data ?? []) as AnswerRow[]);
      const profiles = ((profilesRes.data ?? []) as ProfileRow[]);

      const answersByQuestion: Record<string, AnswerRow[]> = {};
      for (const answer of answers) {
        answersByQuestion[answer.question_id] = answersByQuestion[answer.question_id] ?? [];
        answersByQuestion[answer.question_id].push(answer);
      }

      const profileMap: Record<string, ProfileRow> = {};
      for (const p of profiles) profileMap[p.id] = p;

      const viewRows: QuestionView[] = qRows.map((q) => {
        const related = answersByQuestion[q.id] ?? [];
        const ai = related.find((a) => a.is_ai)?.body ?? '';
        const humanCount = related.filter((a) => !a.is_ai).length;
        const author = profileMap[q.user_id];

        return {
          id: q.id,
          userId: q.user_id,
          title: q.title,
          topic: parseTopic(q.body),
          createdAt: q.created_at,
          aiAnswer: ai,
          humanAnswerCount: humanCount,
          authorName: author?.full_name?.trim() || 'Community Member',
          authorRole: author?.role ?? null,
        };
      });

      setQuestions(viewRows);
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'board_load' } });
      setQuestions([]);
    } finally {
      setRefreshing(false);
    }
  }, [currentSaathiId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const filteredQuestions = useMemo(() => {
    if (!user) return [];
    if (filter === 'unanswered') {
      return questions.filter((q) => q.humanAnswerCount === 0);
    }
    if (filter === 'mine') {
      return questions.filter((q) => q.userId === user.id);
    }
    return questions;
  }, [filter, questions, user]);

  const postQuestion = async () => {
    const trimmedTitle = title.trim().slice(0, 200);
    const topic = selectedTopic || topicOptions[0] || 'General';
    if (!user || !currentSaathiId || !trimmedTitle) return;

    try {
      const { data, error } = await supabase
        .from('board_questions')
        .insert({
          user_id: user.id,
          vertical_id: currentSaathiId,
          title: trimmedTitle,
          body: `[topic:${topic}] ${trimmedTitle}`,
          is_anonymous: false,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        Sentry.captureException(error, { tags: { action: 'board_post_question' } });
        return;
      }

      const questionId = (data as { id: string }).id;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/board-auto-answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ questionId, saathiId: currentSaathiId }),
          });
        }
      } catch (error) {
        Sentry.captureException(error, { tags: { action: 'board_auto_answer_trigger' } });
      }

      trackBoardPosted(currentSaathiId ?? '', 'question');
      setModalVisible(false);
      setTitle('');
      setSelectedTopic('');
      await loadBoard();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'board_post_question_fallback' } });
    }
  };

  const flagQuestion = async (questionId: string) => {
    if (!user) return;

    const { error } = await supabase.from('moderation_flags').insert({
      reporter_user_id: user.id,
      target_type: 'board_question',
      target_id: questionId,
      reason: 'user_flagged',
    });

    if (error) {
      Sentry.captureException(error, { tags: { action: 'board_flag_question' } });
    }
  };

  if (!saathi || !profile) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <View className="flex-1 bg-cream px-4 pt-4">
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: '#0B1F3A' }}>
        Community Board
      </Text>
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#0B1F3A80', marginTop: 4, marginBottom: 8 }}>
        Learn together in {saathi.name}
      </Text>

      <FilterBar
        selected={filter}
        onSelect={setFilter}
        saathiPrimary={saathi.primary}
        saathiBg={saathi.bg}
      />

      <FlatList
        ref={listRef}
        data={filteredQuestions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuestionCard
            item={item}
            isExpanded={Boolean(expandedIds[item.id])}
            onToggleExpanded={() =>
              setExpandedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
            }
            onFlag={() => flagQuestion(item.id)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBoard} tintColor="#C9993A" />}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: filteredQuestions.length === 0 ? 1 : 0 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text style={{ fontSize: 42, marginBottom: 10 }}>{saathi.emoji}</Text>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: '#0B1F3A80', textAlign: 'center' }}>
              Be the first to ask a question in {saathi.name}!
            </Text>
          </View>
        }
      />

      <Pressable
        onPress={() => setModalVisible(true)}
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: '#C9993A' }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, lineHeight: 30, color: '#0B1F3A' }}>+</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: '#00000055' }}>
          <View className="rounded-t-3xl bg-white px-5 pt-5 pb-8">
            <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: '#0B1F3A' }}>
              Post Question
            </Text>

            <TextInput
              value={title}
              onChangeText={(value) => setTitle(value.slice(0, 200))}
              placeholder="Ask your question"
              placeholderTextColor="#0B1F3A66"
              className="mt-4 rounded-2xl px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: '#0B1F3A22',
                fontFamily: 'DMSans-Regular',
                fontSize: 14,
                color: '#0B1F3A',
              }}
            />

            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: '#0B1F3A80', marginTop: 12 }}>
              Topic
            </Text>

            <View className="flex-row flex-wrap mt-2">
              {topicOptions.map((topic) => {
                const active = selectedTopic === topic;
                return (
                  <Pressable
                    key={topic}
                    onPress={() => setSelectedTopic(topic)}
                    className="mr-2 mb-2 px-3 py-2 rounded-full border"
                    style={{
                      borderColor: active ? saathi.primary : '#0B1F3A1A',
                      backgroundColor: active ? saathi.bg : '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: active ? saathi.primary : '#0B1F3A' }}>
                      {topic}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row mt-4">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 rounded-xl items-center justify-center py-3 mr-2"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#0B1F3A' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={postQuestion}
                disabled={title.trim().length === 0}
                className="flex-1 rounded-xl items-center justify-center py-3 ml-2"
                style={{ backgroundColor: title.trim().length > 0 ? '#C9993A' : '#E5E7EB' }}
              >
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#0B1F3A' }}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
