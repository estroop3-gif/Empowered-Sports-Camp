/**
 * Admin CIT Application Detail API Route
 *
 * Handles operations for individual CIT applications.
 * Access restricted to hq_admin and licensee_owner roles.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getCitApplicationById,
  updateCitApplicationStatus,
  updateCitApplicationNotes,
  addCitProgressEvent,
  createCitAssignment,
} from '@/lib/services/cit'
import type { CitApplicationStatus, CitProgressEventType } from '@/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/cit/[id]
 *
 * Get a single CIT application by ID with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const { data, error } = await getCitApplicationById(id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin CIT get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/cit/[id]
 *
 * Update a CIT application
 * Body can contain:
 * - action: 'update_status' | 'update_notes' | 'add_event' | 'assign_camp'
 * - Plus action-specific data
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update_status': {
        const { status, changed_by, note } = body
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required' },
            { status: 400 }
          )
        }

        const { data, error } = await updateCitApplicationStatus(
          id,
          status as CitApplicationStatus,
          {
            details: note,
            changed_by_user_id: changed_by,
          }
        )

        if (error) {
          console.error('Failed to update CIT status:', error.message, error)
          return NextResponse.json(
            { error: 'Failed to update status', details: error.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ data })
      }

      case 'update_notes': {
        const { notes } = body
        const { data, error } = await updateCitApplicationNotes(id, notes || '')

        if (error) {
          return NextResponse.json(
            { error: 'Failed to update notes' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data })
      }

      case 'add_event': {
        const { event_type, description, performed_by } = body
        if (!event_type || !description) {
          return NextResponse.json(
            { error: 'Event type and description are required' },
            { status: 400 }
          )
        }

        const { data, error } = await addCitProgressEvent(
          id,
          event_type as CitProgressEventType,
          {
            details: description,
            changed_by_user_id: performed_by,
          }
        )

        if (error) {
          return NextResponse.json(
            { error: 'Failed to add event' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data })
      }

      case 'assign_camp': {
        const { camp_id, role, notes } = body
        if (!camp_id) {
          return NextResponse.json(
            { error: 'Camp ID is required' },
            { status: 400 }
          )
        }

        const { data, error } = await createCitAssignment(
          id,
          camp_id,
          {
            role,
            notes,
          }
        )

        if (error) {
          return NextResponse.json(
            { error: 'Failed to assign camp' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin CIT update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
