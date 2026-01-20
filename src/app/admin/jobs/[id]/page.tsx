'use client'

/**
 * Admin Edit Job Page
 *
 * Edit an existing job posting.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { buttonVariants } from '@/components/ui/button'
import JobForm from '@/components/admin/jobs/JobForm'
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react'

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
  status: string
  priority: number
  tenant_id: string | null
  created_by_user_id: string
}

export default function AdminEditJobPage() {
  const params = useParams()
  const jobId = params.id as string

  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      loadJob()
    }
  }, [jobId])

  const loadJob = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`)
      const { data, error: apiError } = await res.json()

      if (apiError || !data) {
        setError('Job posting not found')
        return
      }

      setJob(data)
    } catch (err) {
      console.error('Error loading job:', err)
      setError('Failed to load job posting')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !job) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-20">
          <p className="text-white/60 mb-6">{error || 'Job posting not found'}</p>
          <Link
            href="/admin/jobs"
            className={buttonVariants({ variant: 'outline-neon' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Edit Job Posting"
        description={job.title}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Job Postings', href: '/admin/jobs' },
          { label: 'Edit' },
        ]}
      />

      {/* Quick actions */}
      {job.status === 'open' && (
        <div className="mb-6">
          <a
            href={`/careers/${job.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neon hover:text-neon/80 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View public page
          </a>
        </div>
      )}

      <ContentCard>
        <JobForm
          initialData={job}
          jobId={job.id}
          userId={userId}
          tenantId={job.tenant_id || undefined}
        />
      </ContentCard>
    </AdminLayout>
  )
}
