/**
 * Waivers Service
 *
 * Service layer for waiver template management, camp waiver requirements,
 * and athlete waiver signings.
 */

import { prisma } from '@/lib/db/client'
import { WaiverSigningStatus, Prisma } from '@/generated/prisma'

// =============================================================================
// TYPES
// =============================================================================

export interface WaiverTemplateData {
  title: string
  description?: string | null
  contentHtml: string
  isMandatorySiteWide?: boolean
  isActive?: boolean
}

export interface CampWaiverRequirementData {
  campId: string
  waiverTemplateId: string
  waiverTemplateVersion?: number | null
  displayOrder?: number
  isRequired?: boolean
}

export interface WaiverSigningData {
  athleteId: string
  parentProfileId: string
  waiverTemplateId: string
  campId?: string | null
  registrationId?: string | null
  campWaiverRequirementId?: string | null
  signerName: string
  signerEmail: string
  signerIpAddress?: string | null
  signaturePayloadJson?: Record<string, unknown> | null
  signatureTyped: string
  signatureDateEntered: Date
}

// =============================================================================
// WAIVER TEMPLATE FUNCTIONS
// =============================================================================

/**
 * Get all waiver templates (optionally filtered by tenant)
 */
export async function getWaiverTemplates(tenantId?: string | null) {
  try {
    const templates = await prisma.waiverTemplate.findMany({
      where: tenantId === null
        ? { tenantId: null } // HQ-only (site-wide)
        : tenantId
          ? { OR: [{ tenantId }, { tenantId: null }] } // Tenant + site-wide
          : {}, // All
      orderBy: [
        { isMandatorySiteWide: 'desc' },
        { title: 'asc' },
      ],
      include: {
        tenant: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            campRequirements: true,
            athleteSignings: { where: { status: 'signed' } },
          },
        },
      },
    })

    return { data: templates, error: null }
  } catch (error) {
    console.error('[WaiverService] getWaiverTemplates error:', error)
    return { data: null, error: 'Failed to fetch waiver templates' }
  }
}

/**
 * Get a single waiver template by ID
 */
export async function getWaiverTemplateById(id: string) {
  try {
    const template = await prisma.waiverTemplate.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        updatedByUser: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: {
          select: {
            campRequirements: true,
            athleteSignings: { where: { status: 'signed' } },
          },
        },
      },
    })

    if (!template) {
      return { data: null, error: 'Waiver template not found' }
    }

    return { data: template, error: null }
  } catch (error) {
    console.error('[WaiverService] getWaiverTemplateById error:', error)
    return { data: null, error: 'Failed to fetch waiver template' }
  }
}

/**
 * Create a new waiver template
 */
export async function createWaiverTemplate(
  data: WaiverTemplateData,
  createdByUserId: string,
  tenantId?: string | null
) {
  try {
    const template = await prisma.$transaction(async (tx) => {
      // Create the template
      const newTemplate = await tx.waiverTemplate.create({
        data: {
          tenantId: tenantId || null,
          title: data.title,
          description: data.description,
          contentHtml: data.contentHtml,
          isMandatorySiteWide: data.isMandatorySiteWide ?? false,
          isActive: data.isActive ?? true,
          currentVersion: 1,
          createdByUserId,
          updatedByUserId: createdByUserId,
        },
      })

      // Create the first version
      await tx.waiverTemplateVersion.create({
        data: {
          waiverTemplateId: newTemplate.id,
          version: 1,
          contentHtml: data.contentHtml,
          createdByUserId,
        },
      })

      return newTemplate
    })

    return { data: template, error: null }
  } catch (error) {
    console.error('[WaiverService] createWaiverTemplate error:', error)
    return { data: null, error: 'Failed to create waiver template' }
  }
}

/**
 * Update a waiver template (creates new version if content changes)
 */
