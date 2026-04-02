'use client';

import { ActionModal } from '@/components/ui/ActionModal';
import { liftSuspension, escalateSuspension, banUser } from './actions';

export function LiftButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Lift
        </button>
      }
      title={`Lift suspension — ${name}`}
      confirmLabel="Confirm Lift"
      action={async (fd) => {
        fd.set('user_id', userId);
        await liftSuspension(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Admin note (optional)</label>
        <textarea
          name="note"
          rows={3}
          placeholder="Reason for lifting…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>
    </ActionModal>
  );
}

export function EscalateButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Escalate
        </button>
      }
      title={`Escalate suspension — ${name}`}
      confirmLabel="Confirm Escalation"
      action={async (fd) => {
        fd.set('user_id', userId);
        await escalateSuspension(fd);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Duration</label>
          <select
            name="duration_hours"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="72">3 days</option>
            <option value="168">7 days</option>
            <option value="720">30 days</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Required — state the violation…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </div>
    </ActionModal>
  );
}

export function BanButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
          Ban
        </button>
      }
      title={`Permanently ban — ${name}`}
      danger
      confirmLabel="Permanently Ban Account"
      action={async (fd) => {
        fd.set('user_id', userId);
        await banUser(fd);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Document the reason for permanent ban…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            Type <span className="font-mono text-red-400">CONFIRM</span> to proceed
          </label>
          <input
            name="confirm"
            required
            pattern="CONFIRM"
            placeholder="CONFIRM"
            className="w-full bg-slate-800 border border-red-500/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
          />
        </div>
      </div>
    </ActionModal>
  );
}
