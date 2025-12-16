import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  listJobApplications,
  getJobApplicationCounts,
  getJobsWithApplicationCounts,
} from '@/lib/services/jobApplications'
import type { JobApplicationStatus } from '@/generated/prisma'

/**
 * GET /api/admin/job-applications
 * List job applications with optional filters
 * Tenant-aware: hq_admin sees all, licensee_owner sees their tenant only
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const jobId = searchParams.get('jobId')
    const counts = searchParams.get('counts')
    const jobs = searchParams.get('jobs')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Determine tenant filtering based on role
    // hq_admin sees all, licensee_owner sees their tenant only
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    // If jobs list requested
    if (jobs === 'true') {
      const { data, error } = await getJobsWithApplicationCounts(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data: { jobs: data } })
    }

    // If counts requested, return counts by status
    if (counts === 'true') {
      const { data, error } = await getJobApplicationCounts(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Build filters
    const filters: {
      tenant_id?: string
      job_id?: string
      status?: JobApplicationStatus
      search?: string
    } = {}

    if (tenantId) {
      filters.tenant_id = tenantId
    }
    if (status && status !== 'all') {
      filters.status = status as JobApplicationStatus
    }
    if (jobId) {
      filters.job_id = jobId
    }
    if (search) {
      filters.search = search
    }

    // Fetch applications using service
    const { data, error } = await listJobApplications(filters, {
      page,
      page_size: pageSize,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching job applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job applications' },
      { status: 500 }
    )
  }
}
