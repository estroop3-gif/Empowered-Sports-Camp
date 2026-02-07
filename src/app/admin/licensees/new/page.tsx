'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'

// Type definition (no longer imported from service)
interface CreateLicenseeInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
  territory_name: string
  city: string
  state: string
  status?: 'pending' | 'active' | 'inactive'
}
import {
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COUNTRIES, getRegionsForCountry, getRegionLabelForCountry } from '@/lib/constants/locations'

/**
 * Create New Licensee Page
 *
 * Form for onboarding a new licensee/territory operator.
 * Creates profile, user_role, and tenant records in the database.
 */

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  territory_name: string
  city: string
  state: string
  country: string
  status: 'pending' | 'active'
  send_invite: boolean
}

interface FormErrors {
  first_name?: string
  last_name?: string
  email?: string
  territory_name?: string
  city?: string
  state?: string
}

export default function NewLicenseePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    territory_name: '',
    city: '',
    state: '',
    country: 'US',
    status: 'pending',
    send_invite: true,
  })

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required'
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!formData.territory_name.trim()) {
      errors.territory_name = 'Territory name is required'
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required'
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setSaving(true)

    const input: CreateLicenseeInput = {
      email: formData.email.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim() || undefined,
      territory_name: formData.territory_name.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      status: formData.status,
    }

    try {
      const res = await fetch('/api/licensees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...input }),
      })
      const { data, error: createError } = await res.json()

      if (createError) {
        setError(createError || 'Failed to create licensee')
        setSaving(false)
        return
      }

      // If send_invite is checked, send invite email via the role invite system
      if (formData.send_invite && data) {
        try {
          await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              firstName: formData.first_name,
              lastName: formData.last_name,
              phone: formData.phone,
              targetRole: 'licensee_owner',
              tenantId: data.tenant_id,
              sendEmail: true,
            }),
          })
        } catch (inviteErr) {
          console.error('Failed to send invite email:', inviteErr)
          // Don't block the creation, just log the error
        }
      }
    } catch (err) {
      setError('Failed to create licensee')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    // Redirect after short delay to show success
    setTimeout(() => {
      router.push('/admin/licensees')
    }, 1500)
  }

  if (success) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-neon" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Licensee Created!
            </h2>
            <p className="text-white/50 mb-4">
              {formData.send_invite
                ? 'An application email will be sent to the licensee.'
                : 'The licensee has been added to the system.'}
            </p>
            <p className="text-sm text-white/30">Redirecting to licensees list...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href="/admin/licensees"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Licensees
        </Link>
      </div>

      <PageHeader
        title="Create New Licensee"
        description="Onboard a new territory operator to the Empowered Sports Camp network."
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Error creating licensee</p>
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Primary Contact */}
            <ContentCard title="Primary Contact" accent="magenta">
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      placeholder="John"
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                        formErrors.first_name
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-magenta'
                      )}
                    />
                    {formErrors.first_name && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      placeholder="Smith"
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                        formErrors.last_name
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-magenta'
                      )}
                    />
                    {formErrors.last_name && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.last_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="john@example.com"
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                        formErrors.email
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-magenta'
                      )}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>
                    )}
                    <p className="mt-2 text-xs text-white/40">
                      This email will receive the application invite
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Territory Information */}
            <ContentCard title="Territory Information" accent="purple">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Territory Name *
                  </label>
                  <input
                    type="text"
                    value={formData.territory_name}
                    onChange={(e) => updateField('territory_name', e.target.value)}
                    placeholder="e.g., Chicagoland North"
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                      formErrors.territory_name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/20 focus:border-purple'
                    )}
                  />
                  {formErrors.territory_name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.territory_name}</p>
                  )}
                  <p className="mt-2 text-xs text-white/40">
                    The geographic region this licensee will operate in
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Country *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => {
                      updateField('country', e.target.value)
                      updateField('state', '') // Clear state when country changes
                    }}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none appearance-none"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Chicago"
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                        formErrors.city
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    />
                    {formErrors.city && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      {getRegionLabelForCountry(formData.country)} *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none appearance-none',
                        formErrors.state
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    >
                      <option value="">Select {getRegionLabelForCountry(formData.country).toLowerCase()}...</option>
                      {getRegionsForCountry(formData.country).map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.state && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.state}</p>
                    )}
                  </div>
                </div>
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Status Card */}
              <ContentCard title="Licensee Status" accent="neon">
                <div className="space-y-4">
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Initial Status
                  </label>
                  <div className="space-y-2">
                    <label
                      className={cn(
                        'flex items-start gap-3 p-4 cursor-pointer border transition-colors',
                        formData.status === 'pending'
                          ? 'border-neon bg-neon/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="pending"
                        checked={formData.status === 'pending'}
                        onChange={() => updateField('status', 'pending')}
                        className="mt-1"
                      />
                      <div>
                        <div className={cn('font-bold', formData.status === 'pending' ? 'text-neon' : 'text-white')}>
                          Pending
                        </div>
                        <div className="text-sm text-white/50">Awaiting onboarding completion</div>
                      </div>
                    </label>
                    <label
                      className={cn(
                        'flex items-start gap-3 p-4 cursor-pointer border transition-colors',
                        formData.status === 'active'
                          ? 'border-neon bg-neon/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={() => updateField('status', 'active')}
                        className="mt-1"
                      />
                      <div>
                        <div className={cn('font-bold', formData.status === 'active' ? 'text-neon' : 'text-white')}>
                          Active
                        </div>
                        <div className="text-sm text-white/50">Ready to operate</div>
                      </div>
                    </label>
                  </div>
                </div>
              </ContentCard>

              {/* Send Invite Option */}
              <ContentCard title="Application Invite" accent="magenta">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.send_invite}
                    onChange={(e) => updateField('send_invite', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Application Email
                    </div>
                    <div className="text-sm text-white/50 mt-1">
                      Automatically send an email inviting this person to complete their
                      licensee application and set up their account.
                    </div>
                  </div>
                </label>
              </ContentCard>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Licensee
                    </>
                  )}
                </button>

                <Link
                  href="/admin/licensees"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>

              {/* Help Text */}
              <div className="p-4 bg-black/30 border border-white/10">
                <p className="text-sm text-white/50">
                  <strong className="text-white">Note:</strong> After creating the licensee,
                  you can view and manage them from the All Licensees page. If you selected
                  &quot;Send Application Email&quot;, they will receive instructions to complete
                  their account setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
