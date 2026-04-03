'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';

type CareerActionsProps = {
  postingId: string;
  postingType: 'institution' | 'research';
  currentStatus: string;
};

export function CareerActions({ postingId, postingType, currentStatus }: CareerActionsProps) {
  const [busy, setBusy] = useState(false);

  async function updateStatus(status: string) {
    setBusy(true);
    const sb = getBrowserClient();
    await sb.from('internship_postings').update({ status }).eq('id', postingId);
    setBusy(false);
    window.location.reload();
  }

  async function featurePosting() {
    setBusy(true);
    const sb = getBrowserClient();
    await sb.from('internship_postings').update({ listing_plan: 'featured' }).eq('id', postingId);
    setBusy(false);
    window.location.reload();
  }

  const isOpen = currentStatus === 'open';
  const isPaused = currentStatus === 'paused';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isOpen && postingType === 'institution' && (
        <button onClick={featurePosting} disabled={busy}
          className="text-[10px] px-2 py-1 rounded-lg font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-50">
          ★ Feature
        </button>
      )}
      {isOpen && (
        <button onClick={() => updateStatus('paused')} disabled={busy}
          className="text-[10px] px-2 py-1 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50">
          ⏸ Pause
        </button>
      )}
      {isPaused && (
        <button onClick={() => updateStatus('open')} disabled={busy}
          className="text-[10px] px-2 py-1 rounded-lg font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
          ▶ Reopen
        </button>
      )}
      {currentStatus !== 'removed' && (
        <button onClick={() => updateStatus('removed')} disabled={busy}
          className="text-[10px] px-2 py-1 rounded-lg font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50">
          ✕ Remove
        </button>
      )}
    </div>
  );
}
