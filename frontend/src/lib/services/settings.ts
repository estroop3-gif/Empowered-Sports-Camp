/**
 * Settings Service
 *
 * Comprehensive settings management for Empowered Sports Camp.
 * Handles global and tenant-scoped settings with proper resolution,
 * caching, and audit logging.
 *
 * All functions return { data, error } pattern.
 */

import prisma from '@/lib/db/client'
import { z } from 'zod'
import type {
  SettingScope,
  SettingValueType,
  SettingAuditSource,
} from '@/generated/prisma'
import { Prisma } from '@/generated/prisma'
// Note: Cache helpers can be added here when implementing caching
// import { revalidateTag, unstable_cache } from 'next/cache'

// =============================================================================
// SETTINGS SCHEMA - All supported settings keys with defaults and validation
// =============================================================================

/**
 * Settings categories for organization
 */
export const SETTINGS_CATEGORIES = {
  platform: 'Platform',
  tenancy: 'Tenancy',
  camps: 'Camps & Registrations',
  venues: 'Venues',
  athletes: 'Athletes',
  friendPairing: 'Friend Pairing & Grouping',
  notifications: 'Notifications & Email',
  storage: 'Storage & Media',
  payments: 'Payments',
  developer: 'Developer Mode',
} as const

export type SettingsCategory = keyof typeof SETTINGS_CATEGORIES

/**
 * Complete settings schema with keys, defaults, types, and validation
 */
