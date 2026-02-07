/**
 * EMPOWERED SPORTS CAMP - DATA STANDARDIZATION SERVICE
 *
 * This service processes raw camper registration data into standardized
 * formats suitable for the grouping algorithm. It handles:
 *
 * 1. Age calculation at camp start date
 * 2. Grade validation and discrepancy detection
 * 3. Friend request parsing and matching
 * 4. Late registration flagging
 */

import {
  StandardizedCamper,
  GradeLevel,
  GRADE_LEVELS,
  GroupingConfig,
  DEFAULT_GROUPING_CONFIG,
} from './types'

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

// ============================================================================
// AGE CALCULATION
// ============================================================================

/**
 * Calculate age in years at a specific date
 *
 * @param dateOfBirth - The date of birth
 * @param atDate - The date to calculate age at
 * @returns Age in complete years
 */
export function calculateAgeAtDate(dateOfBirth: Date, atDate: Date): number {
  let age = atDate.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = atDate.getMonth() - dateOfBirth.getMonth()

  // If birthday hasn't occurred yet this year, subtract one
  if (monthDiff < 0 || (monthDiff === 0 && atDate.getDate() < dateOfBirth.getDate())) {
    age--
  }

  return Math.max(0, age)
}

/**
 * Calculate age in months at a specific date (for finer sorting)
 *
 * @param dateOfBirth - The date of birth
 * @param atDate - The date to calculate age at
 * @returns Age in complete months
 */
export function calculateAgeMonthsAtDate(dateOfBirth: Date, atDate: Date): number {
  const years = atDate.getFullYear() - dateOfBirth.getFullYear()
  const months = atDate.getMonth() - dateOfBirth.getMonth()
  const dayDiff = atDate.getDate() - dateOfBirth.getDate()

  let totalMonths = years * 12 + months
  if (dayDiff < 0) {
    totalMonths--
  }

  return Math.max(0, totalMonths)
}

// ============================================================================
// GRADE PARSING AND VALIDATION
// ============================================================================

/**
 * Parse a grade string to its numeric value
 *
 * Handles various formats:
 * - "Pre-K", "PreK", "PK" -> -1
 * - "Kindergarten", "K", "Kinder" -> 0
 * - "1st", "1st Grade", "1", "First" -> 1
 * - etc.
 *
 * @param gradeStr - The grade string to parse
 * @returns Numeric grade (-1 to 12) or null if unparseable
 */
export function parseGradeToNumeric(gradeStr: string | null): number | null {
  if (!gradeStr || gradeStr.trim() === '') {
    return null
  }

  const normalized = gradeStr.toLowerCase().trim()

  // Pre-Kindergarten variants
  if (/^(pre-?k|pre-?kindergarten|pk|preschool)$/i.test(normalized)) {
    return -1
  }

  // Kindergarten variants
  if (/^(kindergarten|kinder|k)$/i.test(normalized)) {
    return 0
  }

  // Numeric with suffix (1st, 2nd, 3rd, 4th, etc.)
  const numericMatch = normalized.match(/^(\d+)(st|nd|rd|th)?(\s*(grade)?)?$/i)
  if (numericMatch) {
    const grade = parseInt(numericMatch[1], 10)
    if (grade >= 1 && grade <= 12) {
      return grade
    }
  }

  // Word numbers
  const wordGrades: Record<string, number> = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12,
  }

  for (const [word, grade] of Object.entries(wordGrades)) {
    if (normalized.includes(word)) {
      return grade
    }
  }

  return null
}

/**
 * Compute the expected grade based on DOB and camp date
 *
 * Uses September 1 as the standard school year cutoff.
 * A child who turns 5 by Sept 1 starts Kindergarten that fall.
 *
 * @param dateOfBirth - The date of birth
 * @param campStartDate - The camp start date
 * @param config - Grouping configuration
 * @returns Expected numeric grade
 */
export function computeGradeFromDob(
  dateOfBirth: Date,
  campStartDate: Date,
  config: GroupingConfig = DEFAULT_GROUPING_CONFIG
): number {
  // Determine the school year the camp falls in
  const campYear = campStartDate.getFullYear()
  const campMonth = campStartDate.getMonth() + 1 // 1-indexed

  // School year starts in September (config.schoolYearCutoffMonth)
  let schoolYearStart: Date
  if (campMonth >= config.schoolYearCutoffMonth) {
    // Camp is in fall/winter - current school year started this September
    schoolYearStart = new Date(campYear, config.schoolYearCutoffMonth - 1, 1)
  } else {
    // Camp is in spring/summer - school year started last September
    schoolYearStart = new Date(campYear - 1, config.schoolYearCutoffMonth - 1, 1)
  }

  // Age at start of school year
  const ageAtSchoolStart = calculateAgeAtDate(dateOfBirth, schoolYearStart)

  // Map age to grade: 5 -> K (0), 6 -> 1st (1), etc.
  const grade = ageAtSchoolStart - 5

  // Clamp to valid range
  return Math.max(-1, Math.min(12, grade))
}

