import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { CoolingBanner } from '@/components/chat/CoolingBanner';
import { useAuth } from '@/hooks/useAuth';
import { useQuota } from '@/hooks/useQuota';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';
import { supabase } from '@/lib/supabase';

type NewsRow = {
  id: string;
  source: string;
  category: string | null;
  title: string;
  url: string;
  fetched_at: string;
};

type ExamRow = {
  id: string;
  exam_name: string;
  exam_date: string;
  source_url: string | null;
};

type FeedTab = 'all' | 'news' | 'research' | 'exams';

type NewsCardItem =
  | {
      kind: 'rss' | 'research' | 'announcement';
      id: string;
      source: string;
      title: string;
      topic: string;
      url: string;
      fetchedAt: string;
      highlightResearch: boolean;
    }
  | {
      kind: 'exam';
      id: string;
      examName: string;
      examDate: string;
      daysAway: number;
      sourceUrl: string | null;
    };

function toRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hrs ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} days ago`;
}

function classifyNewsKind(category: string | null): 'rss' | 'research' | 'announcement' {
  const c = (category ?? '').toLowerCase();
  if (c.includes('research') || c.includes('paper') || c.includes('journal')) {
    return 'research';
  }
  if (c.includes('announcement') || c.includes('platform') || c.includes('update')) {
    return 'announcement';
  }
  return 'rss';
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const examTime = new Date(dateStr).getTime();
  return Math.max(0, Math.ceil((examTime - startOfToday) / (1000 * 60 * 60 * 24)));
}

type NewsTabsProps = {
  selectedTab: FeedTab;
  setSelectedTab: (tab: FeedTab) => void;
  saathiPrimary: string;
  saathiBg: string;
};

function NewsTabs({ selectedTab, setSelectedTab, saathiPrimary, saathiBg }: NewsTabsProps) {
  const tabs: Array<{ id: FeedTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'news', label: 'News' },
    { id: 'research', label: 'Research' },
    { id: 'exams', label: 'Exams' },
  ];

  return (
    <View className="flex-row mb-3">
      {tabs.map((tab) => {
        const active = selectedTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => setSelectedTab(tab.id)}
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
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type NewsCardProps = {
  item: NewsCardItem;
  saathiPrimary: string;
  saathiBg: string;
};

function NewsCard({ item, saathiPrimary, saathiBg }: NewsCardProps) {
  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'open_news_url' } });
    }
  };

  if (item.kind === 'exam') {
    return (
      <View
        className="rounded-2xl px-4 py-4 mb-3"
        style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B44' }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: '#92400E' }}>
          {item.examName}
        </Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#92400E', marginTop: 4 }}>
          {item.examDate} • {item.daysAway} {item.daysAway === 1 ? 'day' : 'days'} away
        </Text>
        {item.sourceUrl ? (
          <Pressable className="self-start mt-3" onPress={() => openUrl(item.sourceUrl ?? '')}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#B45309' }}>
              View source
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (item.kind === 'announcement') {
    return (
      <View
        className="rounded-2xl px-4 py-4 mb-3 bg-white"
        style={{ borderLeftWidth: 4, borderLeftColor: '#0B1F3A', borderWidth: 1, borderColor: '#0B1F3A14' }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#0B1F3A' }}>{item.title}</Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A99', marginTop: 6 }}>
          {item.source}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => openUrl(item.url)}
      className="rounded-2xl px-4 py-4 mb-3 bg-white"
      style={{ borderWidth: 1, borderColor: '#0B1F3A14' }}
    >
      <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: '#0B1F3A80' }}>
        {item.source.toUpperCase()}
      </Text>
      <Text
        numberOfLines={2}
        style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: '#0B1F3A', marginTop: 6 }}
      >
        {item.title}
      </Text>

      <View className="flex-row flex-wrap items-center mt-3">
        <View className="rounded-full px-2 py-1 mr-2" style={{ backgroundColor: saathiBg }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: saathiPrimary }}>
            {item.topic}
          </Text>
        </View>

        {item.kind === 'research' ? (
          <View className="rounded-full px-2 py-1 mr-2" style={{ backgroundColor: '#DCFCE7' }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: '#166534' }}>
              Research Paper
            </Text>
          </View>
        ) : null}

        {item.highlightResearch ? (
          <View
            className="rounded-full px-2 py-1"
            style={{ backgroundColor: item.kind === 'research' ? '#DCFCE7' : '#F5E8FE' }}
          >
            <Text
              style={{
                fontFamily: 'DMSans-Bold',
                fontSize: 11,
                color: item.kind === 'research' ? '#166534' : '#5B21B6',
              }}
            >
              Your Research Area ✦
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A80', marginTop: 8 }}>
        {toRelativeTime(item.fetchedAt)}
      </Text>
    </Pressable>
  );
}

export default function NewsScreen() {
  const { user, profile } = useAuth();
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);
  const [selectedTab, setSelectedTab] = useState<FeedTab>('all');
  const [newsRows, setNewsRows] = useState<NewsRow[]>([]);
  const [examRows, setExamRows] = useState<ExamRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const saathi = currentSaathiId ? SAATHIS.find((s) => s.id === currentSaathiId) : null;

  const {
    isCooling,
    coolingUntil,
    refresh: refreshQuota,
  } = useQuota({
    userId: user?.id ?? null,
    saathiId: currentSaathiId,
    botSlot: 1,
  });

  const loadData = useCallback(async () => {
    if (!currentSaathiId) {
      setNewsRows([]);
      setExamRows([]);
      return;
    }

    setRefreshing(true);

    try {
      const today = new Date().toISOString().slice(0, 10);

      const [newsRes, examRes] = await Promise.all([
        supabase
          .from('news_items')
          .select('id, source, category, title, url, fetched_at')
          .eq('vertical_id', currentSaathiId)
          .eq('is_active', true)
          .order('fetched_at', { ascending: false }),
        supabase
          .from('exam_calendar')
          .select('id, exam_name, exam_date, source_url')
          .eq('vertical_id', currentSaathiId)
          .eq('is_active', true)
          .gte('exam_date', today)
          .order('exam_date', { ascending: true }),
      ]);

      if (newsRes.error) {
        Sentry.captureException(newsRes.error, { tags: { action: 'news_fetch' } });
      }
      if (examRes.error) {
        Sentry.captureException(examRes.error, { tags: { action: 'exam_fetch' } });
      }

      setNewsRows((newsRes.data ?? []) as NewsRow[]);
      setExamRows((examRes.data ?? []) as ExamRow[]);
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'news_load_data' } });
      setNewsRows([]);
      setExamRows([]);
    } finally {
      setRefreshing(false);
      void refreshQuota();
    }
  }, [currentSaathiId, refreshQuota]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const researchArea = (soul?.futureResearchArea ?? '').toLowerCase().trim();

  const feedItems = useMemo(() => {
    const newsCards: NewsCardItem[] = newsRows.map((row) => {
      const kind = classifyNewsKind(row.category);
      const topic = row.category?.trim() || 'General';
      const text = `${row.title} ${topic}`.toLowerCase();
      const highlightResearch = Boolean(researchArea) && text.includes(researchArea);

      return {
        kind,
        id: row.id,
        source: row.source,
        title: row.title,
        topic,
        url: row.url,
        fetchedAt: row.fetched_at,
        highlightResearch,
      };
    });

    const examCards: NewsCardItem[] = examRows.map((row) => ({
      kind: 'exam',
      id: row.id,
      examName: row.exam_name,
      examDate: row.exam_date,
      daysAway: daysUntil(row.exam_date),
      sourceUrl: row.source_url,
    }));

    if (selectedTab === 'news') {
      return newsCards.filter((card) => card.kind === 'rss' || card.kind === 'announcement');
    }
    if (selectedTab === 'research') {
      return newsCards.filter((card) => card.kind === 'research');
    }
    if (selectedTab === 'exams') {
      return examCards;
    }

    return [...newsCards, ...examCards].sort((a, b) => {
      if (a.kind === 'exam' && b.kind !== 'exam') return 1;
      if (a.kind !== 'exam' && b.kind === 'exam') return -1;
      if (a.kind === 'exam' && b.kind === 'exam') {
        return a.daysAway - b.daysAway;
      }
      const aTime = 'fetchedAt' in a ? new Date((a as { fetchedAt: string }).fetchedAt).getTime() : 0;
      const bTime = 'fetchedAt' in b ? new Date((b as { fetchedAt: string }).fetchedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [examRows, newsRows, researchArea, selectedTab]);

  if (!currentSaathiId || !saathi || !profile) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <View className="flex-1 bg-cream px-4 pt-4">
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: '#0B1F3A' }}>
        Today's News
      </Text>
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#0B1F3A80', marginTop: 4, marginBottom: 8 }}>
        Curated for {saathi.name}
      </Text>

      {isCooling && coolingUntil ? (
        <CoolingBanner coolingUntil={coolingUntil} saathiName={saathi.name} />
      ) : null}

      <NewsTabs
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        saathiPrimary={saathi.primary}
        saathiBg={saathi.bg}
      />

      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={({ item }) => (
          <NewsCard item={item} saathiPrimary={saathi.primary} saathiBg={saathi.bg} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#C9993A" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: feedItems.length === 0 ? 1 : 0 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📰</Text>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: '#0B1F3A80', textAlign: 'center' }}>
              Today's news is being gathered. Check back soon.
            </Text>
          </View>
        }
      />
    </View>
  );
}
