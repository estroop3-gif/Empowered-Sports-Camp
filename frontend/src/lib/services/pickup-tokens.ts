/**
 * Pickup Tokens Service
 *
 * Handles generation, validation, and management of pickup tokens
 * used for QR-based dismissal at the end of camp days.
 */

import prisma from '@/lib/db/client'
import { randomBytes } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface PickupToken {
  id: string
  camp_day_id: string
  athlete_id: string
  parent_profile_id: string
  token: string
  is_used: boolean
  used_at: string | null
  used_by_user_id: string | null
  manual_reason: string | null
  expires_at: string
  created_at: string
}

export interface PickupTokenWithDetails extends PickupToken {
  athlete: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  camp: {
    id: string
    name: string
  }
  camp_day: {
    id: string
    date: string
    day_number: number
  }
}

export interface TokenValidationResult {
  valid: boolean
  error_code?: 'not_found' | 'expired' | 'already_used' | 'wrong_camp_day'
  error_message?: string
  token?: PickupTokenWithDetails
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Get end of day timestamp for expiry
 */
function getEndOfDay(date?: Date): Date {
  const d = date || new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate pickup tokens for all checked-in athletes for a camp day
 * Expires old tokens and creates new ones
 */
export async function generatePickupTokens(
  campDayId: string
): Promise<{ data: { generated: number; expired: number } | null; error: Error | null }> {
  try {
    // Expire all existing tokens for this camp day
    const expireResult = await prisma.pickupToken.updateMany({
      where: {
        campDayId,
        isUsed: false,
      },
      data: {
        expiresAt: new Date(), // Immediately expire
      },
    })

    // Get all checked-in athletes
    const attendance = await prisma.campAttendance.findMany({
      where: {
        campDayId,
        status: 'checked_in',
      },
      select: {
        athleteId: true,
        parentProfileId: true,
      },
    })

    // Generate new tokens for each athlete
    const expiresAt = getEndOfDay()
    const tokens = attendance.map(a => ({
      campDayId,
      athleteId: a.athleteId,
      parentProfileId: a.parentProfileId,
      token: generateToken(),
      isUsed: false,
      expiresAt,
    }))

    if (tokens.length > 0) {
      await prisma.pickupToken.createMany({
        data: tokens,
      })
    }

    return {
      data: {
        generated: tokens.length,
        expired: expireResult.count,
      },
      error: null,
    }
  } catch (error) {
    console.error('[generatePickupTokens] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Generate a pickup token for a single athlete
 */
export async function generatePickupTokenForAthlete(params: {
  campDayId: string
  athleteId: string
  parentProfileId: string
}): Promise<{ data: PickupToken | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, parentProfileId } = params

    // Check if unexpired token already exists
    const existing = await prisma.pickupToken.findFirst({
      where: {
        campDayId,
        athleteId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (existing) {
      return {
        data: transformToken(existing),
        error: null,
      }
    }

    // Create new token
    const token = await prisma.pickupToken.create({
      data: {
        campDayId,
        athleteId,
        parentProfileId,
        token: generateToken(),
        isUsed: false,
        expiresAt: getEndOfDay(),
      },
    })

    return { data: transformToken(token), error: null }
  } catch (error) {
    console.error('[generatePickupTokenForAthlete] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Validate a pickup token
 */
export async function validatePickupToken(
  tokenString: string,
  expectedCampDayId?: string
): Promise<{ data: TokenValidationResult; error: Error | null }> {
  try {
    const token = await prisma.pickupToken.findUnique({
      where: { token: tokenString },
      include: {
        athlete: true,
        campDay: {
          include: {
            camp: true,
          },
        },
      },
    })

    if (!token) {
      return {
        data: {
          valid: false,
          error_code: 'not_found',
          error_message: 'Invalid pickup code',
        },
        error: null,
      }
    }

    if (token.isUsed) {
      return {
        data: {
          valid: false,
          error_code: 'already_used',
          error_message: 'This pickup code has already been used',
        },
        error: null,
      }
    }

    if (token.expiresAt < new Date()) {
      return {
        data: {
          valid: false,
          error_code: 'expired',
          error_message: 'This pickup code has expired',
        },
        error: null,
      }
    }

    if (expectedCampDayId && token.campDayId !== expectedCampDayId) {
      return {
        data: {
          valid: false,
          error_code: 'wrong_camp_day',
          error_message: 'This pickup code is for a different camp day',
        },
        error: null,
      }
    }

    return {
      data: {
        valid: true,
        token: {
          id: token.id,
          camp_day_id: token.campDayId,
          athlete_id: token.athleteId,
          parent_profile_id: token.parentProfileId,
          token: token.token,
          is_used: token.isUsed,
          used_at: token.usedAt?.toISOString() || null,
          used_by_user_id: token.usedByUserId,
          manual_reason: token.manualReason,
          expires_at: token.expiresAt.toISOString(),
          created_at: token.createdAt.toISOString(),
          athlete: {
            id: token.athlete.id,
            first_name: token.athlete.firstName,
            last_name: token.athlete.lastName,
            photo_url: token.athlete.photoUrl,
          },
          camp: {
            id: token.campDay.camp.id,
            name: token.campDay.camp.name,
          },
          camp_day: {
            id: token.campDay.id,
            date: token.campDay.date.toISOString().split('T')[0],
            day_number: token.campDay.dayNumber,
          },
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[validatePickupToken] Error:', error)
    return {
      data: { valid: false, error_message: 'Validation error' },
      error: error as Error,
    }
  }
}

/**
 * Use a pickup token (mark as used and check out the athlete)
 */
export async function usePickupToken(
  tokenString: string,
  usedByUserId: string
): Promise<{
  data: { success: boolean; athlete_name?: string } | null
  error: Error | null
}> {
  try {
    // Validate first
    const validation = await validatePickupToken(tokenString)
    if (!validation.data.valid || !validation.data.token) {
      return {
        data: { success: false },
        error: new Error(validation.data.error_message || 'Invalid token'),
      }
    }

    const token = validation.data.token

    // Use transaction to mark token used and check out athlete
    await prisma.$transaction(async tx => {
      // Mark token as used
      await tx.pickupToken.update({
        where: { id: token.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedByUserId,
        },
      })

      // Check out the athlete
      await tx.campAttendance.updateMany({
        where: {
          campDayId: token.camp_day_id,
          athleteId: token.athlete_id,
          status: 'checked_in',
        },
        data: {
          status: 'checked_out',
          checkOutTime: new Date(),
          checkOutMethod: 'qr',
          checkOutByUserId: usedByUserId,
        },
      })
    })

    return {
      data: {
        success: true,
        athlete_name: `${token.athlete.first_name} ${token.athlete.last_name}`,
      },
      error: null,
    }
  } catch (error) {
    console.error('[usePickupToken] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Manual checkout without token (requires reason)
 */
export async function manualCheckout(params: {
  campDayId: string
  athleteId: string
  checkedOutByUserId: string
  reason: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, checkedOutByUserId, reason } = params

    // Check out the athlete
    const result = await prisma.campAttendance.updateMany({
      where: {
        campDayId,
        athleteId,
        status: 'checked_in',
      },
      data: {
        status: 'checked_out',
        checkOutTime: new Date(),
        checkOutMethod: 'manual',
        checkOutByUserId: checkedOutByUserId,
        checkOutNotes: reason,
      },
    })

    // Also mark any existing token as used with reason
    await prisma.pickupToken.updateMany({
      where: {
        campDayId,
        athleteId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedByUserId: checkedOutByUserId,
        manualReason: reason,
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[manualCheckout] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// TOKEN QUERIES
// ============================================================================

/**
 * Get pickup token for a parent's athlete on a specific camp day
 */
export async function getPickupTokenForParent(params: {
  campDayId: string
  athleteId: string
  parentProfileId: string
}): Promise<{ data: PickupTokenWithDetails | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, parentProfileId } = params

    const token = await prisma.pickupToken.findFirst({
      where: {
        campDayId,
        athleteId,
        parentProfileId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        athlete: true,
        campDay: {
          include: {
            camp: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: token.id,
        camp_day_id: token.campDayId,
        athlete_id: token.athleteId,
        parent_profile_id: token.parentProfileId,
        token: token.token,
        is_used: token.isUsed,
        used_at: token.usedAt?.toISOString() || null,
        used_by_user_id: token.usedByUserId,
        manual_reason: token.manualReason,
        expires_at: token.expiresAt.toISOString(),
        created_at: token.createdAt.toISOString(),
        athlete: {
          id: token.athlete.id,
          first_name: token.athlete.firstName,
          last_name: token.athlete.lastName,
          photo_url: token.athlete.photoUrl,
        },
        camp: {
          id: token.campDay.camp.id,
          name: token.campDay.camp.name,
        },
        camp_day: {
          id: token.campDay.id,
          date: token.campDay.date.toISOString().split('T')[0],
          day_number: token.campDay.dayNumber,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[getPickupTokenForParent] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all active pickup tokens for a camp day (for director view)
 */
export async function getPickupTokensForCampDay(
  campDayId: string
): Promise<{ data: PickupTokenWithDetails[] | null; error: Error | null }> {
  try {
    const tokens = await prisma.pickupToken.findMany({
      where: {
        campDayId,
        expiresAt: { gt: new Date() },
      },
      include: {
        athlete: true,
        campDay: {
          include: {
            camp: true,
          },
        },
      },
      orderBy: [
        { isUsed: 'asc' },
        { athlete: { lastName: 'asc' } },
      ],
    })

    return {
      data: tokens.map(token => ({
        id: token.id,
        camp_day_id: token.campDayId,
        athlete_id: token.athleteId,
        parent_profile_id: token.parentProfileId,
        token: token.token,
        is_used: token.isUsed,
        used_at: token.usedAt?.toISOString() || null,
        used_by_user_id: token.usedByUserId,
        manual_reason: token.manualReason,
        expires_at: token.expiresAt.toISOString(),
        created_at: token.createdAt.toISOString(),
        athlete: {
          id: token.athlete.id,
          first_name: token.athlete.firstName,
          last_name: token.athlete.lastName,
          photo_url: token.athlete.photoUrl,
        },
        camp: {
          id: token.campDay.camp.id,
          name: token.campDay.camp.name,
        },
        camp_day: {
          id: token.campDay.id,
          date: token.campDay.date.toISOString().split('T')[0],
          day_number: token.campDay.dayNumber,
        },
      })),
      error: null,
    }
  } catch (error) {
    console.error('[getPickupTokensForCampDay] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformToken(
  token: {
    id: string
    campDayId: string
    athleteId: string
    parentProfileId: string
    token: string
    isUsed: boolean
    usedAt: Date | null
    usedByUserId: string | null
    manualReason: string | null
    expiresAt: Date
    createdAt: Date
  }
): PickupToken {
  return {
    id: token.id,
    camp_day_id: token.campDayId,
    athlete_id: token.athleteId,
    parent_profile_id: token.parentProfileId,
    token: token.token,
    is_used: token.isUsed,
    used_at: token.usedAt?.toISOString() || null,
    used_by_user_id: token.usedByUserId,
    manual_reason: token.manualReason,
    expires_at: token.expiresAt.toISOString(),
    created_at: token.createdAt.toISOString(),
  }
}