/**
 * Get grade level info from numeric grade
 */
export function getGradeLevelInfo(gradeNumeric: number): GradeLevel | null {
  return GRADE_LEVELS.find(g => g.gradeNumeric === gradeNumeric) ?? null
}

/**
 * Format grade for display
 *
 * @param gradeNumeric - Numeric grade value
 * @returns Display string like "K", "1st", "2nd", etc.
 */
export function formatGradeDisplay(gradeNumeric: number): string {
  const info = getGradeLevelInfo(gradeNumeric)
  if (!info) return `Grade ${gradeNumeric}`

  if (gradeNumeric === -1) return 'Pre-K'
  if (gradeNumeric === 0) return 'K'
  if (gradeNumeric === 1) return '1st'
  if (gradeNumeric === 2) return '2nd'
  if (gradeNumeric === 3) return '3rd'
  return `${gradeNumeric}th`
}

/**
 * Format grade range for display
 *
 * @param minGrade - Minimum grade in range
 * @param maxGrade - Maximum grade in range
 * @returns Display string like "K - 2nd"
 */
export function formatGradeRange(minGrade: number, maxGrade: number): string {
  if (minGrade === maxGrade) {
    return formatGradeDisplay(minGrade)
  }
  return `${formatGradeDisplay(minGrade)} - ${formatGradeDisplay(maxGrade)}`
}

// ============================================================================
// DISCREPANCY DETECTION
// ============================================================================

/**
 * Detect if there's a discrepancy between parent-reported grade and DOB
 *
 * A discrepancy exists if the grades differ by more than 1 level.
 * Small differences (1 level) are common due to:
 * - Birthday cutoff variations by state
 * - Held back or advanced students
 * - Parent confusion about current vs. upcoming grade
 *
 * @param reportedGrade - Grade as reported by parent
 * @param computedGrade - Grade computed from DOB
 * @returns Whether there's a significant discrepancy
 */
export function detectGradeDiscrepancy(
  reportedGrade: number | null,
  computedGrade: number
): boolean {
  if (reportedGrade === null) {
    // No reported grade - not a discrepancy, just missing data
    return false
  }

  const difference = Math.abs(reportedGrade - computedGrade)

  // More than 1 grade level difference is a discrepancy
  return difference > 1
}

/**
 * Get a human-readable explanation of the discrepancy
 */
export function getDiscrepancyExplanation(
  reportedGrade: number,
  computedGrade: number,
  dateOfBirth: Date,
  campStartDate: Date
): string {
  const ageAtCamp = calculateAgeAtDate(dateOfBirth, campStartDate)
  const reportedDisplay = formatGradeDisplay(reportedGrade)
  const computedDisplay = formatGradeDisplay(computedGrade)

  if (reportedGrade > computedGrade) {
    return `Parent reported ${reportedDisplay}, but DOB (${ageAtCamp} years old at camp) suggests ${computedDisplay}. ` +
           `This camper may be advanced or the parent entered the upcoming school year grade.`
  } else {
    return `Parent reported ${reportedDisplay}, but DOB (${ageAtCamp} years old at camp) suggests ${computedDisplay}. ` +
           `This camper may have been held back or there may be a data entry error.`
  }
}

// ============================================================================
// LATE REGISTRATION DETECTION
// ============================================================================

/**
 * Determine if a registration is considered "late"
 *
 * Late registrations are flagged for director awareness but don't
 * affect the grouping algorithm directly.
 *
 * @param registeredAt - When the registration was made
 * @param campStartDate - When the camp starts
 * @param config - Grouping configuration
 * @returns Whether this is a late registration
 */
export function isLateRegistration(
  registeredAt: Date,
  campStartDate: Date,
  config: GroupingConfig = DEFAULT_GROUPING_CONFIG
): boolean {
  const msPerDay = 24 * 60 * 60 * 1000
  const daysBeforeCamp = (campStartDate.getTime() - registeredAt.getTime()) / msPerDay

  return daysBeforeCamp < config.lateRegistrationDays
}

// ============================================================================
// FRIEND REQUEST PARSING
// ============================================================================

