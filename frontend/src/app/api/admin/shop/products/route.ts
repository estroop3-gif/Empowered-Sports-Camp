/**
 * Admin Shop Products API
 *
 * GET /api/admin/shop/products - List all products for admin
 * POST /api/admin/shop/products - Create a new product
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminProducts, createProduct } from '@/lib/services/shop'

export async function GET(request: NextRequest) {
  const licenseeId = request.nextUrl.searchParams.get('licenseeId')

  const { data, error } = await getAdminProducts({
    licenseeId: licenseeId || undefined
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await createProduct(body)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