export async function updateWaiverTemplate(
  id: string,
  data: Partial<WaiverTemplateData>,
  updatedByUserId: string
) {
  try {
    const template = await prisma.$transaction(async (tx) => {
      // Get current template
      const current = await tx.waiverTemplate.findUnique({
        where: { id },
        select: { currentVersion: true, contentHtml: true },
      })

      if (!current) {
        throw new Error('Template not found')
      }

      const contentChanged = data.contentHtml && data.contentHtml !== current.contentHtml
      const newVersion = contentChanged ? current.currentVersion + 1 : current.currentVersion

      // Update the template
      const updated = await tx.waiverTemplate.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          contentHtml: data.contentHtml,
          isMandatorySiteWide: data.isMandatorySiteWide,
          isActive: data.isActive,
          currentVersion: newVersion,
          updatedByUserId,
        },
      })

      // Create new version if content changed
      if (contentChanged && data.contentHtml) {
        await tx.waiverTemplateVersion.create({
          data: {
            waiverTemplateId: id,
            version: newVersion,
            contentHtml: data.contentHtml,
            createdByUserId: updatedByUserId,
          },
        })
      }

      return updated
    })

    return { data: template, error: null }
  } catch (error) {
    console.error('[WaiverService] updateWaiverTemplate error:', error)
    return { data: null, error: 'Failed to update waiver template' }
  }
}

/**
 * Delete a waiver template (soft delete by deactivating)
 */
export async function deleteWaiverTemplate(id: string) {
  try {
    // Check if there are any signings
    const signings = await prisma.athleteWaiverSigning.count({
      where: { waiverTemplateId: id },
    })

    if (signings > 0) {
      // Soft delete - just deactivate
      await prisma.waiverTemplate.update({
        where: { id },
        data: { isActive: false },
      })
    } else {
      // Hard delete if no signings
      await prisma.waiverTemplate.delete({
        where: { id },
      })
    }

    return { data: true, error: null }
  } catch (error) {
    console.error('[WaiverService] deleteWaiverTemplate error:', error)
    return { data: null, error: 'Failed to delete waiver template' }
  }
}

// =============================================================================
// MANDATORY SITE-WIDE WAIVERS
// =============================================================================

/**
 * Get all active mandatory site-wide waivers
 */
export async function getMandatorySiteWideWaivers() {
  try {
    const waivers = await prisma.waiverTemplate.findMany({
      where: {
        isMandatorySiteWide: true,
        isActive: true,
      },
      orderBy: { title: 'asc' },
    })

    return { data: waivers, error: null }
  } catch (error) {
    console.error('[WaiverService] getMandatorySiteWideWaivers error:', error)
    return { data: null, error: 'Failed to fetch mandatory waivers' }
  }
}

// =============================================================================
// CAMP WAIVER REQUIREMENTS
// =============================================================================

/**
 * Get waiver requirements for a camp (includes mandatory site-wide waivers)
 */
export async function getCampWaiverRequirements(campId: string) {
  try {
    // Get camp's tenant
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true },
    })

    // Get camp-specific waiver requirements
    const campRequirements = await prisma.campWaiverRequirement.findMany({
      where: { campId },
      orderBy: { displayOrder: 'asc' },
      include: {
        waiverTemplate: {
          select: {
            id: true,
            title: true,
            description: true,
            contentHtml: true,
            currentVersion: true,
            isMandatorySiteWide: true,
          },
        },
      },
    })

    // Get mandatory site-wide waivers
    const siteWideWaivers = await prisma.waiverTemplate.findMany({
      where: {
        isMandatorySiteWide: true,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        contentHtml: true,
        currentVersion: true,
        isMandatorySiteWide: true,
      },
    })

    // Combine, putting site-wide first
    const allRequirements = [
      ...siteWideWaivers.map((w) => ({
        id: `site-wide-${w.id}`,
        campId,
        waiverTemplateId: w.id,
        waiverTemplateVersion: w.currentVersion,
        displayOrder: -1,
        isRequired: true,
        isSiteWide: true,
        waiverTemplate: w,
      })),
      ...campRequirements.map((r) => ({
        ...r,
        isSiteWide: false,
      })),
    ]

    return { data: { requirements: allRequirements, tenantId: camp?.tenantId }, error: null }
  } catch (error) {
    console.error('[WaiverService] getCampWaiverRequirements error:', error)
    return { data: null, error: 'Failed to fetch camp waiver requirements' }
  }
}

