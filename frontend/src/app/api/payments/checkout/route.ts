/**
 * SHELL: Stripe Checkout Session API
 *
 * POST /api/payments/checkout
 * Creates a Stripe checkout session for camp registration or shop purchase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { createStripeCheckoutSession, createShopCheckoutSession } from '@/lib/services/payments'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, registrationId, campSessionId, successUrl, cancelUrl } = body

    if (!type || !['registration', 'shop'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "registration" or "shop"' },
        { status: 400 }
      )
    }

    let result

    if (type === 'registration') {
      if (!registrationId || !campSessionId) {
        return NextResponse.json(
          { error: 'registrationId and campSessionId required for registration checkout' },
          { status: 400 }
        )
      }
      result = await createStripeCheckoutSession({
        campSessionId,
        registrationId,
        successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/portal/registration/success`,
        cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/portal/registration/cancel`,
        tenantId: user.tenantId || '',
      })
    } else {
      const { orderId } = body
      if (!orderId) {
        return NextResponse.json(
          { error: 'orderId required for shop checkout' },
          { status: 400 }
        )
      }
      result = await createShopCheckoutSession({
        orderId,
        successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/shop/success`,
        cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/shop/cart`,
        tenantId: user.tenantId || '',
      })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('[API] Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
