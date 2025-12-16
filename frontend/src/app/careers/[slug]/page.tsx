'use client'

/**
 * Job Detail Page
 *
 * Displays full details of a job posting with in-app application form.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Briefcase,
  MapPin,
  Clock,
  Wifi,
  DollarSign,
  ArrowLeft,
  Mail,
  ExternalLink,
  Loader2,
  CheckCircle,
  User,
  Phone,
  Linkedin,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface JobPosting {
  id: string
  title: string
  slug: string
  short_description: string
  full_description: string
  location_label: string
  employment_type: string
  is_remote_friendly: boolean
  min_comp_cents: number | null
  max_comp_cents: number | null
  comp_frequency: string | null
  application_instructions: string | null
  application_email: string | null
  application_url: string | null
  created_at: string
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  seasonal: 'Seasonal',
  part_time: 'Part-Time',
  full_time: 'Full-Time',
  internship: 'Internship',
  contract: 'Contract',
}

const COMP_FREQUENCY_LABELS: Record<string, string> = {
  hourly: 'per hour',
  weekly: 'per week',
  salary: 'per year',
  stipend: 'stipend',
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function JobDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Application form state
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    coverLetter: '',
    linkedinUrl: '',
    howHeard: '',
  })

  useEffect(() => {
    if (slug) {
      loadJob()
    }
  }, [slug])

  const loadJob = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/jobs/${slug}`)
      const { data, error: apiError } = await res.json()

      if (apiError || !data) {
        setError('Job posting not found or no longer accepting applications.')
        return
      }

      setJob(data)
    } catch (err) {
      console.error('Error loading job:', err)
      setError('Unable to load job posting. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const res = await fetch(`/api/jobs/${slug}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (result.error) {
        setFormError(result.error)
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting application:', err)
      setFormError('Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCompensation = () => {
    if (!job?.min_comp_cents && !job?.max_comp_cents) return null

    const formatAmount = (cents: number) => {
      const dollars = cents / 100
      return dollars.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })
    }

    let compString = ''
    if (job.min_comp_cents && job.max_comp_cents) {
      compString = `${formatAmount(job.min_comp_cents)} - ${formatAmount(job.max_comp_cents)}`
    } else if (job.min_comp_cents) {
      compString = `Starting at ${formatAmount(job.min_comp_cents)}`
    } else if (job.max_comp_cents) {
      compString = `Up to ${formatAmount(job.max_comp_cents)}`
    }

    if (job.comp_frequency && COMP_FREQUENCY_LABELS[job.comp_frequency]) {
      compString += ` ${COMP_FREQUENCY_LABELS[job.comp_frequency]}`
    }

    return compString
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </main>
    )
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-black">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Briefcase className="h-8 w-8 text-white/40" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Position Not Found
            </h1>
            <p className="text-white/60 mb-8">
              {error || 'This job posting may have been removed or is no longer accepting applications.'}
            </p>
            <Link
              href="/careers"
              className={buttonVariants({ variant: 'neon', size: 'lg' })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Careers
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const compensation = formatCompensation()

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <section className="relative pt-8 pb-12 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 via-purple/5 to-neon/5" />

        {/* Glow orbs */}
        <div className="absolute top-0 -left-40 w-[400px] h-[400px] bg-magenta/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-neon/10 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-white/50 hover:text-neon transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">All Positions</span>
          </Link>

          {/* Job title and badges */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <h1 className="headline-display headline-md text-white">
              {job.title}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-magenta/10 border border-magenta/30 text-magenta">
                {EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}
              </span>
              {job.is_remote_friendly && (
                <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-neon/10 border border-neon/30 text-neon flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" />
                  Remote OK
                </span>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-6 text-white/60">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {job.location_label}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Posted {formatDate(job.created_at)}
            </span>
            {compensation && (
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {compensation}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative py-12 overflow-hidden">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Short description */}
              <div className="mb-8 p-6 bg-dark-100/30 border border-white/10">
                <p className="text-lg text-white/80 leading-relaxed">
                  {job.short_description}
                </p>
              </div>

              {/* Full description */}
              <div className="prose prose-invert max-w-none">
                <h2 className="text-xl font-bold text-white mb-4">About This Role</h2>
                <div className="text-white/70 leading-relaxed whitespace-pre-wrap">
                  {job.full_description}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Apply card */}
                <div className="p-6 bg-dark-100/50 border border-neon/20">
                  {submitted ? (
                    // Success state
                    <div className="text-center py-4">
                      <div className="mx-auto w-16 h-16 bg-neon/10 border border-neon/30 flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-neon" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        Application Submitted!
                      </h3>
                      <p className="text-sm text-white/60">
                        Thank you for your interest. We&apos;ll review your application and be in touch soon.
                      </p>
                    </div>
                  ) : showForm ? (
                    // Application form
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <h3 className="text-lg font-bold text-white mb-2">
                        Apply for this Position
                      </h3>

                      {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                          {formError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                            First Name *
                          </label>
                          <Input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="Jane"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                            Last Name *
                          </label>
                          <Input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                          Email *
                        </label>
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="jane@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                          Phone
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                            City
                          </label>
                          <Input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Columbus"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                            State
                          </label>
                          <select
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full h-10 bg-dark-100 border border-white/10 text-white px-3 text-sm focus:border-neon focus:outline-none"
                          >
                            <option value="">Select...</option>
                            {US_STATES.map((state) => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                          LinkedIn URL
                        </label>
                        <Input
                          type="url"
                          value={formData.linkedinUrl}
                          onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                          Cover Letter
                        </label>
                        <textarea
                          value={formData.coverLetter}
                          onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                          rows={4}
                          placeholder="Tell us why you're interested in this position..."
                          className="w-full bg-dark-100 border border-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                          How did you hear about us?
                        </label>
                        <Input
                          type="text"
                          value={formData.howHeard}
                          onChange={(e) => setFormData({ ...formData, howHeard: e.target.value })}
                          placeholder="Social media, referral, etc."
                        />
                      </div>

                      <div className="pt-2 space-y-2">
                        <Button
                          type="submit"
                          variant="neon"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Application'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-white/60"
                          onClick={() => setShowForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    // Apply button
                    <>
                      <h3 className="text-lg font-bold text-white mb-4">
                        Ready to Apply?
                      </h3>

                      {job.application_instructions && (
                        <p className="text-sm text-white/60 mb-4">
                          {job.application_instructions}
                        </p>
                      )}

                      <Button
                        variant="neon"
                        size="lg"
                        className="w-full"
                        onClick={() => setShowForm(true)}
                      >
                        Apply Now
                      </Button>

                      <p className="text-xs text-white/40 mt-4 text-center">
                        Fill out a quick application form to get started.
                      </p>
                    </>
                  )}
                </div>

                {/* Quick facts */}
                <div className="p-6 bg-dark-100/30 border border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">
                    Quick Facts
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-white/40 uppercase tracking-wider">Type</dt>
                      <dd className="text-white">
                        {EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-white/40 uppercase tracking-wider">Location</dt>
                      <dd className="text-white">{job.location_label}</dd>
                    </div>
                    {job.is_remote_friendly && (
                      <div>
                        <dt className="text-xs text-white/40 uppercase tracking-wider">Remote</dt>
                        <dd className="text-neon">Yes, remote-friendly</dd>
                      </div>
                    )}
                    {compensation && (
                      <div>
                        <dt className="text-xs text-white/40 uppercase tracking-wider">Compensation</dt>
                        <dd className="text-white">{compensation}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to careers */}
      <section className="relative py-12 border-t border-white/10">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-white/50 hover:text-neon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to All Positions</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
