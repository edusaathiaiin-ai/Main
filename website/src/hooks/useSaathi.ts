'use client';

import { useMemo } from 'react';
import { SAATHIS } from '@/constants/saathis';
import { useAuthStore } from '@/stores/authStore';
import type { Saathi } from '@/types';

export function useSaathi(saathiId?: string): Saathi | null {
  return useMemo(
    () => SAATHIS.find((s) => s.id === saathiId) ?? null,
    [saathiId]
  );
}

export function usePrimarySaathi(): Saathi | null {
  const { profile } = useAuthStore();
  return useMemo(
    () => SAATHIS.find((s) => s.id === profile?.primary_saathi_id) ?? SAATHIS[0],
    [profile?.primary_saathi_id]
  );
}

export function useAllSaathis(): Saathi[] {
  return SAATHIS;
}
