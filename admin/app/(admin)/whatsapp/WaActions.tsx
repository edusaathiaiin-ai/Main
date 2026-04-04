'use client'

import { ActionModal } from '@/components/ui/ActionModal'
import { blockWaUser, sendBroadcast } from './actions'

export function BlockWaButton({ phone }: { phone: string }) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
          Block
        </button>
      }
      title={`Block ${phone}?`}
      description="This will stop this number from using WhatsApp Saathi."
      danger
      confirmLabel="Block Number"
      action={async (fd) => {
        fd.set('phone', phone)
        await blockWaUser(fd)
      }}
    />
  )
}

export function BroadcastForm({ userCount }: { userCount: number }) {
  return (
    <ActionModal
      trigger={
        <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors">
          Send Broadcast
        </button>
      }
      title="Send WhatsApp Broadcast"
      description={`Will be sent to up to ${userCount} active WhatsApp users.`}
      confirmLabel="Send Broadcast"
      action={sendBroadcast}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            Recipients
          </label>
          <select
            name="recipient"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">All WhatsApp users</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Message</label>
          <textarea
            name="message"
            required
            rows={4}
            maxLength={1000}
            placeholder="Type your broadcast message…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </div>
    </ActionModal>
  )
}
