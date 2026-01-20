/**
 * Admin Shop Product API
 *
 * GET /api/admin/shop/products/[id] - Get a single product
 * PUT /api/admin/shop/products/[id] - Update a product
 * DELETE /api/admin/shop/products/[id] - Delete a product
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/shop'

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
    const { data, error } = await getProductById(id)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in GET /api/admin/shop/products/[id]:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { data, error } = await updateProduct(id, body)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in PUT /api/admin/shop/products/[id]:', err)
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
    const { error } = await deleteProduct(id)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Error in DELETE /api/admin/shop/products/[id]:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