/**
 * Set waiver requirements for a camp
 */
export async function setCampWaiverRequirements(
  campId: string,
  requirements: Array<{ waiverTemplateId: string; displayOrder?: number; isRequired?: boolean }>,
  tenantId?: string | null
) {
  try {
    await prisma.$transaction(async (tx) => {
      // Delete existing requirements
      await tx.campWaiverRequirement.deleteMany({
        where: { campId },
      })

      // Create new requirements
      if (requirements.length > 0) {
        await tx.campWaiverRequirement.createMany({
          data: requirements.map((r, index) => ({
            tenantId: tenantId || null,
            campId,
            waiverTemplateId: r.waiverTemplateId,
            displayOrder: r.displayOrder ?? index,
            isRequired: r.isRequired ?? true,
          })),
        })
      }
    })

    return { data: true, error: null }
  } catch (error) {
    console.error('[WaiverService] setCampWaiverRequirements error:', error)
    return { data: null, error: 'Failed to set camp waiver requirements' }
  }
}

/**
 * Add a waiver requirement to a camp
 */
export async function addCampWaiverRequirement(data: CampWaiverRequirementData, tenantId?: string | null) {
  try {
    const requirement = await prisma.campWaiverRequirement.create({
      data: {
        tenantId: tenantId || null,
        campId: data.campId,
        waiverTemplateId: data.waiverTemplateId,
        waiverTemplateVersion: data.waiverTemplateVersion,
        displayOrder: data.displayOrder ?? 0,
        isRequired: data.isRequired ?? true,
      },
      include: {
        waiverTemplate: {
          select: {
            id: true,
            title: true,
            description: true,
            currentVersion: true,
          },
        },
      },
    })

    return { data: requirement, error: null }
  } catch (error) {
    console.error('[WaiverService] addCampWaiverRequirement error:', error)
    return { data: null, error: 'Failed to add camp waiver requirement' }
  }
}

/**
 * Remove a waiver requirement from a camp
 */
export async function removeCampWaiverRequirement(campId: string, waiverTemplateId: string) {
  try {
    await prisma.campWaiverRequirement.deleteMany({
      where: {
        campId,
        waiverTemplateId,
      },
    })

    return { data: true, error: null }
  } catch (error) {
    console.error('[WaiverService] removeCampWaiverRequirement error:', error)
    return { data: null, error: 'Failed to remove camp waiver requirement' }
  }
}

// =============================================================================
// ATHLETE WAIVER SIGNINGS
// =============================================================================

/**
 * Get waiver signing status for a registration
 */
export async function getRegistrationWaiverStatus(registrationId: string) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        campId: true,
        athleteId: true,
        parentId: true,
      },
    })

    if (!registration) {
      return { data: null, error: 'Registration not found' }
    }

    // Get all required waivers for the camp
    const { data: requirements } = await getCampWaiverRequirements(registration.campId)

    if (!requirements) {
      return { data: null, error: 'Failed to fetch waiver requirements' }
    }

    // Get signings for this athlete
    const signings = await prisma.athleteWaiverSigning.findMany({
      where: {
        athleteId: registration.athleteId,
        OR: [
          { registrationId },
          { waiverTemplate: { isMandatorySiteWide: true } },
        ],
      },
      include: {
        waiverTemplate: {
          select: { id: true, title: true, isMandatorySiteWide: true },
        },
      },
    })

    // Map requirements to status
    const waiverStatuses = requirements.requirements.map((req) => {
      const signing = signings.find(
        (s) => s.waiverTemplateId === req.waiverTemplateId
      )

      return {
        waiverTemplateId: req.waiverTemplateId,
        title: req.waiverTemplate.title,
        isRequired: req.isRequired,
        isSiteWide: req.isSiteWide,
        status: signing?.status || 'pending',
        signedAt: signing?.signedAt,
        signerName: signing?.signerName,
        signatureTyped: signing?.signatureTyped,
        signatureDateEntered: signing?.signatureDateEntered,
      }
    })

    const allSigned = waiverStatuses.every(
      (w) => !w.isRequired || w.status === 'signed'
    )

    return {
      data: {
        registrationId,
        waivers: waiverStatuses,
        allRequiredSigned: allSigned,
        totalRequired: waiverStatuses.filter((w) => w.isRequired).length,
        totalSigned: waiverStatuses.filter((w) => w.status === 'signed').length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[WaiverService] getRegistrationWaiverStatus error:', error)
    return { data: null, error: 'Failed to fetch waiver status' }
  }
}

