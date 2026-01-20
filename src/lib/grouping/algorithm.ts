/**
 * EMPOWERED SPORTS CAMP - CONSTRAINED GROUPING ALGORITHM
 *
 * This is the proprietary grouping algorithm that is the core value proposition
 * of the Empowered Sports Camp SaaS platform. It groups campers into five groups
 * per CampSession following these prioritized constraints:
 *
 * PRIORITY 1: SOCIAL GROUPING
 *   - Friends listed on registration must be grouped together
 *   - Handle one-sided requests, chained groups, oversized groups
 *
 * PRIORITY 2: GROUP SIZE
 *   - No group can exceed 12 campers (configurable)
 *   - Surface impossible scenarios for director review
 *
 * PRIORITY 3: GRADE PROXIMITY
 *   - No group can have campers with more than 2 grade difference
 *   - Check both existing range and incoming camper
 *
 * PRIORITY 4: BALANCING
 *   - Balance total campers across groups as evenly as possible
 *
 * ALGORITHM STEPS:
 * 1. Pre-process: Standardize data, cluster friend groups
 * 2. Place friend groups: Assign intact groups first, split if needed
 * 3. Place solo campers: Fill groups respecting grade constraints
 * 4. Balance: Redistribute if possible without breaking constraints
 * 5. Validate: Check all constraints and generate violations
 */

import {
  StandardizedCamper,
  FriendGroup,
  CampGroup,
  GroupingInput,
  GroupingOutput,
  GroupAssignment,
  ConstraintViolation,
  GroupingStats,
  ViolationType,
  GroupingConfig,
  DEFAULT_GROUPING_CONFIG,
  GROUP_COLORS,
  GROUP_NAMES,
} from './types'
import { splitFriendGroup } from './friend-clustering'
import { formatGradeRange } from './standardization'

// ============================================================================
// HELPER TYPES
// ============================================================================

interface GroupState {
  id: string
  groupNumber: number
  camperIds: string[]
  minGrade: number | null
  maxGrade: number | null
}

