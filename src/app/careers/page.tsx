'use client'

/**
 * Careers Page
 *
 * Public job board showing open positions at Empowered Sports Camp.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Briefcase, MapPin, Filter, Loader2, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import JobCard from '@/components/careers/JobCard'
import { cn } from '@/lib/utils'

interface JobPosting {
  id: string
  title: string
  slug: string
  short_description: string
  location_label: string
  employment_type: string
  is_remote_friendly: boolean
  created_at: string
}

const EMPLOYMENT_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'internship', label: 'Internship' },
]

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employmentFilter, setEmploymentFilter] = useState('all')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs')
      const { data, error: apiError } = await res.json()

      if (apiError) {
        setError('Unable to load job postings. Please try again later.')
        return
      }

      setJobs(data || [])
    } catch (err) {
      console.error('Error loading jobs:', err)
      setError('Unable to load job postings. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Filter jobs by employment type
  const filteredJobs = useMemo(() => {
    if (employmentFilter === 'all') return jobs
    return jobs.filter((job) => job.employment_type === employmentFilter)
  }, [jobs, employmentFilter])

  // Get unique locations for display
  const locations = useMemo(() => {
    const uniqueLocations = new Set(jobs.map((job) => job.location_label))
    return Array.from(uniqueLocations)
  }, [jobs])

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-magenta/10 via-purple/5 to-neon/10" />
        <div className="absolute inset-0 bg-black/60" />

        {/* Glow orbs */}
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-magenta/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30">
                <Briefcase className="h-4 w-4 text-neon" />
                <span className="text-xs font-bold uppercase tracking-widest text-neon">
                  Careers
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="headline-display headline-lg text-white mb-6">
              Careers at{' '}
              <span className="text-neon">Empowered Sports Camp</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/80 mb-6">
              Join a women-led movement giving girls a place to compete, grow, and lead.
            </p>

            {/* Description */}
            <p className="text-white/60 leading-relaxed mb-8 max-w-2xl">
              We&apos;re building something special—all-girls sports camps led by women
              who believe in the power of sport to transform young lives. Whether you&apos;re
              a coach, program director, or operations specialist, there&apos;s a place
              for you on our team.
            </p>

            {/* CTA */}
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-neon hover:text-neon/80 transition-colors group"
            >
              <span className="font-medium">Have questions? Reach out</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* Jobs Section */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/20 to-black" />

        {/* Glow effects */}
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-magenta mb-3">
              Open Positions
            </p>
            <p className="text-white/50 max-w-xl mx-auto">
              Find your role in our growing team of passionate coaches and staff.
            </p>
          </div>

          {/* Filter bar */}
          {jobs.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center gap-2 text-white/50">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEmploymentFilter(option.value)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      employmentFilter === option.value
                        ? 'bg-neon text-dark'
                        : 'bg-dark-100 text-white/60 hover:text-white hover:bg-dark-100/80'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Job listings */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-neon" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-red-400/10 border border-red-400/30 flex items-center justify-center mb-6">
                <Briefcase className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-white/60 mb-6">{error}</p>
              <button
                onClick={loadJobs}
                className={buttonVariants({ variant: 'outline-neon' })}
              >
                Try Again
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
                <Briefcase className="h-8 w-8 text-neon" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {jobs.length === 0
                  ? "We're Not Actively Hiring Right Now"
                  : 'No Matching Positions'}
              </h3>
              <p className="text-white/60 max-w-md mx-auto mb-8">
                {jobs.length === 0
                  ? "We're always building for what's next. Check back soon or reach out on our contact page to express interest."
                  : 'Try adjusting your filters to see more opportunities.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {jobs.length === 0 ? (
                  <Link
                    href="/contact"
                    className={buttonVariants({ variant: 'neon', size: 'lg' })}
                  >
                    Contact Us
                  </Link>
                ) : (
                  <button
                    onClick={() => setEmploymentFilter('all')}
                    className={buttonVariants({ variant: 'outline-neon' })}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  title={job.title}
                  slug={job.slug}
                  shortDescription={job.short_description}
                  locationLabel={job.location_label}
                  employmentType={job.employment_type}
                  isRemoteFriendly={job.is_remote_friendly}
                  createdAt={job.created_at}
                />
              ))}
            </div>
          )}

          {/* Results count */}
          {!loading && !error && filteredJobs.length > 0 && (
            <div className="mt-8 text-center text-sm text-white/40">
              Showing {filteredJobs.length} of {jobs.length} position{jobs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-16 overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="headline-display headline-sm text-white mb-4">
            Don&apos;t See Your Role?
          </h2>
          <p className="text-white/60 mb-8">
            We&apos;re always looking for passionate people who want to make a difference
            in girls&apos; sports. Send us a message and tell us how you&apos;d like to contribute.
          </p>
          <Link
            href="/contact"
            className={buttonVariants({ variant: 'outline-neon', size: 'lg' })}
          >
            Get in Touch
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </section>
    </main>
  )
}
