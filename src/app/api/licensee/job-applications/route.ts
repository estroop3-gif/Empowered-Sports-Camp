/**
 * Licensee Job Applications API
 *
 * GET /api/licensee/job-applications - List job applications scoped to licensee's tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  listJobApplications,
  getJobApplicationCounts,
  getJobsWithApplicationCounts,
} from '@/lib/services/jobApplications'
import type { JobApplicationStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Licensee owners and directors can access
    const allowedRoles = ['licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const jobId = searchParams.get('jobId')
    const counts = searchParams.get('counts')
    const jobs = searchParams.get('jobs')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Always scope to licensee's tenant
    const tenantId = user.tenantId

    // If jobs list requested
    if (jobs === 'true') {
      const { data, error } = await getJobsWithApplicationCounts(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data: { jobs: data } })
    }

    // If counts requested
    if (counts === 'true') {
      const { data, error } = await getJobApplicationCounts(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Build filters - always include tenant
    const filters: {
      tenant_id: string
      job_id?: string
      status?: JobApplicationStatus
      search?: string
    } = {
      tenant_id: tenantId,
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

    const { data, error } = await listJobApplications(filters, {
      page,
      page_size: pageSize,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/job-applications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
