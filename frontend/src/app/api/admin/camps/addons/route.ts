/**
 * Admin Camp Add-Ons API
 *
 * Manage add-ons for camps (create, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

// GET - Fetch add-ons for a camp or all tenant add-ons
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

    // If campId is provided, get add-ons for that specific camp
    // Otherwise, get tenant-wide add-ons (campId is null)
    const whereClause: { campId?: string | null; tenantId?: string } = {}

    if (campId) {
      whereClause.campId = campId
    } else if (tenantId) {
      // Get tenant-wide add-ons (those without a specific camp)
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

    const formattedAddons = addons.map((addon) => ({
      id: addon.id,
      tenant_id: addon.tenantId,
      camp_id: addon.campId,
      name: addon.name,
      description: addon.description,
      price_cents: addon.priceCents,
      is_required: addon.isRequired,
      max_quantity: addon.maxQuantity,
      is_active: addon.isActive,
      created_at: addon.createdAt.toISOString(),
      camp_name: addon.camp?.name || null,
      variants: addon.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price_adjustment_cents: v.priceAdjustmentCents,
        inventory: v.inventory,
        is_active: v.isActive,
      })),
    }))

    return NextResponse.json({ addons: formattedAddons })
  } catch (error) {
    console.error('[API] Failed to fetch camp add-ons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch add-ons' },
      { status: 500 }
    )
  }
}

// POST - Create a new add-on for a camp
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
      variants,
    } = body

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'tenantId and name are required' },
        { status: 400 }
      )
    }

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
        variants: variants?.length
          ? {
              create: variants.map((v: { name: string; priceAdjustmentCents?: number; inventory?: number }) => ({
                name: v.name,
                priceAdjustmentCents: v.priceAdjustmentCents || 0,
                inventory: v.inventory ?? null,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    })

    return NextResponse.json({
      addon: {
        id: addon.id,
        tenant_id: addon.tenantId,
        camp_id: addon.campId,
        name: addon.name,
        description: addon.description,
        price_cents: addon.priceCents,
        is_required: addon.isRequired,
        max_quantity: addon.maxQuantity,
        is_active: addon.isActive,
        created_at: addon.createdAt.toISOString(),
        variants: addon.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price_adjustment_cents: v.priceAdjustmentCents,
          inventory: v.inventory,
          is_active: v.isActive,
        })),
      },
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
    } = body

    if (!addonId) {
      return NextResponse.json({ error: 'addonId is required' }, { status: 400 })
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
      },
      include: {
        variants: true,
      },
    })

    return NextResponse.json({
      addon: {
        id: addon.id,
        tenant_id: addon.tenantId,
        camp_id: addon.campId,
        name: addon.name,
        description: addon.description,
        price_cents: addon.priceCents,
        is_required: addon.isRequired,
        max_quantity: addon.maxQuantity,
        is_active: addon.isActive,
        created_at: addon.createdAt.toISOString(),
        variants: addon.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price_adjustment_cents: v.priceAdjustmentCents,
          inventory: v.inventory,
          is_active: v.isActive,
        })),
      },
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
