/**
 * Concession Credits Fulfill API (safety net)
 *
 * POST /api/concession-credits/fulfill
 * Called from the success page after Stripe checkout completes.
 * Verifies payment with Stripe and credits the account if the webhook missed it.
 * Fully idempotent — safe to call multiple times for the same session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { sessionId } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Retrieve the session from Stripe to verify payment
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Verify ownership
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only process paid store_purchase sessions
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    if (session.metadata?.type !== 'store_purchase') {
      return NextResponse.json({ error: 'Not a store purchase' }, { status: 400 })
    }

    const concessionCredits = parseInt(session.metadata.concessionCredits || '0', 10)
    const { athleteId, campId, registrationId, userId } = session.metadata

    if (concessionCredits <= 0 || !athleteId || !campId || !registrationId) {
      return NextResponse.json({ data: { alreadyFulfilled: true, balanceCents: 0 } })
    }

    // Idempotency: check if this session was already processed
    const existingTxn = await prisma.concessionCreditTransaction.findFirst({
      where: { stripeCheckoutSessionId: session.id },
    })

    if (existingTxn) {
      // Already fulfilled — return current balance
      const credit = await prisma.concessionCredit.findUnique({
        where: { athleteId_campId: { athleteId, campId } },
      })
      return NextResponse.json({
        data: { alreadyFulfilled: true, balanceCents: credit?.balanceCents ?? 0 },
      })
    }

    // Fulfill: upsert credit + create transaction (atomic)
    let finalBalance = 0
    await prisma.$transaction(async (tx) => {
      const existing = await tx.concessionCredit.findUnique({
        where: { athleteId_campId: { athleteId, campId } },
      })

      let creditRecord
      if (existing) {
        creditRecord = await tx.concessionCredit.update({
          where: { id: existing.id },
          data: { balanceCents: { increment: concessionCredits } },
        })
      } else {
        creditRecord = await tx.concessionCredit.create({
          data: {
            athleteId,
            parentId: userId!,
            campId,
            registrationId,
            balanceCents: concessionCredits,
          },
        })
      }

      await tx.concessionCreditTransaction.create({
        data: {
          creditId: creditRecord.id,
          type: 'purchase',
          amountCents: concessionCredits,
          balanceAfterCents: creditRecord.balanceCents,
          description: 'Concession credits purchase',
          performedBy: userId,
          stripeCheckoutSessionId: session.id,
        },
      })

      finalBalance = creditRecord.balanceCents
    })

    console.log('[ConcessionCredits] Fulfill safety-net applied:', {
      sessionId: session.id,
      athleteId,
      campId,
      amountCents: concessionCredits,
      finalBalance,
    })

    return NextResponse.json({
      data: { alreadyFulfilled: false, balanceCents: finalBalance },
    })
  } catch (error) {
    console.error('[POST /api/concession-credits/fulfill] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
