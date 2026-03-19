import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';

import { SAATHIS } from '@/constants/saathis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Six preview saathis for slide 2
const PREVIEW_SAATHIS = SAATHIS.slice(0, 5).concat({
  id: 'more',
  name: '+15 more',
  emoji: '✨',
  tagline: '',
  primary: '#0B1F3A',
  accent: '#C9993A',
  bg: '#EEF0F8',
});

type Slide = {
  id: string;
  title: string;
  body?: string;
};

const SLIDES: Slide[] = [
  { id: 'what', title: 'What is EdUsaathiAI?' },
  { id: 'meet', title: 'Meet the Saathis' },
  { id: 'how', title: 'How it works' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  function handleSkip() {
    router.replace('/(auth)/login');
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  }

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    if (index === 0) return <Slide1 />;
    if (index === 1) return <Slide2 />;
    return <Slide3 />;
  }

  return (
    <View className="flex-1 bg-navy">
      {/* Skip button */}
      <Pressable
        onPress={handleSkip}
        className="absolute top-14 right-6 z-10 px-4 py-2"
        hitSlop={8}
      >
        <Text
          className="text-sm"
          style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F299' }}
        >
          Skip
        </Text>
      </Pressable>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />

      {/* Bottom: dots + next button */}
      <View className="flex-row items-center justify-between px-8 pb-14 pt-4">
        {/* Dot indicators */}
        <View className="flex-row gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                backgroundColor: i === activeIndex ? '#C9993A' : '#FAF7F240',
              }}
            />
          ))}
        </View>

        {/* Next / Begin button */}
        <Pressable
          onPress={handleNext}
          className="bg-gold rounded-xl px-6 py-3 active:opacity-80"
        >
          <Text
            className="text-navy text-sm"
            style={{ fontFamily: 'DMSans-Medium' }}
          >
            {activeIndex === SLIDES.length - 1 ? "Let's Begin →" : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Slide 1: What is EdUsaathiAI? ──────────────────────────────────────────

function Slide1() {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
      <Text className="text-7xl mb-8">🧠</Text>
      <Text
        className="text-3xl text-cream text-center"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        What is{'\n'}EdUsaathiAI?
      </Text>
      <Text
        className="text-base text-center mt-6 leading-7"
        style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F2CC' }}
      >
        An AI companion that knows your name, remembers your journey, and grows
        with you — built for India.
      </Text>
      <View
        className="mt-8 px-5 py-4 rounded-2xl"
        style={{ backgroundColor: '#FAF7F210' }}
      >
        <Text
          className="text-sm text-center leading-6"
          style={{ fontFamily: 'DMSans-Regular', color: '#C9993A' }}
        >
          ₹199/month · 8× cheaper than ChatGPT Plus{'\n'}Infinitely more personal.
        </Text>
      </View>
    </View>
  );
}

// ─── Slide 2: Meet the Saathis ───────────────────────────────────────────────

function Slide2() {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-0 pt-20">
      <Text
        className="text-3xl text-cream text-center px-8"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        Meet the Saathis
      </Text>
      <Text
        className="text-base text-center mt-3 px-8"
        style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F2AA' }}
      >
        20 subject-specific AI companions. One for every discipline.
      </Text>

      {/* Horizontal chip scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8, gap: 12 }}
      >
        {PREVIEW_SAATHIS.map(saathi => (
          <View
            key={saathi.id}
            className="items-center rounded-2xl px-4 py-4"
            style={{ backgroundColor: saathi.bg, minWidth: 90 }}
          >
            <Text className="text-3xl mb-2">{saathi.emoji}</Text>
            <Text
              className="text-xs text-center"
              style={{ fontFamily: 'DMSans-Medium', color: saathi.primary }}
              numberOfLines={2}
            >
              {saathi.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text
        className="text-sm text-center mt-4 px-8"
        style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F260' }}
      >
        You will choose your primary Saathi shortly.
      </Text>
    </View>
  );
}

// ─── Slide 3: How it works ───────────────────────────────────────────────────

const HOW_STEPS = [
  {
    icon: '📚',
    title: 'Learn',
    body: 'Chat with your Saathi any time, on any topic. It remembers your pace and goals.',
  },
  {
    icon: '🌱',
    title: 'Grow',
    body: 'Saathi Check-ins track your progress. Your companion notices when you improve.',
  },
  {
    icon: '🤝',
    title: 'Connect',
    body: 'Community Board, daily news, and peer Q&A keep you engaged beyond the chat.',
  },
];

function Slide3() {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-8">
      <Text
        className="text-3xl text-cream text-center"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        How it works
      </Text>
      <View className="mt-10 gap-6">
        {HOW_STEPS.map(step => (
          <View key={step.title} className="flex-row items-start gap-4">
            <View
              className="rounded-xl items-center justify-center"
              style={{ width: 52, height: 52, backgroundColor: '#FAF7F210' }}
            >
              <Text className="text-2xl">{step.icon}</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-base text-cream"
                style={{ fontFamily: 'DMSans-Medium' }}
              >
                {step.title}
              </Text>
              <Text
                className="text-sm mt-1 leading-5"
                style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F2AA' }}
              >
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
