/**
 * Admin Royalties Service
 *
 * HQ Admin service for managing royalty invoices across all licensees.
 * Provides cross-tenant queries, status management, and invoice generation.
 *
 * Uses the RoyaltyInvoice and RoyaltyLineItem Prisma models.
 */

import { prisma } from '@/lib/db/client'
import type { RoyaltyInvoiceStatus } from '@/generated/prisma'
import { notifyRoyaltyInvoiceCreated, notifyRoyaltyInvoiceStatusChanged } from './notifications'

// =============================================================================
// Types
// =============================================================================

export interface AdminRoyaltyInvoiceListItem {
  id: string
  invoiceNumber: string
  tenantId: string
  licenseeName: string
  territoryName: string | null
  campId: string | null
  campName: string | null
  periodStart: string
  periodEnd: string
  grossRevenue: number
  baseRevenue: number
  addonRevenue: number
  royaltyRate: number
  royaltyAmount: number
  adjustments: number
  totalDue: number
  status: RoyaltyInvoiceStatus
  dueDate: string
  issuedAt: string
  paidAt: string | null
  paidAmount: number | null
}

export interface AdminRoyaltyInvoiceDetail extends AdminRoyaltyInvoiceListItem {
  merchandiseRevenue: number
  refundsTotal: number
  netRevenue: number
  paymentMethod: string | null
  paymentReference: string | null
  notes: string | null
  adjustmentNotes: string | null
  disputeReason: string | null
  disputedAt: string | null
  resolvedAt: string | null
  generatedBy: string | null
  paidBy: string | null
  createdAt: string
  updatedAt: string
  licensee: {
    id: string
    name: string
    slug: string
    contactEmail: string | null
    contactPhone: string | null
    royaltyRate: number
  }
  camp: {
    id: string
    name: string
    slug: string
    programType: string
    startDate: string
    endDate: string
    locationName: string | null
    capacity: number | null
    registrationCount: number
  } | null
  lineItems: {
    id: string
    description: string
    category: string
    quantity: number
    unitAmount: number
    totalAmount: number
    royaltyApplies: boolean
  }[]
}

export interface AdminRoyaltySummary {
  totalGrossRevenue: number
  totalRoyaltyDue: number
  totalRoyaltyPaid: number
  totalOutstanding: number
  invoicesCount: number
  invoicesPending: number
  invoicesInvoiced: number
  invoicesPaid: number
  invoicesOverdue: number
  complianceRate: number
}

