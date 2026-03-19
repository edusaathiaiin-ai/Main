import { useCallback, useEffect, useMemo, useState } from 'react';

import { consumeQuota, getQuotaState, type QuotaState } from '@/lib/quota';

type UseQuotaParams = {
  userId: string | null;
  saathiId: string | null;
  botSlot: 1 | 2 | 3 | 4 | 5;
};

type UseQuotaResult = {
  limit: number;
  remaining: number;
  used: number;
  coolingUntil: Date | null;
  isCooling: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  consumeOne: () => Promise<QuotaState | null>;
};

const INITIAL_STATE: QuotaState = {
  limit: 20,
  used: 0,
  remaining: 20,
  coolingUntil: null,
  isCooling: false,
};

export function useQuota(params: UseQuotaParams): UseQuotaResult {
  const [state, setState] = useState<QuotaState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canQuery = useMemo(
    () => Boolean(params.userId && params.saathiId),
    [params.userId, params.saathiId]
  );

  const refresh = useCallback(async () => {
    if (!params.userId || !params.saathiId) {
      setState(INITIAL_STATE);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const next = await getQuotaState({
        userId: params.userId,
        saathiId: params.saathiId,
        botSlot: params.botSlot,
      });
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load quota state');
    } finally {
      setLoading(false);
    }
  }, [params.botSlot, params.saathiId, params.userId]);

  const consumeOne = useCallback(async (): Promise<QuotaState | null> => {
    if (!params.userId || !params.saathiId) return null;

    try {
      setError(null);
      const next = await consumeQuota({
        userId: params.userId,
        saathiId: params.saathiId,
        botSlot: params.botSlot,
      });
      setState(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update quota state');
      return null;
    }
  }, [params.botSlot, params.saathiId, params.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!canQuery || !state.coolingUntil || !state.isCooling) return;

    const id = setInterval(() => {
      setState((prev) => {
        if (!prev.coolingUntil) return prev;
        const stillCooling = prev.coolingUntil.getTime() > Date.now();
        if (!stillCooling) {
          return { ...prev, coolingUntil: null, isCooling: false };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [canQuery, state.coolingUntil, state.isCooling]);

  return {
    limit: state.limit,
    remaining: state.remaining,
    used: state.used,
    coolingUntil: state.coolingUntil,
    isCooling: state.isCooling,
    loading,
    error,
    refresh,
    consumeOne,
  };
}
