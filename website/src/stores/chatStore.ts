'use client';

import { create } from 'zustand';
import type { ChatMessage } from '@/types';

type ChatState = {
  activeSaathiId: string | null;
  activeBotSlot: 1 | 2 | 3 | 4 | 5;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  setActiveSaathi: (saathiId: string) => void;
  setActiveBotSlot: (slot: 1 | 2 | 3 | 4 | 5) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  commitStreamedMessage: (id: string) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeSaathiId: null,
  activeBotSlot: 1,
  messages: [],
  isStreaming: false,
  streamingText: '',

  // Saathi is locked to primary_saathi_id — only set once during init.
  // Backend rejects requests for non-primary Saathi (403 saathi_locked).
  setActiveSaathi: (saathiId) => set((s) => {
    if (s.activeSaathiId && s.activeSaathiId !== saathiId) return s; // prevent switching
    return { activeSaathiId: saathiId };
  }),
  setActiveBotSlot: (slot) => set({ activeBotSlot: slot }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setStreaming: (streaming) => set({ isStreaming: streaming, streamingText: streaming ? '' : '' }),
  appendStreamChunk: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
  commitStreamedMessage: (id) =>
    set((s) => ({
      isStreaming: false,
      messages: [
        ...s.messages,
        {
          id,
          role: 'assistant',
          content: s.streamingText,
          createdAt: new Date().toISOString(),
        },
      ],
      streamingText: '',
    })),
  clearMessages: () => set({ messages: [], streamingText: '', isStreaming: false }),
}));