/**
 * Sign a waiver for an athlete
 */
export async function signWaiver(data: WaiverSigningData, tenantId?: string | null) {
  try {
    // Get the waiver template to get current version
    const template = await prisma.waiverTemplate.findUnique({
      where: { id: data.waiverTemplateId },
      select: {
        id: true,
        currentVersion: true,
      },
    })

    if (!template) {
      return { data: null, error: 'Waiver template not found' }
    }

    // Get the current version record
    const versionRecord = await prisma.waiverTemplateVersion.findFirst({
      where: {
        waiverTemplateId: data.waiverTemplateId,
        version: template.currentVersion,
      },
      select: { id: true },
    })

    // Check for existing signing
    const existing = await prisma.athleteWaiverSigning.findFirst({
      where: {
        athleteId: data.athleteId,
        waiverTemplateId: data.waiverTemplateId,
        campId: data.campId || undefined,
        registrationId: data.registrationId || undefined,
      },
    })

    let signing

    if (existing) {
      // Update existing signing
      signing = await prisma.athleteWaiverSigning.update({
        where: { id: existing.id },
        data: {
          status: 'signed' as WaiverSigningStatus,
          versionSigned: template.currentVersion,
          waiverTemplateVersionId: versionRecord?.id,
          signedAt: new Date(),
          signerName: data.signerName,
          signerEmail: data.signerEmail,
          signerIpAddress: data.signerIpAddress,
          signaturePayloadJson: data.signaturePayloadJson as Prisma.InputJsonValue | undefined,
          signatureTyped: data.signatureTyped,
          signatureDateEntered: data.signatureDateEntered,
        },
      })
    } else {
      // Create new signing
      signing = await prisma.athleteWaiverSigning.create({
        data: {
          tenantId: tenantId || null,
          campId: data.campId || null,
          registrationId: data.registrationId || null,
          athleteId: data.athleteId,
          parentProfileId: data.parentProfileId,
          waiverTemplateId: data.waiverTemplateId,
          waiverTemplateVersionId: versionRecord?.id || null,
          campWaiverRequirementId: data.campWaiverRequirementId || null,
          versionSigned: template.currentVersion,
          status: 'signed' as WaiverSigningStatus,
          signedAt: new Date(),
          signerName: data.signerName,
          signerEmail: data.signerEmail,
          signerIpAddress: data.signerIpAddress,
          signaturePayloadJson: data.signaturePayloadJson as Prisma.InputJsonValue | undefined,
          signatureTyped: data.signatureTyped,
          signatureDateEntered: data.signatureDateEntered,
        },
      })
    }

    return { data: signing, error: null }
  } catch (error) {
    console.error('[WaiverService] signWaiver error:', error)
    return { data: null, error: 'Failed to sign waiver' }
  }
}

/**
 * Get all waiver signings for a camp (for Camp Manager)
 */
