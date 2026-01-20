/**
 * Shop Products API
 * GET /api/shop/products - Fetch active products
 * GET /api/shop/products?ids=id1,id2 - Fetch products by IDs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveProducts, getProductsByIds } from '@/lib/services/shop'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')
    const category = searchParams.get('category') || undefined
    const licenseeId = searchParams.get('tenantId') || searchParams.get('licenseeId') || undefined

    // If IDs are provided, fetch specific products
    if (ids) {
      const productIds = ids.split(',').filter(Boolean)
      const { data, error } = await getProductsByIds(productIds)

      if (error) {
        console.error('[Shop Products API] Error fetching by IDs:', error)
        return NextResponse.json(
          { error: 'Failed to fetch products' },
          { status: 500 }
        )
      }

      return NextResponse.json(data || [])
    }

    const { data, error } = await getActiveProducts({ category, licenseeId })

    if (error) {
      console.error('[Shop Products API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Return array directly for the shop page
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[Shop Products API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