export const SETTINGS_SCHEMA = {
  // ===== PLATFORM =====
  platformName: {
    key: 'platformName',
    category: 'platform' as SettingsCategory,
    label: 'Platform Name',
    description: 'The name of the platform displayed to users',
    valueType: 'STRING' as SettingValueType,
    default: 'Empowered Sports Camp',
    validation: z.string().min(1).max(100),
    tenantOverridable: false,
  },
  supportEmail: {
    key: 'supportEmail',
    category: 'platform' as SettingsCategory,
    label: 'Support Email',
    description: 'Primary support email address',
    valueType: 'STRING' as SettingValueType,
    default: 'support@empoweredsportscamp.com',
    validation: z.string().email(),
    tenantOverridable: true,
  },
  defaultTimezone: {
    key: 'defaultTimezone',
    category: 'platform' as SettingsCategory,
    label: 'Default Timezone',
    description: 'Default timezone for new camps and events',
    valueType: 'STRING' as SettingValueType,
    default: 'America/New_York',
    validation: z.string(),
    tenantOverridable: true,
  },
  maintenanceModeEnabled: {
    key: 'maintenanceModeEnabled',
    category: 'platform' as SettingsCategory,
    label: 'Maintenance Mode',
    description: 'When enabled, blocks non-admin access to the platform',
    valueType: 'BOOLEAN' as SettingValueType,
    default: false,
    validation: z.boolean(),
    tenantOverridable: false,
  },
  legalTermsUrl: {
    key: 'legalTermsUrl',
    category: 'platform' as SettingsCategory,
    label: 'Terms of Service URL',
    description: 'Link to terms of service page',
    valueType: 'STRING' as SettingValueType,
    default: '/terms',
    validation: z.string(),
    tenantOverridable: false,
  },
  legalPrivacyUrl: {
    key: 'legalPrivacyUrl',
    category: 'platform' as SettingsCategory,
    label: 'Privacy Policy URL',
    description: 'Link to privacy policy page',
    valueType: 'STRING' as SettingValueType,
    default: '/privacy',
    validation: z.string(),
    tenantOverridable: false,
  },

  // ===== TENANCY =====
  tenantDefaultConfigTemplate: {
    key: 'tenantDefaultConfigTemplate',
    category: 'tenancy' as SettingsCategory,
    label: 'Default Tenant Config',
    description: 'JSON template for new tenant configuration',
    valueType: 'JSON' as SettingValueType,
    default: {},
    validation: z.record(z.string(), z.unknown()),
    tenantOverridable: false,
  },
  allowTenantOverridesByCategory: {
    key: 'allowTenantOverridesByCategory',
    category: 'tenancy' as SettingsCategory,
    label: 'Tenant Override Permissions',
    description: 'Which setting categories tenants can override',
    valueType: 'JSON' as SettingValueType,
    default: {
      camps: true,
      venues: true,
      athletes: true,
      friendPairing: true,
      notifications: true,
      storage: true,
      payments: false,
      developer: false,
    },
    validation: z.record(z.string(), z.boolean()),
    tenantOverridable: false,
  },

  // ===== CAMPS & REGISTRATIONS =====
  defaultCampStatusOnCreate: {
    key: 'defaultCampStatusOnCreate',
    category: 'camps' as SettingsCategory,
    label: 'Default Camp Status',
    description: 'Initial status when a new camp is created',
    valueType: 'STRING' as SettingValueType,
    default: 'draft',
    validation: z.enum(['draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled']),
    tenantOverridable: true,
  },
  maxAthletesPerRegistration: {
    key: 'maxAthletesPerRegistration',
    category: 'camps' as SettingsCategory,
    label: 'Max Athletes Per Registration',
    description: 'Maximum number of athletes a parent can register at once',
    valueType: 'NUMBER' as SettingValueType,
    default: 5,
    validation: z.number().int().min(1).max(20),
    tenantOverridable: true,
  },
  registrationCloseHoursBeforeStart: {
    key: 'registrationCloseHoursBeforeStart',
    category: 'camps' as SettingsCategory,
    label: 'Registration Cutoff (Hours)',
    description: 'Hours before camp start when registration closes',
    valueType: 'NUMBER' as SettingValueType,
    default: 24,
    validation: z.number().int().min(0).max(168),
    tenantOverridable: true,
  },
  waitlistEnabled: {
    key: 'waitlistEnabled',
    category: 'camps' as SettingsCategory,
    label: 'Waitlist Enabled',
    description: 'Allow waitlist signups when camps are full',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: true,
  },
  refundWindowDays: {
    key: 'refundWindowDays',
    category: 'camps' as SettingsCategory,
    label: 'Refund Window (Days)',
    description: 'Days before camp start when refunds are allowed',
    valueType: 'NUMBER' as SettingValueType,
    default: 7,
    validation: z.number().int().min(0).max(90),
    tenantOverridable: true,
  },
  refundPolicyText: {
    key: 'refundPolicyText',
    category: 'camps' as SettingsCategory,
    label: 'Refund Policy Text',
    description: 'Displayed refund policy during registration',
    valueType: 'STRING' as SettingValueType,
    default: 'Full refunds are available up to 7 days before camp starts. After that, a 50% refund is available up to 48 hours before camp. No refunds within 48 hours of camp start.',
    validation: z.string().max(1000),
    tenantOverridable: true,
  },

  // ===== VENUES =====
  venueApprovalRequired: {
    key: 'venueApprovalRequired',
    category: 'venues' as SettingsCategory,
    label: 'Venue Approval Required',
    description: 'Whether new venues require HQ approval',
    valueType: 'BOOLEAN' as SettingValueType,
    default: false,
    validation: z.boolean(),
    tenantOverridable: false,
  },
  defaultVenueVisibility: {
    key: 'defaultVenueVisibility',
    category: 'venues' as SettingsCategory,
    label: 'Default Venue Visibility',
    description: 'Default visibility setting for new venues',
    valueType: 'STRING' as SettingValueType,
    default: 'tenant',
    validation: z.enum(['public', 'tenant', 'private']),
    tenantOverridable: true,
  },

  // ===== ATHLETES =====
  athleteRequiredFields: {
    key: 'athleteRequiredFields',
    category: 'athletes' as SettingsCategory,
    label: 'Required Athlete Fields',
    description: 'Fields required when registering an athlete',
    valueType: 'JSON' as SettingValueType,
    default: ['firstName', 'lastName', 'dateOfBirth', 'grade', 'emergencyContactName', 'emergencyContactPhone'],
    validation: z.array(z.string()),
    tenantOverridable: true,
  },
  athleteMedicalInfoRequired: {
    key: 'athleteMedicalInfoRequired',
    category: 'athletes' as SettingsCategory,
    label: 'Medical Info Required',
    description: 'Whether medical information is required for registration',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: true,
  },
  athletePhotoRequired: {
    key: 'athletePhotoRequired',
    category: 'athletes' as SettingsCategory,
    label: 'Photo Required',
    description: 'Whether athlete photo is required for registration',
    valueType: 'BOOLEAN' as SettingValueType,
    default: false,
    validation: z.boolean(),
    tenantOverridable: true,
  },

  // ===== FRIEND PAIRING & GROUPING =====
  friendPairingEnabled: {
    key: 'friendPairingEnabled',
    category: 'friendPairing' as SettingsCategory,
    label: 'Friend Pairing Enabled',
    description: 'Allow parents to request friend groupings',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: true,
  },
  friendPairingLabel: {
    key: 'friendPairingLabel',
    category: 'friendPairing' as SettingsCategory,
    label: 'Friend Pairing Label',
    description: 'Branded label for friend pairing feature',
    valueType: 'STRING' as SettingValueType,
    default: 'Build Her Squad',
    validation: z.string().min(1).max(50),
    tenantOverridable: true,
  },
  friendPairingRequestExpirationHours: {
    key: 'friendPairingRequestExpirationHours',
    category: 'friendPairing' as SettingsCategory,
    label: 'Request Expiration (Hours)',
    description: 'Hours until friend pairing requests expire',
    valueType: 'NUMBER' as SettingValueType,
    default: 72,
    validation: z.number().int().min(1).max(720),
    tenantOverridable: true,
  },
  friendPairingMaxRequestsPerRegistration: {
    key: 'friendPairingMaxRequestsPerRegistration',
    category: 'friendPairing' as SettingsCategory,
    label: 'Max Requests Per Registration',
    description: 'Maximum friend pairing requests per registration',
    valueType: 'NUMBER' as SettingValueType,
    default: 3,
    validation: z.number().int().min(1).max(10),
    tenantOverridable: true,
  },

  // ===== NOTIFICATIONS & EMAIL =====
  notificationsEmailEnabled: {
    key: 'notificationsEmailEnabled',
    category: 'notifications' as SettingsCategory,
    label: 'Email Notifications Enabled',
    description: 'Master toggle for email notifications',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: true,
  },
  emailSenderName: {
    key: 'emailSenderName',
    category: 'notifications' as SettingsCategory,
    label: 'Email Sender Name',
    description: 'Name shown as email sender',
    valueType: 'STRING' as SettingValueType,
    default: 'Empowered Sports Camp',
    validation: z.string().min(1).max(100),
    tenantOverridable: true,
  },
  emailSenderAddress: {
    key: 'emailSenderAddress',
    category: 'notifications' as SettingsCategory,
    label: 'Email Sender Address',
    description: 'Email address used as sender',
    valueType: 'STRING' as SettingValueType,
    default: 'noreply@empoweredsportscamp.com',
    validation: z.string().email(),
    tenantOverridable: true,
  },
  notificationsInAppEnabled: {
    key: 'notificationsInAppEnabled',
    category: 'notifications' as SettingsCategory,
    label: 'In-App Notifications Enabled',
    description: 'Master toggle for in-app notifications',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: true,
  },

  // ===== STORAGE & MEDIA =====
  s3UploadsEnabled: {
    key: 's3UploadsEnabled',
    category: 'storage' as SettingsCategory,
    label: 'S3 Uploads Enabled',
    description: 'Enable file uploads to S3',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: false,
  },
  allowedUploadMimeTypes: {
    key: 'allowedUploadMimeTypes',
    category: 'storage' as SettingsCategory,
    label: 'Allowed Upload Types',
    description: 'List of allowed MIME types for uploads',
    valueType: 'JSON' as SettingValueType,
    default: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    validation: z.array(z.string()),
    tenantOverridable: true,
  },
  maxUploadSizeMb: {
    key: 'maxUploadSizeMb',
    category: 'storage' as SettingsCategory,
    label: 'Max Upload Size (MB)',
    description: 'Maximum file upload size in megabytes',
    valueType: 'NUMBER' as SettingValueType,
    default: 10,
    validation: z.number().min(1).max(100),
    tenantOverridable: true,
  },
  signedUrlExpirationSeconds: {
    key: 'signedUrlExpirationSeconds',
    category: 'storage' as SettingsCategory,
    label: 'Signed URL Expiration (Seconds)',
    description: 'How long S3 signed URLs remain valid',
    valueType: 'NUMBER' as SettingValueType,
    default: 3600,
    validation: z.number().int().min(60).max(86400),
    tenantOverridable: false,
  },

  // ===== PAYMENTS =====
  paymentsEnabled: {
    key: 'paymentsEnabled',
    category: 'payments' as SettingsCategory,
    label: 'Payments Enabled',
    description: 'Master toggle for payment processing',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: false,
  },
  paymentsCurrency: {
    key: 'paymentsCurrency',
    category: 'payments' as SettingsCategory,
    label: 'Currency',
    description: 'Default currency for payments',
    valueType: 'STRING' as SettingValueType,
    default: 'USD',
    validation: z.enum(['USD', 'CAD']),
    tenantOverridable: false,
  },
  stripeMode: {
    key: 'stripeMode',
    category: 'payments' as SettingsCategory,
    label: 'Stripe Mode',
    description: 'Live or simulated Stripe integration',
    valueType: 'STRING' as SettingValueType,
    default: 'LIVE',
    validation: z.enum(['LIVE', 'SIMULATED']),
    tenantOverridable: false,
  },
  stripePublishableKey: {
    key: 'stripePublishableKey',
    category: 'payments' as SettingsCategory,
    label: 'Stripe Publishable Key',
    description: 'Stripe publishable API key (safe to expose)',
    valueType: 'STRING' as SettingValueType,
    default: '',
    validation: z.string(),
    tenantOverridable: false,
  },
  showWebhookHealthStatus: {
    key: 'showWebhookHealthStatus',
    category: 'payments' as SettingsCategory,
    label: 'Show Webhook Health',
    description: 'Display webhook health status in admin',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: false,
  },

  // ===== DEVELOPER MODE =====
  developerModeEnabled: {
    key: 'developerModeEnabled',
    category: 'developer' as SettingsCategory,
    label: 'Developer Mode',
    description: 'Master toggle for developer/testing mode',
    valueType: 'BOOLEAN' as SettingValueType,
    default: false,
    validation: z.boolean(),
    tenantOverridable: false,
  },
  simulatedPaymentsDefaultOutcome: {
    key: 'simulatedPaymentsDefaultOutcome',
    category: 'developer' as SettingsCategory,
    label: 'Simulated Payment Outcome',
    description: 'Default outcome for simulated payments',
    valueType: 'STRING' as SettingValueType,
    default: 'SUCCESS',
    validation: z.enum(['SUCCESS', 'DECLINED', 'REQUIRES_ACTION_THEN_SUCCESS']),
    tenantOverridable: false,
  },
  developerModeBannerEnabled: {
    key: 'developerModeBannerEnabled',
    category: 'developer' as SettingsCategory,
    label: 'Show Developer Banner',
    description: 'Show developer mode banner in admin dashboards',
    valueType: 'BOOLEAN' as SettingValueType,
    default: true,
    validation: z.boolean(),
    tenantOverridable: false,
  },
} as const

