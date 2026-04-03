'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';

type Props = {
  intentId: string;
  currentStatus: string;
  topic: string;
  verticalId: string;
  expired?: boolean;
};

export function IntentActions({ intentId, currentStatus, topic, verticalId, expired = false }: Props) {
  const [busy, setBusy] = useState(false);

  async function updateStatus(status: string) {
    setBusy(true);
    const sb = getBrowserClient();
    const updates: Record<string, unknown> = { status };
    if (status === 'open') {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      updates.expires_at = newExpiry.toISOString();
    }
    await sb.from('learning_intents').update(updates).eq('id', intentId);
    setBusy(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {expired ? (
        <>
          <button onClick={() => updateStatus('open')} disabled={busy}
            className="text-[10px] px-2 py-1 rounded-lg font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50">
            🔄 Reopen 30d
          </button>
          <button onClick={() => updateStatus('removed')} disabled={busy}
            className="text-[10px] px-2 py-1 rounded-lg font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50">
            Archive
          </button>
        </>
      ) : (
        <>
          {currentStatus === 'open' && (
            <button onClick={() => updateStatus('removed')} disabled={busy}
              className="text-[10px] px-2 py-1 rounded-lg font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50">
              🚩 Remove
            </button>
          )}
          <a href={`/faculty?search=${encodeURIComponent(verticalId)}`}
            className="text-[10px] px-2 py-1 rounded-lg font-medium bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25">
            Find faculty →
          </a>
        </>
      )}
    </div>
  );
}
