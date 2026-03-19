import { Text, View } from 'react-native';

import type { ChatMessage } from '@/types';

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

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
      </View>
    </View>
  );
}
