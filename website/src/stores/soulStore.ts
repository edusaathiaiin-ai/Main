'use client';

import { create } from 'zustand';
import type { SoulProfile } from '@/types';

type SoulState = {
  souls: Record<string, SoulProfile>; // keyed by saathiId
  getSoul: (saathiId: string) => SoulProfile | null;
  setSoul: (saathiId: string, soul: SoulProfile) => void;
  clearSouls: () => void;
};

export const useSoulStore = create<SoulState>((set, get) => ({
  souls: {},
  getSoul: (saathiId) => get().souls[saathiId] ?? null,
  setSoul: (saathiId, soul) =>
    set((s) => ({ souls: { ...s.souls, [saathiId]: soul } })),
  clearSouls: () => set({ souls: {} }),
}));
