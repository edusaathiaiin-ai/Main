/**
 * lib/ai.ts
 *
 * Client-side helper to call the Supabase chat Edge Function.
 * Handles streaming SSE and returns an async generator of text deltas.
 *
 * Usage:
 *   for await (const delta of streamChat({ saathiId, botSlot, message, history, token })) {
 *     buffer += delta;
 *   }
 */

import type { ChatMessage } from '@/types';

export type StreamChatParams = {
  saathiId: string;
  botSlot: number;
  message: string;
  history: Pick<ChatMessage, 'role' | 'content'>[];
  /** Supabase session access_token from supabase.auth.getSession() */
  accessToken: string;
};

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`;

export async function* streamChat(
  params: StreamChatParams
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      saathiId: params.saathiId,
      botSlot: params.botSlot,
      message: params.message,
      history: params.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    // Gateway errors use `message`; function code errors use `error`
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; message?: string };
    // Distinguish forced-logout (kicked off by another device) from generic errors
    if (res.status === 401 && err.error === 'session_expired') {
      const sessionErr = new Error('session_expired') as Error & { code: string };
      sessionErr.code = 'FORCED_LOGOUT';
      throw sessionErr;
    }
    throw new Error(err.error ?? err.message ?? `Chat API error ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body from chat API');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data) as { delta?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.delta) yield parsed.delta;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/** One-shot (non-streaming) version for simpler use cases */
export async function sendChat(params: StreamChatParams): Promise<string> {
  let full = '';
  for await (const delta of streamChat(params)) {
    full += delta;
  }
  return full;
}
