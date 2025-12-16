/**
 * Admin Testimony Detail API
 *
 * GET    /api/admin/testimonies/[id] - Get testimony by ID
 * PATCH  /api/admin/testimonies/[id] - Update testimony (moderate, feature, etc.)
 * DELETE /api/admin/testimonies/[id] - Delete testimony
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getTestimonyById,
  updateTestimony,
  deleteTestimony,
  type UpdateTestimonyInput,
} from '@/lib/services/testimonies'
import {
  notifyTestimonyApproved,
  notifyTestimonyRejected,
} from '@/lib/services/notifications'
import type { TestimonyStatus } from '@/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role?.toLowerCase() || '')) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { data, error } = await getTestimonyById(id)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ data: null, error: 'Testimony not found' }, { status: 404 })
    }

    // For licensee_owner, verify they own this testimony's tenant
    if (user.role === 'licensee_owner' && data.tenant_id !== user.tenantId) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in GET /api/admin/testimonies/[id]:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role?.toLowerCase() || '')) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // First, get the existing testimony to check permissions and track status change
    const { data: existingTestimony, error: getError } = await getTestimonyById(id)

    if (getError) {
      return NextResponse.json({ data: null, error: getError.message }, { status: 500 })
    }

    if (!existingTestimony) {
      return NextResponse.json({ data: null, error: 'Testimony not found' }, { status: 404 })
    }

    // For licensee_owner, verify they own this testimony's tenant
    if (user.role === 'licensee_owner' && existingTestimony.tenant_id !== user.tenantId) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const previousStatus = existingTestimony.status
    const newStatus = body.status as TestimonyStatus | undefined

    // Build update input
    const input: UpdateTestimonyInput = {
      reviewed_by: user.id,
    }

    if (body.headline !== undefined) input.headline = body.headline
    if (body.body !== undefined) input.body = body.body
    if (body.photo_url !== undefined) input.photo_url = body.photo_url
    if (body.video_url !== undefined) input.video_url = body.video_url
    if (body.status !== undefined) input.status = body.status
    if (body.is_featured !== undefined) input.is_featured = body.is_featured
    if (body.display_order !== undefined) input.display_order = body.display_order
    if (body.review_notes !== undefined) input.review_notes = body.review_notes

    const { data, error } = await updateTestimony(id, input)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    // Send notifications if status changed
    if (newStatus && newStatus !== previousStatus && data) {
      try {
        if (newStatus === 'approved') {
          await notifyTestimonyApproved(
            data.id,
            data.author_name,
            data.created_by_user_id || undefined,
            data.author_email || undefined
          )
        } else if (newStatus === 'rejected') {
          await notifyTestimonyRejected(
            data.id,
            data.author_name,
            data.created_by_user_id || undefined,
            data.author_email || undefined,
            data.review_notes || undefined
          )
        }
      } catch (notifyErr) {
        console.error('Failed to send testimony status notification:', notifyErr)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in PATCH /api/admin/testimonies/[id]:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role?.toLowerCase() || '')) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // First, get the existing testimony to check permissions
    const { data: existingTestimony, error: getError } = await getTestimonyById(id)

    if (getError) {
      return NextResponse.json({ data: null, error: getError.message }, { status: 500 })
    }

    if (!existingTestimony) {
      return NextResponse.json({ data: null, error: 'Testimony not found' }, { status: 404 })
    }

    // For licensee_owner, verify they own this testimony's tenant
    if (user.role === 'licensee_owner' && existingTestimony.tenant_id !== user.tenantId) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await deleteTestimony(id)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in DELETE /api/admin/testimonies/[id]:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