/**
 * Normalize a friend name for matching
 *
 * @param name - Raw friend name
 * @returns Normalized name for comparison
 */
export function normalizeFriendName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '') // Remove non-letters except spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
}

/**
 * Parse friend requests from a raw string or array
 *
 * Handles various input formats:
 * - Comma-separated: "Emma Smith, Sarah Jones"
 * - Newline-separated
 * - Array of names
 * - Mixed formats
 *
 * @param rawFriendRequests - Raw friend request data
 * @returns Array of normalized friend names
 */
export function parseFriendRequests(rawFriendRequests: string | string[] | null): string[] {
  if (!rawFriendRequests) {
    return []
  }

  let names: string[]

  if (Array.isArray(rawFriendRequests)) {
    names = rawFriendRequests
  } else {
    // Split on comma, newline, or semicolon
    names = rawFriendRequests.split(/[,;\n]+/)
  }

  return names
    .map(name => normalizeFriendName(name))
    .filter(name => name.length > 0)
}

/**
 * Attempt to match friend names to registered campers
 *
 * Uses fuzzy matching to handle:
 * - Nickname vs. full name
 * - Missing middle names
 * - Spelling variations
 *
 * @param friendNames - Normalized friend names to match
 * @param registeredCampers - All campers registered for this session
 * @returns Array of matched athlete IDs
 */
export function matchFriendsToCampers(
  friendNames: string[],
  registeredCampers: Array<{ athleteId: string; firstName: string; lastName: string }>
): string[] {
  const matchedIds: string[] = []

  for (const friendName of friendNames) {
    const match = findBestCamperMatch(friendName, registeredCampers)
    if (match) {
      matchedIds.push(match.athleteId)
    }
  }

  return matchedIds
}

/**
 * Find the best matching camper for a friend name
 *
 * Matching priority:
 * 1. Exact full name match
 * 2. First + Last name match
 * 3. First name only match (if unique)
 * 4. Partial/fuzzy match
 */
function findBestCamperMatch(
  friendName: string,
  campers: Array<{ athleteId: string; firstName: string; lastName: string }>
): { athleteId: string } | null {
  const normalizedFriend = normalizeFriendName(friendName)

  // Try exact full name match
  for (const camper of campers) {
    const fullName = normalizeFriendName(`${camper.firstName} ${camper.lastName}`)
    if (fullName === normalizedFriend) {
      return camper
    }
  }

  // Try first + last separately
  const nameParts = normalizedFriend.split(' ')
  if (nameParts.length >= 2) {
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]

    for (const camper of campers) {
      if (
        normalizeFriendName(camper.firstName) === firstName &&
        normalizeFriendName(camper.lastName) === lastName
      ) {
        return camper
      }
    }
  }

  // Try first name only match (if unique)
  if (nameParts.length === 1) {
    const matches = campers.filter(
      c => normalizeFriendName(c.firstName) === normalizedFriend
    )
    if (matches.length === 1) {
      return matches[0]
    }
  }

  // Try partial match (friend name contained in full name)
  for (const camper of campers) {
    const fullName = normalizeFriendName(`${camper.firstName} ${camper.lastName}`)
    if (fullName.includes(normalizedFriend) || normalizedFriend.includes(fullName)) {
      return camper
    }
  }

  return null
}

// ============================================================================
// MAIN STANDARDIZATION FUNCTION
// ============================================================================

export interface StandardizationResult {
  camper: StandardizedCamper
  warnings: string[]
}

/**
 * Standardize a single camper's data for grouping
 *
 * This is the main entry point for data standardization.
 * It processes raw registration data and returns a fully
 * standardized camper record ready for the grouping algorithm.
 *
 * @param rawData - Raw camper data from registration
 * @param campId - The camp session ID
 * @param tenantId - The tenant ID
 * @param campStartDate - When the camp starts
 * @param allCampers - All registered campers (for friend matching)
 * @param config - Grouping configuration
 * @returns Standardized camper data with any warnings
 */
