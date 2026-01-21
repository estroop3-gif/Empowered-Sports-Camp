/**
 * Staff Assignment Requests Service
 *
 * Handles the request/accept workflow for assigning existing staff to camps.
 * When a director requests to assign an existing user, they receive a notification
 * and can accept or decline the assignment.
 */

import prisma from '@/lib/db/client'
import type { StaffRequestStatus, Prisma } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface StaffAssignmentRequestData {
  id: string
  camp_id: string
  camp_name: string
  camp_start_date: string
  camp_end_date: string
  tenant_id: string | null
  tenant_name: string | null
  requested_user_id: string
  requested_user_name: string
  requested_user_email: string
  requested_by_user_id: string
  requested_by_user_name: string
  role: string
  status: StaffRequestStatus
  requested_at: string
  responded_at: string | null
  notes: string | null
  is_lead: boolean
  call_time: string | null
  end_time: string | null
  station_name: string | null
}

export interface CreateStaffAssignmentRequestInput {
  campId: string
  requestedUserId: string
  requestedByUserId: string
  role: string
  notes?: string
  isLead?: boolean
  callTime?: string
  endTime?: string
  stationName?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(time: Date | null): string | null {
  if (!time) return null
  return time.toISOString().split('T')[1]?.substring(0, 5) || null
}

function parseTimeToDate(time: string | null | undefined): Date | null {
  if (!time) return null
  return new Date(`1970-01-01T${time}:00.000Z`)
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create a new staff assignment request
 */
export async function createStaffAssignmentRequest(
  input: CreateStaffAssignmentRequestInput
): Promise<{ data: StaffAssignmentRequestData | null; error: string | null }> {
  try {
    const { campId, requestedUserId, requestedByUserId, role, notes, isLead, callTime, endTime, stationName } = input

    // Check if user is already assigned to this camp
    const existingAssignment = await prisma.campStaffAssignment.findFirst({
      where: { campId, userId: requestedUserId },
    })

    if (existingAssignment) {
      return { data: null, error: 'This user is already assigned to this camp' }
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.staffAssignmentRequest.findUnique({
      where: { campId_requestedUserId: { campId, requestedUserId } },
    })

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { data: null, error: 'A request is already pending for this user' }
      }
      // If declined, delete old request and create new one
      if (existingRequest.status === 'declined') {
        await prisma.staffAssignmentRequest.delete({ where: { id: existingRequest.id } })
      }
    }

    // Create the request
    const request = await prisma.staffAssignmentRequest.create({
      data: {
        campId,
        requestedUserId,
        requestedByUserId,
        role,
        notes: notes || null,
        isLead: isLead || false,
        callTime: parseTimeToDate(callTime),
        endTime: parseTimeToDate(endTime),
        stationName: stationName || null,
      },
      include: {
        camp: {
          include: {
            tenant: true,
          },
        },
        requestedUser: true,
        requestedByUser: true,
      },
    })

    return {
      data: {
        id: request.id,
        camp_id: request.campId,
        camp_name: request.camp.name,
        camp_start_date: request.camp.startDate.toISOString().split('T')[0],
        camp_end_date: request.camp.endDate.toISOString().split('T')[0],
        tenant_id: request.camp.tenantId,
        tenant_name: request.camp.tenant?.name || null,
        requested_user_id: request.requestedUserId,
        requested_user_name: `${request.requestedUser.firstName || ''} ${request.requestedUser.lastName || ''}`.trim(),
        requested_user_email: request.requestedUser.email,
        requested_by_user_id: request.requestedByUserId,
        requested_by_user_name: `${request.requestedByUser.firstName || ''} ${request.requestedByUser.lastName || ''}`.trim(),
        role: request.role,
        status: request.status,
        requested_at: request.requestedAt.toISOString(),
        responded_at: request.respondedAt?.toISOString() || null,
        notes: request.notes,
        is_lead: request.isLead,
        call_time: formatTime(request.callTime),
        end_time: formatTime(request.endTime),
        station_name: request.stationName,
      },
      error: null,
    }
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error creating request:', err)
    return { data: null, error: 'Failed to create staff assignment request' }
  }
}

/**
 * Get staff assignment requests for a specific user (for their dashboard)
 */
export async function getStaffAssignmentRequestsForUser(
  userId: string,
  status?: StaffRequestStatus
): Promise<{ data: StaffAssignmentRequestData[]; error: string | null }> {
  try {
    const where: Prisma.StaffAssignmentRequestWhereInput = {
      requestedUserId: userId,
      ...(status && { status }),
    }

    const requests = await prisma.staffAssignmentRequest.findMany({
      where,
      include: {
        camp: {
          include: {
            tenant: true,
          },
        },
        requestedUser: true,
        requestedByUser: true,
      },
      orderBy: { requestedAt: 'desc' },
    })

    return {
      data: requests.map((request) => ({
        id: request.id,
        camp_id: request.campId,
        camp_name: request.camp.name,
        camp_start_date: request.camp.startDate.toISOString().split('T')[0],
        camp_end_date: request.camp.endDate.toISOString().split('T')[0],
        tenant_id: request.camp.tenantId,
        tenant_name: request.camp.tenant?.name || null,
        requested_user_id: request.requestedUserId,
        requested_user_name: `${request.requestedUser.firstName || ''} ${request.requestedUser.lastName || ''}`.trim(),
        requested_user_email: request.requestedUser.email,
        requested_by_user_id: request.requestedByUserId,
        requested_by_user_name: `${request.requestedByUser.firstName || ''} ${request.requestedByUser.lastName || ''}`.trim(),
        role: request.role,
        status: request.status,
        requested_at: request.requestedAt.toISOString(),
        responded_at: request.respondedAt?.toISOString() || null,
        notes: request.notes,
        is_lead: request.isLead,
        call_time: formatTime(request.callTime),
        end_time: formatTime(request.endTime),
        station_name: request.stationName,
      })),
      error: null,
    }
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error getting user requests:', err)
    return { data: [], error: 'Failed to get staff assignment requests' }
  }
}

/**
 * Get staff assignment requests for a camp (for Camp HQ)
 */
export async function getStaffAssignmentRequestsForCamp(
  campId: string,
  status?: StaffRequestStatus
): Promise<{ data: StaffAssignmentRequestData[]; error: string | null }> {
  try {
    const where: Prisma.StaffAssignmentRequestWhereInput = {
      campId,
      ...(status && { status }),
    }

    const requests = await prisma.staffAssignmentRequest.findMany({
      where,
      include: {
        camp: {
          include: {
            tenant: true,
          },
        },
        requestedUser: true,
        requestedByUser: true,
      },
      orderBy: { requestedAt: 'desc' },
    })

    return {
      data: requests.map((request) => ({
        id: request.id,
        camp_id: request.campId,
        camp_name: request.camp.name,
        camp_start_date: request.camp.startDate.toISOString().split('T')[0],
        camp_end_date: request.camp.endDate.toISOString().split('T')[0],
        tenant_id: request.camp.tenantId,
        tenant_name: request.camp.tenant?.name || null,
        requested_user_id: request.requestedUserId,
        requested_user_name: `${request.requestedUser.firstName || ''} ${request.requestedUser.lastName || ''}`.trim(),
        requested_user_email: request.requestedUser.email,
        requested_by_user_id: request.requestedByUserId,
        requested_by_user_name: `${request.requestedByUser.firstName || ''} ${request.requestedByUser.lastName || ''}`.trim(),
        role: request.role,
        status: request.status,
        requested_at: request.requestedAt.toISOString(),
        responded_at: request.respondedAt?.toISOString() || null,
        notes: request.notes,
        is_lead: request.isLead,
        call_time: formatTime(request.callTime),
        end_time: formatTime(request.endTime),
        station_name: request.stationName,
      })),
      error: null,
    }
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error getting camp requests:', err)
    return { data: [], error: 'Failed to get staff assignment requests' }
  }
}

/**
 * Respond to a staff assignment request (accept or decline)
 */
export async function respondToStaffAssignmentRequest(
  requestId: string,
  userId: string,
  response: 'accepted' | 'declined'
): Promise<{ data: StaffAssignmentRequestData | null; error: string | null }> {
  try {
    // Get the request
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: requestId },
      include: {
        camp: {
          include: {
            tenant: true,
          },
        },
        requestedUser: true,
        requestedByUser: true,
      },
    })

    if (!request) {
      return { data: null, error: 'Request not found' }
    }

    if (request.requestedUserId !== userId) {
      return { data: null, error: 'You are not authorized to respond to this request' }
    }

    if (request.status !== 'pending') {
      return { data: null, error: 'This request has already been responded to' }
    }

    // Use a transaction for the response
    const result = await prisma.$transaction(async (tx) => {
      // Update the request status
      const updatedRequest = await tx.staffAssignmentRequest.update({
        where: { id: requestId },
        data: {
          status: response,
          respondedAt: new Date(),
        },
        include: {
          camp: {
            include: {
              tenant: true,
            },
          },
          requestedUser: true,
          requestedByUser: true,
        },
      })

      // If accepted, create the staff assignment
      if (response === 'accepted') {
        await tx.campStaffAssignment.create({
          data: {
            campId: request.campId,
            userId: request.requestedUserId,
            role: request.role,
            isLead: request.isLead,
            callTime: request.callTime,
            endTime: request.endTime,
            notes: request.notes,
            stationName: request.stationName,
          },
        })
      }

      return updatedRequest
    })

    return {
      data: {
        id: result.id,
        camp_id: result.campId,
        camp_name: result.camp.name,
        camp_start_date: result.camp.startDate.toISOString().split('T')[0],
        camp_end_date: result.camp.endDate.toISOString().split('T')[0],
        tenant_id: result.camp.tenantId,
        tenant_name: result.camp.tenant?.name || null,
        requested_user_id: result.requestedUserId,
        requested_user_name: `${result.requestedUser.firstName || ''} ${result.requestedUser.lastName || ''}`.trim(),
        requested_user_email: result.requestedUser.email,
        requested_by_user_id: result.requestedByUserId,
        requested_by_user_name: `${result.requestedByUser.firstName || ''} ${result.requestedByUser.lastName || ''}`.trim(),
        role: result.role,
        status: result.status,
        requested_at: result.requestedAt.toISOString(),
        responded_at: result.respondedAt?.toISOString() || null,
        notes: result.notes,
        is_lead: result.isLead,
        call_time: formatTime(result.callTime),
        end_time: formatTime(result.endTime),
        station_name: result.stationName,
      },
      error: null,
    }
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error responding to request:', err)
    return { data: null, error: 'Failed to respond to staff assignment request' }
  }
}

/**
 * Cancel a pending staff assignment request (by the requester)
 */
export async function cancelStaffAssignmentRequest(
  requestId: string,
  requestedByUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    if (request.requestedByUserId !== requestedByUserId) {
      return { success: false, error: 'You are not authorized to cancel this request' }
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Only pending requests can be cancelled' }
    }

    await prisma.staffAssignmentRequest.delete({ where: { id: requestId } })

    return { success: true, error: null }
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error cancelling request:', err)
    return { success: false, error: 'Failed to cancel staff assignment request' }
  }
}

/**
 * Get count of pending requests for a user
 */
export async function getPendingRequestCountForUser(userId: string): Promise<number> {
  try {
    return await prisma.staffAssignmentRequest.count({
      where: {
        requestedUserId: userId,
        status: 'pending',
      },
    })
  } catch (err) {
    console.error('[StaffAssignmentRequests] Error getting pending count:', err)
    return 0
  }
}
