/**
 * EMPOWERED SPORTS CAMP - FRIEND GROUP CLUSTERING
 *
 * This module implements the friend group clustering algorithm that identifies
 * connected groups of campers who should be placed together based on friend
 * requests from registration.
 *
 * Algorithm Overview:
 * 1. Build a graph where campers are nodes and friend requests are edges
 * 2. Find connected components (campers reachable through friend chains)
 * 3. Analyze each component for constraint compliance
 * 4. Flag components that are too large or span too many grades
 */

import {
  StandardizedCamper,
  FriendGroup,
  FriendEdge,
  GroupingConfig,
  DEFAULT_GROUPING_CONFIG,
} from './types'
import { formatGradeRange } from './standardization'

// ============================================================================
// GRAPH BUILDING
// ============================================================================

/**
 * Build a friendship graph from camper data
 *
 * Creates edges between campers who have requested each other.
 * Tracks whether requests are mutual (both requested each other)
 * or one-sided.
 *
 * @param campers - Standardized camper data
 * @returns Array of friend edges
 */
export function buildFriendshipGraph(campers: StandardizedCamper[]): FriendEdge[] {
  const edges: FriendEdge[] = []
  const athleteIdToCamperId = new Map<string, string>()

  // Build lookup from athleteId to camper session ID
  for (const camper of campers) {
    athleteIdToCamperId.set(camper.athleteId, camper.athleteId)
  }

  // Track all requests for mutual detection
  const requestSet = new Set<string>()

  // First pass: collect all requests
  for (const camper of campers) {
    for (const friendAthleteId of camper.friendRequestAthleteIds) {
      const edgeKey = `${camper.athleteId}->${friendAthleteId}`
      requestSet.add(edgeKey)
    }
  }

  // Second pass: create edges (deduplicated)
  const addedEdges = new Set<string>()

  for (const camper of campers) {
    for (const friendAthleteId of camper.friendRequestAthleteIds) {
      // Create canonical edge key (smaller ID first)
      const canonicalKey = [camper.athleteId, friendAthleteId].sort().join('--')

      if (addedEdges.has(canonicalKey)) {
        continue
      }

      addedEdges.add(canonicalKey)

      // Check if mutual
      const forwardKey = `${camper.athleteId}->${friendAthleteId}`
      const reverseKey = `${friendAthleteId}->${camper.athleteId}`
      const isMutual = requestSet.has(forwardKey) && requestSet.has(reverseKey)

      edges.push({
        fromCamperId: camper.athleteId,
        toCamperId: friendAthleteId,
        isMutual,
      })
    }
  }

  return edges
}

// ============================================================================
// CONNECTED COMPONENTS (UNION-FIND)
// ============================================================================

/**
 * Union-Find data structure for efficiently finding connected components
 */
class UnionFind {
  private parent: Map<string, string>
  private rank: Map<string, number>

  constructor(elements: string[]) {
    this.parent = new Map()
    this.rank = new Map()

    for (const elem of elements) {
      this.parent.set(elem, elem)
      this.rank.set(elem, 0)
    }
  }

  /**
   * Find the root of an element's set with path compression
   */
  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!))
    }
    return this.parent.get(x)!
  }

  /**
   * Union two sets by rank
   */
  union(x: string, y: string): void {
    const rootX = this.find(x)
    const rootY = this.find(y)

    if (rootX === rootY) return

    const rankX = this.rank.get(rootX)!
    const rankY = this.rank.get(rootY)!

    if (rankX < rankY) {
      this.parent.set(rootX, rootY)
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX)
    } else {
      this.parent.set(rootY, rootX)
      this.rank.set(rootX, rankX + 1)
    }
  }

  /**
   * Get all connected components
   */
  getComponents(): Map<string, string[]> {
    const components = new Map<string, string[]>()

    for (const elem of this.parent.keys()) {
      const root = this.find(elem)
      if (!components.has(root)) {
        components.set(root, [])
      }
      components.get(root)!.push(elem)
    }

    return components
  }
}

/**
 * Find connected components in the friendship graph
 *
 * Uses Union-Find for efficient O(n α(n)) complexity.
 *
 * @param camperIds - All camper athlete IDs
 * @param edges - Friend edges
 * @returns Map of root ID -> array of member IDs
 */
export function findConnectedComponents(
  camperIds: string[],
  edges: FriendEdge[]
): Map<string, string[]> {
  const uf = new UnionFind(camperIds)

  for (const edge of edges) {
    uf.union(edge.fromCamperId, edge.toCamperId)
  }

  return uf.getComponents()
}

// ============================================================================
// FRIEND GROUP ANALYSIS
// ============================================================================

/**
 * Analyze a friend group for constraint compliance
 *
 * @param memberIds - IDs of campers in the group
 * @param camperMap - Map of camper ID to camper data
 * @param config - Grouping configuration
 * @returns Analysis results
 */