export function standardizeCamperData(
  rawData: RawCamperData,
  campId: string,
  tenantId: string,
  campStartDate: Date,
  allCampers: Array<{ athleteId: string; firstName: string; lastName: string }>,
  config: GroupingConfig = DEFAULT_GROUPING_CONFIG
): StandardizationResult {
  const warnings: string[] = []
  const dob = new Date(rawData.dateOfBirth)
  const registeredAt = new Date(rawData.registeredAt)

  // Calculate ages
  const ageAtCampStart = calculateAgeAtDate(dob, campStartDate)
  const ageMonthsAtCampStart = calculateAgeMonthsAtDate(dob, campStartDate)

  // Parse and validate grade
  const gradeFromRegistration = rawData.gradeFromRegistration
  const gradeValidatedRaw = parseGradeToNumeric(gradeFromRegistration)
  const gradeComputedFromDob = computeGradeFromDob(dob, campStartDate, config)

  // Use validated grade if available, otherwise computed
  const gradeValidated = gradeValidatedRaw ?? gradeComputedFromDob

  // Check for discrepancy
  const gradeDiscrepancy = detectGradeDiscrepancy(gradeValidatedRaw, gradeComputedFromDob)
  if (gradeDiscrepancy) {
    warnings.push(
      getDiscrepancyExplanation(gradeValidatedRaw!, gradeComputedFromDob, dob, campStartDate)
    )
  }

  // Get grade display info
  const gradeInfo = getGradeLevelInfo(gradeValidated)

  // Parse friend requests
  const friendRequests = parseFriendRequests(rawData.friendRequests)
  const friendRequestAthleteIds = matchFriendsToCampers(
    friendRequests,
    allCampers.filter(c => c.athleteId !== rawData.athleteId) // Exclude self
  )

  // Check for unmatched friend requests
  if (friendRequests.length > friendRequestAthleteIds.length) {
    const unmatchedCount = friendRequests.length - friendRequestAthleteIds.length
    warnings.push(
      `${unmatchedCount} friend request(s) could not be matched to registered campers`
    )
  }

  // Check for late registration
  const isLate = isLateRegistration(registeredAt, campStartDate, config)
  if (isLate) {
    warnings.push('Late registration - registered within 7 days of camp start')
  }

  const camper: StandardizedCamper = {
    id: '', // Will be assigned by database
    athleteId: rawData.athleteId,
    registrationId: rawData.registrationId,
    campId,
    tenantId,

    firstName: rawData.firstName,
    lastName: rawData.lastName,
    fullName: `${rawData.firstName} ${rawData.lastName}`,
    dateOfBirth: dob,

    ageAtCampStart,
    ageMonthsAtCampStart,
    gradeFromRegistration,
    gradeValidated,
    gradeComputedFromDob,
    gradeDiscrepancy,
    gradeDiscrepancyResolved: false,
    gradeDiscrepancyResolution: null,

    gradeDisplay: formatGradeDisplay(gradeValidated),
    gradeName: gradeInfo?.gradeName ?? `Grade ${gradeValidated}`,

    friendRequests,
    friendRequestAthleteIds,
    friendGroupId: null, // Will be assigned during friend group clustering

    medicalNotes: rawData.medicalNotes,
    allergies: rawData.allergies,
    specialConsiderations: rawData.specialConsiderations,
    leadershipPotential: false,
    leadershipNotes: null,

    registeredAt,
    isLateRegistration: isLate,

    assignedGroupId: null,
    assignedGroupNumber: null,
    assignedGroupName: null,
    assignmentType: null,
    assignmentReason: null,

    // Squad info (populated later from squad service)
    squadId: null,
    squadLabel: null,
    squadMemberNames: [],
  }

  return { camper, warnings }
}

/**
 * Standardize all campers for a camp session
 *
 * @param rawCampers - All raw camper data
 * @param campId - Camp session ID
 * @param tenantId - Tenant ID
 * @param campStartDate - Camp start date
 * @param config - Grouping configuration
 * @returns Array of standardized campers and collected warnings
 */
export function standardizeAllCampers(
  rawCampers: RawCamperData[],
  campId: string,
  tenantId: string,
  campStartDate: Date,
  config: GroupingConfig = DEFAULT_GROUPING_CONFIG
): { campers: StandardizedCamper[]; warnings: Array<{ camperId: string; warnings: string[] }> } {
  // First pass: basic info for friend matching
  const camperBasics = rawCampers.map(c => ({
    athleteId: c.athleteId,
    firstName: c.firstName,
    lastName: c.lastName,
  }))

  const results: StandardizedCamper[] = []
  const allWarnings: Array<{ camperId: string; warnings: string[] }> = []

  // Second pass: full standardization
  for (const raw of rawCampers) {
    const { camper, warnings } = standardizeCamperData(
      raw,
      campId,
      tenantId,
      campStartDate,
      camperBasics,
      config
    )

    results.push(camper)

    if (warnings.length > 0) {
      allWarnings.push({ camperId: raw.athleteId, warnings })
    }
  }

  return { campers: results, warnings: allWarnings }
}