export async function getCampWaiverSignings(campId: string) {
  try {
    // Get camp requirements
    const { data: requirements } = await getCampWaiverRequirements(campId)

    if (!requirements) {
      return { data: null, error: 'Failed to fetch camp requirements' }
    }

    // Get all registrations for the camp
    const registrations = await prisma.registration.findMany({
      where: {
        campId,
        status: { in: ['confirmed', 'pending'] },
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        athleteWaiverSignings: {
          include: {
            waiverTemplate: {
              select: { id: true, title: true, isMandatorySiteWide: true },
            },
          },
        },
      },
    })

    // Also get site-wide signings for these athletes
    const athleteIds = registrations.map((r) => r.athleteId)
    const siteWideSignings = await prisma.athleteWaiverSigning.findMany({
      where: {
        athleteId: { in: athleteIds },
        waiverTemplate: { isMandatorySiteWide: true },
      },
      include: {
        waiverTemplate: {
          select: { id: true, title: true, isMandatorySiteWide: true },
        },
      },
    })

    // Build summary for each registration
    const summary = registrations.map((reg) => {
      const athleteSiteWideSignings = siteWideSignings.filter(
        (s) => s.athleteId === reg.athleteId
      )
      const allSignings = [...reg.athleteWaiverSignings, ...athleteSiteWideSignings]

      const waiverStatuses = requirements.requirements.map((req) => {
        const signing = allSignings.find(
          (s) => s.waiverTemplateId === req.waiverTemplateId
        )

        return {
          waiverTemplateId: req.waiverTemplateId,
          title: req.waiverTemplate.title,
          isRequired: req.isRequired,
          isSiteWide: req.isSiteWide,
          status: signing?.status || 'pending',
          signedAt: signing?.signedAt,
          signerName: signing?.signerName,
          signatureTyped: signing?.signatureTyped,
          signatureDateEntered: signing?.signatureDateEntered,
        }
      })

      const requiredWaivers = waiverStatuses.filter((w) => w.isRequired)
      const signedRequired = requiredWaivers.filter((w) => w.status === 'signed')

      return {
        registrationId: reg.id,
        athlete: reg.athlete,
        parent: reg.parent,
        waivers: waiverStatuses,
        totalRequired: requiredWaivers.length,
        totalSigned: signedRequired.length,
        allRequiredSigned: requiredWaivers.length === signedRequired.length,
      }
    })

    // Calculate overall stats
    const stats = {
      totalAthletes: summary.length,
      fullyCompliant: summary.filter((s) => s.allRequiredSigned).length,
      pendingWaivers: summary.filter((s) => !s.allRequiredSigned).length,
    }

    return {
      data: {
        requirements: requirements.requirements,
        athletes: summary,
        stats,
      },
      error: null,
    }
  } catch (error) {
    console.error('[WaiverService] getCampWaiverSignings error:', error)
    return { data: null, error: 'Failed to fetch camp waiver signings' }
  }
}

/**
 * Get waiver signing history for an athlete
 */
export async function getAthleteWaiverHistory(athleteId: string) {
  try {
    const signings = await prisma.athleteWaiverSigning.findMany({
      where: { athleteId },
      orderBy: { signedAt: 'desc' },
      include: {
        waiverTemplate: {
          select: { id: true, title: true, isMandatorySiteWide: true },
        },
        camp: {
          select: { id: true, name: true },
        },
      },
    })

    return { data: signings, error: null }
  } catch (error) {
    console.error('[WaiverService] getAthleteWaiverHistory error:', error)
    return { data: null, error: 'Failed to fetch athlete waiver history' }
  }
}

/**
 * Check if all required waivers are signed for a registration
 * Used to gate checkout in registration flow
 */
export async function checkWaiversComplete(registrationId: string): Promise<{ complete: boolean; pending: string[] }> {
  const { data: status } = await getRegistrationWaiverStatus(registrationId)

  if (!status) {
    return { complete: false, pending: [] }
  }

  const pendingWaivers = status.waivers
    .filter((w) => w.isRequired && w.status !== 'signed')
    .map((w) => w.title)

  return {
    complete: status.allRequiredSigned,
    pending: pendingWaivers,
  }
}
