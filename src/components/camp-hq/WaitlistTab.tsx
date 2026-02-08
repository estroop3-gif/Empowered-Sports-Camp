'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Send, Trash2, Loader2, RefreshCw, AlertTriangle, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PortalCard } from '@/components/portal'

interface WaitlistEntry {
  id: string
  position: number | null
  athleteName: string
  parentName: string
  parentEmail: string
  joinedAt: string
  offerStatus: 'waiting' | 'offer_sent' | 'offer_expired'
  offerExpiresAt: string | null
}

interface WaitlistTabProps {
  campId: string
}

export function WaitlistTab({ campId }: WaitlistTabProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadWaitlist = useCallback(async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/waitlist`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load waitlist')

      setEntries(json.data.entries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    loadWaitlist()
  }, [loadWaitlist])

  const handlePromote = async (registrationId: string) => {
    setActionLoading(registrationId)
    try {
      const res = await fetch(`/api/camps/${campId}/waitlist/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to send offer')
      }

      await loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (registrationId: string) => {
    if (!confirm('Remove this person from the waitlist? This cannot be undone.')) return

    setActionLoading(registrationId)
    try {
      const res = await fetch(`/api/camps/${campId}/waitlist/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to remove from waitlist')
      }

      await loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  const totalWaitlisted = entries.length
  const activeOffers = entries.filter(e => e.offerStatus === 'offer_sent').length
  const waiting = entries.filter(e => e.offerStatus === 'waiting').length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <PortalCard>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-white">{totalWaitlisted}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Total Waitlisted</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-neon">{activeOffers}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Active Offers</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-purple">{waiting}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Waiting</div>
          </div>
        </PortalCard>
      </div>

      {error && (
        <div className="bg-magenta/10 border border-magenta/30 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-sm text-magenta">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white text-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Waitlist Table */}
      <PortalCard>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-neon" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Waitlist Queue</h3>
          </div>
          <button
            onClick={loadWaitlist}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">No one on the waitlist yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">#</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">Camper</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">Parent</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">Joined</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-white/40 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-neon font-bold">{entry.position}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{entry.athleteName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-white/80 text-sm">{entry.parentName}</span>
                        <br />
                        <span className="text-white/40 text-xs">{entry.parentEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white/60 text-sm">
                        {new Date(entry.joinedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <OfferStatusBadge status={entry.offerStatus} expiresAt={entry.offerExpiresAt} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {entry.offerStatus === 'waiting' && (
                          <button
                            onClick={() => handlePromote(entry.id)}
                            disabled={actionLoading === entry.id}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                              'bg-neon/10 text-neon border border-neon/30 hover:bg-neon/20 transition-colors',
                              actionLoading === entry.id && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {actionLoading === entry.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Send Offer
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(entry.id)}
                          disabled={actionLoading === entry.id}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                            'bg-magenta/10 text-magenta border border-magenta/30 hover:bg-magenta/20 transition-colors',
                            actionLoading === entry.id && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PortalCard>
    </div>
  )
}

function OfferStatusBadge({ status, expiresAt }: { status: string; expiresAt: string | null }) {
  if (status === 'offer_sent' && expiresAt) {
    const expiresDate = new Date(expiresAt)
    const now = new Date()
    const hoursLeft = Math.max(0, Math.round((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60)))

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon">
        <Clock className="h-3 w-3" />
        Offer Sent ({hoursLeft}h left)
      </span>
    )
  }

  if (status === 'offer_expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-yellow-500/10 text-yellow-400">
        Offer Expired
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-white/5 text-white/50">
      Waiting
    </span>
  )
}
