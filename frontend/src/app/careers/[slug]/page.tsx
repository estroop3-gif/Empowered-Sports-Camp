'use client'

/**
 * Job Detail Page
 *
 * Displays full details of a job posting.
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
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'

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

export default function JobDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const getApplicationUrl = () => {
    if (job?.application_url) {
      return job.application_url
    }
    if (job?.application_email) {
      return `mailto:${job.application_email}?subject=Application for ${encodeURIComponent(job.title)}`
    }
    return `mailto:info@empoweredsportscamp.com?subject=Application for ${encodeURIComponent(job?.title || 'Position')}`
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
                  <h3 className="text-lg font-bold text-white mb-4">
                    Ready to Apply?
                  </h3>

                  {job.application_instructions && (
                    <p className="text-sm text-white/60 mb-4">
                      {job.application_instructions}
                    </p>
                  )}

                  <a
                    href={getApplicationUrl()}
                    target={job.application_url ? '_blank' : undefined}
                    rel={job.application_url ? 'noopener noreferrer' : undefined}
                    className={buttonVariants({ variant: 'neon', size: 'lg', className: 'w-full justify-center' })}
                  >
                    {job.application_url ? (
                      <>
                        Apply Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Apply via Email
                      </>
                    )}
                  </a>

                  {!job.application_instructions && (
                    <p className="text-xs text-white/40 mt-4 text-center">
                      Include your resume and a brief note about why you&apos;re interested.
                    </p>
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
