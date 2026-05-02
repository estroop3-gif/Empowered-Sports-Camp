'use client'

/**
 * T-Shirt Size Confirmation Emails
 *
 * Select a camp and send branded confirmation emails to parents
 * showing the apparel sizes on file for their campers.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Mail,
  History,
  FileText,
  Radio,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Shirt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SECTION_TABS = [
  { value: 'logs', label: 'Email Logs', href: '/admin/email', icon: History },
  { value: 'templates', label: 'Templates', href: '/admin/email/templates', icon: FileText },
  { value: 'broadcasts', label: 'Camp Broadcasts', href: '/admin/email/broadcasts', icon: Radio },
  { value: 'tshirt-sizes', label: 'T-Shirt Sizes', href: '/admin/email/tshirt-sizes', icon: Mail },
]

interface CampOption {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  recipientCount: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-white/40 bg-white/5 border-white/10',
  published: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  registration_open: 'text-neon bg-neon/10 border-neon/30',
  registration_closed: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  in_progress: 'text-magenta bg-magenta/10 border-magenta/30',
  completed: 'text-purple bg-purple/10 border-purple/30',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function TshirtSizesPage() {
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const [camps, setCamps] = useState<CampOption[]>([])
  const [loadingCamps, setLoadingCamps] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { sent: number; failed: number; total: number }>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCamps = async () => {
      try {
        const res = await fetch('/api/admin/email/camps')
        const json = await res.json()
        if (json.data) setCamps(json.data)
      } catch {
        console.error('Failed to load camps')
      }
      setLoadingCamps(false)
    }
    loadCamps()
  }, [])

  async function handleSend(camp: CampOption) {
    if (!window.confirm(`Send t-shirt size confirmation emails to all parents with apparel add-ons for "${camp.name}"?`)) return

    setSending(camp.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/camps/${camp.id}/tshirt-email`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      setResults(prev => ({ ...prev, [camp.id]: data }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails')
    } finally {
      setSending(null)
    }
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Automated Email"
        description="Send t-shirt size confirmation emails to camp parents"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automated Email', href: '/admin/email' },
          { label: 'T-Shirt Sizes' },
        ]}
      />

      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-100 border border-white/10 p-1 w-fit">
        {SECTION_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.value === 'tshirt-sizes'
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors',
                isActive
                  ? 'bg-purple text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Info Banner */}
      <ContentCard className="mb-6">
        <div className="flex items-start gap-3">
          <Shirt className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80">
              Send a branded confirmation email to every parent who purchased an apparel add-on,
              showing the size(s) selected for each camper. Only registrations with size-collecting
              add-ons will receive an email.
            </p>
          </div>
        </div>
      </ContentCard>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Camp Grid */}
      {loadingCamps ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple" />
        </div>
      ) : camps.length === 0 ? (
        <ContentCard>
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No camps found</p>
          </div>
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {camps.map(camp => {
            const result = results[camp.id]
            const isSending = sending === camp.id
            return (
              <ContentCard key={camp.id}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider leading-tight">
                      {camp.name}
                    </h3>
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border whitespace-nowrap ml-2',
                      STATUS_COLORS[camp.status] || 'text-white/40 bg-white/5 border-white/10'
                    )}>
                      {formatStatus(camp.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(camp.startDate)} – {formatDate(camp.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {camp.recipientCount} registered
                    </span>
                  </div>

                  {result ? (
                    <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/10">
                      <CheckCircle className="h-4 w-4 text-neon flex-shrink-0" />
                      <span className="text-xs text-white/70">
                        Sent: <strong className="text-neon">{result.sent}</strong>
                        {result.failed > 0 && (
                          <>, Failed: <strong className="text-red-400">{result.failed}</strong></>
                        )}
                        {' '}of {result.total} parents
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="neon"
                      className="mt-auto w-full"
                      onClick={() => handleSend(camp)}
                      disabled={isSending || camp.recipientCount === 0}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Size Confirmations
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </ContentCard>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
