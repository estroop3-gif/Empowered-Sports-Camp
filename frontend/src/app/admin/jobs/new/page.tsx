'use client'

/**
 * Admin New Job Page
 *
 * Create a new job posting.
 */

import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import JobForm from '@/components/admin/jobs/JobForm'

export default function AdminNewJobPage() {
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Use the user's ID for created_by_user_id
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Create Job Posting"
        description="Add a new position to the careers page"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Job Postings', href: '/admin/jobs' },
          { label: 'New Job' },
        ]}
      />

      <ContentCard>
        <JobForm userId={userId} />
      </ContentCard>
    </AdminLayout>
  )
}
