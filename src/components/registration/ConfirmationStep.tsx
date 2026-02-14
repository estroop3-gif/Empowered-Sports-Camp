'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Calendar, MapPin, Mail, Download, UserPlus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/checkout/context'
import { parseDateSafe, formatTime12h } from '@/lib/utils'
import type { CampSession } from '@/types/registration'
import { InviteFriendModal } from '@/components/camps/InviteFriendModal'

/**
 * ConfirmationStep
 *
 * DESIGN NOTES:
 * - Celebratory success state
 * - Confirmation number prominently displayed
 * - Payment breakdown with totals
 * - Quick actions (add to calendar, download receipt, share)
 */

interface ConfirmationStepProps {
  campSession: CampSession | null
  confirmationNumber: string
}

function formatDate(dateString: string): string {
  return parseDateSafe(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTime = formatTime12h

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ConfirmationStep({ campSession, confirmationNumber }: ConfirmationStepProps) {
  const { state, totals } = useCheckout()
  const [inviteOpen, setInviteOpen] = useState(false)

  const handleAddToCalendar = () => {
    if (!campSession) return

    const startDate = new Date(campSession.startDate)
    const endDate = new Date(campSession.endDate)

    // Create Google Calendar URL
    const gcalUrl = new URL('https://calendar.google.com/calendar/render')
    gcalUrl.searchParams.set('action', 'TEMPLATE')
    gcalUrl.searchParams.set('text', `${campSession.name} - Empowered Athletes`)
    gcalUrl.searchParams.set('dates', `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
    if (campSession.location) {
      gcalUrl.searchParams.set('location', `${campSession.location.name}, ${campSession.location.city}, ${campSession.location.state}`)
    }
    gcalUrl.searchParams.set('details', `Camp registration confirmation: ${confirmationNumber}`)

    window.open(gcalUrl.toString(), '_blank')
  }

  const handleDownloadReceipt = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to download the receipt')
      return
    }

    const receiptDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const campName = campSession?.name || 'Camp Registration'
    const campDates = campSession
      ? `${parseDateSafe(campSession.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${parseDateSafe(campSession.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      : ''
    const campTimes = campSession
      ? `${formatTime(campSession.dailyStartTime)} - ${formatTime(campSession.dailyEndTime)}`
      : ''
    const location = campSession?.location
      ? [campSession.location.name, campSession.location.city, campSession.location.state].filter(Boolean).join(', ')
      : ''

    const camperNames = state.campers.map(c => `${c.firstName} ${c.lastName}`).join(', ')

    // Build line items
    let lineItemsHtml = ''
    const pricePerCamper = campSession ? campSession.price : (totals.campSubtotal / Math.max(state.campers.length, 1))

    for (const camper of state.campers) {
      lineItemsHtml += `
        <div class="line-item">
          <span>${camper.firstName} ${camper.lastName} — Camp Registration</span>
          <span>${formatCents(pricePerCamper)}</span>
        </div>
      `
    }

    if (totals.addOnsSubtotal > 0) {
      lineItemsHtml += `
        <div class="line-item">
          <span>Add-Ons</span>
          <span>${formatCents(totals.addOnsSubtotal)}</span>
        </div>
      `
    }

    if (totals.siblingDiscount > 0) {
      lineItemsHtml += `
        <div class="line-item discount">
          <span>Sibling Discount</span>
          <span>-${formatCents(totals.siblingDiscount)}</span>
        </div>
      `
    }

    if (totals.promoDiscount > 0) {
      lineItemsHtml += `
        <div class="line-item discount">
          <span>Promo Code${state.promoCode ? ` (${state.promoCode.code})` : ''}</span>
          <span>-${formatCents(totals.promoDiscount)}</span>
        </div>
      `
    }

    if (totals.tax > 0) {
      lineItemsHtml += `
        <div class="line-item">
          <span>Sales Tax</span>
          <span>${formatCents(totals.tax)}</span>
        </div>
      `
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${campName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #00ff88;
            }
            .logo {
              font-size: 24px;
              font-weight: 900;
              color: #00ff88;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .receipt-title {
              font-size: 14px;
              color: #666;
              margin-top: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .section { margin-bottom: 30px; }
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #999;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .camp-name {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .details { color: #666; font-size: 14px; line-height: 1.6; }
            .divider {
              border-top: 1px solid #eee;
              margin: 20px 0;
            }
            .line-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .line-item.discount { color: #00aa55; }
            .line-item.total {
              font-size: 18px;
              font-weight: 700;
              border-top: 2px solid #333;
              margin-top: 10px;
              padding-top: 15px;
            }
            .payment-info {
              background: #f8f8f8;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .payment-status {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              background: #00ff8820;
              color: #00aa55;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            .confirmation-number {
              font-family: monospace;
              background: #f0f0f0;
              padding: 2px 8px;
              border-radius: 4px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Empowered Sports Camp</div>
            <div class="receipt-title">Registration Receipt</div>
          </div>

          <div class="section">
            <div class="section-title">Camp Registration</div>
            <div class="camp-name">${campName}</div>
            <div class="details">
              ${campDates ? campDates + '<br>' : ''}
              ${campTimes ? campTimes + '<br>' : ''}
              ${location ? location + '<br>' : ''}
              Athletes: ${camperNames}
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="section-title">Payment Summary</div>
            ${lineItemsHtml}

            <div class="line-item total">
              <span>Total</span>
              <span>${formatCents(totals.total)}</span>
            </div>
          </div>

          <div class="payment-info">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="section-title" style="margin-bottom: 5px;">Payment Status</div>
                <span class="payment-status">Paid</span>
              </div>
              <div style="text-align: right;">
                <div class="section-title" style="margin-bottom: 5px;">Date</div>
                <span>${receiptDate}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Confirmation #: <span class="confirmation-number">${confirmationNumber}</span></p>
            <p style="margin-top: 10px;">Thank you for registering with Empowered Sports Camp!</p>
            <p style="margin-top: 5px;">Questions? Contact us at support@empoweredsportscamp.com</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-24 w-24 bg-neon flex items-center justify-center animate-pulse">
            <CheckCircle2 className="h-12 w-12 text-black" />
          </div>
          <div className="absolute inset-0 bg-neon/30 blur-2xl -z-10" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
          You're Registered!
        </h1>
        <p className="mt-2 text-white/60">
          Get ready to unleash your inner champion.
        </p>
      </div>

      {/* Confirmation Number */}
      <div className="bg-white/5 border border-white/10 p-6 inline-block">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Confirmation Number
        </p>
        <p className="text-2xl font-black tracking-wider text-neon">
          {confirmationNumber}
        </p>
      </div>

      {/* Camp Details */}
      {campSession && (
        <div className="bg-white/5 border border-white/10 p-6 text-left space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white text-center">
            {campSession.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-neon shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatDate(campSession.startDate)}
                </p>
                <p className="text-xs text-white/50">
                  through {formatDate(campSession.endDate)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {formatTime(campSession.dailyStartTime)} - {formatTime(campSession.dailyEndTime)}
                </p>
              </div>
            </div>

            {campSession.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-magenta shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {campSession.location.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {campSession.location.addressLine1}
                  </p>
                  <p className="text-xs text-white/50">
                    {campSession.location.city}, {campSession.location.state} {campSession.location.zipCode}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Registered Campers */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
              Registered Campers
            </p>
            <div className="flex flex-wrap gap-2">
              {state.campers.map((camper) => (
                <span
                  key={camper.id}
                  className="px-3 py-1 bg-neon/10 border border-neon/30 text-sm font-semibold text-neon"
                >
                  {camper.firstName} {camper.lastName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      {totals.total > 0 && (
        <div className="bg-white/5 border border-white/10 p-6 text-left space-y-3">
          <div className="flex items-center gap-2 justify-center">
            <Receipt className="h-4 w-4 text-white/50" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Payment Summary
            </h3>
          </div>

          <div className="space-y-1">
            {/* Camp registration per camper */}
            <div className="flex justify-between text-sm py-1">
              <span className="text-white">
                Camp Registration{state.campers.length > 1 ? ` (${state.campers.length} campers)` : ''}
              </span>
              <span className="text-white font-medium">{formatCents(totals.campSubtotal)}</span>
            </div>

            {/* Add-ons total */}
            {totals.addOnsSubtotal > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-white/60">Add-Ons</span>
                <span className="text-white/60">{formatCents(totals.addOnsSubtotal)}</span>
              </div>
            )}

            {/* Sibling discount */}
            {totals.siblingDiscount > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-green-400">Sibling Discount</span>
                <span className="text-green-400">-{formatCents(totals.siblingDiscount)}</span>
              </div>
            )}

            {/* Promo discount */}
            {totals.promoDiscount > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-green-400">
                  Promo Code{state.promoCode ? ` (${state.promoCode.code})` : ''}
                </span>
                <span className="text-green-400">-{formatCents(totals.promoDiscount)}</span>
              </div>
            )}

            {/* Tax */}
            {totals.tax > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-white/60">Sales Tax</span>
                <span className="text-white/60">{formatCents(totals.tax)}</span>
              </div>
            )}

            {/* Total */}
            <div className="border-t-2 border-white/20 mt-2 pt-3 flex justify-between">
              <span className="text-white font-bold uppercase tracking-wider">Total Paid</span>
              <span className="text-xl font-black text-neon">{formatCents(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Email Notice */}
      <div className="bg-neon/10 border border-neon/30 p-4">
        <div className="flex items-center justify-center gap-2 text-neon">
          <Mail className="h-5 w-5" />
          <p className="font-semibold">
            Confirmation Email Sent!
          </p>
        </div>
        <p className="text-sm text-white/60 mt-1">
          We&apos;ve sent a detailed confirmation to <span className="text-white">{state.parentInfo.email}</span>
        </p>
      </div>

      {/* What's Next */}
      <div className="bg-gradient-to-r from-neon/10 via-magenta/10 to-purple/10 border border-white/10 p-6 text-left">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
          What's Next?
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-neon text-black text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-sm text-white/80">
              Check your email for a detailed confirmation with packing list and schedule.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-magenta text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-sm text-white/80">
              Complete the online health form (link in email) at least 3 days before camp.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-purple text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-sm text-white/80">
              Arrive 15 minutes early on the first day for check-in.
            </span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline-neon" onClick={handleAddToCalendar}>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
        <Button variant="outline-neon" onClick={handleDownloadReceipt}>
          <Download className="h-4 w-4 mr-2" />
          Download Receipt
        </Button>
        <Button variant="outline-neon" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite a Friend
        </Button>
      </div>

      {/* Return to Dashboard */}
      <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/dashboard">
          <Button variant="neon" size="lg">
            Go to Parent Dashboard
          </Button>
        </Link>
        <Link href="/camps">
          <Button variant="outline-white" size="lg">
            Browse More Camps
          </Button>
        </Link>
      </div>

      {/* Support */}
      <p className="text-xs text-white/40">
        Questions? Contact us at{' '}
        <a href="mailto:info@empoweredathletes.com" className="text-neon hover:underline">
          info@empoweredathletes.com
        </a>
      </p>

      {campSession && (
        <InviteFriendModal
          campId={campSession.id}
          campName={campSession.name}
          tenantId={campSession.tenantId}
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          inviterName={`${state.parentInfo.firstName} ${state.parentInfo.lastName}`.trim()}
          inviterEmail={state.parentInfo.email}
          athleteNames={state.campers.map(c => `${c.firstName} ${c.lastName}`)}
        />
      )}
    </div>
  )
}
