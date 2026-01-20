/**
 * EMPOWERED SPORTS CAMP - GROUPING ENGINE
 *
 * Proprietary grouping algorithm and director tools for assigning
 * campers to groups based on social connections, grade proximity,
 * and size constraints.
 *
 * This module exports:
 * - Types and interfaces
 * - Data standardization utilities
 * - Friend group clustering
 * - Constrained grouping algorithm
 * - Report generation
 * - React context and hooks
 */

// Types
export * from './types'

// Data standardization
export {
  calculateAgeAtDate,
  calculateAgeMonthsAtDate,
  parseGradeToNumeric,
  computeGradeFromDob,
  getGradeLevelInfo,
  formatGradeDisplay,
  formatGradeRange,
  detectGradeDiscrepancy,
  getDiscrepancyExplanation,
  isLateRegistration,
  normalizeFriendName,
  parseFriendRequests,
  matchFriendsToCampers,
  standardizeCamperData,
  standardizeAllCampers,
} from './standardization'
export type { RawCamperData } from './standardization'

// Friend clustering
export {
  buildFriendshipGraph,
  findConnectedComponents,
  clusterFriendGroups,
  splitFriendGroup,
  getFriendGroupSummary,
} from './friend-clustering'

// Grouping algorithm
export {
  runGroupingAlgorithm,
  addLateRegistration,
} from './algorithm'

// Report generation
export {
  generateGroupReport,
  renderReportToHtml,
  printReport,
  downloadReportHtml,
  copyReportJson,
} from './report-generator'

// React context
export {
  GroupingProvider,
  useGrouping,
} from './context'
