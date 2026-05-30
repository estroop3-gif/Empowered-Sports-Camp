/**
 * Admin Alert Subscriptions API
 *
 * GET  — returns current user's subscription (or null)
 * POST — upsert subscription settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getAdminAlertSubscription,
  upsertAdminAlertSubscription,
} from '@/lib/services/admin-alerts'

const ADMIN_ROLES = ['hq_admin', 'licensee_owner', 'director']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user || !user.role || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await getAdminAlertSubscription(user.id)
    if (error) {
      return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[AlertSubscriptions] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user || !user.role || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { forwardingEmail, enabledCategories, isActive } = body

    if (!forwardingEmail || typeof forwardingEmail !== 'string') {
      return NextResponse.json({ error: 'forwardingEmail is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forwardingEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!Array.isArray(enabledCategories)) {
      return NextResponse.json({ error: 'enabledCategories must be an array' }, { status: 400 })
    }

    const { data, error } = await upsertAdminAlertSubscription({
      userId: user.id,
      forwardingEmail: forwardingEmail.trim(),
      enabledCategories,
      isActive: isActive !== false,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[AlertSubscriptions] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
