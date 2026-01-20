/**
 * Licensee Job Application Detail API
 *
 * GET /api/licensee/job-applications/[id] - Get job application (scoped to tenant)
 * PATCH /api/licensee/job-applications/[id] - Update status (scoped to tenant)
 * DELETE /api/licensee/job-applications/[id] - Delete application (scoped to tenant)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getJobApplicationById,
  updateJobApplicationStatus,
  deleteJobApplication,
} from '@/lib/services/jobApplications'
import type { JobApplicationStatus } from '@/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { id } = await params

    // Always scope to licensee's tenant
    const { data, error } = await getJobApplicationById(id, user.tenantId)

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/job-applications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, reason } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const { data, error } = await updateJobApplicationStatus(
      id,
      status as JobApplicationStatus,
      {
        changed_by_user_id: user.id,
        changed_by_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        reason,
        tenant_id: user.tenantId,
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
    console.error('[API] PATCH /api/licensee/job-applications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { id } = await params

    const { data, error } = await deleteJobApplication(id, user.tenantId)

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] DELETE /api/licensee/job-applications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
