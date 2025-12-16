/**
 * Admin Settings API
 *
 * Endpoints for managing global and tenant settings.
 * Only accessible by hq_admin role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getGlobalSettings,
  getTenantSettings,
  getEffectiveSettings,
  updateGlobalSettings,
  updateTenantSettings,
  getSettingsAuditLogs,
  SETTINGS_SCHEMA,
  SETTINGS_CATEGORIES,
} from '@/lib/services/settings'

const ALLOWED_ROLES = ['hq_admin']

/**
 * GET /api/admin/settings
 *
 * Get settings based on query params:
 * - scope=global: Get all global settings
 * - scope=tenant&tenantId=xxx: Get tenant settings
 * - scope=effective&tenantId=xxx: Get merged effective settings
 * - schema=true: Include settings schema metadata
 * - audit=true&tenantId=xxx: Get audit logs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'global'
    const tenantId = searchParams.get('tenantId')
    const includeSchema = searchParams.get('schema') === 'true'
    const includeAudit = searchParams.get('audit') === 'true'

    // Return audit logs if requested
    if (includeAudit) {
      const { data, error } = await getSettingsAuditLogs({
        tenantId: tenantId || undefined,
        limit: 100,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Build response
    const response: {
      data: Record<string, unknown>
      schema?: typeof SETTINGS_SCHEMA
      categories?: typeof SETTINGS_CATEGORIES
    } = {
      data: {},
    }

    if (scope === 'global') {
      const { data, error } = await getGlobalSettings()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      response.data = { settings: data }
    } else if (scope === 'tenant' && tenantId) {
      const { data, error } = await getTenantSettings({ tenantId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      response.data = { settings: data }
    } else if (scope === 'effective') {
      const { data, error } = await getEffectiveSettings({ tenantId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      response.data = { settings: data }
    }

    // Include schema if requested
    if (includeSchema) {
      response.schema = SETTINGS_SCHEMA
      response.categories = SETTINGS_CATEGORIES
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] GET /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings
 *
 * Update settings:
 * - scope=global: Update global settings (hq_admin only)
 * - scope=tenant&tenantId=xxx: Update tenant settings
 *
 * Body: { updates: [{ key: string, value: unknown }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'global'
    const tenantId = searchParams.get('tenantId')

    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request body: updates array required' },
        { status: 400 }
      )
    }

    if (scope === 'global') {
      const { data, error } = await updateGlobalSettings({
        updates,
        actingUserId: user.id,
        source: 'ADMIN_UI',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    } else if (scope === 'tenant' && tenantId) {
      const { data, error } = await updateTenantSettings({
        tenantId,
        updates,
        actingUserId: user.id,
        source: 'ADMIN_UI',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json(
      { error: 'Invalid scope or missing tenantId' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API] PUT /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
