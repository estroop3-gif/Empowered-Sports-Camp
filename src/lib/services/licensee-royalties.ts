/**
 * Licensee Royalties Service
 *
 * Production-ready service for royalty calculations, tracking, and closeout workflow.
 * Licensees pay royalties (default 10%) on gross revenue to HQ.
 *
 * Uses the RoyaltyInvoice and RoyaltyLineItem models for proper tracking.
 */

import { prisma } from '@/lib/db/client'
import type { RoyaltyInvoiceStatus, RoyaltyPeriodType } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface CampRoyaltySummary {
  camp_id: string
  camp_name: string
  camp_slug: string
  start_date: string
  end_date: string
  location_name: string | null
  director_name: string | null
  status: string
  gross_revenue: number
  registration_revenue: number
  addon_revenue: number
  refunds: number
  net_revenue: number
  royalty_rate: number
  royalty_due: number
  royalty_status: RoyaltyInvoiceStatus | 'not_generated'
  invoice_id: string | null
  invoice_number: string | null
  invoice_generated_at: string | null
  paid_at: string | null
  camper_count: number
}

export interface RoyaltySummaryTotals {
  total_gross_revenue: number
  total_net_revenue: number
  total_royalty_due: number
  total_royalty_paid: number
  total_outstanding: number
  sessions_count: number
  sessions_invoiced: number
  sessions_paid: number
  compliance_rate: number
}

export interface LicenseeRoyaltyReport {
  totals: RoyaltySummaryTotals
  camps: CampRoyaltySummary[]
  period_start: string
  period_end: string
}

export interface RoyaltyInvoiceDetail {
  id: string
  invoice_number: string
  camp_name: string | null
  period_start: string
  period_end: string
  gross_revenue: number
  net_revenue: number
  royalty_rate: number
  royalty_due: number
  adjustments: number
  total_due: number
  status: RoyaltyInvoiceStatus
  due_date: string
  paid_at: string | null
  paid_amount: number | null
  payment_method: string | null
  payment_reference: string | null
  line_items: {
    id: string
    description: string
    category: string
    quantity: number
    unit_amount: number
    total_amount: number
  }[]
  notes: string | null
}

