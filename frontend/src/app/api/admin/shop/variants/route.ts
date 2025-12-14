/**
 * Admin Shop Variants API
 *
 * POST /api/admin/shop/variants - Create a new variant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createVariant } from '@/lib/services/shop'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await createVariant(body)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
