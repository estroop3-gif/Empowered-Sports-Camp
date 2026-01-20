/**
 * Licensee Job Application Notes API
 *
 * POST /api/licensee/job-applications/[id]/notes - Add internal note (scoped to tenant)
 * DELETE /api/licensee/job-applications/[id]/notes - Delete note (scoped to tenant)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  addJobApplicationNote,
  deleteJobApplicationNote,
} from '@/lib/services/jobApplications'

export async function POST(
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
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    const { data, error } = await addJobApplicationNote(id, content, {
      author_user_id: user.id,
      author_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      tenant_id: user.tenantId,
    })

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/licensee/job-applications/[id]/notes error:', error)
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

    await params // consume params
    const body = await request.json()
    const { noteId } = body

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const { data, error } = await deleteJobApplicationNote(noteId, user.tenantId)

    if (error) {
      if (error.message === 'Note not found') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 })
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] DELETE /api/licensee/job-applications/[id]/notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
