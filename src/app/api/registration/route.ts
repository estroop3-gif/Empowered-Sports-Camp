/**
 * Registration API Routes
 *
 * Handles camp registration operations for parents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getCampRegistrationContext,
  createOrUpdateRegistrationDraft,
  createRegistrationCheckout,
  confirmRegistrationsFromPayment,
  getRegistrations,
  cancelRegistration,
} from '@/lib/services/campRegistration'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const action = request.nextUrl.searchParams.get('action') || 'context'
    const campId = request.nextUrl.searchParams.get('campId')

    if (!campId) {
      return NextResponse.json({ error: 'campId required' }, { status: 400 })
    }

    switch (action) {
      case 'context': {
        const { data, error } = await getCampRegistrationContext({
          campId,
          parentId: user.id,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'list': {
        const { data, error } = await getRegistrations({
          campId,
          parentId: user.id,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Registration API] GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // The 'confirm' action doesn't require authentication
    // because the sessionId itself validates the request
    // (users may not be logged in when returning from Stripe checkout)
    if (action === 'confirm') {
      const { sessionId } = body

      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }

      const { data, error } = await confirmRegistrationsFromPayment({ sessionId })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // All other actions require authentication
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'createDraft': {
        const { campId, tenantId, athletes, promoCode } = body

        if (!campId || !athletes || athletes.length === 0) {
          return NextResponse.json({ error: 'campId and athletes required' }, { status: 400 })
        }

        const { data, error } = await createOrUpdateRegistrationDraft({
          campId,
          parentId: user.id,
          tenantId: tenantId || '',
          athletes,
          promoCode,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'checkout': {
        const { registrationIds, tenantId, successUrl, cancelUrl } = body

        if (!registrationIds || registrationIds.length === 0) {
          return NextResponse.json({ error: 'registrationIds required' }, { status: 400 })
        }

        const { data, error } = await createRegistrationCheckout({
          registrationIds,
          tenantId: tenantId || '',
          successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/register/success`,
          cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/register`,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'cancel': {
        const { registrationId, reason } = body

        if (!registrationId) {
          return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
        }

        const { data, error } = await cancelRegistration({
          registrationId,
          parentId: user.id,
          reason,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Registration API] POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
