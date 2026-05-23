'use client'

/**
 * Volunteer Sign-Up Form
 *
 * Simple sign-up form for camp volunteers (non-coaching duties).
 * Fetches upcoming camps for session selection.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Send, CheckCircle, AlertCircle, Loader2, ArrowLeft, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormData {
  firstName: string
  lastName: string
  age: string
  incomingGrade: string
  phone: string
  campIds: string[]
  notes: string
}

interface FormErrors {
  [key: string]: string | undefined
}

interface Camp {
  id: string
  name: string
  startDate: string
  endDate: string
  location?: { city?: string; state?: string } | null
  venue?: { name?: string; city?: string; state?: string } | null
}

const gradeOptions = [
  { value: '', label: 'Select grade...' },
  { value: '6th', label: '6th Grade' },
  { value: '7th', label: '7th Grade' },
  { value: '8th', label: '8th Grade' },
  { value: '9th', label: '9th Grade' },
  { value: '10th', label: '10th Grade' },
  { value: '11th', label: '11th Grade' },
  { value: '12th', label: '12th Grade' },
  { value: 'college', label: 'College' },
]

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

function getCampLocation(camp: Camp): string | null {
  const v = camp.venue
  if (v?.city && v?.state) return `${v.city}, ${v.state}`
  if (v?.name) return v.name
  const l = camp.location
  if (l?.city && l?.state) return `${l.city}, ${l.state}`
  return null
}

export default function VolunteerSignupForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    age: '',
    incomingGrade: '',
    phone: '',
    campIds: [],
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<FormStatus>('idle')
  const [camps, setCamps] = useState<Camp[]>([])
  const [campsLoading, setCampsLoading] = useState(true)

  useEffect(() => {
    async function fetchCamps() {
      try {
        const res = await fetch('/api/camps?action=list&perPage=50')
        const json = await res.json()
        const campList = json.data?.camps || json.data || []
        setCamps(Array.isArray(campList) ? campList : [])
      } catch {
        setCamps([])
      } finally {
        setCampsLoading(false)
      }
    }
    fetchCamps()
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required'
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 1) {
      newErrors.age = 'Please enter a valid age'
    }
    if (!formData.incomingGrade) newErrors.incomingGrade = 'Grade is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (formData.campIds.length === 0) newErrors.campIds = 'Please select at least one session'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleCampToggle = (campId: string) => {
    setFormData((prev) => ({
      ...prev,
      campIds: prev.campIds.includes(campId)
        ? prev.campIds.filter((id) => id !== campId)
        : [...prev.campIds, campId],
    }))
    if (errors.campIds) {
      setErrors((prev) => ({ ...prev, campIds: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      const firstError = document.querySelector('.text-red-400')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/volunteer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: Number(formData.age),
          incomingGrade: formData.incomingGrade,
          phone: formData.phone,
          campIds: formData.campIds,
          notes: formData.notes || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit sign-up')
      }

      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <section className="relative py-16 lg:py-20">
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-dark-100/50 border border-magenta/30 p-8 lg:p-12 text-center">
            <CheckCircle className="h-16 w-16 text-magenta mx-auto mb-6" />
            <h2 className="headline-display text-2xl text-white mb-4">
              You&apos;re Signed Up!
            </h2>
            <p className="text-white/70 mb-4">
              Thank you for volunteering with Empowered Athletes!
            </p>
            <p className="text-white/60 text-sm mb-4">
              We&apos;ll be in touch with details about your session(s), including where to
              report and what to bring. Remember — volunteers arrive 30 minutes before camp
              and stay 30 minutes after.
            </p>
            <p className="text-white/60 text-sm mb-8">
              Your volunteer hours are eligible for community service credit. We&apos;ll
              provide documentation after each session you complete.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/programs">
                <Button variant="outline-neon">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  View All Programs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-16 lg:py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/programs"
          className="inline-flex items-center gap-2 text-white/60 hover:text-magenta transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Programs</span>
        </Link>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Error banner */}
          {status === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Something went wrong submitting your sign-up. Please try again or
                email us at info@empoweredsportscamp.com.
              </p>
            </div>
          )}

          {/* Section: Your Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Your Information</h3>
            <p className="text-white/50 text-sm mb-6">Tell us about yourself.</p>

            <div className="space-y-6">
              {/* Name row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-2">
                    First Name <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Your first name"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-2">
                    Last Name <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Your last name"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Age & Grade row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-white/80 mb-2">
                    Age <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Your age"
                    className={errors.age ? 'border-red-500' : ''}
                  />
                  {errors.age && (
                    <p className="mt-1 text-xs text-red-400">{errors.age}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="incomingGrade" className="block text-sm font-medium text-white/80 mb-2">
                    Incoming Grade <span className="text-magenta">*</span>
                  </label>
                  <select
                    id="incomingGrade"
                    name="incomingGrade"
                    value={formData.incomingGrade}
                    onChange={handleChange}
                    className={`w-full h-10 px-3 bg-dark-100 border ${
                      errors.incomingGrade ? 'border-red-500' : 'border-white/20'
                    } text-white focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors`}
                  >
                    {gradeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-dark-100">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.incomingGrade && (
                    <p className="mt-1 text-xs text-red-400">{errors.incomingGrade}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="md:w-1/2">
                <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                  Phone Number <span className="text-magenta">*</span>
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Session Availability */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Session Availability</h3>
            <p className="text-white/50 text-sm mb-6">
              Select the camp sessions you can volunteer for. You must be available for the
              full session, including 30 minutes before and after camp hours.
            </p>

            {campsLoading ? (
              <div className="flex items-center gap-3 py-8 justify-center text-white/50">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading upcoming sessions...</span>
              </div>
            ) : camps.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-white/50 text-sm">
                  No upcoming sessions — check back soon.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {camps.map((camp) => {
                  const location = getCampLocation(camp)
                  return (
                    <label
                      key={camp.id}
                      className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                        formData.campIds.includes(camp.id)
                          ? 'border-magenta/50 bg-magenta/5'
                          : 'border-white/10 hover:border-magenta/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.campIds.includes(camp.id)}
                        onChange={() => handleCampToggle(camp.id)}
                        className="mt-0.5 h-4 w-4 accent-magenta flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{camp.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs text-white/50">
                            <Calendar className="h-3 w-3" />
                            {formatDateRange(camp.startDate, camp.endDate)}
                          </span>
                          {location && (
                            <span className="inline-flex items-center gap-1 text-xs text-white/50">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            {errors.campIds && (
              <p className="mt-2 text-xs text-red-400">{errors.campIds}</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Notes */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Additional Notes</h3>
            <p className="text-white/50 text-sm mb-6">Anything else we should know?</p>

            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any scheduling conflicts, special skills, or questions..."
              className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="magenta"
              size="lg"
              className="w-full md:w-auto"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Up...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Sign Up to Volunteer
                </>
              )}
            </Button>
            <p className="mt-4 text-xs text-white/40">
              By signing up, you confirm that you can commit to arriving 30 minutes before
              camp and staying 30 minutes after for each session you selected.
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
