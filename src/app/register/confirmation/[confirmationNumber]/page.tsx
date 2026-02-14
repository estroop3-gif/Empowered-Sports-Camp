'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Home,
  ArrowRight,
  Download,
  Clock,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReceiptRegistration {
  athleteName: string
  basePriceCents: number
  discountCents: number
  promoDiscountCents: number
  addonsTotalCents: number
  addons: Array<{ name: string; variant: string | null; quantity: number; priceCents: number }>
  promoCode: { code: string; discountType: string; discountValue: number } | null
}

interface ReceiptData {
  registrations: ReceiptRegistration[]
  subtotalCents: number
  totalDiscountCents: number
  totalAddonsCents: number
  taxCents: number
  grandTotalCents: number
}

interface RegistrationDetails {
  confirmationNumber: string
  campName: string
  campDates: string
  campTimes: string
  location: string
  locationAddress: string
  athleteNames: string[]
  totalPaid: string
  registrationIds: string[]
  receipt: ReceiptData
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ confirmationNumber: string }>
}) {
  const { confirmationNumber } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<RegistrationDetails | null>(null)

  useEffect(() => {
    async function loadConfirmation() {
      try {
        const response = await fetch(`/api/registration/confirmation/${confirmationNumber}`)
        const result = await response.json()

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setRegistration(result.data)
        } else {
          setError('Confirmation not found.')
        }
      } catch (err) {
        console.error('Failed to load confirmation:', err)
        setError('Failed to load confirmation details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadConfirmation()
  }, [confirmationNumber])

  const handleDownloadReceipt = () => {
    if (!registration) return

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

    const { receipt } = registration

    const athleteLineItems = receipt.registrations.map((reg) => {
      let html = `
        <div class="line-item">
          <span>${reg.athleteName} — Camp Registration</span>
          <span>${formatCents(reg.basePriceCents)}</span>
        </div>
      `
      for (const addon of reg.addons) {
        html += `
          <div class="line-item addon">
            <span>&nbsp;&nbsp;${addon.name}${addon.variant ? ` (${addon.variant})` : ''}${addon.quantity > 1 ? ` x${addon.quantity}` : ''}</span>
            <span>${formatCents(addon.priceCents)}</span>
          </div>
        `
      }
      if (reg.discountCents > 0) {
        html += `
          <div class="line-item discount">
            <span>&nbsp;&nbsp;Sibling Discount</span>
            <span>-${formatCents(reg.discountCents)}</span>
          </div>
        `
      }
      if (reg.promoDiscountCents > 0) {
        html += `
          <div class="line-item discount">
            <span>&nbsp;&nbsp;Promo Code${reg.promoCode ? ` (${reg.promoCode.code})` : ''}</span>
            <span>-${formatCents(reg.promoDiscountCents)}</span>
          </div>
        `
      }
      return html
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${registration.campName}</title>
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
            .line-item.addon { color: #555; font-size: 13px; }
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
            <div class="camp-name">${registration.campName}</div>
            <div class="details">
              ${registration.campDates}<br>
              ${registration.campTimes ? registration.campTimes + '<br>' : ''}
              ${registration.location ? registration.location + '<br>' : ''}
              ${registration.locationAddress ? registration.locationAddress + '<br>' : ''}
              Athletes: ${registration.athleteNames.join(', ')}
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="section-title">Payment Summary</div>
            ${athleteLineItems}

            ${receipt.taxCents > 0 ? `
              <div class="line-item">
                <span>Sales Tax</span>
                <span>${formatCents(receipt.taxCents)}</span>
              </div>
            ` : ''}

            <div class="line-item total">
              <span>Total</span>
              <span>${formatCents(receipt.grandTotalCents)}</span>
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
            <p>Confirmation #: <span class="confirmation-number">${registration.confirmationNumber}</span></p>
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

  const handleAddToCalendar = () => {
    if (!registration) return
    const gcalUrl = new URL('https://calendar.google.com/calendar/render')
    gcalUrl.searchParams.set('action', 'TEMPLATE')
    gcalUrl.searchParams.set('text', `${registration.campName} - Empowered Athletes`)
    if (registration.location) {
      gcalUrl.searchParams.set('location', registration.locationAddress || registration.location)
    }
    gcalUrl.searchParams.set('details', `Camp registration confirmation: ${registration.confirmationNumber}`)
    window.open(gcalUrl.toString(), '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-white">Loading Confirmation</h1>
          <p className="text-white/60">Retrieving your registration details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            Confirmation Not Found
          </h1>
          <p className="text-white/60">{error}</p>
          <p className="text-xs text-white/40">
            Confirmation #: {confirmationNumber}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button variant="outline-white" onClick={() => window.location.href = '/camps'}>
              Back to Camps
            </Button>
            <Button variant="neon" onClick={() => window.location.href = '/contact'}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const receipt = registration?.receipt

  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-magenta/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-16 sm:py-24">
        {/* Success Header */}
        <div className="text-center space-y-6 mb-12">
          <div className="h-24 w-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-neon" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-wider text-white">
              You&apos;re In!
            </h1>
            <p className="mt-2 text-xl text-neon font-bold">
              Registration Confirmed
            </p>
          </div>
        </div>

        {/* Confirmation Details */}
        <div className="bg-dark-100 border border-white/10 p-6 sm:p-8 space-y-6">
          {/* Confirmation Number */}
          <div className="text-center p-4 bg-neon/5 border border-neon/30">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
              Confirmation Number
            </p>
            <p className="text-2xl font-black text-neon tracking-wider">
              {registration?.confirmationNumber}
            </p>
          </div>

          {/* Camp Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Camp Details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                <Calendar className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Camp</p>
                  <p className="text-white font-medium">{registration?.campName}</p>
                  {registration?.campDates && (
                    <p className="text-sm text-white/60 mt-1">{registration.campDates}</p>
                  )}
                </div>
              </div>

              {registration?.campTimes && (
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                  <Clock className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Daily Schedule</p>
                    <p className="text-white font-medium">{registration.campTimes}</p>
                  </div>
                </div>
              )}

              {registration?.location && (
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                  <MapPin className="h-5 w-5 text-purple flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Location</p>
                    <p className="text-white font-medium">{registration.location}</p>
                    {registration.locationAddress && registration.locationAddress !== registration.location && (
                      <p className="text-sm text-white/50 mt-0.5">{registration.locationAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Athletes */}
            {registration?.athleteNames && registration.athleteNames.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                <Users className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Registered Athletes</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {registration.athleteNames.map((name) => (
                      <span
                        key={name}
                        className="px-3 py-1 bg-neon/10 border border-neon/30 text-sm font-semibold text-neon"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          {receipt && receipt.registrations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-white/50" />
                <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                  Payment Summary
                </h2>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 space-y-1">
                {receipt.registrations.map((reg) => (
                  <div key={reg.athleteName}>
                    {/* Base camp fee */}
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-white">{reg.athleteName} — Camp Registration</span>
                      <span className="text-white font-medium">{formatCents(reg.basePriceCents)}</span>
                    </div>
                    {/* Add-ons */}
                    {reg.addons.map((addon, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 pl-4">
                        <span className="text-white/60">
                          {addon.name}
                          {addon.variant ? ` (${addon.variant})` : ''}
                          {addon.quantity > 1 ? ` x${addon.quantity}` : ''}
                        </span>
                        <span className="text-white/60">{formatCents(addon.priceCents)}</span>
                      </div>
                    ))}
                    {/* Sibling discount */}
                    {reg.discountCents > 0 && (
                      <div className="flex justify-between text-sm py-1 pl-4">
                        <span className="text-green-400">Sibling Discount</span>
                        <span className="text-green-400">-{formatCents(reg.discountCents)}</span>
                      </div>
                    )}
                    {/* Promo discount */}
                    {reg.promoDiscountCents > 0 && (
                      <div className="flex justify-between text-sm py-1 pl-4">
                        <span className="text-green-400">
                          Promo Code{reg.promoCode ? ` (${reg.promoCode.code})` : ''}
                        </span>
                        <span className="text-green-400">-{formatCents(reg.promoDiscountCents)}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Tax */}
                {receipt.taxCents > 0 && (
                  <>
                    <div className="border-t border-white/10 my-2" />
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-white/60">Sales Tax</span>
                      <span className="text-white/60">{formatCents(receipt.taxCents)}</span>
                    </div>
                  </>
                )}

                {/* Total */}
                <div className="border-t-2 border-white/20 mt-2 pt-3 flex justify-between">
                  <span className="text-white font-bold uppercase tracking-wider">Total Paid</span>
                  <span className="text-xl font-black text-neon">{formatCents(receipt.grandTotalCents)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Simple total fallback if no receipt data */}
          {(!receipt || receipt.registrations.length === 0) && registration?.totalPaid && (
            <div className="flex items-center justify-between p-4 bg-neon/5 border border-neon/30">
              <span className="text-white font-bold uppercase tracking-wider">Total Paid</span>
              <span className="text-2xl font-black text-neon">{registration.totalPaid}</span>
            </div>
          )}

          {/* Email Notice */}
          <div className="text-center text-sm text-white/50 pt-4 border-t border-white/10">
            A confirmation email has been sent with all the details.
            <br />
            Check your inbox (and spam folder) for next steps.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button variant="outline-white" size="lg" className="flex-1" onClick={handleDownloadReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
          <Button variant="outline-white" size="lg" className="flex-1" onClick={handleAddToCalendar}>
            <Calendar className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline-white" size="lg" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button variant="neon" size="lg" className="w-full">
              View in Parent Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* What's Next */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
            What&apos;s Next?
          </h3>
          <ul className="text-white/60 space-y-2 text-sm">
            <li>Check your email for detailed camp information</li>
            <li>Complete any required medical forms before camp starts</li>
            <li>Mark your calendar for drop-off and pick-up times</li>
            <li>Get excited for an amazing camp experience!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