function analyzeFriendGroup(
  memberIds: string[],
  camperMap: Map<string, StandardizedCamper>,
  config: GroupingConfig
): {
  minGrade: number
  maxGrade: number
  gradeSpread: number
  exceedsGradeConstraint: boolean
  exceedsSizeConstraint: boolean
  canBePlacedIntact: boolean
  placementNotes: string[]
} {
  const members = memberIds.map(id => camperMap.get(id)!).filter(Boolean)

  if (members.length === 0) {
    return {
      minGrade: 0,
      maxGrade: 0,
      gradeSpread: 0,
      exceedsGradeConstraint: false,
      exceedsSizeConstraint: false,
      canBePlacedIntact: true,
      placementNotes: [],
    }
  }

  const grades = members.map(m => m.gradeValidated)
  const minGrade = Math.min(...grades)
  const maxGrade = Math.max(...grades)
  const gradeSpread = maxGrade - minGrade

  const exceedsGradeConstraint = gradeSpread > config.maxGradeSpread
  const exceedsSizeConstraint = members.length > config.maxGroupSize

  const placementNotes: string[] = []
  let canBePlacedIntact = true

  if (exceedsSizeConstraint) {
    canBePlacedIntact = false
    placementNotes.push(
      `Friend group has ${members.length} members, exceeding the maximum group size of ${config.maxGroupSize}. ` +
      `This group will need to be split.`
    )
  }

  if (exceedsGradeConstraint) {
    canBePlacedIntact = false
    const gradeRange = formatGradeRange(minGrade, maxGrade)
    placementNotes.push(
      `Friend group spans grades ${gradeRange} (${gradeSpread} grade spread), ` +
      `exceeding the maximum spread of ${config.maxGradeSpread}. ` +
      `Some friends may need to be separated to maintain grade proximity.`
    )
  }

  return {
    minGrade,
    maxGrade,
    gradeSpread,
    exceedsGradeConstraint,
    exceedsSizeConstraint,
    canBePlacedIntact,
    placementNotes,
  }
}

// ============================================================================
// MAIN CLUSTERING FUNCTION
// ============================================================================

export interface ClusteringResult {
  friendGroups: FriendGroup[]
  soloCampers: StandardizedCamper[]
  warnings: string[]
  stats: {
    totalFriendGroups: number
    largestGroupSize: number
    groupsExceedingSize: number
    groupsExceedingGrade: number
    soloCamperCount: number
  }
}

/**
 * Cluster campers into friend groups
 *
 * This is the main entry point for friend group identification.
 * It processes all campers and returns:
 * - Friend groups (2+ campers who should be together)
 * - Solo campers (no friend requests or unmatched requests)
 * - Warnings about constraint violations
 *
 * @param campers - Standardized camper data
 * @param campId - Camp session ID
 * @param tenantId - Tenant ID
 * @param config - Grouping configuration
 * @returns Clustering results
 */
export function clusterFriendGroups(
  campers: StandardizedCamper[],
  campId: string,
  tenantId: string,
  config: GroupingConfig = DEFAULT_GROUPING_CONFIG
): ClusteringResult {
  const warnings: string[] = []

  // Build camper lookup
  const camperMap = new Map<string, StandardizedCamper>()
  for (const camper of campers) {
    camperMap.set(camper.athleteId, camper)
  }

  // Build friendship graph
  const edges = buildFriendshipGraph(campers)
  const camperIds = campers.map(c => c.athleteId)

  // Find connected components
  const components = findConnectedComponents(camperIds, edges)

  // Process each component
  const friendGroups: FriendGroup[] = []
  const soloCampers: StandardizedCamper[] = []
  let groupNumber = 1

  // Stats tracking
  let largestGroupSize = 0
  let groupsExceedingSize = 0
  let groupsExceedingGrade = 0

  for (const [_root, memberIds] of components) {
    if (memberIds.length === 1) {
      // Solo camper - no friend requests that matched
      const camper = camperMap.get(memberIds[0])
      if (camper) {
        soloCampers.push(camper)
      }
      continue
    }

    // Friend group of 2+ members
    const analysis = analyzeFriendGroup(memberIds, camperMap, config)

    largestGroupSize = Math.max(largestGroupSize, memberIds.length)
    if (analysis.exceedsSizeConstraint) groupsExceedingSize++
    if (analysis.exceedsGradeConstraint) groupsExceedingGrade++

    const friendGroup: FriendGroup = {
      id: `fg-${groupNumber}`, // Will be replaced with UUID from DB
      campId,
      tenantId,
      groupNumber,
      memberIds,
      memberCount: memberIds.length,
      minGrade: analysis.minGrade,
      maxGrade: analysis.maxGrade,
      gradeSpread: analysis.gradeSpread,
      exceedsGradeConstraint: analysis.exceedsGradeConstraint,
      exceedsSizeConstraint: analysis.exceedsSizeConstraint,
      canBePlacedIntact: analysis.canBePlacedIntact,
      placementNotes: analysis.placementNotes.join(' '),
    }

    friendGroups.push(friendGroup)

    // Add warnings for problematic groups
    for (const note of analysis.placementNotes) {
      warnings.push(`Friend Group #${groupNumber}: ${note}`)
    }

    // Update campers with friend group assignment
    for (const memberId of memberIds) {
      const camper = camperMap.get(memberId)
      if (camper) {
        camper.friendGroupId = friendGroup.id
      }
    }

    groupNumber++
  }

  // Sort friend groups by size (largest first) for placement priority
  friendGroups.sort((a, b) => b.memberCount - a.memberCount)

  return {
    friendGroups,
    soloCampers,
    warnings,
    stats: {
      totalFriendGroups: friendGroups.length,
      largestGroupSize,
      groupsExceedingSize,
      groupsExceedingGrade,
      soloCamperCount: soloCampers.length,
    },
  }
}

