'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { buildQuotaState, todayIST } from '@/lib/quota';
import { useAuthStore } from '@/stores/authStore';
import type { QuotaState } from '@/types';

export function useQuota(saathiId: string, botSlot: number) {
  const { profile } = useAuthStore();

  return useQuery<QuotaState>({
    queryKey: ['quota', profile?.id, saathiId, botSlot],
    enabled: !!profile?.id && !!saathiId,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('chat_sessions')
        .select('message_count, cooling_until')
        .eq('user_id', profile!.id)
        .eq('vertical_id', saathiId)
        .eq('bot_slot', botSlot)
        .eq('date_ist', todayIST())
        .maybeSingle();

      return buildQuotaState(
        data?.message_count ?? 0,
        data?.cooling_until ?? null,
        profile?.plan_id
      );
    },
  });
}
