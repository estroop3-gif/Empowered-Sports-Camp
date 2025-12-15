/**
 * Admin Licensee Application Detail API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getLicenseeApplicationById,
  updateLicenseeApplicationStatus,
} from '@/lib/services/licensee-application'
import type { LicenseeApplicationStatus } from '@/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { data, error } = await getLicenseeApplicationById(id)

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
    console.error('Admin licensee application get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewed_by, internal_notes, assigned_territory_id } = body

    // If no status provided, get current status first
    let statusToUse = status
    if (!statusToUse) {
      const { data: currentApp } = await getLicenseeApplicationById(id)
      if (currentApp) {
        statusToUse = currentApp.status
      } else {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }
    }

    const { data, error } = await updateLicenseeApplicationStatus(
      id,
      statusToUse as LicenseeApplicationStatus,
      {
        reviewed_by,
        internal_notes,
        assigned_territory_id,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin licensee application update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
