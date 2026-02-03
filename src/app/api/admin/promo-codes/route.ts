/**
 * Admin Promo Codes API
 *
 * CRUD operations for promo codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

// GET - Fetch promo codes
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = request.nextUrl.searchParams.get('tenantId')
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') === 'true'

    const whereClause: { tenantId?: string; isActive?: boolean } = {}
    if (tenantId) whereClause.tenantId = tenantId
    if (activeOnly) whereClause.isActive = true

    const promoCodes = await prisma.promoCode.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedCodes = promoCodes.map((pc) => ({
      id: pc.id,
      tenant_id: pc.tenantId,
      tenant_name: pc.tenant.name,
      code: pc.code,
      description: pc.description,
      discount_type: pc.discountType,
      discount_value: pc.discountValue,
      applies_to: pc.appliesTo,
      max_uses: pc.maxUses,
      current_uses: pc.currentUses,
      usage_count: pc._count.registrations,
      min_purchase_cents: pc.minPurchaseCents,
      valid_from: pc.validFrom?.toISOString().split('T')[0] || null,
      valid_until: pc.validUntil?.toISOString().split('T')[0] || null,
      is_active: pc.isActive,
      created_at: pc.createdAt.toISOString(),
    }))

    return NextResponse.json({ promoCodes: formattedCodes })
  } catch (error) {
    console.error('[API] Failed to fetch promo codes:', error)
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 })
  }
}

// POST - Create a new promo code
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      tenantId,
      code,
      description,
      discountType,
      discountValue,
      appliesTo,
      maxUses,
      minPurchaseCents,
      validFrom,
      validUntil,
    } = body

    if (!tenantId || !code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'tenantId, code, discountType, and discountValue are required' },
        { status: 400 }
      )
    }

    // Check if code already exists for this tenant
    const existing = await prisma.promoCode.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A promo code with this code already exists' },
        { status: 400 }
      )
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        tenantId,
        code: code.toUpperCase(),
        description: description || null,
        discountType: discountType as 'percentage' | 'fixed',
        discountValue,
        appliesTo: appliesTo || 'both',
        maxUses: maxUses || null,
        minPurchaseCents: minPurchaseCents || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: true,
      },
    })

    return NextResponse.json({
      promoCode: {
        id: promoCode.id,
        tenant_id: promoCode.tenantId,
        code: promoCode.code,
        description: promoCode.description,
        discount_type: promoCode.discountType,
        discount_value: promoCode.discountValue,
        applies_to: promoCode.appliesTo,
        max_uses: promoCode.maxUses,
        current_uses: promoCode.currentUses,
        min_purchase_cents: promoCode.minPurchaseCents,
        valid_from: promoCode.validFrom?.toISOString().split('T')[0] || null,
        valid_until: promoCode.validUntil?.toISOString().split('T')[0] || null,
        is_active: promoCode.isActive,
        created_at: promoCode.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] Failed to create promo code:', error)
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
  }
}

// PUT - Update a promo code
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      promoCodeId,
      description,
      discountType,
      discountValue,
      appliesTo: appliesToUpdate,
      maxUses,
      minPurchaseCents,
      validFrom,
      validUntil,
      isActive,
    } = body

    if (!promoCodeId) {
      return NextResponse.json({ error: 'promoCodeId is required' }, { status: 400 })
    }

    const promoCode = await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: {
        ...(description !== undefined && { description }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(appliesToUpdate !== undefined && { appliesTo: appliesToUpdate }),
        ...(maxUses !== undefined && { maxUses: maxUses || null }),
        ...(minPurchaseCents !== undefined && { minPurchaseCents: minPurchaseCents || null }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      promoCode: {
        id: promoCode.id,
        tenant_id: promoCode.tenantId,
        code: promoCode.code,
        description: promoCode.description,
        discount_type: promoCode.discountType,
        discount_value: promoCode.discountValue,
        applies_to: promoCode.appliesTo,
        max_uses: promoCode.maxUses,
        current_uses: promoCode.currentUses,
        min_purchase_cents: promoCode.minPurchaseCents,
        valid_from: promoCode.validFrom?.toISOString().split('T')[0] || null,
        valid_until: promoCode.validUntil?.toISOString().split('T')[0] || null,
        is_active: promoCode.isActive,
        created_at: promoCode.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] Failed to update promo code:', error)
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
  }
}

// DELETE - Delete a promo code
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = ['hq_admin', 'licensee_owner', 'director'].includes(user.role?.toLowerCase() || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const promoCodeId = request.nextUrl.searchParams.get('promoCodeId')

    if (!promoCodeId) {
      return NextResponse.json({ error: 'promoCodeId is required' }, { status: 400 })
    }

    // Check if promo code has been used
    const promoCode = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    })

    if (!promoCode) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    if (promoCode._count.registrations > 0) {
      // Soft delete - just deactivate it
      await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Promo code deactivated (has been used)',
      })
    }

    // Hard delete if never used
    await prisma.promoCode.delete({
      where: { id: promoCodeId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Failed to delete promo code:', error)
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 })
  }
}
