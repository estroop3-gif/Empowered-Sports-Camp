/**
 * Grouping Service
 *
 * Implements the camp grouping algorithm with the following constraints:
 * - Group Size Limit: max 12 campers per group (configurable)
 * - Grade Separation: max 2 grade levels apart within any group
 * - Social Lock: campers with same Friend Request ID must stay together
 *
 * Algorithm:
 * 1. Lock social friend groups first, placing entire groups together
 * 2. Assign remaining campers sorted by grade to smallest valid group
 * 3. Flag any campers/friend groups that cannot be placed for manual override
 */

import prisma from '@/lib/db/client'
import { AssignmentType, GroupingStatus, ViolationType, ViolationSeverity } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface GroupingCamper {
  id: string
  camper_session_id: string
  athlete_id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_id: string | null
  friend_group_number: number | null
  current_group_id: string | null
  current_group_number: number | null
  assignment_type: string | null
  photo_url: string | null
  has_medical_notes: boolean
  has_allergies: boolean
  special_considerations: string | null
}

export interface GroupingGroup {
  id: string
  group_number: number
  group_name: string
  group_color: string | null
  max_size: number
  campers: GroupingCamper[]
  stats: {
    count: number
    min_grade: number | null
    max_grade: number | null
    grade_spread: number
    is_full: boolean
    has_size_violation: boolean
    has_grade_violation: boolean
    has_friend_violation: boolean
  }
}

export interface GroupingState {
  camp_id: string
  camp_name: string
  tenant_id: string | null
  status: string
  max_group_size: number
  num_groups: number
  max_grade_spread: number
  groups: GroupingGroup[]
  ungrouped_campers: GroupingCamper[]
  total_campers: number
  friend_groups_count: number
  warnings: GroupingWarning[]
  is_finalized: boolean
}

export interface GroupingWarning {
  type: 'friend_group_too_large' | 'friend_group_grade_spread' | 'unplaceable_camper' | 'over_capacity'
  message: string
  affected_camper_ids: string[]
  friend_group_id?: string
  severity: 'warning' | 'error'
}

export interface GroupingResult {
  groups: GroupingGroup[]
  ungrouped_campers: GroupingCamper[]
  warnings: GroupingWarning[]
  stats: {
    total_campers: number
    placed_count: number
    unplaced_count: number
    friend_groups_intact: number
    friend_groups_split: number
  }
}

export interface UpdateGroupingInput {
  camp_id: string
  updates: Array<{
    camper_session_id: string
    new_group_id: string | null
    override_acknowledged?: boolean
    override_note?: string
  }>
  user_id: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_GROUP_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Lavender
  '#FCBAD3', // Pink
  '#A8D8EA', // Light Blue
]

