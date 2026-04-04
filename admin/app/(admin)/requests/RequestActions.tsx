'use client'

import { ActionModal } from '@/components/ui/ActionModal'
import { removeRequest } from './actions'

export function RemoveButton({
  requestId,
  subject,
}: {
  requestId: string
  subject: string
}) {
  return (
    <ActionModal
      trigger={
        <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
          🚩 Remove
        </button>
      }
      title="Remove request?"
      description={`"${subject.slice(0, 60)}${subject.length > 60 ? '…' : ''}" will be hidden from the platform.`}
      danger
      confirmLabel="Remove Request"
      action={async (fd) => {
        fd.set('request_id', requestId)
        await removeRequest(fd)
      }}
    />
  )
}
