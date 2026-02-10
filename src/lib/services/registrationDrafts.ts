/**
 * Registration Drafts Service
 *
 * Handles saving, loading, listing, and deleting draft registrations.
 * Also processes timed reminder emails for abandoned drafts.
 */

import { prisma } from '@/lib/db/client'
import {
  sendDraftSaveConfirmationEmail,
  sendDraftReminder24hEmail,
  sendDraftReminder72hEmail,
} from '@/lib/email/draft-reminders'

interface SaveDraftInput {
  parentEmail: string
  parentName?: string
  campId: string
  campName: string
  campSlug: string
  tenantId?: string | null
  checkoutState: Record<string, unknown>
  currentStep: string
  camperCount: number
  totalEstimate?: number | null
}

export async function saveDraft(data: SaveDraftInput) {
  const email = data.parentEmail.toLowerCase().trim()

  // 30-day expiry
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Check if draft already exists for upsert
  const existing = await prisma.registrationDraft.findUnique({
    where: { parentEmail_campId: { parentEmail: email, campId: data.campId } },
  })

  const draft = await prisma.registrationDraft.upsert({
    where: { parentEmail_campId: { parentEmail: email, campId: data.campId } },
    create: {
      parentEmail: email,
      parentName: data.parentName || null,
      campId: data.campId,
      campName: data.campName,
      campSlug: data.campSlug,
      tenantId: data.tenantId || null,
      checkoutState: data.checkoutState as never,
      currentStep: data.currentStep,
      camperCount: data.camperCount,
      totalEstimate: data.totalEstimate ?? null,
      expiresAt,
    },
    update: {
      parentName: data.parentName || undefined,
      checkoutState: data.checkoutState as never,
      currentStep: data.currentStep,
      camperCount: data.camperCount,
      totalEstimate: data.totalEstimate ?? undefined,
      expiresAt,
    },
  })

  // Send confirmation email only on first save (not updates)
  if (!existing) {
    // Get camper names from checkout state
    const campers = (data.checkoutState as { campers?: Array<{ firstName?: string }> }).campers || []
    const camperNames = campers
      .map(c => c.firstName)
      .filter(Boolean) as string[]

    await sendDraftSaveConfirmationEmail({
      parentEmail: email,
      parentName: data.parentName || null,
      campName: data.campName,
      campSlug: data.campSlug,
      camperNames,
    })
  }

  return draft
}

export async function loadDraft(parentEmail: string, campId: string) {
  const email = parentEmail.toLowerCase().trim()

  return prisma.registrationDraft.findFirst({
    where: {
      parentEmail: email,
      campId,
      completedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
}

export async function listDrafts(parentEmail: string) {
  const email = parentEmail.toLowerCase().trim()

  return prisma.registrationDraft.findMany({
    where: {
      parentEmail: email,
      completedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      parentEmail: true,
      parentName: true,
      campId: true,
      campName: true,
      campSlug: true,
      currentStep: true,
      camperCount: true,
      totalEstimate: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function deleteDraft(id: string) {
  return prisma.registrationDraft.delete({
    where: { id },
  })
}

export async function markDraftCompleted(parentEmail: string, campId: string) {
  const email = parentEmail.toLowerCase().trim()

  try {
    return await prisma.registrationDraft.update({
      where: { parentEmail_campId: { parentEmail: email, campId } },
      data: { completedAt: new Date() },
    })
  } catch {
    // Draft may not exist — that's okay
    return null
  }
}

export async function processDraftReminders() {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  const results = { sent24h: 0, sent72h: 0, errors: 0 }

  // 24-hour reminders
  const drafts24h = await prisma.registrationDraft.findMany({
    where: {
      reminder24hSent: false,
      completedAt: null,
      expiresAt: { gt: now },
      createdAt: { lt: twentyFourHoursAgo },
    },
    take: 50,
  })

  for (const draft of drafts24h) {
    try {
      const campers = (draft.checkoutState as { campers?: Array<{ firstName?: string }> }).campers || []
      const camperNames = campers.map(c => c.firstName).filter(Boolean) as string[]

      await sendDraftReminder24hEmail({
        parentEmail: draft.parentEmail,
        parentName: draft.parentName,
        campName: draft.campName,
        campSlug: draft.campSlug,
        camperNames,
      })

      await prisma.registrationDraft.update({
        where: { id: draft.id },
        data: { reminder24hSent: true },
      })
      results.sent24h++
    } catch (err) {
      console.error(`[DraftReminders] Failed to send 24h reminder for draft ${draft.id}:`, err)
      results.errors++
    }
  }

  // 72-hour reminders
  const drafts72h = await prisma.registrationDraft.findMany({
    where: {
      reminder72hSent: false,
      reminder24hSent: true,
      completedAt: null,
      expiresAt: { gt: now },
      createdAt: { lt: seventyTwoHoursAgo },
    },
    take: 50,
  })

  for (const draft of drafts72h) {
    try {
      const campers = (draft.checkoutState as { campers?: Array<{ firstName?: string }> }).campers || []
      const camperNames = campers.map(c => c.firstName).filter(Boolean) as string[]

      await sendDraftReminder72hEmail({
        parentEmail: draft.parentEmail,
        parentName: draft.parentName,
        campName: draft.campName,
        campSlug: draft.campSlug,
        camperNames,
      })

      await prisma.registrationDraft.update({
        where: { id: draft.id },
        data: { reminder72hSent: true },
      })
      results.sent72h++
    } catch (err) {
      console.error(`[DraftReminders] Failed to send 72h reminder for draft ${draft.id}:`, err)
      results.errors++
    }
  }

  return results
}
