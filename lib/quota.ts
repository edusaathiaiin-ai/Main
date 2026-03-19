import * as SecureStore from 'expo-secure-store';

type QuotaRecord = {
  date: string;
  used: number;
  coolingUntil: number | null;
};

type QuotaStore = Record<string, QuotaRecord>;

type QuotaKeyParams = {
  userId: string;
  saathiId: string;
  botSlot: 1 | 2 | 3 | 4 | 5;
};

export type QuotaState = {
  limit: number;
  used: number;
  remaining: number;
  coolingUntil: Date | null;
  isCooling: boolean;
};

export const DAILY_CHAT_LIMIT = 20;
export const COOLING_HOURS = 48;
export const COOLING_MS = COOLING_HOURS * 60 * 60 * 1000;

const STORE_KEY = 'edusaathiai.quota.v1';
let memoryStore: QuotaStore = {};

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildQuotaKey(params: QuotaKeyParams): string {
  return [params.userId, params.saathiId, String(params.botSlot)].join(':');
}

async function readStore(): Promise<QuotaStore> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return memoryStore;
    const parsed = JSON.parse(raw) as QuotaStore;
    memoryStore = parsed;
    return parsed;
  } catch {
    return memoryStore;
  }
}

async function writeStore(next: QuotaStore): Promise<void> {
  memoryStore = next;
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next));
  } catch {
    // Ignore persistence errors; in-memory fallback still works for the session.
  }
}

function normalizeRecord(record: QuotaRecord | undefined): QuotaRecord {
  const today = getTodayIsoDate();
  const now = Date.now();

  const coolingUntil =
    record?.coolingUntil && record.coolingUntil > now ? record.coolingUntil : null;

  if (!record || record.date !== today) {
    return { date: today, used: 0, coolingUntil };
  }

  if (record.coolingUntil && record.coolingUntil <= now) {
    return { ...record, coolingUntil: null };
  }

  return record;
}

function toQuotaState(record: QuotaRecord): QuotaState {
  const used = Math.min(record.used, DAILY_CHAT_LIMIT);
  const remaining = Math.max(0, DAILY_CHAT_LIMIT - used);
  const coolingUntil = record.coolingUntil ? new Date(record.coolingUntil) : null;
  const isCooling = Boolean(coolingUntil && coolingUntil.getTime() > Date.now());

  return {
    limit: DAILY_CHAT_LIMIT,
    used,
    remaining,
    coolingUntil,
    isCooling,
  };
}

export async function getQuotaState(params: QuotaKeyParams): Promise<QuotaState> {
  const store = await readStore();
  const key = buildQuotaKey(params);
  const record = normalizeRecord(store[key]);

  if (store[key] !== record) {
    await writeStore({ ...store, [key]: record });
  }

  return toQuotaState(record);
}

export async function consumeQuota(params: QuotaKeyParams): Promise<QuotaState> {
  const store = await readStore();
  const key = buildQuotaKey(params);
  const current = normalizeRecord(store[key]);

  if (current.used >= DAILY_CHAT_LIMIT) {
    const capped = { ...current, used: DAILY_CHAT_LIMIT };
    await writeStore({ ...store, [key]: capped });
    return toQuotaState(capped);
  }

  const nextUsed = current.used + 1;
  const hitLimit = nextUsed >= DAILY_CHAT_LIMIT;

  const next: QuotaRecord = {
    date: current.date,
    used: nextUsed,
    coolingUntil: hitLimit ? Date.now() + COOLING_MS : current.coolingUntil,
  };

  await writeStore({ ...store, [key]: next });
  return toQuotaState(next);
}
