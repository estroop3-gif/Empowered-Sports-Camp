/**
 * Admin Shop Product API
 *
 * GET /api/admin/shop/products/[id] - Get a single product
 * PUT /api/admin/shop/products/[id] - Update a product
 * DELETE /api/admin/shop/products/[id] - Delete a product
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/shop'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await getProductById(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data, error } = await updateProduct(id, body)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await deleteProduct(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
