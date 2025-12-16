import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  addJobApplicationNote,
  deleteJobApplicationNote,
} from '@/lib/services/jobApplications'

/**
 * POST /api/admin/job-applications/[id]/notes
 * Add an internal note to a job application
 * Tenant-aware: hq_admin sees all, licensee_owner sees their tenant only
 */
export async function POST(
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

    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    // Tenant filtering based on role
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    const { data, error } = await addJobApplicationNote(id, content, {
      author_user_id: user.id,
      author_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      tenant_id: tenantId,
    })

    if (error) {
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error adding note to job application:', error)
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/job-applications/[id]/notes
 * Delete an internal note from a job application
 * Body: { noteId: string }
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

    // Application ID is in params but we need note ID from body
    await params // Just to consume params
    const body = await request.json()
    const { noteId } = body

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Tenant filtering based on role
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    const { data, error } = await deleteJobApplicationNote(noteId, tenantId)

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
    console.error('Error deleting note from job application:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
