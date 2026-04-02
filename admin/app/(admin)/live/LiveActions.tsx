'use client';

import { ActionModal } from '@/components/ui/ActionModal';
import { approveLiveSession, rejectLiveSession, cancelLiveSession } from './actions';

export function ApproveButton({ sessionId }: { sessionId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ✅ Approve
        </button>
      }
      title="Approve live session?"
      description="Session will be published and visible to students."
      confirmLabel="Approve & Publish"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await approveLiveSession(fd);
      }}
    />
  );
}

export function RejectLiveButton({ sessionId }: { sessionId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ❌ Reject
        </button>
      }
      title="Reject live session"
      danger
      confirmLabel="Reject Session"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await rejectLiveSession(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-red-400">*</span></label>
        <textarea
          name="reason"
          required
          rows={3}
          placeholder="Reason sent to faculty…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
        />
      </div>
    </ActionModal>
  );
}

export function CancelSessionButton({
  sessionId,
  studentCount,
  refundTotal,
}: {
  sessionId: string;
  studentCount: number;
  refundTotal: number;
}) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
          Cancel
        </button>
      }
      title="Cancel live session"
      description={`This will refund ${studentCount} student${studentCount !== 1 ? 's' : ''} (₹${(refundTotal / 100).toLocaleString('en-IN')} total). This cannot be undone.`}
      danger
      confirmLabel="Confirm Cancellation"
      action={async (fd) => {
        fd.set('session_id', sessionId);
        await cancelLiveSession(fd);
      }}
    >
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Cancellation reason <span className="text-red-400">*</span></label>
        <textarea
          name="reason"
          required
          rows={3}
          placeholder="Reason shared with attendees in refund email…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
        />
      </div>
    </ActionModal>
  );
}