export type SettingKey = keyof typeof SETTINGS_SCHEMA

// Type for settings values
export type SettingsValues = {
  [K in SettingKey]: typeof SETTINGS_SCHEMA[K]['default']
}

// =============================================================================
// TYPES
// =============================================================================

export interface SettingData {
  id: string
  scope: SettingScope
  tenant_id: string | null
  key: string
  value: unknown
  value_type: SettingValueType
  description: string | null
  updated_at: string
  updated_by_user_id: string | null
}

export interface SettingsUpdateItem {
  key: string
  value: unknown
}

export interface SettingsAuditLogData {
  id: string
  setting_id: string | null
  scope: SettingScope
  tenant_id: string | null
  key: string
  old_value: unknown
  new_value: unknown
  changed_at: string
  changed_by_user_id: string | null
  source: SettingAuditSource
}

// =============================================================================
// CACHE TAGS (disabled for now)
// =============================================================================

// const CACHE_TAG_GLOBAL = 'settings:global'
// const CACHE_TAG_TENANT_PREFIX = 'settings:tenant:'

// function getTenantCacheTag(tenantId: string): string {
//   return `${CACHE_TAG_TENANT_PREFIX}${tenantId}`
// }

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function transformSetting(setting: {
  id: string
  scope: SettingScope
  tenantId: string | null
  key: string
  valueJson: unknown
  valueType: SettingValueType
  description: string | null
  updatedAt: Date
  updatedByUserId: string | null
}): SettingData {
  return {
    id: setting.id,
    scope: setting.scope,
    tenant_id: setting.tenantId,
    key: setting.key,
    value: setting.valueJson,
    value_type: setting.valueType,
    description: setting.description,
    updated_at: setting.updatedAt.toISOString(),
    updated_by_user_id: setting.updatedByUserId,
  }
}