export interface GetAdminRoyaltyInvoicesParams {
  from?: Date
  to?: Date
  status?: RoyaltyInvoiceStatus
  tenantId?: string
  search?: string
  sortBy?: 'dueDate' | 'generatedAt' | 'grossRevenue' | 'royaltyAmount' | 'status'
  sortDir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// =============================================================================
// Helper Functions
// =============================================================================

const DEFAULT_ROYALTY_RATE_BPS = 1000 // 10% = 1000 basis points

function bpsToDecimal(bps: number): number {
  return bps / 10000
}

function centsToDollars(cents: number): number {
  return cents / 100
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

function generateInvoiceNumber(tenantSlug: string, campId: string | null): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const tenantCode = tenantSlug.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const campCode = campId ? campId.substring(0, 4).toUpperCase() : 'GEN'
  return `ESC-${tenantCode}-${campCode}-${timestamp}`
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get royalty invoices for admin view with filtering and pagination
 */
export async function getAdminRoyaltyInvoices(
  params: GetAdminRoyaltyInvoicesParams = {}
): Promise<{
  data: { items: AdminRoyaltyInvoiceListItem[]; totalCount: number; summary: AdminRoyaltySummary } | null
  error: Error | null
}> {
  try {
    const {
      from,
      to,
      status,
      tenantId,
      search,
      sortBy = 'dueDate',
      sortDir = 'desc',
      limit = 50,
      offset = 0,
    } = params

    // Build where clause
    const where: Record<string, unknown> = {}

    if (from || to) {
      where.dueDate = {}
      if (from) (where.dueDate as Record<string, Date>).gte = from
      if (to) (where.dueDate as Record<string, Date>).lte = to
    }

    if (status) {
      where.status = status
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { camp: { name: { contains: search, mode: 'insensitive' } } },
        { tenant: { territories: { some: { name: { contains: search, mode: 'insensitive' } } } } },
      ]
    }

    // Build orderBy
    const orderByMap: Record<string, Record<string, string>> = {
      dueDate: { dueDate: sortDir },
      generatedAt: { generatedAt: sortDir },
      grossRevenue: { grossRevenueCents: sortDir },
      royaltyAmount: { royaltyDueCents: sortDir },
      status: { status: sortDir },
    }
    const orderBy = orderByMap[sortBy] || { dueDate: 'desc' }

    // Fetch invoices with relations
    const [invoices, totalCount] = await Promise.all([
      prisma.royaltyInvoice.findMany({
        where,
        include: {
          tenant: {
            include: {
              territories: {
                take: 1,
                select: { name: true },
              },
            },
          },
          camp: true,
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.royaltyInvoice.count({ where }),
    ])

    // Calculate summary across all invoices (not just current page)
    const summaryAggregates = await prisma.royaltyInvoice.aggregate({
      where: from || to ? { dueDate: where.dueDate as Record<string, Date> } : {},
      _sum: {
        grossRevenueCents: true,
        royaltyDueCents: true,
        totalDueCents: true,
        paidAmountCents: true,
      },
      _count: true,
    })

    const statusCounts = await prisma.royaltyInvoice.groupBy({
      by: ['status'],
      where: from || to ? { dueDate: where.dueDate as Record<string, Date> } : {},
      _count: true,
    })

    const statusCountMap = Object.fromEntries(
      statusCounts.map(s => [s.status, s._count])
    )

    const totalRoyaltyDue = centsToDollars(summaryAggregates._sum.totalDueCents || 0)
    const totalRoyaltyPaid = centsToDollars(summaryAggregates._sum.paidAmountCents || 0)
    const paidCount = statusCountMap.paid || 0
    const totalInvoices = summaryAggregates._count

    const summary: AdminRoyaltySummary = {
      totalGrossRevenue: centsToDollars(summaryAggregates._sum.grossRevenueCents || 0),
      totalRoyaltyDue,
      totalRoyaltyPaid,
      totalOutstanding: totalRoyaltyDue - totalRoyaltyPaid,
      invoicesCount: totalInvoices,
      invoicesPending: statusCountMap.pending || 0,
      invoicesInvoiced: statusCountMap.invoiced || 0,
      invoicesPaid: paidCount,
      invoicesOverdue: statusCountMap.overdue || 0,
      complianceRate: totalInvoices > 0 ? Math.round((paidCount / totalInvoices) * 100) : 100,
    }

    // Transform to list items
    const items: AdminRoyaltyInvoiceListItem[] = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId: invoice.tenantId,
      licenseeName: invoice.tenant.name,
      territoryName: invoice.tenant.territories[0]?.name || null,
      campId: invoice.campId,
      campName: invoice.camp?.name || null,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      grossRevenue: centsToDollars(invoice.grossRevenueCents),
      baseRevenue: centsToDollars(invoice.registrationRevenueCents),
      addonRevenue: centsToDollars(invoice.addonRevenueCents),
      royaltyRate: bpsToDecimal(invoice.royaltyRateBps),
      royaltyAmount: centsToDollars(invoice.royaltyDueCents),
      adjustments: centsToDollars(invoice.adjustmentCents),
      totalDue: centsToDollars(invoice.totalDueCents),
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      issuedAt: invoice.generatedAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
      paidAmount: invoice.paidAmountCents ? centsToDollars(invoice.paidAmountCents) : null,
    }))

    return {
      data: { items, totalCount, summary },
      error: null,
    }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to get invoices:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get detailed royalty invoice by ID
 */
export async function getAdminRoyaltyInvoiceById(params: {
  id: string
}): Promise<{ data: AdminRoyaltyInvoiceDetail | null; error: Error | null }> {
  try {
    const invoice = await prisma.royaltyInvoice.findUnique({
      where: { id: params.id },
      include: {
        tenant: {
          include: {
            territories: {
              take: 1,
              select: { name: true },
            },
          },
        },
        camp: {
          include: {
            location: true,
            registrations: {
              where: { status: 'confirmed' },
              select: { id: true },
            },
          },
        },
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    const detail: AdminRoyaltyInvoiceDetail = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId: invoice.tenantId,
      licenseeName: invoice.tenant.name,
      territoryName: invoice.tenant.territories[0]?.name || null,
      campId: invoice.campId,
      campName: invoice.camp?.name || null,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      grossRevenue: centsToDollars(invoice.grossRevenueCents),
      baseRevenue: centsToDollars(invoice.registrationRevenueCents),
      addonRevenue: centsToDollars(invoice.addonRevenueCents),
      merchandiseRevenue: centsToDollars(invoice.merchandiseRevenueCents),
      refundsTotal: centsToDollars(invoice.refundsTotalCents),
      netRevenue: centsToDollars(invoice.netRevenueCents),
      royaltyRate: bpsToDecimal(invoice.royaltyRateBps),
      royaltyAmount: centsToDollars(invoice.royaltyDueCents),
      adjustments: centsToDollars(invoice.adjustmentCents),
      totalDue: centsToDollars(invoice.totalDueCents),
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      issuedAt: invoice.generatedAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
      paidAmount: invoice.paidAmountCents ? centsToDollars(invoice.paidAmountCents) : null,
      paymentMethod: invoice.paymentMethod,
      paymentReference: invoice.paymentReference,
      notes: invoice.notes,
      adjustmentNotes: invoice.adjustmentNotes,
      disputeReason: invoice.disputeReason,
      disputedAt: invoice.disputedAt?.toISOString() || null,
      resolvedAt: invoice.resolvedAt?.toISOString() || null,
      generatedBy: invoice.generatedBy,
      paidBy: invoice.paidBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      licensee: {
        id: invoice.tenant.id,
        name: invoice.tenant.name,
        slug: invoice.tenant.slug,
        contactEmail: invoice.tenant.contactEmail,
        contactPhone: invoice.tenant.contactPhone,
        royaltyRate: invoice.tenant.royaltyRate
          ? Number(invoice.tenant.royaltyRate)
          : bpsToDecimal(DEFAULT_ROYALTY_RATE_BPS),
      },
      camp: invoice.camp
        ? {
            id: invoice.camp.id,
            name: invoice.camp.name,
            slug: invoice.camp.slug,
            programType: invoice.camp.programType,
            startDate: invoice.camp.startDate.toISOString(),
            endDate: invoice.camp.endDate.toISOString(),
            locationName: invoice.camp.location?.name || null,
            capacity: invoice.camp.capacity,
            registrationCount: invoice.camp.registrations.length,
          }
        : null,
      lineItems: invoice.lineItems.map(li => ({
        id: li.id,
        description: li.description,
        category: li.category,
        quantity: li.quantity,
        unitAmount: centsToDollars(li.unitAmountCents),
        totalAmount: centsToDollars(li.totalAmountCents),
        royaltyApplies: li.royaltyApplies,
      })),
    }

    return { data: detail, error: null }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to get invoice by ID:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all licensees for filter dropdown
 */
export async function getAdminRoyaltyLicensees(): Promise<{
  data: { id: string; name: string; slug: string }[] | null
  error: Error | null
}> {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { licenseStatus: 'active' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    })

    return { data: tenants, error: null }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to get licensees:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Generate a royalty invoice for a specific camp session
 */
export async function generateRoyaltyInvoiceForSession(params: {
  campId: string
  generatedBy?: string
  dueInDays?: number
}): Promise<{ data: { invoiceId: string; invoiceNumber: string } | null; error: Error | null }> {
  try {
    const { campId, generatedBy, dueInDays = 30 } = params

    // Get camp with registrations and tenant
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        tenant: true,
        registrations: {
          where: { status: 'confirmed' },
          include: {
            registrationAddons: {
              include: {
                addon: true,
                variant: true,
              },
            },
            athlete: true,
          },
        },
        royaltyInvoices: {
          where: {
            status: { notIn: ['paid', 'waived'] },
          },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Check for existing unpaid invoice
    if (camp.royaltyInvoices.length > 0) {
      const existingInvoice = camp.royaltyInvoices[0]
      // If draft/pending, we can update it
      if (existingInvoice.status === 'pending') {
        // Delete and recreate with fresh calculations
        await prisma.royaltyInvoice.delete({ where: { id: existingInvoice.id } })
      } else {
        return {
          data: null,
          error: new Error('An active royalty invoice already exists for this camp'),
        }
      }
    }

    // Calculate royalty rate from tenant settings
    const royaltyRateBps = camp.tenant?.royaltyRate
      ? Math.round(Number(camp.tenant.royaltyRate) * 10000)
      : DEFAULT_ROYALTY_RATE_BPS

    // Calculate revenues and build line items
    let registrationRevenue = 0
    let addonRevenue = 0
    const lineItems: {
      description: string
      category: string
      quantity: number
      unitAmountCents: number
      totalAmountCents: number
      royaltyApplies: boolean
    }[] = []

    for (const reg of camp.registrations) {
      const regAmount = reg.totalPriceCents - reg.addonsTotalCents
      registrationRevenue += regAmount

      lineItems.push({
        description: `Registration: ${reg.athlete.firstName} ${reg.athlete.lastName}`,
        category: 'registration',
        quantity: 1,
        unitAmountCents: regAmount,
        totalAmountCents: regAmount,
        royaltyApplies: true,
      })

      for (const regAddon of reg.registrationAddons) {
        const addonAmount = regAddon.priceCents
        addonRevenue += addonAmount

        const addonName = regAddon.addon?.name || 'Add-on'
        const variantName = regAddon.variant?.name

        lineItems.push({
          description: `${addonName}${variantName ? ` (${variantName})` : ''} - ${reg.athlete.firstName} ${reg.athlete.lastName}`,
          category: 'addon',
          quantity: regAddon.quantity,
          unitAmountCents: Math.round(addonAmount / regAddon.quantity),
          totalAmountCents: addonAmount,
          royaltyApplies: true,
        })
      }
    }

    const grossRevenue = registrationRevenue + addonRevenue
    const refunds = 0 // Would come from refund tracking if implemented
    const netRevenue = grossRevenue - refunds
    const royaltyDue = Math.round(netRevenue * bpsToDecimal(royaltyRateBps))

    const invoiceNumber = generateInvoiceNumber(camp.tenant?.slug || 'unknown', campId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueInDays)

    // Validate tenantId exists
    if (!camp.tenantId) {
      return { data: null, error: new Error('Camp has no tenant assigned') }
    }

    // Create invoice with line items
    const invoice = await prisma.royaltyInvoice.create({
      data: {
        tenantId: camp.tenantId,
        campId: camp.id,
        invoiceNumber,
        periodType: 'camp_session',
        periodStart: camp.startDate,
        periodEnd: camp.endDate,
        grossRevenueCents: grossRevenue,
        registrationRevenueCents: registrationRevenue,
        addonRevenueCents: addonRevenue,
        merchandiseRevenueCents: 0,
        refundsTotalCents: refunds,
        netRevenueCents: netRevenue,
        royaltyRateBps,
        royaltyDueCents: royaltyDue,
        adjustmentCents: 0,
        totalDueCents: royaltyDue,
        status: 'invoiced',
        dueDate,
        generatedBy,
        lineItems: {
          create: lineItems,
        },
      },
    })

    // Notify licensee about new invoice
    notifyRoyaltyInvoiceCreated({
      tenantId: camp.tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountDue: royaltyDue / 100,
      dueDate: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      campName: camp.name,
    }).catch((err) => console.error('[AdminRoyalties] Failed to send invoice notification:', err))

    return {
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to generate invoice:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update royalty invoice status
 */
export async function markRoyaltyInvoiceStatus(params: {
  id: string
  status: RoyaltyInvoiceStatus
  paidAt?: Date
  paidAmountCents?: number
  paymentMethod?: string
  paymentReference?: string
  notes?: string
  updatedBy?: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { id, status, paidAt, paidAmountCents, paymentMethod, paymentReference, notes, updatedBy } = params

    // Get current invoice
    const invoice = await prisma.royaltyInvoice.findUnique({
      where: { id },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    // Validate status transitions
    const validTransitions: Record<RoyaltyInvoiceStatus, RoyaltyInvoiceStatus[]> = {
      pending: ['invoiced', 'waived'],
      invoiced: ['paid', 'overdue', 'disputed', 'waived'],
      paid: [], // Generally don't change from paid
      overdue: ['paid', 'disputed', 'waived'],
      disputed: ['invoiced', 'paid', 'waived'],
      waived: [],
    }

    if (!validTransitions[invoice.status].includes(status) && invoice.status !== status) {
      return {
        data: null,
        error: new Error(`Cannot transition from ${invoice.status} to ${status}`),
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
    }

    // Handle paid status
    if (status === 'paid') {
      updateData.paidAt = paidAt || new Date()
      updateData.paidAmountCents = paidAmountCents || invoice.totalDueCents
      updateData.paidBy = updatedBy
      if (paymentMethod) updateData.paymentMethod = paymentMethod
      if (paymentReference) updateData.paymentReference = paymentReference
    }

    // Handle disputed status
    if (status === 'disputed' && notes) {
      updateData.disputeReason = notes
      updateData.disputedAt = new Date()
    }

    // Handle resolved dispute
    if (invoice.status === 'disputed' && status !== 'disputed') {
      updateData.resolvedAt = new Date()
    }

    // Add notes if provided (append to existing)
    if (notes && status !== 'disputed') {
      updateData.notes = invoice.notes
        ? `${invoice.notes}\n---\n[${new Date().toISOString()}] ${notes}`
        : `[${new Date().toISOString()}] ${notes}`
    }

    await prisma.royaltyInvoice.update({
      where: { id },
      data: updateData,
    })

    // Notify licensee about status change
    notifyRoyaltyInvoiceStatusChanged({
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      newStatus: status,
    }).catch((err) => console.error('[AdminRoyalties] Failed to send status notification:', err))

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to update invoice status:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Add adjustment to invoice
 */
export async function addRoyaltyInvoiceAdjustment(params: {
  id: string
  adjustmentAmountDollars: number
  notes: string
  updatedBy?: string
}): Promise<{ data: { success: boolean; newTotal: number } | null; error: Error | null }> {
  try {
    const { id, adjustmentAmountDollars, notes, updatedBy } = params

    const invoice = await prisma.royaltyInvoice.findUnique({
      where: { id },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    if (invoice.status === 'paid' || invoice.status === 'waived') {
      return { data: null, error: new Error('Cannot adjust a paid or waived invoice') }
    }

    const adjustmentCents = dollarsToCents(adjustmentAmountDollars)
    const newAdjustmentTotal = invoice.adjustmentCents + adjustmentCents
    const newTotalDue = invoice.royaltyDueCents + newAdjustmentTotal

    const timestamp = new Date().toISOString()
    const adjustmentNote = `[${timestamp}] Adjustment: ${adjustmentAmountDollars >= 0 ? '+' : ''}$${adjustmentAmountDollars.toFixed(2)} - ${notes}${updatedBy ? ` (by ${updatedBy})` : ''}`

    await prisma.royaltyInvoice.update({
      where: { id },
      data: {
        adjustmentCents: newAdjustmentTotal,
        totalDueCents: newTotalDue,
        adjustmentNotes: invoice.adjustmentNotes
          ? `${invoice.adjustmentNotes}\n${adjustmentNote}`
          : adjustmentNote,
      },
    })

    return {
      data: {
        success: true,
        newTotal: centsToDollars(newTotalDue),
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to add adjustment:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get camps that don't have royalty invoices yet
 */
export async function getCampsWithoutRoyaltyInvoices(params: {
  tenantId?: string
  from?: Date
  to?: Date
  limit?: number
}): Promise<{
  data: {
    id: string
    name: string
    tenantName: string
    startDate: string
    endDate: string
    status: string
    registrationCount: number
    estimatedRevenue: number
  }[] | null
  error: Error | null
}> {
  try {
    const { tenantId, from, to, limit = 50 } = params

    // Default date range: current year
    const rangeStart = from || new Date(new Date().getFullYear(), 0, 1)
    const rangeEnd = to || new Date()

    const camps = await prisma.camp.findMany({
      where: {
        ...(tenantId && { tenantId }),
        startDate: { gte: rangeStart, lte: rangeEnd },
        status: { in: ['completed', 'in_progress'] },
        royaltyInvoices: {
          none: {},
        },
      },
      include: {
        tenant: true,
        registrations: {
          where: { status: 'confirmed' },
          select: { totalPriceCents: true },
        },
      },
      orderBy: { endDate: 'desc' },
      take: limit,
    })

    const result = camps.map(camp => ({
      id: camp.id,
      name: camp.name,
      tenantName: camp.tenant?.name || 'Unknown Tenant',
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      status: camp.status,
      registrationCount: camp.registrations.length,
      estimatedRevenue: centsToDollars(
        camp.registrations.reduce((sum, r) => sum + r.totalPriceCents, 0)
      ),
    }))

    return { data: result, error: null }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to get camps without invoices:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Bulk generate royalty invoices for all completed camps without invoices
 */
export async function bulkGenerateRoyaltyInvoices(params: {
  campIds: string[]
  generatedBy?: string
  dueInDays?: number
}): Promise<{
  data: { generated: number; failed: number; errors: string[] } | null
  error: Error | null
}> {
  try {
    const { campIds, generatedBy, dueInDays = 30 } = params

    let generated = 0
    let failed = 0
    const errors: string[] = []

    for (const campId of campIds) {
      const { data, error } = await generateRoyaltyInvoiceForSession({
        campId,
        generatedBy,
        dueInDays,
      })

      if (error) {
        failed++
        errors.push(`Camp ${campId}: ${error.message}`)
      } else if (data) {
        generated++
      }
    }

    return {
      data: { generated, failed, errors },
      error: null,
    }
  } catch (error) {
    console.error('[AdminRoyalties] Failed bulk generation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark overdue invoices automatically
 */
export async function markOverdueInvoices(): Promise<{
  data: { updated: number } | null
  error: Error | null
}> {
  try {
    const result = await prisma.royaltyInvoice.updateMany({
      where: {
        status: 'invoiced',
        dueDate: { lt: new Date() },
      },
      data: {
        status: 'overdue',
      },
    })

    return { data: { updated: result.count }, error: null }
  } catch (error) {
    console.error('[AdminRoyalties] Failed to mark overdue invoices:', error)
    return { data: null, error: error as Error }
  }
}
