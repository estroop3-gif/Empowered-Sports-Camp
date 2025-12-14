/**
 * Admin Shop Variant API
 *
 * PUT /api/admin/shop/variants/[id] - Update a variant
 * DELETE /api/admin/shop/variants/[id] - Delete a variant
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateVariant, deleteVariant } from '@/lib/services/shop'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data, error } = await updateVariant(id, body)

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

  const { error } = await deleteVariant(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
