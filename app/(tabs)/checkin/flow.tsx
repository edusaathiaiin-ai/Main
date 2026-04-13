import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { useAuth } from '@/hooks/useAuth';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';
import { supabase } from '@/lib/supabase';
import { trackCheckinCompleted } from '@/lib/analytics';

type QuestionType = 'mcq' | 'open' | 'conversation';

type Question = {
  id: string;
  type: QuestionType;
  topic: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
};

type AnswerState = {
  text?: string;
  selectedIndex?: number;
  isCorrect?: boolean;
  feedback?: string;
  score?: number;
};

function normalizeScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value <= 1) return Math.max(0, Math.min(1, value));
  return Math.max(0, Math.min(1, value / 100));
}

async function evaluateOpenAnswer(params: {
  question: string;
  answer: string;
  saathiId: string;
}): Promise<{ feedback: string; score: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { feedback: 'Good attempt. Keep your explanation crisp and practical.', score: 0.5 };
  }

  const endpoint = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/checkin-eval`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        question: params.question,
        answer: params.answer,
        saathiId: params.saathiId,
      }),
    });

    if (!response.ok) {
      return {
        feedback: 'Strong effort. Add one concrete example in your next response for even better clarity.',
        score: 0.6,
      };
    }

    const parsed = (await response.json()) as { feedback?: string; score?: number };
    return {
      feedback:
        parsed.feedback ??
        'You are on the right track. Next time, make your structure a little tighter.',
      score: normalizeScore(parsed.score),
    };
  } catch {
    return {
      feedback: 'Good thinking. Keep building your explanation with one key takeaway at the end.',
      score: 0.55,
    };
  }
}

function pickResultLevel(params: {
  ambitionLevel: string;
  sessionCount: number;
  score: number;
}): 'ambitious' | 'struggling' | 'casual' | 'high_performer' {
  if (params.score >= 0.85 && params.sessionCount >= 10) return 'high_performer';
  if (params.sessionCount <= 7 || params.score < 0.5) return 'struggling';

  const ambition = params.ambitionLevel.toLowerCase();
  if (ambition.includes('high') || ambition.includes('upsc') || ambition.includes('phd')) {
    return 'ambitious';
  }

  return 'casual';
}

export default function CheckinFlowScreen() {
  const { user } = useAuth();
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);

  const saathi = currentSaathiId ? SAATHIS.find((item) => item.id === currentSaathiId) : null;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [input, setInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);

  const previousOpenAnswer = answers['q2']?.text || '';

  const questions: Question[] = useMemo(() => {
    const followUp = previousOpenAnswer
      ? `You mentioned: "${previousOpenAnswer.slice(0, 80)}". What would you improve first in that approach and why?`
      : 'What is one practical step you would take first, and why?';

    return [
      {
        id: 'q1',
        type: 'mcq',
        topic: 'Foundations',
        prompt: 'Which approach helps learning stay strongest over time?',
        options: [
          'Last-minute cramming only',
          'Spaced revision with active recall',
          'Reading once without notes',
          'Skipping difficult topics',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        type: 'open',
        topic: 'Application',
        prompt: 'In your own words, explain one concept you used this week and where it fits in real life.',
      },
      {
        id: 'q3',
        type: 'conversation',
        topic: 'Reflection',
        prompt: followUp,
      },
      {
        id: 'q4',
        type: 'mcq',
        topic: 'Reasoning',
        prompt: 'When a problem looks confusing, what should you do first?',
        options: [
          'Guess quickly and move on',
          'Break it into smaller known pieces',
          'Ignore constraints',
          'Memorize the final answer only',
        ],
        correctIndex: 1,
      },
      {
        id: 'q5',
        type: 'open',
        topic: 'Growth',
        prompt: 'What is one topic you want your Saathi to help you strengthen next?',
      },
    ];
  }, [previousOpenAnswer]);

  const current = questions[index];
  const currentAnswer = answers[current.id] ?? {};

  const onSelectMcq = (selectedIndex: number) => {
    if (current.type !== 'mcq') return;
    const isCorrect = selectedIndex === current.correctIndex;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: {
        ...prev[current.id],
        selectedIndex,
        isCorrect,
        score: isCorrect ? 1 : 0,
      },
    }));
  };

  const onNext = async () => {
    if (!currentSaathiId || !user || !soul) return;

    if (current.type === 'mcq') {
      if (typeof currentAnswer.selectedIndex !== 'number') return;
    }

    if (current.type === 'open') {
      const text = input.trim();
      if (!text) return;

      if (!currentAnswer.feedback) {
        setEvaluating(true);
        try {
          const evaluated = await evaluateOpenAnswer({
            question: current.prompt,
            answer: text,
            saathiId: currentSaathiId,
          });

          setAnswers((prev) => ({
            ...prev,
            [current.id]: {
              ...prev[current.id],
              text,
              feedback: evaluated.feedback,
              score: evaluated.score,
            },
          }));
        } catch (error) {
          Sentry.captureException(error, { tags: { action: 'checkin_open_evaluate' } });
        } finally {
          setEvaluating(false);
        }
        return;
      }
    }

    if (current.type === 'conversation') {
      const text = input.trim();
      if (!text) return;
      setAnswers((prev) => ({
        ...prev,
        [current.id]: { ...prev[current.id], text, score: 0.7 },
      }));
    }

    if (index < questions.length - 1) {
      const nextQuestion = questions[index + 1];
      setIndex((prev) => prev + 1);
      setInput(answers[nextQuestion.id]?.text ?? '');
      return;
    }

    setSaving(true);
    try {
      const answerList = questions.map((q) => ({ question: q, answer: answers[q.id] ?? {} }));
      const scored = answerList.filter((item) => typeof item.answer.score === 'number');
      const avgScore =
        scored.length > 0
          ? scored.reduce((sum, item) => sum + (item.answer.score ?? 0), 0) / scored.length
          : 0;

      const resultLevel = pickResultLevel({
        ambitionLevel: soul.ambitionLevel,
        sessionCount: soul.sessionCount,
        score: avgScore,
      });

      const topicsCleared = Array.from(
        new Set(
          answerList
            .filter((item) => (item.answer.score ?? 0) >= 0.7)
            .map((item) => item.question.topic)
        )
      );

      const topicsRevisit = Array.from(
        new Set(
          answerList
            .filter((item) => (item.answer.score ?? 0) < 0.7)
            .map((item) => item.question.topic)
        )
      );

      const mcqPayload = answerList
        .filter((item) => item.question.type === 'mcq')
        .map((item) => ({
          id: item.question.id,
          topic: item.question.topic,
          prompt: item.question.prompt,
          selectedIndex: item.answer.selectedIndex ?? null,
          correctIndex: item.question.correctIndex ?? null,
          isCorrect: Boolean(item.answer.isCorrect),
        }));

      const openFeedback = answerList
        .filter((item) => item.question.type === 'open')
        .map((item) => ({
          id: item.question.id,
          topic: item.question.topic,
          prompt: item.question.prompt,
          answer: item.answer.text ?? '',
          feedback: item.answer.feedback ?? '',
          score: item.answer.score ?? 0,
        }));

      const conversationFeedback = {
        prompt: questions.find((q) => q.id === 'q3')?.prompt ?? '',
        answer: answers['q3']?.text ?? '',
      };

      const { error: insertError } = await supabase.from('checkin_results').insert({
        user_id: user.id,
        vertical_id: currentSaathiId,
        initiated_by: 'student',
        result_score: Number((avgScore * 100).toFixed(2)),
        result_level: resultLevel,
        mcq_payload: mcqPayload,
        open_answer_feedback: openFeedback,
        conversation_feedback: conversationFeedback,
      });

      if (insertError) {
        Sentry.captureException(insertError, { tags: { action: 'checkin_results_insert' } });
      } else {
        // Analytics: fire checkin_completed only on successful insert.
        // flame_stage isn't in useSoul's select list — fetch inline so we can
        // attach it as a property without widening the hook.
        const { data: flameRow } = await supabase
          .from('student_soul')
          .select('flame_stage')
          .eq('user_id', user.id)
          .eq('vertical_id', currentSaathiId)
          .maybeSingle();
        trackCheckinCompleted(currentSaathiId, {
          checkin_score: Math.round(avgScore * 100),
          flame_stage: (flameRow?.flame_stage as string | undefined) ?? undefined,
        });
      }

      const mergedStruggles = Array.from(
        new Set([
          ...(soul.struggleTopics ?? []).filter((topic) => !topicsCleared.includes(topic)),
          ...topicsRevisit,
        ])
      ).slice(0, 10);

      const { error: soulError } = await supabase
        .from('student_soul')
        .update({ struggle_topics: mergedStruggles })
        .eq('user_id', user.id)
        .eq('vertical_id', currentSaathiId);

      if (soulError) {
        Sentry.captureException(soulError, { tags: { action: 'checkin_update_struggle_topics' } });
      }

      router.replace({
        pathname: '/(tabs)/checkin/result',
        params: {
          level: resultLevel,
          cleared: JSON.stringify(topicsCleared),
          revisit: JSON.stringify(topicsRevisit),
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'checkin_complete' } });
    } finally {
      setSaving(false);
    }
  };

  if (!saathi || !soul) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <View className="flex-1 bg-cream px-4 pt-6">
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: saathi.primary }}>
        Saathi Check-in
      </Text>

      <View className="flex-row mt-4 mb-5">
        {questions.map((question, dotIndex) => {
          const done = dotIndex < index;
          const active = dotIndex === index;
          const color = done ? '#C9993A' : active ? '#F59E0B' : '#D1D5DB';
          return (
            <View
              key={question.id}
              className="h-2 rounded-full mr-2"
              style={{ width: 42, backgroundColor: color }}
            />
          );
        })}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A18' }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: '#0B1F3A80' }}>{current.topic}</Text>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 17, color: '#0B1F3A', marginTop: 6 }}>
            {current.prompt}
          </Text>
        </View>

        {current.type === 'mcq' && current.options ? (
          <View>
            {current.options.map((option, optionIndex) => {
              const selected = currentAnswer.selectedIndex === optionIndex;
              const isCorrect = optionIndex === current.correctIndex;
              const showFeedback = typeof currentAnswer.selectedIndex === 'number';

              let background = '#FFFFFF';
              let border = '#0B1F3A20';
              let textColor = '#0B1F3A';
              if (showFeedback && selected && currentAnswer.isCorrect) {
                background = '#DCFCE7';
                border = '#16A34A';
                textColor = '#166534';
              } else if (showFeedback && selected && !currentAnswer.isCorrect) {
                background = '#FEE2E2';
                border = '#DC2626';
                textColor = '#991B1B';
              } else if (showFeedback && !selected && !currentAnswer.isCorrect && isCorrect) {
                background = '#ECFDF5';
                border = '#22C55E';
                textColor = '#166534';
              }

              return (
                <Pressable
                  key={option}
                  onPress={() => onSelectMcq(optionIndex)}
                  className="rounded-xl px-4 py-3 mb-2"
                  style={{ backgroundColor: background, borderWidth: 1, borderColor: border }}
                >
                  <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: textColor }}>
                     {option}
                   </Text>
                 </Pressable>
              );
            })}

            {typeof currentAnswer.selectedIndex === 'number' && !currentAnswer.isCorrect ? (
              <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#991B1B', marginTop: 2 }}>
                Strong attempt. The highlighted option is the better fit.
              </Text>
            ) : null}
          </View>
        ) : null}

        {(current.type === 'open' || current.type === 'conversation') ? (
          <View>
            <TextInput
              value={input}
              onChangeText={setInput}
              multiline
              placeholder="Share your response"
              placeholderTextColor="#0B1F3A55"
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#0B1F3A20',
                fontFamily: 'DMSans-Regular',
                fontSize: 14,
                color: '#0B1F3A',
                minHeight: 120,
                textAlignVertical: 'top',
              }}
            />

            {current.type === 'open' && evaluating ? (
              <View className="flex-row items-center mt-3">
                <ActivityIndicator size="small" color="#C9993A" />
                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A80', marginLeft: 8 }}>
                  Evaluating...
                </Text>
              </View>
            ) : null}

            {current.type === 'open' && currentAnswer.feedback ? (
              <View className="mt-3 rounded-xl px-3 py-3" style={{ backgroundColor: '#FFFBEB' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#C9993A' }}>Saathi feedback</Text>
                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#0B1F3A', marginTop: 4 }}>
                  {currentAnswer.feedback}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={onNext}
        disabled={evaluating || saving}
        className="rounded-2xl items-center justify-center py-3 mb-4"
        style={{ backgroundColor: evaluating || saving ? '#E5E7EB' : '#C9993A' }}
      >
        {saving ? (
          <ActivityIndicator color="#0B1F3A" />
        ) : (
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#0B1F3A' }}>
            {current.type === 'open' && !currentAnswer.feedback ? 'Evaluate response' : 'Next'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
