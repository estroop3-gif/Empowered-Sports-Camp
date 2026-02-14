/**
 * Admin Camp Add-Ons API
 *
 * Manage add-ons for camps (create, update, delete)
 * Supports both camp-specific add-ons and tenant-wide library templates (campId = null)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const SIZE_VARIANTS = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL']

function formatAddon(addon: {
  id: string
  tenantId: string
  campId: string | null
  name: string
  description: string | null
  priceCents: number
  isRequired: boolean
  maxQuantity: number
  isActive: boolean
  isDefault: boolean
  isTaxable: boolean
  collectSize: boolean
  createdAt: Date
  camp?: { id: string; name: string } | null
  variants: Array<{
    id: string
    name: string
    priceAdjustmentCents: number
    inventory: number | null
    isActive: boolean
  }>
}) {
  return {
    id: addon.id,
    tenant_id: addon.tenantId,
    camp_id: addon.campId,
    name: addon.name,
    description: addon.description,
    price_cents: addon.priceCents,
    is_required: addon.isRequired,
    max_quantity: addon.maxQuantity,
    is_active: addon.isActive,
    is_default: addon.isDefault,
    is_taxable: addon.isTaxable,
    collect_size: addon.collectSize,
    created_at: addon.createdAt.toISOString(),
    camp_name: addon.camp?.name || null,
    variants: addon.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price_adjustment_cents: v.priceAdjustmentCents,
      inventory: v.inventory,
      is_active: v.isActive,
    })),
  }
}

// GET - Fetch add-ons for a camp or library templates
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campId = request.nextUrl.searchParams.get('campId')
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    const library = request.nextUrl.searchParams.get('library')

    const whereClause: { campId?: string | null; tenantId?: string } = {}

    if (library === 'true' && tenantId) {
      // Fetch library templates: tenant-scoped, campId = null
      whereClause.tenantId = tenantId
      whereClause.campId = null
    } else if (campId) {
      whereClause.campId = campId
    } else if (tenantId) {
      whereClause.tenantId = tenantId
      whereClause.campId = null
    }

    const addons = await prisma.addon.findMany({
      where: whereClause,
      include: {
        variants: true,
        camp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedAddons = addons.map(formatAddon)

    return NextResponse.json({ addons: formattedAddons })
  } catch (error) {
    console.error('[API] Failed to fetch camp add-ons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch add-ons' },
      { status: 500 }
    )
  }
}

// POST - Create a new add-on for a camp or a library template
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      campId,
      tenantId,
      name,
      description,
      priceCents,
      isRequired,
      maxQuantity,
      isDefault,
      isTaxable,
      collectSize,
      variants,
    } = body

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'tenantId and name are required' },
        { status: 400 }
      )
    }

    // If collectSize is true and no variants provided, auto-create size variants
    const variantsToCreate = variants?.length
      ? variants.map((v: { name: string; priceAdjustmentCents?: number; inventory?: number }) => ({
          name: v.name,
          priceAdjustmentCents: v.priceAdjustmentCents || 0,
          inventory: v.inventory ?? null,
          isActive: true,
        }))
      : collectSize
        ? SIZE_VARIANTS.map((size) => ({
            name: size,
            priceAdjustmentCents: 0,
            inventory: null,
            isActive: true,
          }))
        : undefined

    // Create the add-on
    const addon = await prisma.addon.create({
      data: {
        tenantId,
        campId: campId || null,
        name,
        description: description || null,
        priceCents: priceCents || 0,
        isRequired: isRequired || false,
        maxQuantity: maxQuantity || 1,
        isActive: true,
        isDefault: isDefault || false,
        isTaxable: isTaxable || false,
        collectSize: collectSize || false,
        variants: variantsToCreate ? { create: variantsToCreate } : undefined,
      },
      include: {
        variants: true,
      },
    })

    return NextResponse.json({
      addon: formatAddon({ ...addon, camp: null }),
    })
  } catch (error) {
    console.error('[API] Failed to create camp add-on:', error)
    return NextResponse.json(
      { error: 'Failed to create add-on' },
      { status: 500 }
    )
  }
}

// PUT - Update an add-on
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      addonId,
      name,
      description,
      priceCents,
      isRequired,
      maxQuantity,
      isActive,
      isDefault,
      isTaxable,
      collectSize,
    } = body

    if (!addonId) {
      return NextResponse.json({ error: 'addonId is required' }, { status: 400 })
    }

    // If toggling collectSize on, check if we need to auto-create size variants
    if (collectSize === true) {
      const existingVariants = await prisma.addonVariant.count({
        where: { addonId },
      })
      if (existingVariants === 0) {
        await prisma.addonVariant.createMany({
          data: SIZE_VARIANTS.map((size) => ({
            addonId,
            name: size,
            priceAdjustmentCents: 0,
            isActive: true,
          })),
        })
      }
    }

    const addon = await prisma.addon.update({
      where: { id: addonId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceCents !== undefined && { priceCents }),
        ...(isRequired !== undefined && { isRequired }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isTaxable !== undefined && { isTaxable }),
        ...(collectSize !== undefined && { collectSize }),
      },
      include: {
        variants: true,
      },
    })

    return NextResponse.json({
      addon: formatAddon({ ...addon, camp: null }),
    })
  } catch (error) {
    console.error('[API] Failed to update camp add-on:', error)
    return NextResponse.json(
      { error: 'Failed to update add-on' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an add-on
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const addonId = request.nextUrl.searchParams.get('addonId')

    if (!addonId) {
      return NextResponse.json({ error: 'addonId is required' }, { status: 400 })
    }

    await prisma.addon.delete({
      where: { id: addonId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Failed to delete camp add-on:', error)
    return NextResponse.json(
      { error: 'Failed to delete add-on' },
      { status: 500 }
    )
  }
}
