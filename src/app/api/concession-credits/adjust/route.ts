/**
 * Concession Credit Adjustment API
 *
 * POST /api/concession-credits/adjust
 *
 * Adjusts an athlete's concession credit balance (positive or negative).
 * Staff only. Uses a Prisma transaction for atomicity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(
      user.role?.toLowerCase() || ''
    )
    if (!isStaff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { athleteId, campId, amountCents, description } = body as {
      athleteId: string
      campId: string
      amountCents: number
      description: string
    }

    if (!athleteId || !campId || amountCents === undefined || amountCents === 0) {
      return NextResponse.json(
        { error: 'athleteId, campId, and a non-zero amountCents are required' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const credit = await tx.concessionCredit.findUnique({
        where: {
          athleteId_campId: { athleteId, campId },
        },
      })

      if (!credit) {
        throw new Error('Credit record not found')
      }

      if (amountCents < 0 && credit.balanceCents < Math.abs(amountCents)) {
        throw new Error(
          `Insufficient balance: ${credit.balanceCents} cents available, ${Math.abs(amountCents)} cents requested`
        )
      }

      const newBalance = credit.balanceCents + amountCents

      const updatedCredit = await tx.concessionCredit.update({
        where: { id: credit.id },
        data: { balanceCents: newBalance },
      })

      await tx.concessionCreditTransaction.create({
        data: {
          creditId: credit.id,
          type: 'adjustment',
          amountCents,
          balanceAfterCents: newBalance,
          description: description || 'Adjustment',
          performedBy: user.id,
        },
      })

      const recentTransactions = await tx.concessionCreditTransaction.findMany({
        where: { creditId: credit.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          performer: {
            select: { firstName: true, lastName: true },
          },
        },
      })

      return {
        balance: updatedCredit.balanceCents,
        transactions: recentTransactions,
      }
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found')
      ? 404
      : message.includes('Insufficient balance')
        ? 400
        : 500

    if (status === 500) {
      console.error('[POST /api/concession-credits/adjust] Error:', error)
    }

    return NextResponse.json({ error: message }, { status })
  }
}
