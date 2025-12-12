/**
 * EMPOWERED SPORTS CAMP - GROUPING ENGINE TYPES
 *
 * TypeScript type definitions for the proprietary grouping algorithm.
 * These types define the data structures used throughout the grouping system.
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export type GroupingStatus = 'pending' | 'auto_grouped' | 'reviewed' | 'finalized'

export type AssignmentType = 'auto' | 'manual' | 'override'

export type ViolationType =
  | 'size_exceeded'
  | 'grade_spread_exceeded'
  | 'friend_group_split'
  | 'friend_group_too_large'
  | 'impossible_placement'
  | 'grade_discrepancy'

export type ViolationSeverity = 'warning' | 'hard'

export type RunType = 'initial' | 'rerun' | 'incremental'

export type ResolutionType = 'auto_fixed' | 'manual_override' | 'accepted' | 'dismissed'

export type ReportType = 'draft' | 'final' | 'amended'

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface GroupingConfig {
  maxGroupSize: number        // Default: 12
  numGroups: number           // Default: 5
  maxGradeSpread: number      // Default: 2
  schoolYearCutoffMonth: number // Default: 9 (September)
  lateRegistrationDays: number  // Default: 7
}

export const DEFAULT_GROUPING_CONFIG: GroupingConfig = {
  maxGroupSize: 12,
  numGroups: 5,
  maxGradeSpread: 2,
  schoolYearCutoffMonth: 9,
  lateRegistrationDays: 7,
}

// ============================================================================
// GRADE LEVEL REFERENCE
// ============================================================================

export interface GradeLevel {
  id: number
  gradeName: string           // "Pre-Kindergarten", "Kindergarten", "1st Grade"
  gradeShort: string          // "PK", "K", "1", "2"
  gradeNumeric: number        // -1 for Pre-K, 0 for K, 1-12 for grades
  typicalAgeStart: number     // Age at start of school year
  typicalAgeEnd: number       // Age at end of school year
}

export const GRADE_LEVELS: GradeLevel[] = [
  { id: 1, gradeName: 'Pre-Kindergarten', gradeShort: 'PK', gradeNumeric: -1, typicalAgeStart: 4, typicalAgeEnd: 5 },
  { id: 2, gradeName: 'Kindergarten', gradeShort: 'K', gradeNumeric: 0, typicalAgeStart: 5, typicalAgeEnd: 6 },
  { id: 3, gradeName: '1st Grade', gradeShort: '1', gradeNumeric: 1, typicalAgeStart: 6, typicalAgeEnd: 7 },
  { id: 4, gradeName: '2nd Grade', gradeShort: '2', gradeNumeric: 2, typicalAgeStart: 7, typicalAgeEnd: 8 },
  { id: 5, gradeName: '3rd Grade', gradeShort: '3', gradeNumeric: 3, typicalAgeStart: 8, typicalAgeEnd: 9 },
  { id: 6, gradeName: '4th Grade', gradeShort: '4', gradeNumeric: 4, typicalAgeStart: 9, typicalAgeEnd: 10 },
  { id: 7, gradeName: '5th Grade', gradeShort: '5', gradeNumeric: 5, typicalAgeStart: 10, typicalAgeEnd: 11 },
  { id: 8, gradeName: '6th Grade', gradeShort: '6', gradeNumeric: 6, typicalAgeStart: 11, typicalAgeEnd: 12 },
  { id: 9, gradeName: '7th Grade', gradeShort: '7', gradeNumeric: 7, typicalAgeStart: 12, typicalAgeEnd: 13 },
  { id: 10, gradeName: '8th Grade', gradeShort: '8', gradeNumeric: 8, typicalAgeStart: 13, typicalAgeEnd: 14 },
  { id: 11, gradeName: '9th Grade', gradeShort: '9', gradeNumeric: 9, typicalAgeStart: 14, typicalAgeEnd: 15 },
  { id: 12, gradeName: '10th Grade', gradeShort: '10', gradeNumeric: 10, typicalAgeStart: 15, typicalAgeEnd: 16 },
  { id: 13, gradeName: '11th Grade', gradeShort: '11', gradeNumeric: 11, typicalAgeStart: 16, typicalAgeEnd: 17 },
  { id: 14, gradeName: '12th Grade', gradeShort: '12', gradeNumeric: 12, typicalAgeStart: 17, typicalAgeEnd: 18 },
]

// ============================================================================
// CAMPER DATA
// ============================================================================

/**
 * Raw camper data from registration
 */
export interface RawCamperData {
  athleteId: string
  registrationId: string
  firstName: string
  lastName: string
  dateOfBirth: string         // ISO date string
  gradeFromRegistration: string | null
  friendRequests: string[]    // Names as entered by parent
  medicalNotes: string | null
  allergies: string | null
  specialConsiderations: string | null
  registeredAt: string        // ISO datetime
}

