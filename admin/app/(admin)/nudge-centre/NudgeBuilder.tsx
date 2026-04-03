'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';

const SEGMENTS = [
  { id: 'all_students',           label: 'All students' },
  { id: 'all_faculty',            label: 'All faculty' },
  { id: 'free_plan',              label: 'Free plan users' },
  { id: 'paid_plan',              label: 'Paid users only' },
  { id: 'inactive_7d',            label: 'No session in 7 days' },
  { id: 'inactive_30d',           label: 'No session in 30 days' },
  { id: 'low_completeness',       label: 'Profile completeness < 50%' },
  { id: 'pending_verification',   label: 'Faculty pending verification' },
  { id: 'no_session_30d',         label: 'Students with 0 sessions (30d)' },
] as const;

type SegmentId = typeof SEGMENTS[number]['id'];

type Props = {
  templateId: string;
  templateTitle: string;
  estimatedReach: number;
  compact?: boolean;
};

export function NudgeBuilder({ templateId, templateTitle, estimatedReach, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState<SegmentId>('all_students');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState({ inapp: true, email: true, whatsapp: false });
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendNudge() {
    setSending(true);
    const sb = getBrowserClient();
    // Log the nudge send
    await sb.from('nudge_log').insert({
      template_id: templateId,
      segment,
      message: message.trim() || templateTitle,
      channels: JSON.stringify(channels),
      reach: estimatedReach,
      scheduled_at: scheduleNow ? new Date().toISOString() : scheduledAt,
    }).select().maybeSingle();
    setSending(false);
    setSent(true);
    setOpen(false);
    setConfirming(false);
    setTimeout(() => setSent(false), 3000);
  }

  if (compact) {
    return (
      <>
        {sent
          ? <span className="text-xs text-emerald-400">✓ Sent</span>
          : <button onClick={() => setOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors">
              Send →
            </button>
        }
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className="w-full max-w-md rounded-2xl p-6 bg-slate-900 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{templateTitle}</h3>
                <button onClick={() => setOpen(false)} className="text-slate-500 text-xl">×</button>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target segment</label>
                <select value={segment} onChange={(e) => setSegment(e.target.value as SegmentId)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white bg-slate-800 border border-slate-700 outline-none">
                  {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-500">Estimated reach: ~{estimatedReach} users</p>
              {!confirming
                ? <button onClick={() => setConfirming(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500">
                    Send Nudge →
                  </button>
                : <div className="space-y-2">
                    <p className="text-xs text-amber-400 text-center font-semibold">
                      This will notify ~{estimatedReach} users. Confirm?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-xl text-xs font-medium bg-slate-700 text-slate-300">Cancel</button>
                      <button onClick={sendNudge} disabled={sending} className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white disabled:opacity-50">
                        {sending ? 'Sending…' : 'Confirm Send'}
                      </button>
                    </div>
                  </div>
              }
            </div>
          </div>
        )}
      </>
    );
  }

  // Full custom builder
  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-white">Custom Nudge Builder</h2>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Target segment</label>
        <select value={segment} onChange={(e) => setSegment(e.target.value as SegmentId)}
          className="w-full rounded-xl px-4 py-3 text-sm text-white bg-slate-800 border border-slate-700 outline-none">
          {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Channels</label>
        <div className="flex gap-3">
          {[
            { key: 'inapp' as const, label: '📲 In-app' },
            { key: 'email' as const, label: '📧 Email' },
            { key: 'whatsapp' as const, label: '💬 WhatsApp' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setChannels((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                channels[key] ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {channels.whatsapp && (
          <p className="text-[10px] text-amber-400 mt-1">⚠️ Use WhatsApp sparingly — opt-out risk</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Message <span className="text-slate-600">(use {'{'}name{'}'} {'{'}saathi_name{'}'} etc.)</span>
        </label>
        <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Your {saathi_name} misses you. Come back and continue where you left off →"
          className="w-full rounded-xl px-4 py-3 text-sm text-white bg-slate-800 border border-slate-700 outline-none resize-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Schedule</label>
        <div className="flex gap-3">
          <button onClick={() => setScheduleNow(true)}
            className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${scheduleNow ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
            Send now
          </button>
          <button onClick={() => setScheduleNow(false)}
            className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${!scheduleNow ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
            Schedule
          </button>
        </div>
        {!scheduleNow && (
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-white bg-slate-800 border border-slate-700 outline-none" />
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 mb-1">Preview for: Arjun · KanoonSaathi</p>
        <p className="text-sm text-white">{message.replace('{name}', 'Arjun').replace('{saathi_name}', 'KanoonSaathi') || '(type a message above)'}</p>
      </div>

      <p className="text-xs text-slate-500">Estimated reach: <span className="text-white font-semibold">~{estimatedReach} users</span></p>

      {sent
        ? <div className="py-3 rounded-xl text-center text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">✓ Nudge sent!</div>
        : !confirming
          ? <button onClick={() => setConfirming(true)}
              className="w-full py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
              Send Nudge →
            </button>
          : <div className="space-y-2">
              <p className="text-sm text-amber-400 text-center font-semibold">
                This will notify ~{estimatedReach} users. Are you sure?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirming(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-slate-300">Cancel</button>
                <button onClick={sendNudge} disabled={sending} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white disabled:opacity-50">
                  {sending ? 'Sending…' : 'Confirm Send'}
                </button>
              </div>
            </div>
      }
    </div>
  );
}
