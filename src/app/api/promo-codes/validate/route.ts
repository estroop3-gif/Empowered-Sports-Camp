/**
 * Promo Code Validation API
 *
 * POST /api/promo-codes/validate
 * Validates a promo code and returns discount details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

interface ValidateRequest {
  code: string
  tenantId: string
  subtotalCents?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateRequest
    const { code, tenantId, subtotalCents } = body

    if (!code || !tenantId) {
      return NextResponse.json(
        { error: 'Code and tenant ID are required' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Find the promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: code.toUpperCase(),
        },
      },
    })

    if (!promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
    }

    // Check if active
    if (!promoCode.isActive) {
      return NextResponse.json(
        { error: 'This promo code is no longer active' },
        { status: 400 }
      )
    }

    // Check validity dates
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return NextResponse.json(
        { error: 'This promo code is not yet valid' },
        { status: 400 }
      )
    }

    if (promoCode.validUntil && now > promoCode.validUntil) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 }
      )
    }

    // Check usage limits
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 }
      )
    }

    // Check minimum purchase
    if (
      promoCode.minPurchaseCents &&
      subtotalCents &&
      subtotalCents < promoCode.minPurchaseCents
    ) {
      const minAmount = (promoCode.minPurchaseCents / 100).toFixed(2)
      return NextResponse.json(
        { error: `Minimum purchase of $${minAmount} required for this code` },
        { status: 400 }
      )
    }

    // Calculate discount amount if subtotal provided
    let discountAmount = 0
    if (subtotalCents) {
      if (promoCode.discountType === 'percentage') {
        discountAmount = Math.round(subtotalCents * (promoCode.discountValue / 100))
      } else {
        discountAmount = Math.min(promoCode.discountValue, subtotalCents)
      }
    }

    return NextResponse.json({
      data: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType === 'percentage' ? 'percent' : 'fixed',
        discountValue: promoCode.discountValue,
        discountAmount,
        description: promoCode.description,
        appliesTo: promoCode.appliesTo,
      },
    })
  } catch (error) {
    console.error('[API] Promo code validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
