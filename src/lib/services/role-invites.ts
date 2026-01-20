/**
 * Role Invites Service
 *
 * Manages invitations for users to join with specific roles.
 * Supports hierarchical role invitations:
 * - HQ Admin -> Licensee Owner
 * - Licensee Owner -> Director, Coach, CIT Volunteer
 * - Director -> Coach, CIT Volunteer
 * - Coach -> CIT Volunteer
 */

import prisma from '@/lib/db/client'
import { UserRole } from '@/generated/prisma'

// Define role hierarchy - who can invite whom
const ROLE_HIERARCHY: Record<string, UserRole[]> = {
  hq_admin: ['licensee_owner', 'director', 'coach', 'cit_volunteer'],
  licensee_owner: ['director', 'coach', 'cit_volunteer'],
  director: ['coach', 'cit_volunteer'],
  coach: ['cit_volunteer'],
  parent: [],
  cit_volunteer: [],
}

// Role display names
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  hq_admin: 'HQ Administrator',
  licensee_owner: 'Licensee Owner',
  director: 'Director',
  coach: 'Coach',
  cit_volunteer: 'CIT Volunteer',
  parent: 'Parent',
}

export interface CreateInviteParams {
  invitedByUserId: string
  invitedByRole: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  targetRole: UserRole
  tenantId?: string
  notes?: string
}

export interface InviteResult {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  targetRole: UserRole
  token: string
  expiresAt: Date
  status: string
}

/**
 * Check if a role can invite another role
 */
export function canInviteRole(inviterRole: string, targetRole: UserRole): boolean {
  const allowedRoles = ROLE_HIERARCHY[inviterRole.toLowerCase()] || []
  return allowedRoles.includes(targetRole)
}

/**
 * Get roles that a user can invite
 */
export function getInvitableRoles(userRole: string): UserRole[] {
  return ROLE_HIERARCHY[userRole.toLowerCase()] || []
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role.toLowerCase()] || role
}

/**
 * Create a new role invite
 */
export async function createRoleInvite(
  params: CreateInviteParams
): Promise<{ data: InviteResult | null; error: Error | null }> {
  try {
    // Validate role hierarchy
    if (!canInviteRole(params.invitedByRole, params.targetRole)) {
      return {
        data: null,
        error: new Error(`${params.invitedByRole} cannot invite ${params.targetRole}`),
      }
    }

    // Check if there's already a pending invite for this email and role
    const existingInvite = await prisma.roleInvite.findFirst({
      where: {
        email: params.email.toLowerCase(),
        targetRole: params.targetRole,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return {
        data: null,
        error: new Error('An active invite already exists for this email and role'),
      }
    }

    // Create invite with 7-day expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.roleInvite.create({
      data: {
        invitedByUserId: params.invitedByUserId,
        email: params.email.toLowerCase(),
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        targetRole: params.targetRole,
        tenantId: params.tenantId,
        notes: params.notes,
        expiresAt,
        status: 'pending',
      },
    })

    return {
      data: {
        id: invite.id,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        targetRole: invite.targetRole,
        token: invite.token,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error creating role invite:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get invite by token
 */
export async function getInviteByToken(
  token: string
): Promise<{ data: InviteResult | null; error: Error | null }> {
  try {
    const invite = await prisma.roleInvite.findUnique({
      where: { token },
      include: {
        tenant: { select: { name: true, slug: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    })

    if (!invite) {
      return { data: null, error: new Error('Invite not found') }
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await prisma.roleInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      })
      return { data: null, error: new Error('This invite has expired') }
    }

    // Check if already used
    if (invite.status !== 'pending') {
      return { data: null, error: new Error(`This invite is ${invite.status}`) }
    }

    return {
      data: {
        id: invite.id,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        targetRole: invite.targetRole,
        token: invite.token,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error getting invite by token:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Accept an invite (mark as accepted and assign role)
 */
export async function acceptInvite(
  token: string,
  acceptedUserId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const invite = await prisma.roleInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return { data: null, error: new Error('Invite not found') }
    }

    if (invite.status !== 'pending') {
      return { data: null, error: new Error(`This invite is ${invite.status}`) }
    }

    if (invite.expiresAt < new Date()) {
      await prisma.roleInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      })
      return { data: null, error: new Error('This invite has expired') }
    }

    // Use transaction to update invite and create role assignment
    await prisma.$transaction(async (tx) => {
      // Mark invite as accepted
      await tx.roleInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedUserId,
        },
      })

      // Create role assignment for the user
      await tx.userRoleAssignment.create({
        data: {
          userId: acceptedUserId,
          tenantId: invite.tenantId,
          role: invite.targetRole,
          isActive: true,
        },
      })
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error accepting invite:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Revoke an invite
 */
export async function revokeInvite(
  inviteId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const invite = await prisma.roleInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite) {
      return { data: null, error: new Error('Invite not found') }
    }

    // Only the inviter or an admin can revoke
    // (For now, just check inviter - admin check would be done in API)
    if (invite.invitedByUserId !== userId) {
      return { data: null, error: new Error('Not authorized to revoke this invite') }
    }

    await prisma.roleInvite.update({
      where: { id: inviteId },
      data: { status: 'revoked' },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error revoking invite:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * List invites sent by a user
 */
export async function listInvitesByUser(
  userId: string,
  options: { status?: string; limit?: number } = {}
): Promise<{ data: InviteResult[] | null; error: Error | null }> {
  try {
    const invites = await prisma.roleInvite.findMany({
      where: {
        invitedByUserId: userId,
        ...(options.status ? { status: options.status as 'pending' | 'accepted' | 'expired' | 'revoked' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
    })

    return {
      data: invites.map((i) => ({
        id: i.id,
        email: i.email,
        firstName: i.firstName,
        lastName: i.lastName,
        targetRole: i.targetRole,
        token: i.token,
        expiresAt: i.expiresAt,
        status: i.status,
      })),
      error: null,
    }
  } catch (err) {
    console.error('Error listing invites:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update invite email sent count
 */
export async function markInviteEmailSent(
  inviteId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.roleInvite.update({
      where: { id: inviteId },
      data: {
        lastEmailSentAt: new Date(),
        emailSentCount: { increment: 1 },
      },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error marking invite email sent:', err)
    return { data: null, error: err as Error }
  }
}
