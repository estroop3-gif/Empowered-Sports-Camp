'use client'

/**
 * Assignment Requests Card Component
 *
 * Displays pending staff assignment requests for the current user.
 * Used in coach and director dashboards to show incoming requests.
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { PortalCard } from '@/components/portal'
import {
  Loader2,
  Check,
  X,
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  Inbox,
} from 'lucide-react'

interface AssignmentRequest {
  id: string
  camp_id: string
  camp_name: string
  camp_start_date: string
  camp_end_date: string
  requested_by_user_name: string
  role: string
  status: string
  requested_at: string
  is_lead: boolean
  call_time: string | null
  end_time: string | null
  station_name: string | null
  notes: string | null
}

interface AssignmentRequestsCardProps {
  className?: string
}

export function AssignmentRequestsCard({ className }: AssignmentRequestsCardProps) {
  const [requests, setRequests] = useState<AssignmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/assignment-requests?status=pending')
      const json = await res.json()
      if (res.ok) {
        setRequests(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load assignment requests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleRespond = async (requestId: string, response: 'accepted' | 'declined') => {
    setRespondingId(requestId)
    try {
      const res = await fetch(`/api/staff/assignment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    } catch (err) {
      console.error('Failed to respond to request:', err)
    } finally {
      setRespondingId(null)
    }
  }

  // Don't show the card if there are no requests and not loading
  if (!loading && requests.length === 0) {
    return null
  }

  return (
    <PortalCard
      title="Assignment Requests"
      accent="purple"
      className={className}
      headerActions={
        requests.length > 0 ? (
          <span className="px-2 py-0.5 text-xs bg-purple text-white font-bold">
            {requests.length} pending
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-purple animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">No pending assignment requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 bg-white/5 border border-white/10"
            >
              {/* Camp Name and Role */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{request.camp_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs bg-purple/20 text-purple font-bold uppercase">
                      {request.role}
                    </span>
                    {request.is_lead && (
                      <span className="px-2 py-0.5 text-xs bg-neon/20 text-neon font-bold uppercase">
                        Lead
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {new Date(request.camp_start_date).toLocaleDateString()} - {new Date(request.camp_end_date).toLocaleDateString()}
                  </span>
                </div>
                {(request.call_time || request.end_time) && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {request.call_time || '—'} - {request.end_time || '—'}
                    </span>
                  </div>
                )}
                {request.station_name && (
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{request.station_name}</span>
                  </div>
                )}
              </div>

              {/* From */}
              <div className="text-sm text-white/40 mb-4">
                Requested by <span className="text-white/60">{request.requested_by_user_name}</span>
                {' · '}
                {new Date(request.requested_at).toLocaleDateString()}
              </div>

              {/* Notes */}
              {request.notes && (
                <div className="text-sm text-white/60 p-2 bg-white/5 mb-4">
                  {request.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRespond(request.id, 'accepted')}
                  disabled={respondingId === request.id}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 font-bold uppercase tracking-wider transition-colors',
                    respondingId !== request.id
                      ? 'bg-neon text-black hover:bg-neon/90'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {respondingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Accept
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRespond(request.id, 'declined')}
                  disabled={respondingId === request.id}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 font-bold uppercase tracking-wider transition-colors border',
                    respondingId !== request.id
                      ? 'border-white/20 text-white/70 hover:bg-white/5'
                      : 'border-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {respondingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Decline
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalCard>
  )
}
