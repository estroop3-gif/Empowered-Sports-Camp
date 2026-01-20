/**
 * Admin Shop Variant API
 *
 * PUT /api/admin/shop/variants/[id] - Update a variant
 * DELETE /api/admin/shop/variants/[id] - Delete a variant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { updateVariant, deleteVariant } from '@/lib/services/shop'

export async function PUT(
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

    const { data, error } = await updateVariant(id, body)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in PUT /api/admin/shop/variants/[id]:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
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
    const { error } = await deleteVariant(id)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Error in DELETE /api/admin/shop/variants/[id]:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
