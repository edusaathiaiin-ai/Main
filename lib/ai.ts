import { BOTS } from '@/constants/bots';
import { supabase } from './supabase';

const STREAM_DELAY_MS = 28;

export type StreamParams = {
  botSlot: 1 | 2 | 3 | 4 | 5;
  saathiId: string;
  userMessage: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBotMeta(botSlot: 1 | 2 | 3 | 4 | 5): { name: string; provider: string } {
  const bot = BOTS.find((item) => item.slot === botSlot);
  if (!bot) {
    return { name: 'Saathi', provider: 'Groq' };
  }
  return { name: bot.name, provider: bot.apiProvider };
}

function buildLocalReply(params: StreamParams): string {
  const { name, provider } = getBotMeta(params.botSlot);

  return [
    `${name} here for ${params.saathiId}.`,
    `I understood your question: "${params.userMessage.trim()}".`,
    `I will break it down in simple steps, then connect it to your long-term goal.`,
    `This is a streaming preview mode while server-side AI routing is being wired through Edge Functions (${provider}).`,
    'Does this feel clearer?',
  ].join(' ');
}

/**
 * Step 7 streaming UI helper — local simulation.
 * No secrets used here. Used as a dev fallback; real calls go through sendChatMessage.
 */
export async function* streamLocalBotResponse(
  params: StreamParams
): AsyncGenerator<string, void, void> {
  if (process.env.APP_ENV === 'production') {
    throw new Error('streamLocalBotResponse must not be called in production');
  }

  const reply = buildLocalReply(params);
  const tokens = reply.split(' ');

  for (const token of tokens) {
    yield `${token} `;
    await wait(STREAM_DELAY_MS);
  }
}

// ---------------------------------------------------------------------------
// Real Edge Function streaming — all AI keys stay server-side
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type MessageParam = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatError =
  | { type: 'cooling'; coolingUntil: Date }
  | { type: 'quota'; remaining: 0 }
  | { type: 'error'; message: string };

/**
 * sendChatMessage
 *
 * Calls the Supabase Edge Function /functions/v1/chat and streams the response.
 * AI API keys and the system prompt are never sent to or from the client.
 */
export async function sendChatMessage(params: {
  saathiId: string;
  botSlot: number;
  message: string;
  history: MessageParam[];
  onChunk: (delta: string, fullText: string) => void;
  onComplete: (fullText: string) => void;
  onError: (err: ChatError) => void;
}): Promise<void> {
  const { saathiId, botSlot, message, history, onChunk, onComplete, onError } = params;
  const cappedHistory = history.slice(-10);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    onError({ type: 'error', message: 'Not authenticated' });
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ saathiId, botSlot, message, history: cappedHistory }),
    });
  } catch (err) {
    onError({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
    return;
  }

  if (response.status === 429) {
    type ErrBody = { error: string; coolingUntil?: string };
    try {
      const body = (await response.json()) as ErrBody;
      if (body.error === 'cooling' && body.coolingUntil) {
        onError({ type: 'cooling', coolingUntil: new Date(body.coolingUntil) });
      } else {
        onError({ type: 'quota', remaining: 0 });
      }
    } catch {
      onError({ type: 'quota', remaining: 0 });
    }
    return;
  }

  if (!response.ok) {
    onError({ type: 'error', message: `Server error (${response.status})` });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError({ type: 'error', message: 'No response stream' });
    return;
  }

  const decoder = new TextDecoder();
  let fullText = '';

  try {
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          onComplete(fullText);
          break outer;
        }

        try {
          type SseDelta = { delta?: string; error?: string };
          const parsed = JSON.parse(data) as SseDelta;
          if (parsed.error) {
            onError({ type: 'error', message: parsed.error });
            return;
          }
          if (parsed.delta) {
            fullText += parsed.delta;
            onChunk(parsed.delta, fullText);
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
    if (fullText) onComplete(fullText);
  } finally {
    reader.releaseLock();
  }
}
