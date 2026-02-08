'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Shirt,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  Phone,
  Heart,
  Receipt,
  Download,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { parseDateSafe } from '@/lib/utils'

interface ReceiptAddon {
  name: string
  variant: string | null
  quantity: number
  price_cents: number
}

interface ReceiptData {
  base_price_cents: number
  discount_cents: number
  promo_discount_cents: number
  addons_total_cents: number
  tax_cents: number
  total_price_cents: number
  payment_status: string
  payment_method: string | null
  paid_at: string | null
  promo_code: {
    code: string
    description: string | null
    discount_type: string
    discount_value: number
  } | null
  addons: ReceiptAddon[]
}

interface RegistrationDetails {
  id: string
  status: string
  payment_status: string
  shirt_size: string | null
  special_considerations: string | null
  created_at: string
  camp: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    location_name: string | null
    city: string | null
    state: string | null
    price_cents: number
  }
  athlete: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    grade: string | null
    t_shirt_size: string | null
    medical_notes: string | null
    allergies: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
  }
  receipt: ReceiptData
}

export default function RegistrationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const registrationId = params.registrationId as string
  const receiptRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [registration, setRegistration] = useState<RegistrationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editable fields
  const [shirtSize, setShirtSize] = useState('')
  const [specialConsiderations, setSpecialConsiderations] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [allergies, setAllergies] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && registrationId) {
      loadRegistration()
    }
  }, [user, registrationId])

  const loadRegistration = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/registrations/${registrationId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setRegistration(data.data)
      // Initialize editable fields
      setShirtSize(data.data.shirt_size || data.data.athlete.t_shirt_size || '')
      setSpecialConsiderations(data.data.special_considerations || '')
      setMedicalNotes(data.data.athlete.medical_notes || '')
      setAllergies(data.data.athlete.allergies || '')
      setEmergencyContactName(data.data.athlete.emergency_contact_name || '')
      setEmergencyContactPhone(data.data.athlete.emergency_contact_phone || '')
      setEmergencyContactRelationship(data.data.athlete.emergency_contact_relationship || '')
    } catch (err) {
      console.error('Failed to load registration:', err)
      setError('Failed to load registration details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!registration) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shirtSize,
          specialConsiderations,
          athleteUpdates: {
            medicalNotes,
            allergies,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelationship,
          },
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setSuccessMessage('Changes saved successfully!')
      // Reload to get fresh data
      await loadRegistration()
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadReceipt = () => {
    if (!registration) return

    // Create a printable receipt window
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to download the receipt')
      return
    }

    const receiptDate = registration.receipt.paid_at
      ? new Date(registration.receipt.paid_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date(registration.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

    const campDates = `${parseDateSafe(registration.camp.start_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })} - ${parseDateSafe(registration.camp.end_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`

    const location = [
      registration.camp.location_name,
      registration.camp.city,
      registration.camp.state,
    ].filter(Boolean).join(', ')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${registration.camp.name}</title>
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
            }
            .payment-status.paid {
              background: #00ff8820;
              color: #00aa55;
            }
            .payment-status.pending {
              background: #ffaa0020;
              color: #aa7700;
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
            <div class="camp-name">${registration.camp.name}</div>
            <div class="details">
              ${campDates}<br>
              ${location ? location + '<br>' : ''}
              Athlete: ${registration.athlete.first_name} ${registration.athlete.last_name}
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="section-title">Payment Summary</div>

            <div class="line-item">
              <span>Camp Registration</span>
              <span>$${(registration.receipt.base_price_cents / 100).toFixed(2)}</span>
            </div>

            ${registration.receipt.addons.length > 0 ? registration.receipt.addons.map(addon => `
              <div class="line-item">
                <span>${addon.name}${addon.variant ? ` (${addon.variant})` : ''}${addon.quantity > 1 ? ` x${addon.quantity}` : ''}</span>
                <span>$${(addon.price_cents / 100).toFixed(2)}</span>
              </div>
            `).join('') : registration.receipt.addons_total_cents > 0 ? `
              <div class="line-item">
                <span>Add-ons</span>
                <span>$${(registration.receipt.addons_total_cents / 100).toFixed(2)}</span>
              </div>
            ` : ''}

            ${registration.receipt.discount_cents > 0 ? `
              <div class="line-item discount">
                <span>Sibling Discount</span>
                <span>-$${(registration.receipt.discount_cents / 100).toFixed(2)}</span>
              </div>
            ` : ''}

            ${registration.receipt.promo_discount_cents > 0 ? `
              <div class="line-item discount">
                <span>Promo Code${registration.receipt.promo_code ? ` (${registration.receipt.promo_code.code})` : ''}</span>
                <span>-$${(registration.receipt.promo_discount_cents / 100).toFixed(2)}</span>
              </div>
            ` : ''}

            ${registration.receipt.tax_cents > 0 ? `
              <div class="line-item">
                <span>Sales Tax</span>
                <span>$${(registration.receipt.tax_cents / 100).toFixed(2)}</span>
              </div>
            ` : ''}

            <div class="line-item total">
              <span>Total</span>
              <span>$${(registration.receipt.total_price_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div class="payment-info">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="section-title" style="margin-bottom: 5px;">Payment Status</div>
                <span class="payment-status ${registration.receipt.payment_status === 'paid' ? 'paid' : 'pending'}">
                  ${registration.receipt.payment_status === 'paid' ? 'Paid' : registration.receipt.payment_status}
                </span>
              </div>
              <div style="text-align: right;">
                <div class="section-title" style="margin-bottom: 5px;">Date</div>
                <span>${receiptDate}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Confirmation #: <span class="confirmation-number">${registration.id.slice(0, 8).toUpperCase()}</span></p>
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

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseDateSafe(startDate)
    const end = parseDateSafe(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.toLocaleDateString('en-US', yearOptions)}`
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return parseDateSafe(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (error && !registration) {
    return (
      <div className="min-h-screen bg-black">
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="bg-red-500/10 border border-red-500/30 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  if (!registration) return null

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              {registration.camp.name}
            </h1>
            {registration.status === 'confirmed' || registration.status === 'registered' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon/10 text-neon text-xs font-bold uppercase tracking-wider border border-neon/30">
                <CheckCircle className="h-3 w-3" />
                Confirmed
              </span>
            ) : registration.status === 'pending' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold uppercase tracking-wider border border-yellow-500/30">
                Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider border border-white/20">
                {registration.status}
              </span>
            )}
          </div>
          <p className="text-white/50">
            Registration for {registration.athlete.first_name} {registration.athlete.last_name}
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Receipt Section - Full Width */}
        <div className="mb-6 bg-dark-100 border border-white/10" ref={receiptRef}>
          <div className="px-6 py-4 border-b border-neon/30 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-neon" />
              Payment Receipt
            </h2>
            <Button
              variant="outline-neon"
              size="sm"
              onClick={handleDownloadReceipt}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Download PDF
            </Button>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Line Items */}
              <div className="space-y-3">
                {/* Base Price */}
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Camp Registration</span>
                  <span className="text-white">{formatCurrency(registration.receipt.base_price_cents)}</span>
                </div>

                {/* Add-ons - show individual items if available, otherwise show total */}
                {registration.receipt.addons.length > 0 ? (
                  registration.receipt.addons.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-white/70">
                        {addon.name}
                        {addon.variant && <span className="text-white/40"> ({addon.variant})</span>}
                        {addon.quantity > 1 && <span className="text-white/40"> x{addon.quantity}</span>}
                      </span>
                      <span className="text-white">{formatCurrency(addon.price_cents)}</span>
                    </div>
                  ))
                ) : registration.receipt.addons_total_cents > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Add-ons</span>
                    <span className="text-white">{formatCurrency(registration.receipt.addons_total_cents)}</span>
                  </div>
                ) : null}

                {/* Sibling Discount */}
                {registration.receipt.discount_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neon">Sibling Discount</span>
                    <span className="text-neon">-{formatCurrency(registration.receipt.discount_cents)}</span>
                  </div>
                )}

                {/* Promo Discount */}
                {registration.receipt.promo_discount_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neon flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Promo Code
                      {registration.receipt.promo_code && (
                        <span className="text-neon/70">({registration.receipt.promo_code.code})</span>
                      )}
                    </span>
                    <span className="text-neon">-{formatCurrency(registration.receipt.promo_discount_cents)}</span>
                  </div>
                )}

                {/* Sales Tax */}
                {registration.receipt.tax_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Sales Tax</span>
                    <span className="text-white">{formatCurrency(registration.receipt.tax_cents)}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-neon font-black text-xl">{formatCurrency(registration.receipt.total_price_cents)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Payment Info */}
              <div className="bg-black/30 p-4 border border-white/5 space-y-4">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Payment Status</p>
                  {registration.receipt.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-neon/10 text-neon text-sm font-bold uppercase tracking-wider border border-neon/30">
                      <CheckCircle className="h-3 w-3" />
                      Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 text-sm font-bold uppercase tracking-wider border border-yellow-500/30">
                      {registration.receipt.payment_status}
                    </span>
                  )}
                </div>

                {registration.receipt.paid_at && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Payment Date</p>
                    <p className="text-white">{formatDate(registration.receipt.paid_at)}</p>
                  </div>
                )}

                {registration.receipt.payment_method && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Payment Method</p>
                    <p className="text-white capitalize">
                      {registration.receipt.payment_method === 'dev_mode' ? 'Test Payment' : registration.receipt.payment_method}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Confirmation #</p>
                  <p className="text-white font-mono">{registration.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camp Details */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-magenta/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-magenta" />
                Camp Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Dates</p>
                <p className="text-white">{formatDateRange(registration.camp.start_date, registration.camp.end_date)}</p>
              </div>
              {(registration.camp.location_name || registration.camp.city) && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Location</p>
                  <p className="text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-white/40" />
                    {registration.camp.location_name}
                    {registration.camp.city && `, ${registration.camp.city}`}
                    {registration.camp.state && `, ${registration.camp.state}`}
                  </p>
                </div>
              )}
              {registration.camp.description && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white/70 text-sm">{registration.camp.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Athlete Info */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-purple/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <User className="h-4 w-4 text-purple" />
                Athlete Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-purple/10 border border-purple/30 flex items-center justify-center">
                  <span className="text-purple font-black text-2xl">
                    {registration.athlete.first_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">
                    {registration.athlete.first_name} {registration.athlete.last_name}
                  </p>
                  <p className="text-white/50 text-sm">
                    Age {calculateAge(registration.athlete.date_of_birth)}
                    {registration.athlete.grade && ` • Grade ${registration.athlete.grade}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Registration Details */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-blue-500/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Shirt className="h-4 w-4 text-blue-500" />
                Camp Preferences
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  T-Shirt Size
                </label>
                <select
                  value={shirtSize}
                  onChange={(e) => setShirtSize(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                >
                  <option value="">Select size...</option>
                  <option value="YS">Youth Small</option>
                  <option value="YM">Youth Medium</option>
                  <option value="YL">Youth Large</option>
                  <option value="YXL">Youth XL</option>
                  <option value="AS">Adult Small</option>
                  <option value="AM">Adult Medium</option>
                  <option value="AL">Adult Large</option>
                  <option value="AXL">Adult XL</option>
                  <option value="A2XL">Adult 2XL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Special Considerations / Notes
                </label>
                <textarea
                  value={specialConsiderations}
                  onChange={(e) => setSpecialConsiderations(e.target.value)}
                  rows={3}
                  placeholder="Any special requests or notes for the camp staff..."
                  className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Medical & Emergency Info */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-red-500/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Medical & Emergency
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Medical Notes
                </label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={2}
                  placeholder="Any medical conditions or concerns..."
                  className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Allergies
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Food, environmental, or other allergies..."
                  className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                />
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  Emergency Contact
                </p>
                <div className="grid gap-3">
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                    placeholder="Relationship (e.g., Grandparent, Aunt)"
                    className="w-full bg-black/50 border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            variant="neon"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[150px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
