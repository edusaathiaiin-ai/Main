import { useState } from 'react';
import { Platform, Pressable, Text, ToastAndroid, View } from 'react-native';

import { supabase } from '@/lib/supabase';

import type { ChatMessage } from '@/types';

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isFlagging, setIsFlagging] = useState(false);
  const [showFlagToast, setShowFlagToast] = useState(false);

  const handleFlagMessage = async () => {
    if (isUser || isFlagging) return;

    setIsFlagging(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.from('moderation_flags').insert({
        target_type: 'chat_message',
        target_id: message.id,
        reason: 'user_flagged',
        flagged_by: user.id,
      });

      if (error) return;

      if (Platform.OS === 'android') {
        ToastAndroid.show('Flagged for review', ToastAndroid.SHORT);
      } else {
        setShowFlagToast(true);
        setTimeout(() => setShowFlagToast(false), 1500);
      }
    } finally {
      setIsFlagging(false);
    }
  };

  return (
    <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={{
          backgroundColor: isUser ? '#0B1F3A' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 15,
            lineHeight: 22,
            color: isUser ? '#FAF7F2' : '#0B1F3A',
          }}
        >
          {message.content}
          {isStreaming && message.content.length > 0 ? (
            <Text style={{ color: '#C9993A' }}> ▋</Text>
          ) : null}
        </Text>

        {!isUser ? (
          <View className="items-end mt-2">
            <Pressable
              onPress={handleFlagMessage}
              disabled={isFlagging}
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: '#0B1F3A0F' }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 12 }}>{isFlagging ? '...' : '🚩'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {showFlagToast ? (
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#0B1F3A' }}>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 11, color: '#FAF7F2' }}>
            Flagged for review
          </Text>
        </View>
      ) : null}
    </View>
  );
}
