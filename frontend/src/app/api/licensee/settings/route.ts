/**
 * Licensee Settings API
 *
 * Endpoints for licensees to manage their tenant-specific settings.
 * Only accessible by licensee_owner role for their own tenant.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getTenantSettings,
  getEffectiveSettings,
  updateTenantSettings,
  resetTenantSetting,
  SETTINGS_SCHEMA,
  SETTINGS_CATEGORIES,
  type SettingKey,
} from '@/lib/services/settings'

const ALLOWED_ROLES = ['licensee_owner', 'hq_admin']

// Filter schema to only tenant-overridable settings
function getOverridableSchema() {
  const filtered: Record<string, (typeof SETTINGS_SCHEMA)[SettingKey]> = {}
  for (const [key, value] of Object.entries(SETTINGS_SCHEMA)) {
    if (value.tenantOverridable) {
      filtered[key] = value
    }
  }
  return filtered
}

/**
 * GET /api/licensee/settings
 *
 * Get tenant settings for the authenticated user's tenant.
 * Query params:
 * - scope=effective: Get merged effective settings (default)
 * - scope=overrides: Get only tenant overrides
 * - schema=true: Include overridable schema metadata
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

    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'effective'
    const includeSchema = searchParams.get('schema') === 'true'

    const response: {
      data: Record<string, unknown>
      schema?: ReturnType<typeof getOverridableSchema>
      categories?: typeof SETTINGS_CATEGORIES
    } = {
      data: {},
    }

    if (scope === 'overrides') {
      const { data, error } = await getTenantSettings({ tenantId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      response.data = { settings: data }
    } else {
      // Default: effective settings
      const { data, error } = await getEffectiveSettings({ tenantId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      response.data = { settings: data }
    }

    // Include overridable schema if requested
    if (includeSchema) {
      response.schema = getOverridableSchema()
      response.categories = SETTINGS_CATEGORIES
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] GET /api/licensee/settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/licensee/settings
 *
 * Update tenant settings for the authenticated user's tenant.
 * Body: { updates: [{ key: string, value: unknown }] }
 *
 * Only settings marked as tenantOverridable can be updated.
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

    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request body: updates array required' },
        { status: 400 }
      )
    }

    // Filter to only overridable settings
    const filteredUpdates = updates.filter((update) => {
      const schema = SETTINGS_SCHEMA[update.key as SettingKey]
      return schema?.tenantOverridable === true
    })

    if (filteredUpdates.length === 0) {
      return NextResponse.json(
        { error: 'No valid settings to update' },
        { status: 400 }
      )
    }

    const { data, error } = await updateTenantSettings({
      tenantId,
      updates: filteredUpdates,
      actingUserId: user.id,
      source: 'LICENSEE_UI',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] PUT /api/licensee/settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/licensee/settings
 *
 * Reset a tenant setting to global/default value.
 * Query param: key=settingKey
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key required' },
        { status: 400 }
      )
    }

    const { data, error } = await resetTenantSetting({
      tenantId,
      key,
      actingUserId: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] DELETE /api/licensee/settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
