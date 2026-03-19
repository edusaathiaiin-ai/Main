import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

export function useSaathi() {
  const { profile } = useAuth();
  const [currentSaathiId, setCurrentSaathiId] = useState<string | null>(
    profile?.primary_saathi_id ?? null
  );

  useEffect(() => {
    setCurrentSaathiId(profile?.primary_saathi_id ?? null);
  }, [profile?.primary_saathi_id]);

  return {
    currentSaathiId,
    setCurrentSaathiId,
  };
}