/**
 * Standardized camper data after processing
 */
export interface StandardizedCamper {
  id: string                  // camper_session_data.id
  athleteId: string
  registrationId: string
  campId: string
  tenantId: string

  // Identity
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: Date

  // Computed Demographics
  ageAtCampStart: number      // Age in years
  ageMonthsAtCampStart: number // Age in months (for finer sorting)
  gradeFromRegistration: string | null
  gradeValidated: number      // Numeric grade (-1 to 12)
  gradeComputedFromDob: number
  gradeDiscrepancy: boolean
  gradeDiscrepancyResolved: boolean
  gradeDiscrepancyResolution: string | null

  // Grade Display
  gradeDisplay: string        // "K", "1st", "2nd", etc.
  gradeName: string           // "Kindergarten", "1st Grade", etc.

  // Friend Requests
  friendRequests: string[]
  friendRequestAthleteIds: string[]
  friendGroupId: string | null

  // Special Considerations
  medicalNotes: string | null
  allergies: string | null
  specialConsiderations: string | null
  leadershipPotential: boolean
  leadershipNotes: string | null

  // Registration Info
  registeredAt: Date
  isLateRegistration: boolean

  // Assignment
  assignedGroupId: string | null
  assignedGroupNumber: number | null
  assignedGroupName: string | null
  assignmentType: AssignmentType | null
  assignmentReason: string | null
}

// ============================================================================
// FRIEND GROUPS
// ============================================================================

/**
 * A friend group is a connected cluster of campers who requested each other
 */
export interface FriendGroup {
  id: string
  campId: string
  tenantId: string
  groupNumber: number         // Sequential display number

  // Members
  memberIds: string[]         // StandardizedCamper IDs
  memberCount: number

  // Grade Analysis
  minGrade: number
  maxGrade: number
  gradeSpread: number
  exceedsGradeConstraint: boolean

  // Size Analysis
  exceedsSizeConstraint: boolean

  // Placement Status
  canBePlacedIntact: boolean
  placementNotes: string | null
}

/**
 * Edge in the friend request graph (for building friend groups)
 */
export interface FriendEdge {
  fromCamperId: string
  toCamperId: string
  isMutual: boolean           // Both requested each other
}

// ============================================================================
// CAMP GROUPS
// ============================================================================

/**
 * One of the five (or configured number) groups for a camp session
 */
export interface CampGroup {
  id: string
  campId: string
  tenantId: string

  // Identity
  groupNumber: number         // 1-5 (or configured max)
  groupName: string | null    // Optional custom name
  groupColor: string          // Hex color for visual distinction

  // Current State
  camperCount: number
  camperIds: string[]         // StandardizedCamper IDs
  minGrade: number | null
  maxGrade: number | null
  gradeSpread: number

  // Constraint Status
  sizeViolation: boolean
  gradeViolation: boolean
  friendViolation: boolean
  hasWarnings: boolean
  hasHardViolations: boolean

  // Display
  displayOrder: number
}

/**
 * Default group colors matching the Empowered brand
 */
export const GROUP_COLORS = [
  '#CCFF00', // Neon Green
  '#FF2DCE', // Hot Magenta
  '#6F00D8', // Electric Purple
  '#22C55E', // Success Green
  '#F59E0B', // Warning Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#10B981', // Emerald
  '#F97316', // Orange
]

export const GROUP_NAMES = [
  'Lightning',
  'Thunder',
  'Storm',
  'Blaze',
  'Phoenix',
  'Titans',
  'Falcons',
  'Panthers',
  'Vipers',
  'Wolves',
]

// ============================================================================
// CONSTRAINT VIOLATIONS
// ============================================================================

export interface ConstraintViolation {
  id: string
  campId: string
  tenantId: string
  groupingRunId: string | null

  // Violation Details
  violationType: ViolationType
  severity: ViolationSeverity

  // Context
  affectedGroupId: string | null
  affectedCamperIds: string[]
  affectedFriendGroupId: string | null

  // Description
  title: string
  description: string
  suggestedResolution: string | null

  // Resolution
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: Date | null
  resolutionType: ResolutionType | null
  resolutionNote: string | null

  createdAt: Date
}

// ============================================================================
// GROUPING ALGORITHM
// ============================================================================

/**
 * Input for the grouping algorithm
 */
export interface GroupingInput {
  campId: string
  tenantId: string
  campStartDate: Date
  config: GroupingConfig
  campers: StandardizedCamper[]
  friendGroups: FriendGroup[]
  preserveManualOverrides: boolean
  existingAssignments: Map<string, string> // camperId -> groupId (for preserving)
}

/**
 * Output from the grouping algorithm
 */