export interface CampRevenueBreakdown {
  camp_id: string
  camp_name: string
  gross_revenue: number
  registration_breakdown: {
    count: number
    revenue: number
  }
  addon_breakdown: {
    count: number
    revenue: number
  }
  refunds: number
  net_revenue: number
  royalty_calculation: {
    gross: number
    rate: number
    rate_bps: number
    amount: number
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

const DEFAULT_ROYALTY_RATE_BPS = 1000 // 10% = 1000 basis points

function getSeasonDateRange(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  return {
    start: new Date(year, 2, 1), // March 1
    end: new Date(year, 8, 30), // September 30
  }
}

function generateInvoiceNumber(tenantId: string, campId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const shortTenant = tenantId.substring(0, 4).toUpperCase()
  const shortCamp = campId.substring(0, 4).toUpperCase()
  return `ROY-${shortTenant}-${shortCamp}-${timestamp}`
}

function bpsToDecimal(bps: number): number {
  return bps / 10000
}

function centsToDollars(cents: number): number {
  return cents / 100
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get royalty summary for all camps in a period
 */
export async function getLicenseeRoyaltySummary(params: {
  tenantId: string
  period?: string
  startDate?: string
  endDate?: string
}): Promise<{ data: LicenseeRoyaltyReport | null; error: Error | null }> {
  try {
    let start: Date
    let end: Date

    if (params.startDate && params.endDate) {
      start = new Date(params.startDate)
      end = new Date(params.endDate)
    } else {
      const range = getSeasonDateRange()
      start = range.start
      end = range.end
    }

    // Get tenant's royalty rate
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { royaltyRate: true },
    })
    const royaltyRateBps = tenant?.royaltyRate
      ? Math.round(Number(tenant.royaltyRate) * 10000)
      : DEFAULT_ROYALTY_RATE_BPS

    // Get all completed and in-progress camps
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
        status: { in: ['completed', 'in_progress'] },
      },
      include: {
        location: true,
        registrations: {
          where: { status: 'confirmed' },
          include: {
            registrationAddons: true,
          },
        },
        staffAssignments: {
          where: { role: 'director' },
          include: {
            user: true,
          },
        },
        royaltyInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startDate: 'desc' },
    })

    let totalGrossRevenue = 0
    let totalNetRevenue = 0
    let totalRoyaltyDue = 0
    let totalRoyaltyPaid = 0
    let sessionsInvoiced = 0
    let sessionsPaid = 0

    const campSummaries: CampRoyaltySummary[] = camps.map(camp => {
      // Calculate registration revenue
      let registrationRevenue = 0
      let addonRevenue = 0
      for (const reg of camp.registrations) {
        registrationRevenue += reg.totalPriceCents - reg.addonsTotalCents
        addonRevenue += reg.addonsTotalCents
      }

      const grossRevenue = registrationRevenue + addonRevenue
      const refunds = 0 // Would come from refund tracking
      const netRevenue = grossRevenue - refunds

      // Calculate royalty
      const royaltyRate = bpsToDecimal(royaltyRateBps)
      const royaltyDue = Math.round(netRevenue * royaltyRate)

      // Check for existing invoice
      const invoice = camp.royaltyInvoices[0]
      const royaltyStatus: RoyaltyInvoiceStatus | 'not_generated' = invoice
        ? invoice.status
        : 'not_generated'

      // Get director name
      const director = camp.staffAssignments[0]?.user
      const directorName = director
        ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
        : null

      // Update totals
      totalGrossRevenue += grossRevenue
      totalNetRevenue += netRevenue
      totalRoyaltyDue += royaltyDue

      if (invoice) {
        sessionsInvoiced += 1
        if (invoice.status === 'paid') {
          sessionsPaid += 1
          totalRoyaltyPaid += invoice.paidAmountCents || invoice.totalDueCents
        }
      }

      return {
        camp_id: camp.id,
        camp_name: camp.name,
        camp_slug: camp.slug,
        start_date: camp.startDate.toISOString(),
        end_date: camp.endDate.toISOString(),
        location_name: camp.location?.name || null,
        director_name: directorName,
        status: camp.status,
        gross_revenue: centsToDollars(grossRevenue),
        registration_revenue: centsToDollars(registrationRevenue),
        addon_revenue: centsToDollars(addonRevenue),
        refunds: centsToDollars(refunds),
        net_revenue: centsToDollars(netRevenue),
        royalty_rate: royaltyRate,
        royalty_due: centsToDollars(royaltyDue),
        royalty_status: royaltyStatus,
        invoice_id: invoice?.id || null,
        invoice_number: invoice?.invoiceNumber || null,
        invoice_generated_at: invoice?.generatedAt.toISOString() || null,
        paid_at: invoice?.paidAt?.toISOString() || null,
        camper_count: camp.registrations.length,
      }
    })

    const totalOutstanding = totalRoyaltyDue - totalRoyaltyPaid
    const completedCamps = camps.filter(c => c.status === 'completed').length
    const complianceRate = completedCamps > 0
      ? Math.round((sessionsPaid / completedCamps) * 100)
      : 100

    return {
      data: {
        totals: {
          total_gross_revenue: centsToDollars(totalGrossRevenue),
          total_net_revenue: centsToDollars(totalNetRevenue),
          total_royalty_due: centsToDollars(totalRoyaltyDue),
          total_royalty_paid: centsToDollars(totalRoyaltyPaid),
          total_outstanding: centsToDollars(totalOutstanding),
          sessions_count: camps.length,
          sessions_invoiced: sessionsInvoiced,
          sessions_paid: sessionsPaid,
          compliance_rate: complianceRate,
        },
        camps: campSummaries,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to get summary:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get detailed revenue breakdown for a specific camp
 */
export async function getLicenseeCampRevenue(params: {
  tenantId: string
  campId: string
}): Promise<{ data: CampRevenueBreakdown | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findFirst({
      where: {
        id: params.campId,
        tenantId: params.tenantId,
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          include: {
            registrationAddons: {
              include: {
                addon: true,
                variant: true,
              },
            },
          },
        },
        tenant: {
          select: { royaltyRate: true },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const royaltyRateBps = camp.tenant?.royaltyRate
      ? Math.round(Number(camp.tenant.royaltyRate) * 10000)
      : DEFAULT_ROYALTY_RATE_BPS

    let registrationRevenue = 0
    let addonRevenue = 0

    for (const reg of camp.registrations) {
      registrationRevenue += reg.totalPriceCents - reg.addonsTotalCents
      addonRevenue += reg.addonsTotalCents
    }

    const grossRevenue = registrationRevenue + addonRevenue
    const refunds = 0 // Would come from refund tracking
    const netRevenue = grossRevenue - refunds

    const royaltyRate = bpsToDecimal(royaltyRateBps)
    const royaltyAmount = Math.round(netRevenue * royaltyRate)

    return {
      data: {
        camp_id: camp.id,
        camp_name: camp.name,
        gross_revenue: centsToDollars(grossRevenue),
        registration_breakdown: {
          count: camp.registrations.length,
          revenue: centsToDollars(registrationRevenue),
        },
        addon_breakdown: {
          count: camp.registrations.reduce((sum, r) => sum + r.registrationAddons.length, 0),
          revenue: centsToDollars(addonRevenue),
        },
        refunds: centsToDollars(refunds),
        net_revenue: centsToDollars(netRevenue),
        royalty_calculation: {
          gross: centsToDollars(netRevenue),
          rate: royaltyRate,
          rate_bps: royaltyRateBps,
          amount: centsToDollars(royaltyAmount),
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to get camp revenue:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Generate a royalty invoice for a camp
 */
export async function generateRoyaltyInvoice(params: {
  tenantId: string
  campId: string
  generatedBy: string
  dueInDays?: number
}): Promise<{ data: { invoice_id: string; invoice_number: string } | null; error: Error | null }> {
  try {
    // Get camp with registrations
    const camp = await prisma.camp.findFirst({
      where: {
        id: params.campId,
        tenantId: params.tenantId,
      },
      include: {
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
        tenant: {
          select: { royaltyRate: true },
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
      return {
        data: null,
        error: new Error('An unpaid royalty invoice already exists for this camp'),
      }
    }

    const royaltyRateBps = camp.tenant?.royaltyRate
      ? Math.round(Number(camp.tenant.royaltyRate) * 10000)
      : DEFAULT_ROYALTY_RATE_BPS

    // Calculate revenues
    let registrationRevenue = 0
    let addonRevenue = 0
    const lineItems: {
      description: string
      category: string
      quantity: number
      unitAmountCents: number
      totalAmountCents: number
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
      })

      for (const regAddon of reg.registrationAddons) {
        const addonAmount = regAddon.priceCents
        addonRevenue += addonAmount

        lineItems.push({
          description: `Add-on: ${regAddon.addon?.name || 'Unknown'} - ${reg.athlete.firstName} ${reg.athlete.lastName}`,
          category: 'addon',
          quantity: 1,
          unitAmountCents: addonAmount,
          totalAmountCents: addonAmount,
        })
      }
    }

    const grossRevenue = registrationRevenue + addonRevenue
    const refunds = 0
    const netRevenue = grossRevenue - refunds
    const royaltyDue = Math.round(netRevenue * bpsToDecimal(royaltyRateBps))

    const invoiceNumber = generateInvoiceNumber(params.tenantId, params.campId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (params.dueInDays || 30))

    // Create invoice with line items
    const invoice = await prisma.royaltyInvoice.create({
      data: {
        tenantId: params.tenantId,
        campId: params.campId,
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
        generatedBy: params.generatedBy,
        lineItems: {
          create: lineItems,
        },
      },
    })

    return {
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to generate invoice:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get invoice details
 */
export async function getRoyaltyInvoice(params: {
  tenantId: string
  invoiceId: string
}): Promise<{ data: RoyaltyInvoiceDetail | null; error: Error | null }> {
  try {
    const invoice = await prisma.royaltyInvoice.findFirst({
      where: {
        id: params.invoiceId,
        tenantId: params.tenantId,
      },
      include: {
        camp: true,
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    return {
      data: {
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        camp_name: invoice.camp?.name || null,
        period_start: invoice.periodStart.toISOString(),
        period_end: invoice.periodEnd.toISOString(),
        gross_revenue: centsToDollars(invoice.grossRevenueCents),
        net_revenue: centsToDollars(invoice.netRevenueCents),
        royalty_rate: bpsToDecimal(invoice.royaltyRateBps),
        royalty_due: centsToDollars(invoice.royaltyDueCents),
        adjustments: centsToDollars(invoice.adjustmentCents),
        total_due: centsToDollars(invoice.totalDueCents),
        status: invoice.status,
        due_date: invoice.dueDate.toISOString(),
        paid_at: invoice.paidAt?.toISOString() || null,
        paid_amount: invoice.paidAmountCents ? centsToDollars(invoice.paidAmountCents) : null,
        payment_method: invoice.paymentMethod,
        payment_reference: invoice.paymentReference,
        line_items: invoice.lineItems.map(li => ({
          id: li.id,
          description: li.description,
          category: li.category,
          quantity: li.quantity,
          unit_amount: centsToDollars(li.unitAmountCents),
          total_amount: centsToDollars(li.totalAmountCents),
        })),
        notes: invoice.notes,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to get invoice:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark royalty as paid
 */
export async function markRoyaltyPaid(params: {
  tenantId: string
  invoiceId: string
  paymentMethod?: string
  paymentReference?: string
  paidBy: string
  paidAmountCents?: number
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const invoice = await prisma.royaltyInvoice.findFirst({
      where: {
        id: params.invoiceId,
        tenantId: params.tenantId,
      },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    if (invoice.status === 'paid') {
      return { data: null, error: new Error('Invoice is already paid') }
    }

    await prisma.royaltyInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidAmountCents: params.paidAmountCents || invoice.totalDueCents,
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference,
        paidBy: params.paidBy,
      },
    })

    return {
      data: { success: true },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to mark paid:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Add adjustment to invoice
 */
export async function addInvoiceAdjustment(params: {
  tenantId: string
  invoiceId: string
  adjustmentCents: number
  notes: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const invoice = await prisma.royaltyInvoice.findFirst({
      where: {
        id: params.invoiceId,
        tenantId: params.tenantId,
      },
    })

    if (!invoice) {
      return { data: null, error: new Error('Invoice not found') }
    }

    if (invoice.status === 'paid') {
      return { data: null, error: new Error('Cannot adjust a paid invoice') }
    }

    const newAdjustment = invoice.adjustmentCents + params.adjustmentCents
    const newTotal = invoice.royaltyDueCents + newAdjustment

    await prisma.royaltyInvoice.update({
      where: { id: invoice.id },
      data: {
        adjustmentCents: newAdjustment,
        adjustmentNotes: invoice.adjustmentNotes
          ? `${invoice.adjustmentNotes}\n---\n${params.notes}`
          : params.notes,
        totalDueCents: newTotal,
      },
    })

    return {
      data: { success: true },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to add adjustment:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark royalty as paid by campId (finds invoice for camp, then marks paid)
 */
export async function markCampRoyaltyPaid(params: {
  tenantId: string
  campId: string
  paymentMethod?: string
  paymentReference?: string
  paidBy: string
  paidAmountCents?: number
}): Promise<{ data: { success: boolean; invoice_id: string } | null; error: Error | null }> {
  try {
    // Find the most recent unpaid invoice for this camp
    const invoice = await prisma.royaltyInvoice.findFirst({
      where: {
        campId: params.campId,
        tenantId: params.tenantId,
        status: { notIn: ['paid', 'waived'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!invoice) {
      return { data: null, error: new Error('No unpaid invoice found for this camp') }
    }

    await prisma.royaltyInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidAmountCents: params.paidAmountCents || invoice.totalDueCents,
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference,
        paidBy: params.paidBy,
      },
    })

    return {
      data: { success: true, invoice_id: invoice.id },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to mark camp royalty paid:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get royalty status for a specific camp
 */
export async function getCampRoyaltyStatus(params: {
  tenantId: string
  campId: string
}): Promise<{
  data: {
    has_invoice: boolean
    invoice_id: string | null
    invoice_number: string | null
    status: RoyaltyInvoiceStatus | null
    amount_due: number | null
    paid_at: string | null
  } | null
  error: Error | null
}> {
  try {
    const invoice = await prisma.royaltyInvoice.findFirst({
      where: {
        campId: params.campId,
        tenantId: params.tenantId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: {
        has_invoice: !!invoice,
        invoice_id: invoice?.id || null,
        invoice_number: invoice?.invoiceNumber || null,
        status: invoice?.status || null,
        amount_due: invoice ? centsToDollars(invoice.totalDueCents) : null,
        paid_at: invoice?.paidAt?.toISOString() || null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to get camp royalty status:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List all invoices for a tenant
 */
export async function listRoyaltyInvoices(params: {
  tenantId: string
  status?: RoyaltyInvoiceStatus
  limit?: number
  offset?: number
}): Promise<{
  data: {
    invoices: {
      id: string
      invoice_number: string
      camp_name: string | null
      period_start: string
      period_end: string
      total_due: number
      status: RoyaltyInvoiceStatus
      due_date: string
      paid_at: string | null
    }[]
    total: number
  } | null
  error: Error | null
}> {
  try {
    const where = {
      tenantId: params.tenantId,
      ...(params.status && { status: params.status }),
    }

    const [invoices, total] = await Promise.all([
      prisma.royaltyInvoice.findMany({
        where,
        include: { camp: true },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.royaltyInvoice.count({ where }),
    ])

    return {
      data: {
        invoices: invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoiceNumber,
          camp_name: inv.camp?.name || null,
          period_start: inv.periodStart.toISOString(),
          period_end: inv.periodEnd.toISOString(),
          total_due: centsToDollars(inv.totalDueCents),
          status: inv.status,
          due_date: inv.dueDate.toISOString(),
          paid_at: inv.paidAt?.toISOString() || null,
        })),
        total,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeRoyalties] Failed to list invoices:', error)
    return { data: null, error: error as Error }
  }
}
