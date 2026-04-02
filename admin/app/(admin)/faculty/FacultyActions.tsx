'use client';

import { ActionModal } from '@/components/ui/ActionModal';
import {
  verifyFaculty,
  rejectFaculty,
  markEmeritus,
  revokeFacultyVerification,
} from './actions';

export function VerifyButton({
  userId,
  name,
  institution,
}: {
  userId: string;
  name: string;
  institution: string;
}) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ✅ Verify
        </button>
      }
      title={`Verify ${name}`}
      confirmLabel="Confirm Verification"
      action={async (fd) => {
        fd.set('user_id', userId);
        await verifyFaculty(fd);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Confirm institution</label>
          <input
            name="institution"
            defaultValue={institution}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Admin note (optional)</label>
          <input
            name="note"
            placeholder="e.g. Verified via LinkedIn"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </ActionModal>
  );
}

export function RejectButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ❌ Reject
        </button>
      }
      title={`Reject ${name}`}
      danger
      confirmLabel="Reject Application"
      action={async (fd) => {
        fd.set('user_id', userId);
        await rejectFaculty(fd);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-red-400">*</span></label>
          <select
            name="reason"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          >
            <option value="">Select reason…</option>
            <option value="Cannot verify credentials">Cannot verify credentials</option>
            <option value="Institution not found">Institution not found</option>
            <option value="Incomplete information">Incomplete information</option>
            <option value="Policy violation">Policy violation</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Custom message (optional)</label>
          <textarea
            name="custom"
            rows={3}
            placeholder="Additional detail for the faculty member…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
      </div>
    </ActionModal>
  );
}

export function EmeritusButton({
  userId,
  name,
  institution,
}: {
  userId: string;
  name: string;
  institution: string;
}) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          🎓 Emeritus
        </button>
      }
      title={`Mark as Emeritus — ${name}`}
      confirmLabel="Confirm Emeritus Status"
      action={async (fd) => {
        fd.set('user_id', userId);
        await markEmeritus(fd);
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Retirement year</label>
          <input
            name="retirement_year"
            type="number"
            placeholder={String(new Date().getFullYear())}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Former institution</label>
          <input
            name="former_institution"
            defaultValue={institution}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </ActionModal>
  );
}

export function RevokeButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-slate-400 hover:text-red-400 font-medium transition-colors">
          Revoke
        </button>
      }
      title={`Revoke verification — ${name}?`}
      danger
      confirmLabel="Revoke Verification"
      action={async (fd) => {
        fd.set('user_id', userId);
        await revokeFacultyVerification(fd);
      }}
    />
  );
}
