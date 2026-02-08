'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { InviteFriendModal } from './InviteFriendModal'

interface InviteFriendButtonProps {
  campId: string
  campName: string
  tenantId: string
}

export function InviteFriendButton({ campId, campName, tenantId }: InviteFriendButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-3 text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-all"
      >
        <UserPlus className="h-4 w-4" />
        <span className="text-sm uppercase tracking-wider">Invite a Friend</span>
      </button>

      <InviteFriendModal
        campId={campId}
        campName={campName}
        tenantId={tenantId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