const DEFAULT_GROUP_NAMES = [
  'Team Blaze',
  'Team Thunder',
  'Team Lightning',
  'Team Storm',
  'Team Phoenix',
  'Team Falcon',
  'Team Wolves',
  'Team Panthers',
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateGradeStats(campers: GroupingCamper[]): {
  min_grade: number | null
  max_grade: number | null
  grade_spread: number
} {
  const grades = campers
    .map(c => c.grade_level)
    .filter((g): g is number => g !== null)

  if (grades.length === 0) {
    return { min_grade: null, max_grade: null, grade_spread: 0 }
  }

  const min_grade = Math.min(...grades)
  const max_grade = Math.max(...grades)

  return {
    min_grade,
    max_grade,
    grade_spread: max_grade - min_grade,
  }
}

function canAddCamperToGroup(
  camper: GroupingCamper,
  group: GroupingGroup,
  maxGroupSize: number,
  maxGradeSpread: number
): { valid: boolean; reason?: string } {
  // Check size
  if (group.campers.length >= maxGroupSize) {
    return { valid: false, reason: 'Group is at capacity' }
  }

  // Check grade spread
  if (camper.grade_level !== null) {
    const currentGrades = group.campers
      .map(c => c.grade_level)
      .filter((g): g is number => g !== null)

    if (currentGrades.length > 0) {
      const currentMin = Math.min(...currentGrades)
      const currentMax = Math.max(...currentGrades)
      const newMin = Math.min(currentMin, camper.grade_level)
      const newMax = Math.max(currentMax, camper.grade_level)

      if (newMax - newMin > maxGradeSpread) {
        return {
          valid: false,
          reason: `Grade gap would exceed ${maxGradeSpread} levels`,
        }
      }
    }
  }

  return { valid: true }
}

function canAddFriendGroupToGroup(
  friendCampers: GroupingCamper[],
  group: GroupingGroup,
  maxGroupSize: number,
  maxGradeSpread: number
): { valid: boolean; reason?: string } {
  // Check size
  if (group.campers.length + friendCampers.length > maxGroupSize) {
    return { valid: false, reason: 'Would exceed group capacity' }
  }

  // Check grade spread
  const allGrades = [
    ...group.campers.map(c => c.grade_level),
    ...friendCampers.map(c => c.grade_level),
  ].filter((g): g is number => g !== null)

  if (allGrades.length > 0) {
    const min = Math.min(...allGrades)
    const max = Math.max(...allGrades)

    if (max - min > maxGradeSpread) {
      return { valid: false, reason: `Grade gap would exceed ${maxGradeSpread} levels` }
    }
  }

  return { valid: true }
}

function transformCamper(
  camperData: {
    id: string
    athleteId: string
    athlete: {
      firstName: string
      lastName: string
      photoUrl: string | null
      medicalNotes: string | null
      allergies: string | null
    }
    gradeValidated: number | null
    friendGroupId: string | null
    friendGroup: { groupNumber: number } | null
    assignedGroupId: string | null
    assignedGroup: { groupNumber: number } | null
    assignmentType: string | null
    specialConsiderations: string | null
  }
): GroupingCamper {
  return {
    id: camperData.id,
    camper_session_id: camperData.id,
    athlete_id: camperData.athleteId,
    name: `${camperData.athlete.firstName} ${camperData.athlete.lastName}`,
    first_name: camperData.athlete.firstName,
    last_name: camperData.athlete.lastName,
    grade_level: camperData.gradeValidated,
    friend_group_id: camperData.friendGroupId,
    friend_group_number: camperData.friendGroup?.groupNumber || null,
    current_group_id: camperData.assignedGroupId,
    current_group_number: camperData.assignedGroup?.groupNumber || null,
    assignment_type: camperData.assignmentType,
    photo_url: camperData.athlete.photoUrl,
    has_medical_notes: !!camperData.athlete.medicalNotes,
    has_allergies: !!camperData.athlete.allergies,
    special_considerations: camperData.specialConsiderations,
  }
}

// ============================================================================
// CORE SERVICE FUNCTIONS
// ============================================================================

/**
 * Sync CamperSessionData from confirmed registrations.
 * Ensures all confirmed registrations have a corresponding CamperSessionData entry.
 */
export async function syncCamperSessionData(
  campId: string
): Promise<{ synced: number; error: Error | null }> {
  try {
    // Find active registrations without CamperSessionData
    // Use same filter as roster service: all non-cancelled registrations
    const confirmedRegistrations = await prisma.registration.findMany({
      where: {
        campId,
        status: { not: 'cancelled' },
      },
      include: {
        athlete: true,
        camp: true,
        camperSessionData: true,
      },
    })

    let syncedCount = 0

    for (const reg of confirmedRegistrations) {
      // Skip if CamperSessionData already exists
      if (reg.camperSessionData) continue

      // Check if CamperSessionData exists via the unique constraint
      const existingSessionData = await prisma.camperSessionData.findUnique({
        where: {
          campId_athleteId: {
            campId: reg.campId,
            athleteId: reg.athleteId,
          },
        },
      })

      if (existingSessionData) continue

      // Create CamperSessionData
      const campStart = new Date(reg.camp.startDate)
      const dob = reg.athlete.dateOfBirth
      const ageAtCamp = campStart.getFullYear() - dob.getFullYear()
      const ageMonths = (campStart.getFullYear() - dob.getFullYear()) * 12 +
        (campStart.getMonth() - dob.getMonth())

      await prisma.camperSessionData.create({
        data: {
          registrationId: reg.id,
          campId: reg.campId,
          athleteId: reg.athleteId,
          tenantId: reg.tenantId,
          ageAtCampStart: ageAtCamp,
          ageMonthsAtCampStart: ageMonths,
          gradeFromRegistration: reg.athlete.grade,
          medicalNotes: reg.athlete.medicalNotes,
          allergies: reg.athlete.allergies,
          specialConsiderations: reg.specialConsiderations,
          friendRequests: reg.friendRequests,
          registeredAt: reg.createdAt,
          isLateRegistration: new Date() > new Date(reg.camp.registrationClose || reg.camp.startDate),
        },
      })

      syncedCount++
    }

    return { synced: syncedCount, error: null }
  } catch (error) {
    console.error('[syncCamperSessionData] Error:', error)
    return { synced: 0, error: error as Error }
  }
}

/**
 * Get the current grouping state for a camp
 * Creates groups if they don't exist
 * Also syncs CamperSessionData from confirmed registrations
 */
export async function getCampGroupingState(
  campId: string
): Promise<{ data: GroupingState | null; error: Error | null }> {
  try {
    // First, sync CamperSessionData from confirmed registrations
    await syncCamperSessionData(campId)

    // Fetch camp with configuration
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
        tenantId: true,
        groupingStatus: true,
        groupingFinalizedAt: true,
        maxGroupSize: true,
        numGroups: true,
        maxGradeSpread: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const maxGroupSize = camp.maxGroupSize || 12
    const numGroups = camp.numGroups || 5
    const maxGradeSpread = camp.maxGradeSpread || 2

    // Ensure groups exist
    const existingGroups = await prisma.campGroup.findMany({
      where: { campId },
      orderBy: { groupNumber: 'asc' },
    })

    // Create missing groups
    if (existingGroups.length < numGroups && camp.tenantId) {
      const existingNumbers = new Set(existingGroups.map(g => g.groupNumber))
      const groupsToCreate: Array<{
        campId: string
        tenantId: string
        groupNumber: number
        groupName: string
        groupColor: string
      }> = []

      for (let i = 1; i <= numGroups; i++) {
        if (!existingNumbers.has(i)) {
          groupsToCreate.push({
            campId,
            tenantId: camp.tenantId,
            groupNumber: i,
            groupName: DEFAULT_GROUP_NAMES[i - 1] || `Group ${i}`,
            groupColor: DEFAULT_GROUP_COLORS[(i - 1) % DEFAULT_GROUP_COLORS.length],
          })
        }
      }

      if (groupsToCreate.length > 0) {
        await prisma.campGroup.createMany({ data: groupsToCreate })
      }
    }

    // Fetch groups with campers
    const groups = await prisma.campGroup.findMany({
      where: { campId },
      orderBy: { groupNumber: 'asc' },
      include: {
        camperSessionData: {
          include: {
            athlete: {
              select: {
                firstName: true,
                lastName: true,
                photoUrl: true,
                medicalNotes: true,
                allergies: true,
              },
            },
            friendGroup: {
              select: { groupNumber: true },
            },
            assignedGroup: {
              select: { groupNumber: true },
            },
          },
        },
      },
    })

    // Fetch ungrouped campers
    const ungroupedCampers = await prisma.camperSessionData.findMany({
      where: {
        campId,
        assignedGroupId: null,
      },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
            medicalNotes: true,
            allergies: true,
          },
        },
        friendGroup: {
          select: { groupNumber: true },
        },
        assignedGroup: {
          select: { groupNumber: true },
        },
      },
    })

    // Count friend groups
    const friendGroupsCount = await prisma.friendGroup.count({
      where: { campId },
    })

    // Transform groups
    const transformedGroups: GroupingGroup[] = groups.map(group => {
      const campers = group.camperSessionData.map(csd => transformCamper(csd))
      const gradeStats = calculateGradeStats(campers)

      return {
        id: group.id,
        group_number: group.groupNumber,
        group_name: group.groupName || `Group ${group.groupNumber}`,
        group_color: group.groupColor,
        max_size: maxGroupSize,
        campers,
        stats: {
          count: campers.length,
          ...gradeStats,
          is_full: campers.length >= maxGroupSize,
          has_size_violation: campers.length > maxGroupSize,
          has_grade_violation: gradeStats.grade_spread > maxGradeSpread,
          has_friend_violation: group.friendViolation || false,
        },
      }
    })

    // Transform ungrouped
    const transformedUngrouped = ungroupedCampers.map(csd => transformCamper(csd))

    // Calculate warnings
    const warnings: GroupingWarning[] = []

    // Check for groups with violations
    for (const group of transformedGroups) {
      if (group.stats.has_size_violation) {
        warnings.push({
          type: 'over_capacity',
          message: `${group.group_name} has ${group.stats.count} campers (max ${maxGroupSize})`,
          affected_camper_ids: group.campers.map(c => c.camper_session_id),
          severity: 'error',
        })
      }
      if (group.stats.has_grade_violation) {
        warnings.push({
          type: 'friend_group_grade_spread',
          message: `${group.group_name} has grade spread of ${group.stats.grade_spread} (max ${maxGradeSpread})`,
          affected_camper_ids: group.campers.map(c => c.camper_session_id),
          severity: 'warning',
        })
      }
    }

    const totalCampers =
      transformedGroups.reduce((sum, g) => sum + g.campers.length, 0) +
      transformedUngrouped.length

    return {
      data: {
        camp_id: camp.id,
        camp_name: camp.name,
        tenant_id: camp.tenantId,
        status: camp.groupingStatus,
        max_group_size: maxGroupSize,
        num_groups: numGroups,
        max_grade_spread: maxGradeSpread,
        groups: transformedGroups,
        ungrouped_campers: transformedUngrouped,
        total_campers: totalCampers,
        friend_groups_count: friendGroupsCount,
        warnings,
        is_finalized: !!camp.groupingFinalizedAt,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getCampGroupingState] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Auto-group campers using the algorithm
 *
 * Algorithm steps:
 * 1. Initialize/reset groups
 * 2. Lock social friend groups - place entire groups together
 * 3. Assign remaining campers sorted by grade
 * 4. Flag unplaceable campers for manual override
 */
export async function autoGroupCampers(
  campId: string,
  userId?: string
): Promise<{ data: GroupingResult | null; error: Error | null }> {
  try {
    const startTime = Date.now()

    // Get camp configuration
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        tenantId: true,
        maxGroupSize: true,
        numGroups: true,
        maxGradeSpread: true,
        groupingFinalizedAt: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    if (camp.groupingFinalizedAt) {
      return { data: null, error: new Error('Grouping has been finalized. Unfinalize to make changes.') }
    }

    const maxGroupSize = camp.maxGroupSize || 12
    const numGroups = camp.numGroups || 5
    const maxGradeSpread = camp.maxGradeSpread || 2

    // Fetch all camper session data
    const allCampers = await prisma.camperSessionData.findMany({
      where: { campId },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
            medicalNotes: true,
            allergies: true,
          },
        },
        friendGroup: {
          select: { id: true, groupNumber: true, memberCount: true },
        },
        assignedGroup: {
          select: { groupNumber: true },
        },
      },
      orderBy: { gradeValidated: 'asc' },
    })

    // Fetch friend groups
    const friendGroups = await prisma.friendGroup.findMany({
      where: { campId },
      include: {
        camperSessionData: {
          include: {
            athlete: {
              select: {
                firstName: true,
                lastName: true,
                photoUrl: true,
                medicalNotes: true,
                allergies: true,
              },
            },
            friendGroup: {
              select: { groupNumber: true },
            },
            assignedGroup: {
              select: { groupNumber: true },
            },
          },
        },
      },
    })

    // Initialize groups
    let groups = await prisma.campGroup.findMany({
      where: { campId },
      orderBy: { groupNumber: 'asc' },
    })

    // Ensure we have enough groups
    if (groups.length < numGroups && camp.tenantId) {
      const existingNumbers = new Set(groups.map(g => g.groupNumber))
      const groupsToCreate: Array<{
        campId: string
        tenantId: string
        groupNumber: number
        groupName: string
        groupColor: string
      }> = []

      for (let i = 1; i <= numGroups; i++) {
        if (!existingNumbers.has(i)) {
          groupsToCreate.push({
            campId,
            tenantId: camp.tenantId,
            groupNumber: i,
            groupName: DEFAULT_GROUP_NAMES[i - 1] || `Group ${i}`,
            groupColor: DEFAULT_GROUP_COLORS[(i - 1) % DEFAULT_GROUP_COLORS.length],
          })
        }
      }

      if (groupsToCreate.length > 0) {
        await prisma.campGroup.createMany({ data: groupsToCreate })
        groups = await prisma.campGroup.findMany({
          where: { campId },
          orderBy: { groupNumber: 'asc' },
        })
      }
    }

    // Clear existing assignments
    await prisma.camperSessionData.updateMany({
      where: { campId },
      data: {
        assignedGroupId: null,
        assignmentType: null,
        assignmentReason: null,
      },
    })

    // Working state for algorithm
    const groupAssignments: Map<string, GroupingCamper[]> = new Map()
    groups.forEach(g => groupAssignments.set(g.id, []))

    const warnings: GroupingWarning[] = []
    const assignedCamperIds = new Set<string>()
    let friendGroupsIntact = 0
    let friendGroupsSplit = 0

    // STEP 1: Lock social friend groups
    for (const friendGroup of friendGroups) {
      const friendCampers = friendGroup.camperSessionData.map(csd => transformCamper(csd))

      if (friendCampers.length === 0) continue

      // Check if friend group itself violates constraints
      const friendGradeStats = calculateGradeStats(friendCampers)

      if (friendCampers.length > maxGroupSize) {
        warnings.push({
          type: 'friend_group_too_large',
          message: `Friend group ${friendGroup.groupNumber} has ${friendCampers.length} members (max ${maxGroupSize})`,
          affected_camper_ids: friendCampers.map(c => c.camper_session_id),
          friend_group_id: friendGroup.id,
          severity: 'error',
        })
        friendGroupsSplit++
        // Will be handled individually later
        continue
      }

      if (friendGradeStats.grade_spread > maxGradeSpread) {
        warnings.push({
          type: 'friend_group_grade_spread',
          message: `Friend group ${friendGroup.groupNumber} has grade spread of ${friendGradeStats.grade_spread} (max ${maxGradeSpread})`,
          affected_camper_ids: friendCampers.map(c => c.camper_session_id),
          friend_group_id: friendGroup.id,
          severity: 'warning',
        })
      }

      // Find best group for this friend group
      let bestGroupId: string | null = null
      let bestGroupSize = Infinity

      for (const [groupId, campers] of groupAssignments) {
        const check = canAddFriendGroupToGroup(
          friendCampers,
          {
            id: groupId,
            group_number: 0,
            group_name: '',
            group_color: null,
            max_size: maxGroupSize,
            campers,
            stats: {
              count: campers.length,
              ...calculateGradeStats(campers),
              is_full: false,
              has_size_violation: false,
              has_grade_violation: false,
              has_friend_violation: false,
            },
          },
          maxGroupSize,
          maxGradeSpread
        )

        if (check.valid && campers.length < bestGroupSize) {
          bestGroupId = groupId
          bestGroupSize = campers.length
        }
      }

      if (bestGroupId) {
        // Place friend group
        const currentCampers = groupAssignments.get(bestGroupId) || []
        groupAssignments.set(bestGroupId, [...currentCampers, ...friendCampers])
        friendCampers.forEach(c => assignedCamperIds.add(c.camper_session_id))
        friendGroupsIntact++
      } else {
        // Cannot place friend group intact
        warnings.push({
          type: 'friend_group_too_large',
          message: `Cannot place friend group ${friendGroup.groupNumber} intact - no valid group available`,
          affected_camper_ids: friendCampers.map(c => c.camper_session_id),
          friend_group_id: friendGroup.id,
          severity: 'error',
        })
        friendGroupsSplit++
      }
    }

    // STEP 2: Assign remaining campers sorted by grade
    const unassignedCampers = allCampers
      .filter(c => !assignedCamperIds.has(c.id))
      .sort((a, b) => (a.gradeValidated || 0) - (b.gradeValidated || 0))

    for (const camperData of unassignedCampers) {
      const camper = transformCamper(camperData)

      // Find best group
      let bestGroupId: string | null = null
      let bestGroupSize = Infinity

      for (const [groupId, campers] of groupAssignments) {
        const check = canAddCamperToGroup(
          camper,
          {
            id: groupId,
            group_number: 0,
            group_name: '',
            group_color: null,
            max_size: maxGroupSize,
            campers,
            stats: {
              count: campers.length,
              ...calculateGradeStats(campers),
              is_full: false,
              has_size_violation: false,
              has_grade_violation: false,
              has_friend_violation: false,
            },
          },
          maxGroupSize,
          maxGradeSpread
        )

        if (check.valid && campers.length < bestGroupSize) {
          bestGroupId = groupId
          bestGroupSize = campers.length
        }
      }

      if (bestGroupId) {
        const currentCampers = groupAssignments.get(bestGroupId) || []
        groupAssignments.set(bestGroupId, [...currentCampers, camper])
        assignedCamperIds.add(camper.camper_session_id)
      } else {
        warnings.push({
          type: 'unplaceable_camper',
          message: `Cannot place ${camper.name} (Grade ${camper.grade_level}) - no valid group available`,
          affected_camper_ids: [camper.camper_session_id],
          severity: 'error',
        })
      }
    }

    // STEP 3: Persist assignments
    const assignmentPromises: Promise<unknown>[] = []

    for (const [groupId, campers] of groupAssignments) {
      for (const camper of campers) {
        assignmentPromises.push(
          prisma.camperSessionData.update({
            where: { id: camper.camper_session_id },
            data: {
              assignedGroupId: groupId,
              assignmentType: 'auto' as AssignmentType,
              assignmentReason: camper.friend_group_id
                ? 'Auto-assigned with friend group'
                : 'Auto-assigned by grade',
            },
          })
        )
      }
    }

    await Promise.all(assignmentPromises)

    // Update group stats
    for (const group of groups) {
      const campers = groupAssignments.get(group.id) || []
      const gradeStats = calculateGradeStats(campers)

      await prisma.campGroup.update({
        where: { id: group.id },
        data: {
          camperCount: campers.length,
          minGrade: gradeStats.min_grade,
          maxGrade: gradeStats.max_grade,
          gradeSpread: gradeStats.grade_spread,
          sizeViolation: campers.length > maxGroupSize,
          gradeViolation: gradeStats.grade_spread > maxGradeSpread,
          friendViolation: false,
        },
      })
    }

    // Update camp grouping status
    await prisma.camp.update({
      where: { id: campId },
      data: {
        groupingStatus: 'auto_grouped' as GroupingStatus,
        groupingRunAt: new Date(),
      },
    })

    // Create grouping run record
    const executionTimeMs = Date.now() - startTime
    if (camp.tenantId) {
      await prisma.groupingRun.create({
        data: {
          campId,
          tenantId: camp.tenantId,
          runType: 'initial',
          triggeredBy: userId,
          triggerReason: 'Auto-group button clicked',
          totalCampers: allCampers.length,
          totalFriendGroups: friendGroups.length,
          maxGroupSize,
          numGroups,
          maxGradeSpread,
          algorithmVersion: '2.0',
          executionTimeMs,
          campersAutoPlaced: assignedCamperIds.size,
          friendGroupsPlacedIntact: friendGroupsIntact,
          friendGroupsSplit: friendGroupsSplit,
          constraintViolations: warnings.length,
          success: true,
          warnings: warnings.map(w => w.message),
        },
      })
    }

    // Build result
    const resultGroups: GroupingGroup[] = groups.map(group => {
      const campers = groupAssignments.get(group.id) || []
      const gradeStats = calculateGradeStats(campers)

      return {
        id: group.id,
        group_number: group.groupNumber,
        group_name: group.groupName || `Group ${group.groupNumber}`,
        group_color: group.groupColor,
        max_size: maxGroupSize,
        campers,
        stats: {
          count: campers.length,
          ...gradeStats,
          is_full: campers.length >= maxGroupSize,
          has_size_violation: campers.length > maxGroupSize,
          has_grade_violation: gradeStats.grade_spread > maxGradeSpread,
          has_friend_violation: false,
        },
      }
    })

    const ungroupedCampers = allCampers
      .filter(c => !assignedCamperIds.has(c.id))
      .map(csd => transformCamper(csd))

    return {
      data: {
        groups: resultGroups,
        ungrouped_campers: ungroupedCampers,
        warnings,
        stats: {
          total_campers: allCampers.length,
          placed_count: assignedCamperIds.size,
          unplaced_count: allCampers.length - assignedCamperIds.size,
          friend_groups_intact: friendGroupsIntact,
          friend_groups_split: friendGroupsSplit,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[autoGroupCampers] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update grouping assignments (drag-and-drop)
 * Validates changes against constraints
 */
export async function updateGroupingAssignments(
  input: UpdateGroupingInput
): Promise<{ data: GroupingState | null; error: Error | null }> {
  try {
    const { camp_id, updates, user_id } = input

    // Get camp configuration
    const camp = await prisma.camp.findUnique({
      where: { id: camp_id },
      select: {
        id: true,
        tenantId: true,
        maxGroupSize: true,
        maxGradeSpread: true,
        groupingFinalizedAt: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    if (camp.groupingFinalizedAt) {
      return { data: null, error: new Error('Grouping has been finalized. Unfinalize to make changes.') }
    }

    const maxGroupSize = camp.maxGroupSize || 12
    const maxGradeSpread = camp.maxGradeSpread || 2

    // Process each update
    for (const update of updates) {
      const camper = await prisma.camperSessionData.findUnique({
        where: { id: update.camper_session_id },
        include: {
          athlete: true,
          friendGroup: {
            include: {
              camperSessionData: {
                select: { id: true },
              },
            },
          },
        },
      })

      if (!camper) {
        return { data: null, error: new Error(`Camper ${update.camper_session_id} not found`) }
      }

      // Check friend group lock
      if (camper.friendGroupId && !update.override_acknowledged) {
        const friendMembers = camper.friendGroup?.camperSessionData || []
        const otherMembers = friendMembers.filter(m => m.id !== camper.id)

        if (otherMembers.length > 0) {
          // Check if all friend group members are being moved together
          const friendMemberUpdates = updates.filter(u =>
            otherMembers.some(m => m.id === u.camper_session_id) &&
            u.new_group_id === update.new_group_id
          )

          if (friendMemberUpdates.length !== otherMembers.length) {
            return {
              data: null,
              error: new Error(
                `${camper.athlete.firstName} is in a friend group. Move all members together or acknowledge override.`
              ),
            }
          }
        }
      }

      // If moving to a group, validate constraints
      if (update.new_group_id) {
        const targetGroup = await prisma.campGroup.findUnique({
          where: { id: update.new_group_id },
          include: {
            camperSessionData: {
              include: {
                athlete: true,
              },
            },
          },
        })

        if (!targetGroup) {
          return { data: null, error: new Error('Target group not found') }
        }

        // Check size
        const currentSize = targetGroup.camperSessionData.filter(
          c => c.id !== update.camper_session_id
        ).length

        if (currentSize >= maxGroupSize) {
          return {
            data: null,
            error: new Error(`${targetGroup.groupName || 'Group'} is at capacity (${maxGroupSize} max)`),
          }
        }

        // Check grade spread
        if (camper.gradeValidated !== null) {
          const grades = targetGroup.camperSessionData
            .filter(c => c.id !== update.camper_session_id)
            .map(c => c.gradeValidated)
            .filter((g): g is number => g !== null)

          if (grades.length > 0) {
            const currentMin = Math.min(...grades)
            const currentMax = Math.max(...grades)
            const newMin = Math.min(currentMin, camper.gradeValidated)
            const newMax = Math.max(currentMax, camper.gradeValidated)

            if (newMax - newMin > maxGradeSpread && !update.override_acknowledged) {
              return {
                data: null,
                error: new Error(
                  `Moving ${camper.athlete.firstName} would create a grade gap of ${newMax - newMin} (max ${maxGradeSpread}). Acknowledge override to proceed.`
                ),
              }
            }
          }
        }
      }

      // Perform update
      const fromGroupId = camper.assignedGroupId

      await prisma.camperSessionData.update({
        where: { id: update.camper_session_id },
        data: {
          assignedGroupId: update.new_group_id,
          assignmentType: update.override_acknowledged ? 'override' : 'manual',
          assignmentReason: update.override_note || 'Manual assignment',
        },
      })

      // Create assignment record
      if (update.new_group_id && camp.tenantId) {
        await prisma.groupAssignment.create({
          data: {
            camperSessionId: update.camper_session_id,
            campId: camp_id,
            tenantId: camp.tenantId,
            fromGroupId,
            toGroupId: update.new_group_id,
            assignmentType: update.override_acknowledged ? 'override' : 'manual',
            reason: update.override_note || 'Manual drag-and-drop',
            overrideAcknowledged: update.override_acknowledged || false,
            overrideNote: update.override_note,
            assignedBy: user_id,
          },
        })
      }
    }

    // Update camp status
    await prisma.camp.update({
      where: { id: camp_id },
      data: {
        groupingStatus: 'reviewed' as GroupingStatus,
      },
    })

    // Recalculate group stats
    const groups = await prisma.campGroup.findMany({
      where: { campId: camp_id },
      include: {
        camperSessionData: true,
      },
    })

    for (const group of groups) {
      const grades = group.camperSessionData
        .map(c => c.gradeValidated)
        .filter((g): g is number => g !== null)

      const minGrade = grades.length > 0 ? Math.min(...grades) : null
      const maxGrade = grades.length > 0 ? Math.max(...grades) : null
      const gradeSpread = minGrade !== null && maxGrade !== null ? maxGrade - minGrade : 0

      await prisma.campGroup.update({
        where: { id: group.id },
        data: {
          camperCount: group.camperSessionData.length,
          minGrade,
          maxGrade,
          gradeSpread,
          sizeViolation: group.camperSessionData.length > maxGroupSize,
          gradeViolation: gradeSpread > maxGradeSpread,
        },
      })
    }

    // Return updated state
    return getCampGroupingState(camp_id)
  } catch (error) {
    console.error('[updateGroupingAssignments] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Finalize grouping for a camp
 * Prevents further automatic changes
 */
export async function finalizeGrouping(
  campId: string,
  userId: string
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    // Check for any violations
    const state = await getCampGroupingState(campId)

    if (state.error) {
      return { data: { success: false }, error: state.error }
    }

    const hardViolations = state.data?.warnings.filter(w => w.severity === 'error') || []
    const ungroupedCount = state.data?.ungrouped_campers.length || 0

    if (hardViolations.length > 0 || ungroupedCount > 0) {
      return {
        data: { success: false },
        error: new Error(
          `Cannot finalize: ${ungroupedCount} ungrouped campers and ${hardViolations.length} violations remaining.`
        ),
      }
    }

    // Update camp
    await prisma.camp.update({
      where: { id: campId },
      data: {
        groupingStatus: 'finalized' as GroupingStatus,
        groupingFinalizedAt: new Date(),
        groupingFinalizedBy: userId,
      },
    })

    // Create report snapshot
    const groups = await prisma.campGroup.findMany({
      where: { campId },
      include: {
        camperSessionData: {
          include: {
            athlete: true,
          },
        },
      },
    })

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true },
    })

    if (camp?.tenantId) {
      await prisma.groupReportSnapshot.create({
        data: {
          campId,
          tenantId: camp.tenantId,
          reportType: 'final',
          version: 1,
          groupsSnapshot: groups.map(g => ({
            id: g.id,
            groupNumber: g.groupNumber,
            groupName: g.groupName,
            camperCount: g.camperCount,
            minGrade: g.minGrade,
            maxGrade: g.maxGrade,
          })),
          campersSnapshot: groups.flatMap(g =>
            g.camperSessionData.map(c => ({
              id: c.id,
              name: `${c.athlete.firstName} ${c.athlete.lastName}`,
              grade: c.gradeValidated,
              groupId: g.id,
              groupNumber: g.groupNumber,
            }))
          ),
          statsSnapshot: {
            totalCampers: state.data?.total_campers,
            groupedCampers: state.data?.total_campers,
            friendGroupsCount: state.data?.friend_groups_count,
          },
          generatedBy: userId,
        },
      })
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[finalizeGrouping] Error:', error)
    return { data: { success: false }, error: error as Error }
  }
}

/**
 * Unfinalize grouping to allow changes
 */
export async function unfinalizeGrouping(
  campId: string
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    await prisma.camp.update({
      where: { id: campId },
      data: {
        groupingStatus: 'reviewed' as GroupingStatus,
        groupingFinalizedAt: null,
        groupingFinalizedBy: null,
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[unfinalizeGrouping] Error:', error)
    return { data: { success: false }, error: error as Error }
  }
}

/**
 * Update group name
 */
export async function updateGroupName(
  groupId: string,
  name: string
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    await prisma.campGroup.update({
      where: { id: groupId },
      data: { groupName: name },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[updateGroupName] Error:', error)
    return { data: { success: false }, error: error as Error }
  }
}

/**
 * Add a new group to a camp
 */
export async function addGroup(
  campId: string,
  options?: {
    groupName?: string
    groupColor?: string
  }
): Promise<{ data: { group: { id: string; groupNumber: number; groupName: string; groupColor: string } } | null; error: Error | null }> {
  try {
    // Get camp info
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true, numGroups: true },
    })

    if (!camp || !camp.tenantId) {
      return { data: null, error: new Error('Camp not found or has no tenant') }
    }

    // Get highest existing group number
    const existingGroups = await prisma.campGroup.findMany({
      where: { campId },
      orderBy: { groupNumber: 'desc' },
      take: 1,
    })

    const newGroupNumber = (existingGroups[0]?.groupNumber || 0) + 1
    const defaultName = DEFAULT_GROUP_NAMES[newGroupNumber - 1] || `Group ${newGroupNumber}`
    const defaultColor = DEFAULT_GROUP_COLORS[(newGroupNumber - 1) % DEFAULT_GROUP_COLORS.length]

    const newGroup = await prisma.campGroup.create({
      data: {
        campId,
        tenantId: camp.tenantId,
        groupNumber: newGroupNumber,
        groupName: options?.groupName || defaultName,
        groupColor: options?.groupColor || defaultColor,
      },
    })

    // Update camp's numGroups
    await prisma.camp.update({
      where: { id: campId },
      data: { numGroups: newGroupNumber },
    })

    return {
      data: {
        group: {
          id: newGroup.id,
          groupNumber: newGroup.groupNumber,
          groupName: newGroup.groupName || defaultName,
          groupColor: newGroup.groupColor || defaultColor,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[addGroup] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a group from a camp
 * Moves all campers in that group to ungrouped
 */
export async function removeGroup(
  groupId: string
): Promise<{ data: { success: boolean; movedCampers: number } | null; error: Error | null }> {
  try {
    // Get group with campers
    const group = await prisma.campGroup.findUnique({
      where: { id: groupId },
      include: {
        camperSessionData: true,
      },
    })

    if (!group) {
      return { data: null, error: new Error('Group not found') }
    }

    // Move all campers to ungrouped
    const movedCampers = group.camperSessionData.length
    if (movedCampers > 0) {
      await prisma.camperSessionData.updateMany({
        where: { assignedGroupId: groupId },
        data: {
          assignedGroupId: null,
          assignmentType: null,
          assignmentReason: 'Group was deleted',
        },
      })
    }

    // Delete the group
    await prisma.campGroup.delete({
      where: { id: groupId },
    })

    // Renumber remaining groups
    const remainingGroups = await prisma.campGroup.findMany({
      where: { campId: group.campId },
      orderBy: { groupNumber: 'asc' },
    })

    for (let i = 0; i < remainingGroups.length; i++) {
      if (remainingGroups[i].groupNumber !== i + 1) {
        await prisma.campGroup.update({
          where: { id: remainingGroups[i].id },
          data: { groupNumber: i + 1 },
        })
      }
    }

    // Update camp's numGroups
    await prisma.camp.update({
      where: { id: group.campId },
      data: { numGroups: remainingGroups.length },
    })

    return { data: { success: true, movedCampers }, error: null }
  } catch (error) {
    console.error('[removeGroup] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update group settings (name, color)
 */
export async function updateGroup(
  groupId: string,
  updates: {
    groupName?: string
    groupColor?: string
  }
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.campGroup.update({
      where: { id: groupId },
      data: {
        ...(updates.groupName !== undefined && { groupName: updates.groupName }),
        ...(updates.groupColor !== undefined && { groupColor: updates.groupColor }),
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[updateGroup] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// TEAM COLOR TYPES
// ============================================================================

export interface TeamColorCamper {
  id: string
  camper_session_id: string
  athlete_id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_id: string | null
  group_id: string | null
  group_name: string | null
  team_color: 'pink' | 'purple' | null
  photo_url: string | null
}

export interface TeamColorState {
  camp_id: string
  camp_name: string
  pink_team: {
    campers: TeamColorCamper[]
    count: number
  }
  purple_team: {
    campers: TeamColorCamper[]
    count: number
  }
  unassigned: {
    campers: TeamColorCamper[]
    count: number
  }
  total_campers: number
  is_balanced: boolean
  balance_diff: number
}

export interface TeamColorAssignmentResult {
  pink_count: number
  purple_count: number
  campers_updated: number
}

// ============================================================================
// TEAM COLOR FUNCTIONS
// ============================================================================

/**
 * Get the current team color state for a camp
 */
export async function getTeamColorState(
  campId: string
): Promise<{ data: TeamColorState | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const campers = await prisma.camperSessionData.findMany({
      where: { campId },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
        assignedGroup: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
      orderBy: [
        { teamColor: 'asc' },
        { athlete: { lastName: 'asc' } },
      ],
    })

    const transformCamper = (c: typeof campers[0]): TeamColorCamper => ({
      id: c.id,
      camper_session_id: c.id,
      athlete_id: c.athleteId,
      name: `${c.athlete.firstName} ${c.athlete.lastName}`,
      first_name: c.athlete.firstName,
      last_name: c.athlete.lastName,
      grade_level: c.gradeValidated,
      friend_group_id: c.friendGroupId,
      group_id: c.assignedGroupId,
      group_name: c.assignedGroup?.groupName || null,
      team_color: c.teamColor as 'pink' | 'purple' | null,
      photo_url: c.athlete.photoUrl,
    })

    const pinkCampers = campers.filter(c => c.teamColor === 'pink').map(transformCamper)
    const purpleCampers = campers.filter(c => c.teamColor === 'purple').map(transformCamper)
    const unassignedCampers = campers.filter(c => !c.teamColor).map(transformCamper)

    const balanceDiff = Math.abs(pinkCampers.length - purpleCampers.length)

    return {
      data: {
        camp_id: camp.id,
        camp_name: camp.name,
        pink_team: {
          campers: pinkCampers,
          count: pinkCampers.length,
        },
        purple_team: {
          campers: purpleCampers,
          count: purpleCampers.length,
        },
        unassigned: {
          campers: unassignedCampers,
          count: unassignedCampers.length,
        },
        total_campers: campers.length,
        is_balanced: balanceDiff <= 1,
        balance_diff: balanceDiff,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getTeamColorState] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Auto-assign team colors (pink/purple) while keeping friends together
 *
 * Algorithm:
 * 1. Group campers by friend_group_id (friends stay together)
 * 2. Sort clusters by size descending for better balance
 * 3. Assign each cluster to the team with fewer members
 * 4. Persist assignments
 */
export async function autoAssignTeamColors(
  campId: string
): Promise<{ data: TeamColorAssignmentResult | null; error: Error | null }> {
  try {
    // Fetch all campers with friend group info
    const campers = await prisma.camperSessionData.findMany({
      where: { campId },
      select: {
        id: true,
        athleteId: true,
        friendGroupId: true,
        gradeValidated: true,
      },
    })

    if (campers.length === 0) {
      return {
        data: { pink_count: 0, purple_count: 0, campers_updated: 0 },
        error: null,
      }
    }

    // Group campers by friendGroupId
    // Campers without a friend group are their own singleton cluster
    const clusters: Map<string, typeof campers> = new Map()

    for (const camper of campers) {
      const clusterId = camper.friendGroupId || `solo_${camper.id}`
      const existing = clusters.get(clusterId) || []
      clusters.set(clusterId, [...existing, camper])
    }

    // Convert to array and sort by size descending (larger clusters first for better balance)
    const clusterArray = Array.from(clusters.entries())
      .map(([clusterId, members]) => ({
        clusterId,
        members,
        size: members.length,
        avgGrade: members.reduce((sum, m) => sum + (m.gradeValidated || 0), 0) / members.length,
      }))
      .sort((a, b) => b.size - a.size)

    // Assign clusters to teams
    let pinkCount = 0
    let purpleCount = 0
    const assignments: { id: string; teamColor: 'pink' | 'purple' }[] = []

    for (const cluster of clusterArray) {
      // Assign to the team with fewer members
      // If equal, use deterministic tiebreaker (cluster ID hash or avg grade)
      let assignedColor: 'pink' | 'purple'

      if (pinkCount < purpleCount) {
        assignedColor = 'pink'
      } else if (purpleCount < pinkCount) {
        assignedColor = 'purple'
      } else {
        // Tiebreaker: use cluster average grade (lower grades go to pink)
        assignedColor = cluster.avgGrade <= 6 ? 'pink' : 'purple'
      }

      // Add all cluster members to the assigned color
      for (const member of cluster.members) {
        assignments.push({ id: member.id, teamColor: assignedColor })
      }

      if (assignedColor === 'pink') {
        pinkCount += cluster.size
      } else {
        purpleCount += cluster.size
      }
    }

    // Persist assignments in a transaction
    await prisma.$transaction(
      assignments.map(a =>
        prisma.camperSessionData.update({
          where: { id: a.id },
          data: { teamColor: a.teamColor },
        })
      )
    )

    return {
      data: {
        pink_count: pinkCount,
        purple_count: purpleCount,
        campers_updated: assignments.length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[autoAssignTeamColors] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a single camper's team color (manual override)
 */
export async function updateTeamColor(
  camperSessionId: string,
  teamColor: 'pink' | 'purple' | null
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    await prisma.camperSessionData.update({
      where: { id: camperSessionId },
      data: { teamColor },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[updateTeamColor] Error:', error)
    return { data: { success: false }, error: error as Error }
  }
}