interface PlacementDecision {
  groupId: string
  reason: string
  causedSizeViolation: boolean
  causedGradeViolation: boolean
  causedFriendViolation: boolean
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize empty groups for a camp
 */
function initializeGroups(
  campId: string,
  tenantId: string,
  config: GroupingConfig
): GroupState[] {
  const groups: GroupState[] = []

  for (let i = 1; i <= config.numGroups; i++) {
    groups.push({
      id: `group-${i}`, // Will be replaced with UUID from DB
      groupNumber: i,
      camperIds: [],
      minGrade: null,
      maxGrade: null,
    })
  }

  return groups
}

/**
 * Update group grade bounds after adding a camper
 */
function updateGroupGrades(group: GroupState, grade: number): void {
  if (group.minGrade === null || grade < group.minGrade) {
    group.minGrade = grade
  }
  if (group.maxGrade === null || grade > group.maxGrade) {
    group.maxGrade = grade
  }
}

/**
 * Calculate grade spread of a group
 */
function getGradeSpread(group: GroupState): number {
  if (group.minGrade === null || group.maxGrade === null) {
    return 0
  }
  return group.maxGrade - group.minGrade
}

/**
 * Check if adding a camper with given grade would violate grade constraint
 */
function wouldViolateGradeConstraint(
  group: GroupState,
  grade: number,
  maxSpread: number
): boolean {
  if (group.minGrade === null || group.maxGrade === null) {
    return false // Empty group, no violation
  }

  const newMin = Math.min(group.minGrade, grade)
  const newMax = Math.max(group.maxGrade, grade)
  const newSpread = newMax - newMin

  return newSpread > maxSpread
}

// ============================================================================
// SCORING AND SELECTION
// ============================================================================

/**
 * Score a group for placing a friend group
 *
 * Lower score is better.
 * Considers: grade compatibility, current size, balance
 */
function scoreFriendGroupPlacement(
  group: GroupState,
  friendGroup: FriendGroup,
  config: GroupingConfig,
  allGroups: GroupState[]
): number {
  let score = 0

  // Penalize if would exceed size
  const newSize = group.camperIds.length + friendGroup.memberCount
  if (newSize > config.maxGroupSize) {
    score += 1000 * (newSize - config.maxGroupSize)
  }

  // Penalize if would exceed grade spread
  const newMinGrade = group.minGrade === null
    ? friendGroup.minGrade
    : Math.min(group.minGrade, friendGroup.minGrade)
  const newMaxGrade = group.maxGrade === null
    ? friendGroup.maxGrade
    : Math.max(group.maxGrade, friendGroup.maxGrade)
  const newSpread = newMaxGrade - newMinGrade

  if (newSpread > config.maxGradeSpread) {
    score += 500 * (newSpread - config.maxGradeSpread)
  }

  // Prefer groups with similar grades (minimize spread increase)
  if (group.minGrade !== null) {
    const currentSpread = group.maxGrade! - group.minGrade
    score += (newSpread - currentSpread) * 10
  }

  // Slight preference for emptier groups (for balance)
  score += group.camperIds.length

  return score
}

/**
 * Score a group for placing a solo camper
 */
function scoreSoloCamperPlacement(
  group: GroupState,
  camper: StandardizedCamper,
  config: GroupingConfig,
  allGroups: GroupState[]
): number {
  let score = 0

  // Hard penalty if would exceed size
  if (group.camperIds.length >= config.maxGroupSize) {
    score += 10000
  }

  // Hard penalty if would exceed grade spread
  if (wouldViolateGradeConstraint(group, camper.gradeValidated, config.maxGradeSpread)) {
    score += 5000
  }

  // Prefer groups where camper's grade fits well
  if (group.minGrade !== null && group.maxGrade !== null) {
    const distFromMin = Math.abs(camper.gradeValidated - group.minGrade)
    const distFromMax = Math.abs(camper.gradeValidated - group.maxGrade)
    const avgDist = (distFromMin + distFromMax) / 2
    score += avgDist * 20
  }

  // Prefer smaller groups (for balance)
  const avgSize = allGroups.reduce((sum, g) => sum + g.camperIds.length, 0) / allGroups.length
  const sizeDeviation = group.camperIds.length - avgSize
  score += sizeDeviation * 5

  return score
}

/**
 * Find the best group for a friend group
 */
function findBestGroupForFriendGroup(
  friendGroup: FriendGroup,
  groups: GroupState[],
  config: GroupingConfig
): { group: GroupState; score: number } | null {
  let bestGroup: GroupState | null = null
  let bestScore = Infinity

  for (const group of groups) {
    const score = scoreFriendGroupPlacement(group, friendGroup, config, groups)

    if (score < bestScore) {
      bestScore = score
      bestGroup = group
    }
  }

  return bestGroup ? { group: bestGroup, score: bestScore } : null
}

/**
 * Find the best group for a solo camper
 */
function findBestGroupForSoloCamper(
  camper: StandardizedCamper,
  groups: GroupState[],
  config: GroupingConfig
): { group: GroupState; score: number } | null {
  let bestGroup: GroupState | null = null
  let bestScore = Infinity

  for (const group of groups) {
    const score = scoreSoloCamperPlacement(group, camper, config, groups)

    if (score < bestScore) {
      bestScore = score
      bestGroup = group
    }
  }

  return bestGroup ? { group: bestGroup, score: bestScore } : null
}

// ============================================================================
// PLACEMENT FUNCTIONS
// ============================================================================

/**
 * Place a friend group into the groups
 *
 * Returns placement decision and whether the group was split
 */
function placeFriendGroup(
  friendGroup: FriendGroup,
  groups: GroupState[],
  camperMap: Map<string, StandardizedCamper>,
  config: GroupingConfig,
  assignments: GroupAssignment[],
  violations: ConstraintViolation[]
): { placed: boolean; split: boolean } {
  // Check if group can be placed intact
  if (friendGroup.canBePlacedIntact) {
    const result = findBestGroupForFriendGroup(friendGroup, groups, config)

    if (result && result.score < 1000) {
      // Place intact
      const { group } = result

      for (const memberId of friendGroup.memberIds) {
        const camper = camperMap.get(memberId)
        if (!camper) continue

        group.camperIds.push(memberId)
        updateGroupGrades(group, camper.gradeValidated)

        assignments.push({
          camperSessionId: memberId,
          toGroupId: group.id,
          fromGroupId: null,
          assignmentType: 'auto',
          reason: `Placed with friend group #${friendGroup.groupNumber}`,
          causedSizeViolation: false,
          causedGradeViolation: false,
          causedFriendViolation: false,
        })
      }

      return { placed: true, split: false }
    }
  }

  // Need to split the friend group
  const subgroups = splitFriendGroup(friendGroup, camperMap, config)

  if (subgroups.length > 1) {
    // Log violation for split friend group
    violations.push({
      id: `v-${Date.now()}-${Math.random()}`,
      campId: '',
      tenantId: '',
      groupingRunId: null,
      violationType: 'friend_group_split',
      severity: 'warning',
      affectedGroupId: null,
      affectedCamperIds: friendGroup.memberIds,
      affectedFriendGroupId: friendGroup.id,
      title: `Friend Group #${friendGroup.groupNumber} Split`,
      description: `Friend group of ${friendGroup.memberCount} campers was split into ${subgroups.length} subgroups due to constraint violations.`,
      suggestedResolution: 'Review the split and adjust manually if needed to keep close friends together.',
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      resolutionType: null,
      resolutionNote: null,
      createdAt: new Date(),
    })
  }

  // Place each subgroup
  for (const subgroup of subgroups) {
    // Find best group for this subgroup
    const subgroupGrades = subgroup
      .map(id => camperMap.get(id)?.gradeValidated ?? 0)
    const minGrade = Math.min(...subgroupGrades)
    const maxGrade = Math.max(...subgroupGrades)

    const tempFriendGroup: FriendGroup = {
      ...friendGroup,
      memberIds: subgroup,
      memberCount: subgroup.length,
      minGrade,
      maxGrade,
      gradeSpread: maxGrade - minGrade,
      exceedsGradeConstraint: (maxGrade - minGrade) > config.maxGradeSpread,
      exceedsSizeConstraint: subgroup.length > config.maxGroupSize,
      canBePlacedIntact: true,
    }

    const result = findBestGroupForFriendGroup(tempFriendGroup, groups, config)

    if (result) {
      const { group } = result
      const causedViolation = result.score >= 500

      for (const memberId of subgroup) {
        const camper = camperMap.get(memberId)
        if (!camper) continue

        group.camperIds.push(memberId)
        updateGroupGrades(group, camper.gradeValidated)

        assignments.push({
          camperSessionId: memberId,
          toGroupId: group.id,
          fromGroupId: null,
          assignmentType: 'auto',
          reason: subgroups.length > 1
            ? `Placed in subgroup from split friend group #${friendGroup.groupNumber}`
            : `Placed with friend group #${friendGroup.groupNumber}`,
          causedSizeViolation: group.camperIds.length > config.maxGroupSize,
          causedGradeViolation: getGradeSpread(group) > config.maxGradeSpread,
          causedFriendViolation: subgroups.length > 1,
        })
      }
    }
  }

  return { placed: true, split: subgroups.length > 1 }
}

/**
 * Place solo campers into groups
 */
function placeSoloCampers(
  soloCampers: StandardizedCamper[],
  groups: GroupState[],
  config: GroupingConfig,
  assignments: GroupAssignment[],
  violations: ConstraintViolation[]
): void {
  // Sort solo campers by grade for more predictable placement
  const sortedCampers = [...soloCampers].sort(
    (a, b) => a.gradeValidated - b.gradeValidated
  )

  for (const camper of sortedCampers) {
    const result = findBestGroupForSoloCamper(camper, groups, config)

    if (result) {
      const { group, score } = result

      group.camperIds.push(camper.athleteId)
      updateGroupGrades(group, camper.gradeValidated)

      const causedSizeViolation = group.camperIds.length > config.maxGroupSize
      const causedGradeViolation = getGradeSpread(group) > config.maxGradeSpread

      assignments.push({
        camperSessionId: camper.athleteId,
        toGroupId: group.id,
        fromGroupId: null,
        assignmentType: 'auto',
        reason: score < 100 ? 'Best fit by grade and balance' : 'Best available option',
        causedSizeViolation,
        causedGradeViolation,
        causedFriendViolation: false,
      })

      // Log violations if any
      if (causedSizeViolation) {
        violations.push({
          id: `v-${Date.now()}-${Math.random()}`,
          campId: '',
          tenantId: '',
          groupingRunId: null,
          violationType: 'size_exceeded',
          severity: 'hard',
          affectedGroupId: group.id,
          affectedCamperIds: [camper.athleteId],
          affectedFriendGroupId: null,
          title: `Group ${group.groupNumber} Exceeds Size Limit`,
          description: `Group ${group.groupNumber} now has ${group.camperIds.length} campers, exceeding the limit of ${config.maxGroupSize}.`,
          suggestedResolution: 'Move some campers to other groups.',
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          resolutionType: null,
          resolutionNote: null,
          createdAt: new Date(),
        })
      }

      if (causedGradeViolation) {
        violations.push({
          id: `v-${Date.now()}-${Math.random()}`,
          campId: '',
          tenantId: '',
          groupingRunId: null,
          violationType: 'grade_spread_exceeded',
          severity: 'hard',
          affectedGroupId: group.id,
          affectedCamperIds: [camper.athleteId],
          affectedFriendGroupId: null,
          title: `Group ${group.groupNumber} Exceeds Grade Spread`,
          description: `Group ${group.groupNumber} now spans ${formatGradeRange(group.minGrade!, group.maxGrade!)}, exceeding the maximum spread of ${config.maxGradeSpread} grades.`,
          suggestedResolution: 'Move the youngest or oldest camper to another group.',
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          resolutionType: null,
          resolutionNote: null,
          createdAt: new Date(),
        })
      }
    }
  }
}

// ============================================================================
// BALANCING
// ============================================================================

/**
 * Attempt to balance group sizes without breaking constraints
 *
 * This is a best-effort pass that tries to even out group sizes
 * by moving campers from larger to smaller groups.
 */
function balanceGroups(
  groups: GroupState[],
  camperMap: Map<string, StandardizedCamper>,
  config: GroupingConfig,
  assignments: GroupAssignment[]
): number {
  let movesMade = 0
  const targetSize = Math.ceil(
    groups.reduce((sum, g) => sum + g.camperIds.length, 0) / groups.length
  )

  // Sort groups by size (largest first)
  const sortedGroups = [...groups].sort(
    (a, b) => b.camperIds.length - a.camperIds.length
  )

  for (const largeGroup of sortedGroups) {
    if (largeGroup.camperIds.length <= targetSize) {
      continue // Already balanced
    }

    // Find campers who can be moved
    for (const camperId of [...largeGroup.camperIds]) {
      const camper = camperMap.get(camperId)
      if (!camper) continue

      // Skip if this camper is in a friend group (don't break friend groups)
      if (camper.friendGroupId) continue

      // Find a smaller group that can accept this camper
      for (const smallGroup of sortedGroups) {
        if (smallGroup.id === largeGroup.id) continue
        if (smallGroup.camperIds.length >= targetSize) continue
        if (smallGroup.camperIds.length >= config.maxGroupSize) continue

        // Check grade constraint
        if (wouldViolateGradeConstraint(smallGroup, camper.gradeValidated, config.maxGradeSpread)) {
          continue
        }

        // Move the camper
        largeGroup.camperIds = largeGroup.camperIds.filter(id => id !== camperId)
        smallGroup.camperIds.push(camperId)
        updateGroupGrades(smallGroup, camper.gradeValidated)

        // Recalculate large group grades
        recalculateGroupGrades(largeGroup, camperMap)

        movesMade++

        // Update assignment record
        const existingAssignment = assignments.find(a => a.camperSessionId === camperId)
        if (existingAssignment) {
          existingAssignment.toGroupId = smallGroup.id
          existingAssignment.reason += ' (balanced)'
        }

        break
      }

      if (largeGroup.camperIds.length <= targetSize) {
        break
      }
    }
  }

  return movesMade
}

/**
 * Recalculate grade bounds for a group
 */
function recalculateGroupGrades(
  group: GroupState,
  camperMap: Map<string, StandardizedCamper>
): void {
  if (group.camperIds.length === 0) {
    group.minGrade = null
    group.maxGrade = null
    return
  }

  const grades = group.camperIds
    .map(id => camperMap.get(id)?.gradeValidated ?? 0)

  group.minGrade = Math.min(...grades)
  group.maxGrade = Math.max(...grades)
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate all groups and collect any remaining violations
 */
function validateGroups(
  groups: GroupState[],
  camperMap: Map<string, StandardizedCamper>,
  friendGroups: FriendGroup[],
  config: GroupingConfig,
  existingViolations: ConstraintViolation[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  for (const group of groups) {
    // Check size violation
    if (group.camperIds.length > config.maxGroupSize) {
      const existing = existingViolations.find(
        v => v.violationType === 'size_exceeded' && v.affectedGroupId === group.id
      )
      if (!existing) {
        violations.push({
          id: `v-${Date.now()}-${Math.random()}`,
          campId: '',
          tenantId: '',
          groupingRunId: null,
          violationType: 'size_exceeded',
          severity: 'hard',
          affectedGroupId: group.id,
          affectedCamperIds: group.camperIds,
          affectedFriendGroupId: null,
          title: `Group ${group.groupNumber} Exceeds Size Limit`,
          description: `Group ${group.groupNumber} has ${group.camperIds.length} campers, exceeding the limit of ${config.maxGroupSize}.`,
          suggestedResolution: 'Move some campers to other groups.',
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          resolutionType: null,
          resolutionNote: null,
          createdAt: new Date(),
        })
      }
    }

    // Check grade violation
    const spread = getGradeSpread(group)
    if (spread > config.maxGradeSpread) {
      const existing = existingViolations.find(
        v => v.violationType === 'grade_spread_exceeded' && v.affectedGroupId === group.id
      )
      if (!existing) {
        violations.push({
          id: `v-${Date.now()}-${Math.random()}`,
          campId: '',
          tenantId: '',
          groupingRunId: null,
          violationType: 'grade_spread_exceeded',
          severity: 'hard',
          affectedGroupId: group.id,
          affectedCamperIds: group.camperIds,
          affectedFriendGroupId: null,
          title: `Group ${group.groupNumber} Exceeds Grade Spread`,
          description: `Group ${group.groupNumber} spans ${formatGradeRange(group.minGrade!, group.maxGrade!)}, exceeding the maximum spread of ${config.maxGradeSpread} grades.`,
          suggestedResolution: 'Move the youngest or oldest camper to another group.',
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          resolutionType: null,
          resolutionNote: null,
          createdAt: new Date(),
        })
      }
    }
  }

  // Check friend group violations
  for (const fg of friendGroups) {
    const memberGroups = new Set<string>()
    for (const memberId of fg.memberIds) {
      const group = groups.find(g => g.camperIds.includes(memberId))
      if (group) {
        memberGroups.add(group.id)
      }
    }

    if (memberGroups.size > 1) {
      const existing = existingViolations.find(
        v => v.violationType === 'friend_group_split' && v.affectedFriendGroupId === fg.id
      )
      if (!existing) {
        violations.push({
          id: `v-${Date.now()}-${Math.random()}`,
          campId: '',
          tenantId: '',
          groupingRunId: null,
          violationType: 'friend_group_split',
          severity: 'warning',
          affectedGroupId: null,
          affectedCamperIds: fg.memberIds,
          affectedFriendGroupId: fg.id,
          title: `Friend Group #${fg.groupNumber} Split`,
          description: `Friend group of ${fg.memberCount} campers is spread across ${memberGroups.size} groups.`,
          suggestedResolution: 'Consider moving friends to the same group if constraints allow.',
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          resolutionType: null,
          resolutionNote: null,
          createdAt: new Date(),
        })
      }
    }
  }

  return violations
}

// ============================================================================
// MAIN ALGORITHM
// ============================================================================

/**
 * Run the grouping algorithm
 *
 * This is the main entry point for the grouping algorithm.
 *
 * @param input - Grouping input with campers, friend groups, and config
 * @returns Grouping output with groups, assignments, violations, and stats
 */
export function runGroupingAlgorithm(input: GroupingInput): GroupingOutput {
  const startTime = Date.now()

  const {
    campId,
    tenantId,
    config,
    campers,
    friendGroups,
    preserveManualOverrides,
    existingAssignments,
  } = input

  // Build camper lookup
  const camperMap = new Map<string, StandardizedCamper>()
  for (const camper of campers) {
    camperMap.set(camper.athleteId, camper)
  }

  // Initialize groups
  const groupStates = initializeGroups(campId, tenantId, config)

  // Track assignments and violations
  const assignments: GroupAssignment[] = []
  const violations: ConstraintViolation[] = []

  // Phase 1: Handle preserved manual overrides
  if (preserveManualOverrides && existingAssignments.size > 0) {
    for (const [camperId, groupId] of existingAssignments) {
      const group = groupStates.find(g => g.id === groupId)
      const camper = camperMap.get(camperId)

      if (group && camper) {
        group.camperIds.push(camperId)
        updateGroupGrades(group, camper.gradeValidated)

        assignments.push({
          camperSessionId: camperId,
          toGroupId: groupId,
          fromGroupId: null,
          assignmentType: 'manual',
          reason: 'Preserved manual override from previous run',
          causedSizeViolation: false,
          causedGradeViolation: false,
          causedFriendViolation: false,
        })
      }
    }
  }

  // Track which campers are already placed
  const placedCamperIds = new Set(
    groupStates.flatMap(g => g.camperIds)
  )

  // Phase 2: Place friend groups
  // Sort by size (largest first) and constraint compliance
  const sortedFriendGroups = [...friendGroups].sort((a, b) => {
    // Priority: placeable intact groups first, then by size
    if (a.canBePlacedIntact !== b.canBePlacedIntact) {
      return a.canBePlacedIntact ? -1 : 1
    }
    return b.memberCount - a.memberCount
  })

  let friendGroupsPlacedIntact = 0
  let friendGroupsSplit = 0

  for (const fg of sortedFriendGroups) {
    // Skip if all members already placed
    const unplacedMembers = fg.memberIds.filter(id => !placedCamperIds.has(id))
    if (unplacedMembers.length === 0) continue

    const { split } = placeFriendGroup(
      { ...fg, memberIds: unplacedMembers, memberCount: unplacedMembers.length },
      groupStates,
      camperMap,
      config,
      assignments,
      violations
    )

    if (split) {
      friendGroupsSplit++
    } else {
      friendGroupsPlacedIntact++
    }

    // Mark members as placed
    for (const memberId of unplacedMembers) {
      placedCamperIds.add(memberId)
    }
  }

  // Phase 3: Place solo campers
  const soloCampers = campers.filter(c => !placedCamperIds.has(c.athleteId))
  placeSoloCampers(soloCampers, groupStates, config, assignments, violations)

  // Phase 4: Balance groups
  const balanceMoves = balanceGroups(groupStates, camperMap, config, assignments)

  // Phase 5: Final validation
  const finalViolations = validateGroups(
    groupStates,
    camperMap,
    friendGroups,
    config,
    violations
  )

  // Merge violations (deduplicate)
  const allViolations = [...violations, ...finalViolations]

  // Convert group states to CampGroup objects
  const groups: CampGroup[] = groupStates.map((state, index) => ({
    id: state.id,
    campId,
    tenantId,
    groupNumber: state.groupNumber,
    groupName: GROUP_NAMES[index] ?? `Group ${state.groupNumber}`,
    groupColor: GROUP_COLORS[index] ?? '#CCFF00',
    camperCount: state.camperIds.length,
    camperIds: state.camperIds,
    minGrade: state.minGrade,
    maxGrade: state.maxGrade,
    gradeSpread: getGradeSpread(state),
    sizeViolation: state.camperIds.length > config.maxGroupSize,
    gradeViolation: getGradeSpread(state) > config.maxGradeSpread,
    friendViolation: false, // Will be set based on violations
    hasWarnings: allViolations.some(
      v => v.severity === 'warning' && v.affectedGroupId === state.id
    ),
    hasHardViolations: allViolations.some(
      v => v.severity === 'hard' && v.affectedGroupId === state.id
    ),
    displayOrder: index + 1,
  }))

  // Mark friend violations on groups
  for (const violation of allViolations) {
    if (violation.violationType === 'friend_group_split') {
      // Find which groups contain members of this friend group
      const fg = friendGroups.find(f => f.id === violation.affectedFriendGroupId)
      if (fg) {
        for (const group of groups) {
          if (fg.memberIds.some(id => group.camperIds.includes(id))) {
            group.friendViolation = true
          }
        }
      }
    }
  }

  // Calculate stats
  const groupSizes = groups.map(g => g.camperCount)
  const avgSize = groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length
  const variance = groupSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / groupSizes.length

  const stats: GroupingStats = {
    totalCampers: campers.length,
    totalFriendGroups: friendGroups.length,
    campersAutoPlaced: assignments.filter(a => a.assignmentType === 'auto').length,
    friendGroupsPlacedIntact,
    friendGroupsSplit,
    constraintViolations: allViolations.filter(v => v.severity === 'hard').length,
    warnings: allViolations.filter(v => v.severity === 'warning').length,
    lateRegistrations: campers.filter(c => c.isLateRegistration).length,
    gradeDiscrepancies: campers.filter(c => c.gradeDiscrepancy).length,
    averageGroupSize: avgSize,
    groupSizeVariance: variance,
  }

  const executionTimeMs = Date.now() - startTime

  return {
    success: allViolations.filter(v => v.severity === 'hard').length === 0,
    groups,
    assignments,
    violations: allViolations,
    warnings: allViolations.filter(v => v.severity === 'warning').map(v => v.description),
    stats,
    executionTimeMs,
  }
}

// ============================================================================
// INCREMENTAL UPDATES
// ============================================================================

/**
 * Add a late registration to existing groups
 *
 * This is used when a new camper registers after initial grouping.
 * It tries to place the camper in the best group without disrupting
 * existing assignments.
 */
export function addLateRegistration(
  camper: StandardizedCamper,
  existingGroups: CampGroup[],
  config: GroupingConfig
): { groupId: string; violations: ConstraintViolation[] } {
  const violations: ConstraintViolation[] = []

  // Convert to group states
  const groupStates: GroupState[] = existingGroups.map(g => ({
    id: g.id,
    groupNumber: g.groupNumber,
    camperIds: g.camperIds,
    minGrade: g.minGrade,
    maxGrade: g.maxGrade,
  }))

  // Find best group
  let bestGroup: GroupState | null = null
  let bestScore = Infinity

  for (const group of groupStates) {
    let score = 0

    // Check constraints
    const wouldExceedSize = group.camperIds.length >= config.maxGroupSize
    const wouldExceedGrade = wouldViolateGradeConstraint(
      group,
      camper.gradeValidated,
      config.maxGradeSpread
    )

    if (wouldExceedSize) score += 1000
    if (wouldExceedGrade) score += 500

    // Prefer groups with similar grades
    if (group.minGrade !== null && group.maxGrade !== null) {
      const currentMid = (group.minGrade + group.maxGrade) / 2
      score += Math.abs(camper.gradeValidated - currentMid) * 10
    }

    // Prefer smaller groups
    score += group.camperIds.length

    if (score < bestScore) {
      bestScore = score
      bestGroup = group
    }
  }

  if (!bestGroup) {
    // This shouldn't happen if groups exist
    throw new Error('No groups available for late registration')
  }

  // Check for violations
  if (bestGroup.camperIds.length >= config.maxGroupSize) {
    violations.push({
      id: `v-${Date.now()}-${Math.random()}`,
      campId: '',
      tenantId: '',
      groupingRunId: null,
      violationType: 'size_exceeded',
      severity: 'hard',
      affectedGroupId: bestGroup.id,
      affectedCamperIds: [camper.athleteId],
      affectedFriendGroupId: null,
      title: `Late Registration Exceeds Group Size`,
      description: `Adding ${camper.fullName} to Group ${bestGroup.groupNumber} exceeds the size limit.`,
      suggestedResolution: 'Consider moving another camper or accepting the overflow.',
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      resolutionType: null,
      resolutionNote: null,
      createdAt: new Date(),
    })
  }

  if (wouldViolateGradeConstraint(bestGroup, camper.gradeValidated, config.maxGradeSpread)) {
    violations.push({
      id: `v-${Date.now()}-${Math.random()}`,
      campId: '',
      tenantId: '',
      groupingRunId: null,
      violationType: 'grade_spread_exceeded',
      severity: 'hard',
      affectedGroupId: bestGroup.id,
      affectedCamperIds: [camper.athleteId],
      affectedFriendGroupId: null,
      title: `Late Registration Exceeds Grade Spread`,
      description: `Adding ${camper.fullName} (${camper.gradeDisplay}) to Group ${bestGroup.groupNumber} exceeds the grade spread limit.`,
      suggestedResolution: 'Consider placing in a different group or accepting the grade spread.',
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      resolutionType: null,
      resolutionNote: null,
      createdAt: new Date(),
    })
  }

  return {
    groupId: bestGroup.id,
    violations,
  }
}
