/**
 * Admin Venue Contract Document API
 *
 * GET /api/admin/venues/[id]/contracts/[contractId]/document - Get presigned URL for viewing document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { getContractById } from '@/lib/services/venue-contracts'
import { getDownloadUrl, extractKeyFromUrl } from '@/lib/storage/s3'

interface RouteParams {
  params: Promise<{ id: string; contractId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: venueId, contractId } = await params

    const { data: contract, error } = await getContractById({
      id: contractId,
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (!contract.document_url) {
      return NextResponse.json({ error: 'No document attached to this contract' }, { status: 404 })
    }

    // Extract the S3 key from the document URL
    const key = extractKeyFromUrl(contract.document_url)
    if (!key) {
      return NextResponse.json({ error: 'Invalid document URL' }, { status: 500 })
    }

    // Generate a presigned URL for viewing (1 hour expiry)
    const viewUrl = await getDownloadUrl(key, 3600)

    return NextResponse.json({ url: viewUrl })
  } catch (error) {
    console.error('[API] GET /api/admin/venues/[id]/contracts/[contractId]/document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