function getDefaultValue(key: string): unknown {
  const schema = SETTINGS_SCHEMA[key as SettingKey]
  return schema?.default ?? null
}

function getValueType(key: string): SettingValueType {
  const schema = SETTINGS_SCHEMA[key as SettingKey]
  return schema?.valueType ?? 'STRING'
}

function isValidSettingKey(key: string): key is SettingKey {
  return key in SETTINGS_SCHEMA
}

// =============================================================================
// CORE SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all effective settings for a context (tenant override > global > default)
 */
export async function getEffectiveSettings(params: {
  tenantId?: string | null
}): Promise<{ data: SettingsValues | null; error: Error | null }> {
  try {
    const { tenantId } = params

    // Start with defaults
    const effectiveSettings: Record<string, unknown> = {}
    for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
      effectiveSettings[key] = schema.default
    }

    // Fetch global settings
    const globalSettings = await prisma.setting.findMany({
      where: { scope: 'GLOBAL' },
    })

    // Apply global overrides
    for (const setting of globalSettings) {
      if (isValidSettingKey(setting.key)) {
        effectiveSettings[setting.key] = setting.valueJson
      }
    }

    // If tenant context, fetch and apply tenant overrides
    if (tenantId) {
      const tenantSettings = await prisma.setting.findMany({
        where: {
          scope: 'TENANT',
          tenantId,
        },
      })

      for (const setting of tenantSettings) {
        if (isValidSettingKey(setting.key)) {
          const schema = SETTINGS_SCHEMA[setting.key]
          // Only apply if tenant overrides are allowed for this setting
          if (schema.tenantOverridable) {
            effectiveSettings[setting.key] = setting.valueJson
          }
        }
      }
    }

    return {
      data: effectiveSettings as SettingsValues,
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error getting effective settings:', error)
    return { data: null, error: error as Error }
  }
}