// ============================================================================
// FRIEND GROUP SPLITTING STRATEGIES
// ============================================================================

/**
 * Strategy for splitting a friend group that's too large
 *
 * When a friend group exceeds the max group size, we need to split it.
 * This function determines how to split while minimizing social disruption.
 *
 * Strategy:
 * 1. Prefer splitting by grade (keep same-grade friends together)
 * 2. Prefer keeping mutual friend pairs together
 * 3. Balance resulting subgroups
 *
 * @param friendGroup - The friend group to split
 * @param camperMap - Map of camper ID to camper data
 * @param config - Grouping configuration
 * @returns Array of subgroups (arrays of camper IDs)
 */
export function splitFriendGroup(
  friendGroup: FriendGroup,
  camperMap: Map<string, StandardizedCamper>,
  config: GroupingConfig
): string[][] {
  const members = friendGroup.memberIds
    .map(id => camperMap.get(id)!)
    .filter(Boolean)

  if (members.length <= config.maxGroupSize) {
    return [friendGroup.memberIds]
  }

  // Group members by grade
  const byGrade = new Map<number, StandardizedCamper[]>()
  for (const member of members) {
    const grade = member.gradeValidated
    if (!byGrade.has(grade)) {
      byGrade.set(grade, [])
    }
    byGrade.get(grade)!.push(member)
  }

  // Sort grades
  const sortedGrades = [...byGrade.keys()].sort((a, b) => a - b)

  // Create subgroups trying to stay within grade spread constraint
  const subgroups: string[][] = []
  let currentSubgroup: StandardizedCamper[] = []
  let currentMinGrade: number | null = null
  let currentMaxGrade: number | null = null

  for (const grade of sortedGrades) {
    const gradeMembers = byGrade.get(grade)!

    for (const member of gradeMembers) {
      // Check if adding this member would exceed constraints
      const wouldExceedSize = currentSubgroup.length >= config.maxGroupSize
      const newMinGrade: number = currentMinGrade === null ? grade : Math.min(currentMinGrade, grade)
      const newMaxGrade: number = currentMaxGrade === null ? grade : Math.max(currentMaxGrade, grade)
      const wouldExceedGrade = (newMaxGrade - newMinGrade) > config.maxGradeSpread

      if (wouldExceedSize || wouldExceedGrade) {
        // Start a new subgroup
        if (currentSubgroup.length > 0) {
          subgroups.push(currentSubgroup.map(c => c.athleteId))
        }
        currentSubgroup = [member]
        currentMinGrade = grade
        currentMaxGrade = grade
      } else {
        currentSubgroup.push(member)
        currentMinGrade = newMinGrade
        currentMaxGrade = newMaxGrade
      }
    }
  }

  // Don't forget the last subgroup
  if (currentSubgroup.length > 0) {
    subgroups.push(currentSubgroup.map(c => c.athleteId))
  }

  return subgroups
}

/**
 * Get friend group summary for display
 */
export function getFriendGroupSummary(
  friendGroup: FriendGroup,
  camperMap: Map<string, StandardizedCamper>
): {
  memberNames: string[]
  gradeRange: string
  statusLabel: string
  statusColor: 'green' | 'yellow' | 'red'
} {
  const memberNames = friendGroup.memberIds
    .map(id => camperMap.get(id)?.fullName ?? 'Unknown')
    .sort()

  const gradeRange = formatGradeRange(friendGroup.minGrade, friendGroup.maxGrade)

  let statusLabel: string
  let statusColor: 'green' | 'yellow' | 'red'

  if (friendGroup.canBePlacedIntact) {
    statusLabel = 'Can be placed together'
    statusColor = 'green'
  } else if (friendGroup.exceedsSizeConstraint && friendGroup.exceedsGradeConstraint) {
    statusLabel = 'Too large and spans too many grades'
    statusColor = 'red'
  } else if (friendGroup.exceedsSizeConstraint) {
    statusLabel = 'Too large - will be split'
    statusColor = 'yellow'
  } else {
    statusLabel = 'Spans too many grades'
    statusColor = 'yellow'
  }

  return {
    memberNames,
    gradeRange,
    statusLabel,
    statusColor,
  }
}
