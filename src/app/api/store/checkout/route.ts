/**
 * Store Checkout API
 *
 * POST /api/store/checkout - Create checkout session for post-registration purchases
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

interface CartItem {
  addOnId: string
  variantId?: string
  quantity: number
  priceCents: number
  name: string
  size?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const {
      registrationId,
      athleteId,
      campId,
      items,
      concessionCredits,
    } = body as {
      registrationId: string
      athleteId: string
      campId: string
      items: CartItem[]
      concessionCredits: number
    }

    // Validate registration belongs to user
    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        parentId: user.id,
      },
      include: {
        athlete: true,
        camp: true,
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Calculate total
    const itemsTotal = items.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0)
    const total = itemsTotal + (concessionCredits || 0)

    if (total <= 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Add cart items
    for (const item of items) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.size ? `Size: ${item.size}` : undefined,
          },
          unit_amount: item.priceCents,
        },
        quantity: item.quantity,
      })
    }

    // Add concession credits
    if (concessionCredits > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Concession Credits',
            description: `Credits for ${registration.athlete.firstName} ${registration.athlete.lastName}`,
          },
          unit_amount: concessionCredits,
        },
        quantity: 1,
      })
    }

    // Get or create Stripe customer by email
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    let stripeCustomerId: string

    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id
    } else {
      // Get profile for name
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true },
      })

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || undefined,
        metadata: {
          userId: user.id,
        },
      })
      stripeCustomerId = customer.id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/camp-store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/camp-store`,
      metadata: {
        type: 'store_purchase',
        registrationId,
        athleteId,
        campId,
        userId: user.id,
        items: JSON.stringify(items),
        concessionCredits: concessionCredits.toString(),
      },
    })

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('[POST /api/store/checkout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
