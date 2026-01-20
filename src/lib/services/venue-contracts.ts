/**
 * Venue Contracts Service
 *
 * Handles all database operations for venue contract management.
 * Supports contract terms, PDF attachments, status tracking, and email sending.
 */

import prisma from '@/lib/db/client'

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'expired'

export interface VenueContract {
  id: string
  venue_id: string
  tenant_id: string | null
  rental_rate_cents: number
  currency: string
  contract_start_date: string
  contract_end_date: string
  deposit_cents: number | null
  payment_due_date: string | null
  insurance_requirements: string | null
  cancellation_policy: string | null
  setup_time_minutes: number | null
  cleanup_time_minutes: number | null
  special_conditions: string | null
  document_url: string | null
  document_name: string | null
  status: ContractStatus
  sent_at: string | null
  sent_to_email: string | null
  signed_at: string | null
  expiration_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  venue?: {
    id: string
    name: string
    primary_contact_email: string | null
    primary_contact_name: string | null
  }
}

export interface CreateContractInput {
  venue_id: string
  tenant_id?: string | null
  rental_rate_cents: number
  currency?: string
  contract_start_date: string
  contract_end_date: string
  deposit_cents?: number | null
  payment_due_date?: string | null
  insurance_requirements?: string | null
  cancellation_policy?: string | null
  setup_time_minutes?: number | null
  cleanup_time_minutes?: number | null
  special_conditions?: string | null
  document_url?: string | null
  document_name?: string | null
  expiration_date?: string | null
  created_by?: string | null
}

export interface UpdateContractInput {
  rental_rate_cents?: number
  currency?: string
  contract_start_date?: string
  contract_end_date?: string
  deposit_cents?: number | null
  payment_due_date?: string | null
  insurance_requirements?: string | null
  cancellation_policy?: string | null
  setup_time_minutes?: number | null
  cleanup_time_minutes?: number | null
  special_conditions?: string | null
  document_url?: string | null
  document_name?: string | null
  expiration_date?: string | null
  status?: ContractStatus
}

function mapContract(contract: {
  id: string
  venueId: string
  tenantId: string | null
  rentalRateCents: number
  currency: string
  contractStartDate: Date
  contractEndDate: Date
  depositCents: number | null
  paymentDueDate: Date | null
  insuranceRequirements: string | null
  cancellationPolicy: string | null
  setupTimeMinutes: number | null
  cleanupTimeMinutes: number | null
  specialConditions: string | null
  documentUrl: string | null
  documentName: string | null
  status: string
  sentAt: Date | null
  sentToEmail: string | null
  signedAt: Date | null
  expirationDate: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  venue?: {
    id: string
    name: string
    primaryContactEmail: string | null
    primaryContactName: string | null
  }
}): VenueContract {
  return {
    id: contract.id,
    venue_id: contract.venueId,
    tenant_id: contract.tenantId,
    rental_rate_cents: contract.rentalRateCents,
    currency: contract.currency,
    contract_start_date: contract.contractStartDate.toISOString().split('T')[0],
    contract_end_date: contract.contractEndDate.toISOString().split('T')[0],
    deposit_cents: contract.depositCents,
    payment_due_date: contract.paymentDueDate?.toISOString().split('T')[0] ?? null,
    insurance_requirements: contract.insuranceRequirements,
    cancellation_policy: contract.cancellationPolicy,
    setup_time_minutes: contract.setupTimeMinutes,
    cleanup_time_minutes: contract.cleanupTimeMinutes,
    special_conditions: contract.specialConditions,
    document_url: contract.documentUrl,
    document_name: contract.documentName,
    status: contract.status as ContractStatus,
    sent_at: contract.sentAt?.toISOString() ?? null,
    sent_to_email: contract.sentToEmail,
    signed_at: contract.signedAt?.toISOString() ?? null,
    expiration_date: contract.expirationDate?.toISOString().split('T')[0] ?? null,
    created_by: contract.createdBy,
    created_at: contract.createdAt.toISOString(),
    updated_at: contract.updatedAt.toISOString(),
    venue: contract.venue
      ? {
          id: contract.venue.id,
          name: contract.venue.name,
          primary_contact_email: contract.venue.primaryContactEmail,
          primary_contact_name: contract.venue.primaryContactName,
        }
      : undefined,
  }
}

