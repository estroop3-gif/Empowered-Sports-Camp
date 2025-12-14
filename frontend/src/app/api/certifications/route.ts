/**
 * Certifications API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchUserCertifications,
  fetchAllCertifications,
  createCertification,
  deleteCertification,
  reviewCertification,
} from '@/lib/services/certifications'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'byUser'
  const profileId = request.nextUrl.searchParams.get('profileId')
  const status = request.nextUrl.searchParams.get('status')
  const tenantId = request.nextUrl.searchParams.get('tenantId')

  try {
    switch (action) {
      case 'byUser': {
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        const { data, error } = await fetchUserCertifications(profileId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'all': {
        const options: { status?: 'pending_review' | 'approved' | 'rejected' | 'expired'; tenantId?: string } = {}
        if (status) options.status = status as 'pending_review' | 'approved' | 'rejected' | 'expired'
        if (tenantId) options.tenantId = tenantId
        const { data, error } = await fetchAllCertifications(options)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'create': {
        const { data: cert, error } = await createCertification(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: cert })
      }

      case 'delete': {
        const { certId, profileId } = data
        if (!certId || !profileId) {
          return NextResponse.json({ error: 'certId and profileId required' }, { status: 400 })
        }
        const { error } = await deleteCertification(certId, profileId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'review': {
        const { certId, reviewerProfileId, status, reviewerNotes, expiresAt } = data
        if (!certId || !reviewerProfileId || !status) {
          return NextResponse.json({ error: 'certId, reviewerProfileId, and status required' }, { status: 400 })
        }
        const { data: cert, error } = await reviewCertification(
          certId,
          reviewerProfileId,
          status,
          reviewerNotes,
          expiresAt ? new Date(expiresAt) : undefined
        )
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: cert })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
