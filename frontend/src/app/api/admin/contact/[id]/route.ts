/**
 * Admin Contact Submission Detail API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getContactSubmissionById,
  updateContactSubmissionStatus,
} from '@/lib/services/contact'
import type { ContactSubmissionStatus } from '@/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { data, error } = await getContactSubmissionById(id)

    if (error) {
      return NextResponse.json(
        { data: null, error: 'Failed to fetch submission' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { data: null, error: 'Submission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Admin contact get error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { status, responded_by, internal_notes } = body

    if (!status) {
      return NextResponse.json(
        { data: null, error: 'Status is required' },
        { status: 400 }
      )
    }

    const { data, error } = await updateContactSubmissionStatus(
      id,
      status as ContactSubmissionStatus,
      {
        responded_by,
        internal_notes,
      }
    )

    if (error) {
      return NextResponse.json(
        { data: null, error: 'Failed to update submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Admin contact update error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
