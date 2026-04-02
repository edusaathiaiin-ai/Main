'use client';

import { ActionModal } from '@/components/ui/ActionModal';
import { releaseToFaculty, refundStudent, addSessionNote } from './actions';

export function ReleaseButton({ sessionId }: { sessionId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Release to Faculty
        </button>
      }
      title="Release payment to faculty?"
      description="Confirms session happened — faculty payout will be released."
      confirmLabel="Release Payment"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await releaseToFaculty(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Admin note (optional)</label>
        <input
          name="note"
          placeholder="e.g. Both parties confirmed session occurred"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </ActionModal>
  );
}

export function RefundButton({ sessionId }: { sessionId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Refund Student
        </button>
      }
      title="Refund student?"
      description="Confirms session did not happen — student will be refunded."
      danger
      confirmLabel="Issue Refund"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await refundStudent(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Reason</label>
        <input
          name="note"
          placeholder="e.g. Faculty failed to show up"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
        />
      </div>
    </ActionModal>
  );
}

export function NoteButton({ sessionId }: { sessionId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-slate-400 hover:text-white font-medium transition-colors">
          + Note
        </button>
      }
      title="Add admin note"
      confirmLabel="Save Note"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await addSessionNote(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Note <span className="text-red-400">*</span></label>
        <textarea
          name="note"
          required
          rows={3}
          placeholder="Internal note — not visible to users"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>
    </ActionModal>
  );
}
