/**
 * Public Camp Add-Ons API
 *
 * Returns active add-ons for a specific camp.
 * Used by the registration flow to display camp-specific add-ons.
 * No authentication required — this is a public endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    if (!campId) {
      return NextResponse.json({ error: 'campId is required' }, { status: 400 })
    }

    // Fetch active add-ons for this camp
    const addons = await prisma.addon.findMany({
      where: {
        campId,
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Format for the registration flow's AddOn type
    const formatted = addons.map((addon, index) => ({
      id: addon.id,
      tenantId: addon.tenantId,
      name: addon.name,
      slug: addon.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: addon.description,
      hypeCopy: addon.description,
      addonType: 'merchandise' as const,
      scope: 'per_camper' as const,
      price: addon.priceCents,
      compareAtPrice: null,
      imageUrl: null,
      displayOrder: index + 1,
      featured: index === 0,
      isRequired: addon.isRequired,
      maxQuantity: addon.maxQuantity,
      variants: addon.variants.map((v) => ({
        id: v.id,
        addonId: addon.id,
        name: v.name,
        sku: null,
        priceOverride: v.priceAdjustmentCents !== 0 ? addon.priceCents + v.priceAdjustmentCents : null,
        inventoryQuantity: v.inventory ?? 999,
        lowStockThreshold: 5,
        allowBackorder: false,
        isLowStock: v.inventory !== null && v.inventory <= 5 && v.inventory > 0,
        isSoldOut: v.inventory !== null && v.inventory <= 0,
      })),
    }))

    return NextResponse.json({ addons: formatted })
  } catch (error) {
    console.error('[API] Failed to fetch public camp add-ons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch add-ons' },
      { status: 500 }
    )
  }
}