export interface GroupingOutput {
  success: boolean
  groups: CampGroup[]
  assignments: GroupAssignment[]
  violations: ConstraintViolation[]
  warnings: string[]
  stats: GroupingStats
  executionTimeMs: number
}

/**
 * Individual assignment decision
 */
export interface GroupAssignment {
  camperSessionId: string
  toGroupId: string
  fromGroupId: string | null
  assignmentType: AssignmentType
  reason: string
  causedSizeViolation: boolean
  causedGradeViolation: boolean
  causedFriendViolation: boolean
}

/**
 * Statistics from a grouping run
 */
export interface GroupingStats {
  totalCampers: number
  totalFriendGroups: number
  campersAutoPlaced: number
  friendGroupsPlacedIntact: number
  friendGroupsSplit: number
  constraintViolations: number
  warnings: number
  lateRegistrations: number
  gradeDiscrepancies: number
  averageGroupSize: number
  groupSizeVariance: number
}

// ============================================================================
// GROUPING RUN RECORD
// ============================================================================

export interface GroupingRun {
  id: string
  campId: string
  tenantId: string

  runType: RunType
  triggeredBy: string | null
  triggerReason: string

  // Input Stats
  totalCampers: number
  totalFriendGroups: number
  lateRegistrations: number
  gradeDiscrepancies: number

  // Config
  maxGroupSize: number
  numGroups: number
  maxGradeSpread: number

  // Results
  algorithmVersion: string
  executionTimeMs: number
  campersAutoPlaced: number
  friendGroupsPlacedIntact: number
  friendGroupsSplit: number
  constraintViolations: number

  // Outcome
  success: boolean
  errorMessage: string | null
  warnings: string[]

  // Preservation
  preservedManualOverrides: boolean
  overridesPreservedCount: number

  createdAt: Date
}

// ============================================================================
// REPORT DATA
// ============================================================================

/**
 * Data structure for the final group report
 */
export interface GroupReport {
  // Metadata
  reportId: string
  campId: string
  tenantId: string
  reportType: ReportType
  version: number
  generatedAt: Date
  generatedBy: string | null

  // Camp Info
  campName: string
  campStartDate: Date
  campEndDate: Date
  campLocation: string

  // Tenant/Brand Info
  tenantName: string
  tenantLogo: string | null
  primaryColor: string
  secondaryColor: string

  // Groups
  groups: GroupReportSection[]

  // Summary
  summary: GroupReportSummary

  // Exceptions
  acceptedViolations: AcceptedViolation[]

  // Notes
  directorNotes: string | null
}

export interface GroupReportSection {
  groupNumber: number
  groupName: string
  groupColor: string
  camperCount: number
  gradeRange: string          // e.g., "K - 2nd"
  campers: GroupReportCamper[]
}

export interface GroupReportCamper {
  fullName: string
  age: number
  grade: string
  medicalNotes: string | null
  allergies: string | null
  specialNotes: string | null
  leadershipNotes: string | null
  friendsWith: string[]       // Names of friends in same group
}

export interface GroupReportSummary {
  totalCampers: number
  groupCounts: number[]       // Count per group
  allConstraintsSatisfied: boolean
  acceptedExceptionCount: number
}

export interface AcceptedViolation {
  type: ViolationType
  description: string
  directorNote: string
  acceptedAt: Date
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * State for the director grouping board UI
 */
export interface GroupingBoardState {
  campId: string
  groupingStatus: GroupingStatus
  groups: CampGroup[]
  campers: StandardizedCamper[]
  friendGroups: FriendGroup[]
  violations: ConstraintViolation[]

  // UI State
  selectedCamperId: string | null
  draggedCamperId: string | null
  dragOverGroupId: string | null
  showViolationsPanel: boolean
  filterGrade: number | null
  searchQuery: string

  // Pending Changes
  pendingMoves: PendingMove[]
  hasUnsavedChanges: boolean
}

export interface PendingMove {
  camperId: string
  fromGroupId: string
  toGroupId: string
  wouldCauseViolations: ViolationType[]
  overrideNote: string | null
}

/**
 * Result of a drag-drop validation
 */
export interface DropValidation {
  allowed: boolean
  violations: ViolationType[]
  warnings: string[]
  newGroupState: {
    size: number
    minGrade: number
    maxGrade: number
    gradeSpread: number
  }
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GroupingApiResponse<T> {
  success: boolean
  data: T | null
  error: string | null
  warnings: string[]
}

export interface RunGroupingResponse {
  runId: string
  groups: CampGroup[]
  violations: ConstraintViolation[]
  stats: GroupingStats
}

export interface MoveCAMperResponse {
  success: boolean
  violations: ConstraintViolation[]
  updatedGroups: CampGroup[]
}

export interface FinalizeGroupingResponse {
  success: boolean
  reportId: string
  reportUrl: string
}