// Note: Cached version can be enabled when implementing caching
// export const getCachedEffectiveSettings = unstable_cache(
//   async (tenantId: string | null) => {
//     const result = await getEffectiveSettings({ tenantId })
//     return result.data
//   },
//   ['effective-settings'],
//   {
//     tags: [CACHE_TAG_GLOBAL],
//     revalidate: 300, // 5 minutes
//   }
// )

/**
 * Get a single setting value (resolved: tenant override > global > default)
 */
export async function getSetting<K extends SettingKey>(params: {
  key: K
  tenantId?: string | null
}): Promise<{ data: typeof SETTINGS_SCHEMA[K]['default'] | null; error: Error | null }> {
  try {
    const { key, tenantId } = params

    if (!isValidSettingKey(key)) {
      return { data: null, error: new Error(`Unknown setting key: ${key}`) }
    }

    const schema = SETTINGS_SCHEMA[key]
    let value = schema.default

    // Check for global override
    const globalSetting = await prisma.setting.findFirst({
      where: {
        scope: 'GLOBAL',
        key,
      },
    })

    if (globalSetting) {
      value = globalSetting.valueJson as typeof value
    }

    // Check for tenant override if applicable
    if (tenantId && schema.tenantOverridable) {
      const tenantSetting = await prisma.setting.findFirst({
        where: {
          scope: 'TENANT',
          tenantId,
          key,
        },
      })

      if (tenantSetting) {
        value = tenantSetting.valueJson as typeof value
      }
    }

    return { data: value, error: null }
  } catch (error) {
    console.error('[Settings] Error getting setting:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all global settings (for admin display)
 */
export async function getGlobalSettings(): Promise<{
  data: SettingData[] | null
  error: Error | null
}> {
  try {
    const settings = await prisma.setting.findMany({
      where: { scope: 'GLOBAL' },
      orderBy: { key: 'asc' },
    })

    return {
      data: settings.map(transformSetting),
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error getting global settings:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get tenant-specific settings overrides
 */
export async function getTenantSettings(params: {
  tenantId: string
}): Promise<{ data: SettingData[] | null; error: Error | null }> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        scope: 'TENANT',
        tenantId: params.tenantId,
      },
      orderBy: { key: 'asc' },
    })

    return {
      data: settings.map(transformSetting),
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error getting tenant settings:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update global settings (HQ admin only)
 */
export async function updateGlobalSettings(params: {
  updates: SettingsUpdateItem[]
  actingUserId: string
  source?: SettingAuditSource
}): Promise<{ data: { updated: number } | null; error: Error | null }> {
  try {
    const { updates, actingUserId, source = 'ADMIN_UI' } = params

    let updatedCount = 0

    for (const update of updates) {
      if (!isValidSettingKey(update.key)) {
        console.warn(`[Settings] Skipping unknown key: ${update.key}`)
        continue
      }

      const schema = SETTINGS_SCHEMA[update.key]

      // Validate value
      const parseResult = schema.validation.safeParse(update.value)
      if (!parseResult.success) {
        console.warn(`[Settings] Invalid value for ${update.key}:`, parseResult.error)
        continue
      }

      // Get existing setting for audit log
      const existing = await prisma.setting.findFirst({
        where: {
          scope: 'GLOBAL',
          tenantId: null,
          key: update.key,
        },
      })

      // Create or update the setting (upsert doesn't work well with nullable unique fields)
      let upserted
      if (existing) {
        upserted = await prisma.setting.update({
          where: { id: existing.id },
          data: {
            valueJson: update.value as Prisma.InputJsonValue,
            updatedByUserId: actingUserId,
          },
        })
      } else {
        upserted = await prisma.setting.create({
          data: {
            scope: 'GLOBAL',
            tenantId: null,
            key: update.key,
            valueJson: update.value as Prisma.InputJsonValue,
            valueType: schema.valueType,
            description: schema.description,
            updatedByUserId: actingUserId,
          },
        })
      }

      // Create audit log
      await prisma.settingsAuditLog.create({
        data: {
          settingId: upserted.id,
          scope: 'GLOBAL',
          key: update.key,
          oldValueJson: existing?.valueJson ?? Prisma.JsonNull,
          newValueJson: update.value as Prisma.InputJsonValue,
          changedByUserId: actingUserId,
          source,
        },
      })

      updatedCount++
    }

    // Note: Cache invalidation can be added if caching is implemented

    return {
      data: { updated: updatedCount },
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error updating global settings:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update tenant-specific settings
 */
export async function updateTenantSettings(params: {
  tenantId: string
  updates: SettingsUpdateItem[]
  actingUserId: string
  source?: SettingAuditSource
}): Promise<{ data: { updated: number } | null; error: Error | null }> {
  try {
    const { tenantId, updates, actingUserId, source = 'LICENSEE_UI' } = params

    let updatedCount = 0

    for (const update of updates) {
      if (!isValidSettingKey(update.key)) {
        console.warn(`[Settings] Skipping unknown key: ${update.key}`)
        continue
      }

      const schema = SETTINGS_SCHEMA[update.key]

      // Check if tenant can override this setting
      if (!schema.tenantOverridable) {
        console.warn(`[Settings] Setting ${update.key} is not tenant-overridable`)
        continue
      }

      // Validate value
      const parseResult = schema.validation.safeParse(update.value)
      if (!parseResult.success) {
        console.warn(`[Settings] Invalid value for ${update.key}:`, parseResult.error)
        continue
      }

      // Get existing setting for audit log
      const existing = await prisma.setting.findFirst({
        where: {
          scope: 'TENANT',
          tenantId,
          key: update.key,
        },
      })

      // Upsert the setting
      const upserted = await prisma.setting.upsert({
        where: {
          scope_tenantId_key: {
            scope: 'TENANT',
            tenantId,
            key: update.key,
          },
        },
        create: {
          scope: 'TENANT',
          tenantId,
          key: update.key,
          valueJson: update.value as Prisma.InputJsonValue,
          valueType: schema.valueType,
          description: schema.description,
          updatedByUserId: actingUserId,
        },
        update: {
          valueJson: update.value as Prisma.InputJsonValue,
          updatedByUserId: actingUserId,
        },
      })

      // Create audit log
      await prisma.settingsAuditLog.create({
        data: {
          settingId: upserted.id,
          scope: 'TENANT',
          tenantId,
          key: update.key,
          oldValueJson: existing?.valueJson ?? Prisma.JsonNull,
          newValueJson: update.value as Prisma.InputJsonValue,
          changedByUserId: actingUserId,
          source,
        },
      })

      updatedCount++
    }

    // Note: Cache invalidation can be added if caching is implemented

    return {
      data: { updated: updatedCount },
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error updating tenant settings:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Reset a tenant setting to global/default value
 */
export async function resetTenantSetting(params: {
  tenantId: string
  key: string
  actingUserId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { tenantId, key, actingUserId } = params

    // Get existing for audit
    const existing = await prisma.setting.findFirst({
      where: {
        scope: 'TENANT',
        tenantId,
        key,
      },
    })

    if (!existing) {
      return { data: { success: true }, error: null } // Already at default
    }

    // Create audit log before deleting
    await prisma.settingsAuditLog.create({
      data: {
        settingId: existing.id,
        scope: 'TENANT',
        tenantId,
        key,
        oldValueJson: existing.valueJson ?? Prisma.JsonNull,
        newValueJson: Prisma.JsonNull,
        changedByUserId: actingUserId,
        source: 'LICENSEE_UI',
      },
    })

    // Delete the tenant override
    await prisma.setting.delete({
      where: { id: existing.id },
    })

    // Note: Cache invalidation can be added if caching is implemented

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Settings] Error resetting tenant setting:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get settings audit history
 */
export async function getSettingsAuditLogs(params: {
  tenantId?: string | null
  key?: string
  limit?: number
  offset?: number
}): Promise<{ data: SettingsAuditLogData[] | null; error: Error | null }> {
  try {
    const { tenantId, key, limit = 50, offset = 0 } = params

    const where: Prisma.SettingsAuditLogWhereInput = {}

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (key) {
      where.key = key
    }

    const logs = await prisma.settingsAuditLog.findMany({
      where,
      orderBy: { changedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return {
      data: logs.map((log) => ({
        id: log.id,
        setting_id: log.settingId,
        scope: log.scope,
        tenant_id: log.tenantId,
        key: log.key,
        old_value: log.oldValueJson,
        new_value: log.newValueJson,
        changed_at: log.changedAt.toISOString(),
        changed_by_user_id: log.changedByUserId,
        source: log.source,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Settings] Error getting audit logs:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// CONVENIENCE HELPERS FOR SPECIFIC SETTINGS
// =============================================================================

/**
 * Check if developer mode is enabled
 */
export async function isDeveloperModeEnabled(): Promise<boolean> {
  const result = await getSetting({ key: 'developerModeEnabled' })
  return result.data ?? false
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceModeEnabled(): Promise<boolean> {
  const result = await getSetting({ key: 'maintenanceModeEnabled' })
  return result.data ?? false
}

/**
 * Check if payments are enabled
 */
export async function arePaymentsEnabled(): Promise<boolean> {
  const result = await getSetting({ key: 'paymentsEnabled' })
  return result.data ?? true
}

/**
 * Get Stripe mode (LIVE or SIMULATED)
 * If developer mode is enabled, always returns SIMULATED
 */
export async function getStripeMode(): Promise<'LIVE' | 'SIMULATED'> {
  const devMode = await isDeveloperModeEnabled()
  if (devMode) {
    return 'SIMULATED'
  }

  const result = await getSetting({ key: 'stripeMode' })
  return (result.data as 'LIVE' | 'SIMULATED') ?? 'LIVE'
}

/**
 * Check if friend pairing is enabled for a tenant
 */
export async function isFriendPairingEnabled(tenantId?: string): Promise<boolean> {
  const result = await getSetting({ key: 'friendPairingEnabled', tenantId })
  return result.data ?? true
}

/**
 * Get the branded label for friend pairing
 */
export async function getFriendPairingLabel(tenantId?: string): Promise<string> {
  const result = await getSetting({ key: 'friendPairingLabel', tenantId })
  return result.data ?? 'Build Her Squad'
}

/**
 * Get upload restrictions
 */
export async function getUploadRestrictions(tenantId?: string): Promise<{
  allowedMimeTypes: string[]
  maxSizeMb: number
}> {
  const [mimeResult, sizeResult] = await Promise.all([
    getSetting({ key: 'allowedUploadMimeTypes', tenantId }),
    getSetting({ key: 'maxUploadSizeMb', tenantId }),
  ])

  return {
    allowedMimeTypes: mimeResult.data ? [...(mimeResult.data as readonly string[])] : [],
    maxSizeMb: (sizeResult.data as number) ?? 10,
  }
}

/**
 * Check if email notifications are enabled
 */
export async function areEmailNotificationsEnabled(tenantId?: string): Promise<boolean> {
  const result = await getSetting({ key: 'notificationsEmailEnabled', tenantId })
  return result.data ?? true
}

/**
 * Get email sender info
 */
export async function getEmailSenderInfo(tenantId?: string): Promise<{
  name: string
  address: string
}> {
  const [nameResult, addressResult] = await Promise.all([
    getSetting({ key: 'emailSenderName', tenantId }),
    getSetting({ key: 'emailSenderAddress', tenantId }),
  ])

  return {
    name: nameResult.data ?? 'Empowered Sports Camp',
    address: addressResult.data ?? 'noreply@empoweredsportscamp.com',
  }
}
