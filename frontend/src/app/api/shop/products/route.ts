/**
 * Shop Products API
 * GET /api/shop/products - Fetch active products
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveProducts } from '@/lib/services/shop'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const licenseeId = searchParams.get('tenantId') || searchParams.get('licenseeId') || undefined

    const products = await getActiveProducts({ category, licenseeId })
    return NextResponse.json(products)
  } catch (error) {
    console.error('[Shop Products API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
