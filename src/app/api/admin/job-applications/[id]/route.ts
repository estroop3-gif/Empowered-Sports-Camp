import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getJobApplicationById,
  updateJobApplicationStatus,
  deleteJobApplication,
} from '@/lib/services/jobApplications'
import type { JobApplicationStatus } from '@/generated/prisma'

/**
 * GET /api/admin/job-applications/[id]
 * Get a single job application with all details
 * Tenant-aware: hq_admin sees all, licensee_owner sees their tenant only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Tenant filtering based on role
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    const { data, error } = await getJobApplicationById(id, tenantId)

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching job application:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/job-applications/[id]
 * Update a job application status
 * Tenant-aware: hq_admin sees all, licensee_owner sees their tenant only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { status, reason } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Tenant filtering based on role
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    const { data, error } = await updateJobApplicationStatus(
      id,
      status as JobApplicationStatus,
      {
        changed_by_user_id: user.id,
        changed_by_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        reason,
        tenant_id: tenantId,
      }
    )

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating job application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/job-applications/[id]
 * Delete a job application
 * Tenant-aware: hq_admin sees all, licensee_owner sees their tenant only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Tenant filtering based on role
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    const { data, error } = await deleteJobApplication(id, tenantId)

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error deleting job application:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}
