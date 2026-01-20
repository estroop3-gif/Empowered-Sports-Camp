/**
 * Shop Checkout API Route
 *
 * Creates a Stripe Checkout Session for the Empowered Locker.
 * Currently returns a stub response until Stripe is fully configured.
 *
 * POST /api/shop/checkout
 * Body: { cart: CartItem[], profileId?: string, licenseeId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSessionFromCart, isStripeConfigured } from '@/lib/stripe'
import { createOrder } from '@/lib/services/shop'
import type { CartItem } from '@/lib/services/shop'

interface CheckoutRequestBody {
  cart: CartItem[]
  profileId?: string | null
  licenseeId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CheckoutRequestBody = await request.json()

    // Validate cart
    if (!body.cart || !Array.isArray(body.cart) || body.cart.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty or invalid' },
        { status: 400 }
      )
    }

    // Validate cart items
    for (const item of body.cart) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Invalid cart item format' },
          { status: 400 }
        )
      }
    }

    // Build success and cancel URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const successUrl = `${origin}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/shop/cart`

    // Create checkout session
    const result = await createCheckoutSessionFromCart(body.cart, {
      profileId: body.profileId,
      licenseeId: body.licenseeId,
      successUrl,
      cancelUrl,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      // Return stub response with helpful message
      return NextResponse.json({
        success: true,
        configured: false,
        sessionId: result.sessionId,
        sessionUrl: null,
        message: 'Stripe checkout will be wired soon. Your cart has been validated and is ready for purchase once Stripe is configured.',
        debug: {
          cartItems: body.cart.length,
          profileId: body.profileId || 'guest',
          licenseeId: body.licenseeId || 'global',
        },
      })
    }

    // Return real Stripe session URL
    return NextResponse.json({
      success: true,
      configured: true,
      sessionId: result.sessionId,
      sessionUrl: result.sessionUrl,
    })
  } catch (error) {
    console.error('[Checkout API] Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