/**
 * List contracts for a venue
 */
export async function listVenueContracts(params: {
  venue_id: string
  tenant_id?: string
  status?: ContractStatus
}): Promise<{ data: VenueContract[] | null; error: Error | null }> {
  try {
    const contracts = await prisma.venueContract.findMany({
      where: {
        venueId: params.venue_id,
        ...(params.tenant_id && { tenantId: params.tenant_id }),
        ...(params.status && { status: params.status }),
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data: contracts.map(mapContract), error: null }
  } catch (error) {
    console.error('[listVenueContracts] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single contract by ID
 */
export async function getContractById(params: {
  id: string
  venue_id?: string
  tenant_id?: string
}): Promise<{ data: VenueContract | null; error: Error | null }> {
  try {
    const contract = await prisma.venueContract.findFirst({
      where: {
        id: params.id,
        ...(params.venue_id && { venueId: params.venue_id }),
        ...(params.tenant_id && { tenantId: params.tenant_id }),
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
    })

    if (!contract) {
      return { data: null, error: new Error('Contract not found') }
    }

    return { data: mapContract(contract), error: null }
  } catch (error) {
    console.error('[getContractById] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new contract
 */
export async function createContract(
  input: CreateContractInput
): Promise<{ data: VenueContract | null; error: Error | null }> {
  try {
    const contract = await prisma.venueContract.create({
      data: {
        venueId: input.venue_id,
        tenantId: input.tenant_id ?? null,
        rentalRateCents: input.rental_rate_cents,
        currency: input.currency ?? 'USD',
        contractStartDate: new Date(input.contract_start_date),
        contractEndDate: new Date(input.contract_end_date),
        depositCents: input.deposit_cents ?? null,
        paymentDueDate: input.payment_due_date ? new Date(input.payment_due_date) : null,
        insuranceRequirements: input.insurance_requirements ?? null,
        cancellationPolicy: input.cancellation_policy ?? null,
        setupTimeMinutes: input.setup_time_minutes ?? null,
        cleanupTimeMinutes: input.cleanup_time_minutes ?? null,
        specialConditions: input.special_conditions ?? null,
        documentUrl: input.document_url ?? null,
        documentName: input.document_name ?? null,
        expirationDate: input.expiration_date ? new Date(input.expiration_date) : null,
        createdBy: input.created_by ?? null,
        status: 'draft',
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
    })

    return { data: mapContract(contract), error: null }
  } catch (error) {
    console.error('[createContract] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a contract
 */
export async function updateContract(params: {
  id: string
  venue_id?: string
  tenant_id?: string
  updates: UpdateContractInput
}): Promise<{ data: VenueContract | null; error: Error | null }> {
  try {
    // First verify the contract exists and matches filters
    const existing = await prisma.venueContract.findFirst({
      where: {
        id: params.id,
        ...(params.venue_id && { venueId: params.venue_id }),
        ...(params.tenant_id && { tenantId: params.tenant_id }),
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Contract not found') }
    }

    const contract = await prisma.venueContract.update({
      where: { id: params.id },
      data: {
        ...(params.updates.rental_rate_cents !== undefined && {
          rentalRateCents: params.updates.rental_rate_cents,
        }),
        ...(params.updates.currency !== undefined && { currency: params.updates.currency }),
        ...(params.updates.contract_start_date !== undefined && {
          contractStartDate: new Date(params.updates.contract_start_date),
        }),
        ...(params.updates.contract_end_date !== undefined && {
          contractEndDate: new Date(params.updates.contract_end_date),
        }),
        ...(params.updates.deposit_cents !== undefined && {
          depositCents: params.updates.deposit_cents,
        }),
        ...(params.updates.payment_due_date !== undefined && {
          paymentDueDate: params.updates.payment_due_date
            ? new Date(params.updates.payment_due_date)
            : null,
        }),
        ...(params.updates.insurance_requirements !== undefined && {
          insuranceRequirements: params.updates.insurance_requirements,
        }),
        ...(params.updates.cancellation_policy !== undefined && {
          cancellationPolicy: params.updates.cancellation_policy,
        }),
        ...(params.updates.setup_time_minutes !== undefined && {
          setupTimeMinutes: params.updates.setup_time_minutes,
        }),
        ...(params.updates.cleanup_time_minutes !== undefined && {
          cleanupTimeMinutes: params.updates.cleanup_time_minutes,
        }),
        ...(params.updates.special_conditions !== undefined && {
          specialConditions: params.updates.special_conditions,
        }),
        ...(params.updates.document_url !== undefined && {
          documentUrl: params.updates.document_url,
        }),
        ...(params.updates.document_name !== undefined && {
          documentName: params.updates.document_name,
        }),
        ...(params.updates.expiration_date !== undefined && {
          expirationDate: params.updates.expiration_date
            ? new Date(params.updates.expiration_date)
            : null,
        }),
        ...(params.updates.status !== undefined && { status: params.updates.status }),
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
    })

    return { data: mapContract(contract), error: null }
  } catch (error) {
    console.error('[updateContract] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a contract
 */
export async function deleteContract(params: {
  id: string
  venue_id?: string
  tenant_id?: string
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    // First verify the contract exists and matches filters
    const existing = await prisma.venueContract.findFirst({
      where: {
        id: params.id,
        ...(params.venue_id && { venueId: params.venue_id }),
        ...(params.tenant_id && { tenantId: params.tenant_id }),
      },
    })

    if (!existing) {
      return { success: false, error: new Error('Contract not found') }
    }

    await prisma.venueContract.delete({
      where: { id: params.id },
    })

    return { success: true, error: null }
  } catch (error) {
    console.error('[deleteContract] Error:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Upload a contract document (update document URL and name)
 */
export async function uploadContractDocument(params: {
  id: string
  venue_id?: string
  tenant_id?: string
  document_url: string
  document_name: string
}): Promise<{ data: VenueContract | null; error: Error | null }> {
  return updateContract({
    id: params.id,
    venue_id: params.venue_id,
    tenant_id: params.tenant_id,
    updates: {
      document_url: params.document_url,
      document_name: params.document_name,
    },
  })
}

/**
 * Mark a contract as sent
 */
export async function markContractAsSent(params: {
  id: string
  venue_id?: string
  tenant_id?: string
  sent_to_email: string
}): Promise<{ data: VenueContract | null; error: Error | null }> {
  try {
    // First verify the contract exists
    const existing = await prisma.venueContract.findFirst({
      where: {
        id: params.id,
        ...(params.venue_id && { venueId: params.venue_id }),
        ...(params.tenant_id && { tenantId: params.tenant_id }),
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Contract not found') }
    }

    const contract = await prisma.venueContract.update({
      where: { id: params.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentToEmail: params.sent_to_email,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
    })

    return { data: mapContract(contract), error: null }
  } catch (error) {
    console.error('[markContractAsSent] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark a contract as signed
 */
export async function markContractAsSigned(params: {
  id: string
  venue_id?: string
  tenant_id?: string
}): Promise<{ data: VenueContract | null; error: Error | null }> {
  try {
    // First verify the contract exists
    const existing = await prisma.venueContract.findFirst({
      where: {
        id: params.id,
        ...(params.venue_id && { venueId: params.venue_id }),
        ...(params.tenant_id && { tenantId: params.tenant_id }),
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Contract not found') }
    }

    const contract = await prisma.venueContract.update({
      where: { id: params.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
            primaryContactName: true,
          },
        },
      },
    })

    return { data: mapContract(contract), error: null }
  } catch (error) {
    console.error('[markContractAsSigned] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Check and update expired contracts
 * Should be called periodically (e.g., daily cron job)
 */
export async function checkExpiredContracts(): Promise<{
  updated_count: number
  error: Error | null
}> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await prisma.venueContract.updateMany({
      where: {
        expirationDate: { lt: today },
        status: { not: 'expired' },
      },
      data: {
        status: 'expired',
      },
    })

    return { updated_count: result.count, error: null }
  } catch (error) {
    console.error('[checkExpiredContracts] Error:', error)
    return { updated_count: 0, error: error as Error }
  }
}
