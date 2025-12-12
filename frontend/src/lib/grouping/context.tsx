'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import {
  CampGroup,
  StandardizedCamper,
  FriendGroup,
  ConstraintViolation,
  GroupingConfig,
  GroupingStatus,
  GroupingStats,
  GroupingOutput,
  DropValidation,
  DEFAULT_GROUPING_CONFIG,
  ViolationType,
} from './types'
import { runGroupingAlgorithm } from './algorithm'
import { clusterFriendGroups } from './friend-clustering'
import { standardizeAllCampers } from './standardization'
import type { RawCamperData } from './standardization'
import { generateGroupReport, printReport, downloadReportHtml } from './report-generator'

// ============================================================================
// STATE TYPES
// ============================================================================

interface GroupingState {
  // Camp info
  campId: string
  campName: string
  campStartDate: Date
  campEndDate: Date
  campLocation: string
  tenantId: string
  tenantName: string
  tenantLogo: string | null
  primaryColor: string
  secondaryColor: string

  // Config
  config: GroupingConfig

  // Status
  groupingStatus: GroupingStatus
  isLoading: boolean
  isRunning: boolean
  error: string | null

  // Data
  rawCampers: RawCamperData[]
  campers: StandardizedCamper[]
  friendGroups: FriendGroup[]
  groups: CampGroup[]
  violations: ConstraintViolation[]
  stats: GroupingStats | null

  // UI state
  hasUnsavedChanges: boolean
}

// ============================================================================
// ACTIONS
// ============================================================================

type GroupingAction =
  | { type: 'INIT_CAMP'; payload: InitCampPayload }
  | { type: 'SET_RAW_CAMPERS'; payload: RawCamperData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'STANDARDIZE_CAMPERS' }
  | { type: 'RUN_GROUPING_SUCCESS'; payload: GroupingOutput }
  | { type: 'MOVE_CAMPER'; payload: MoveCamperPayload }
  | { type: 'RESOLVE_VIOLATION'; payload: ResolveViolationPayload }
  | { type: 'FINALIZE' }
  | { type: 'RESET' }

interface InitCampPayload {
  campId: string
  campName: string
  campStartDate: Date
  campEndDate: Date
  campLocation: string
  tenantId: string
  tenantName: string
  tenantLogo: string | null
  primaryColor: string
  secondaryColor: string
  config?: Partial<GroupingConfig>
}

interface MoveCamperPayload {
  camperId: string
  fromGroupId: string
  toGroupId: string
  overrideNote?: string
}

interface ResolveViolationPayload {
  violationId: string
  resolutionNote: string
}

// ============================================================================
// REDUCER
// ============================================================================

function groupingReducer(state: GroupingState, action: GroupingAction): GroupingState {
  switch (action.type) {
    case 'INIT_CAMP':
      return {
        ...state,
        campId: action.payload.campId,
        campName: action.payload.campName,
        campStartDate: action.payload.campStartDate,
        campEndDate: action.payload.campEndDate,
        campLocation: action.payload.campLocation,
        tenantId: action.payload.tenantId,
        tenantName: action.payload.tenantName,
        tenantLogo: action.payload.tenantLogo,
        primaryColor: action.payload.primaryColor,
        secondaryColor: action.payload.secondaryColor,
        config: { ...DEFAULT_GROUPING_CONFIG, ...action.payload.config },
        groupingStatus: 'pending',
        error: null,
      }

    case 'SET_RAW_CAMPERS':
      return {
        ...state,
        rawCampers: action.payload,
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isRunning: false }

    case 'STANDARDIZE_CAMPERS': {
      const { campers, warnings } = standardizeAllCampers(
        state.rawCampers,
        state.campId,
        state.tenantId,
        state.campStartDate,
        state.config
      )

      const { friendGroups, soloCampers } = clusterFriendGroups(
        campers,
        state.campId,
        state.tenantId,
        state.config
      )

      return {
        ...state,
        campers,
        friendGroups,
      }
    }

    case 'RUN_GROUPING_SUCCESS':
      return {
        ...state,
        groups: action.payload.groups,
        violations: action.payload.violations,
        stats: action.payload.stats,
        groupingStatus: 'auto_grouped',
        isRunning: false,
        hasUnsavedChanges: false,
        // Update campers with their assignments
        campers: state.campers.map(camper => {
          const assignment = action.payload.assignments.find(
            a => a.camperSessionId === camper.athleteId
          )
          if (assignment) {
            const group = action.payload.groups.find(g => g.id === assignment.toGroupId)
            return {
              ...camper,
              assignedGroupId: assignment.toGroupId,
              assignedGroupNumber: group?.groupNumber ?? null,
              assignedGroupName: group?.groupName ?? null,
              assignmentType: assignment.assignmentType,
              assignmentReason: assignment.reason,
            }
          }
          return camper
        }),
      }

    case 'MOVE_CAMPER': {
      const { camperId, fromGroupId, toGroupId } = action.payload

      // Update groups
      const updatedGroups = state.groups.map(group => {
        if (group.id === fromGroupId) {
          return {
            ...group,
            camperIds: group.camperIds.filter(id => id !== camperId),
            camperCount: group.camperCount - 1,
          }
        }
        if (group.id === toGroupId) {
          return {
            ...group,
            camperIds: [...group.camperIds, camperId],
            camperCount: group.camperCount + 1,
          }
        }
        return group
      })

      // Recalculate group stats
      const camperMap = new Map(state.campers.map(c => [c.athleteId, c]))
      const finalGroups = updatedGroups.map(group => {
        const groupCampers = group.camperIds.map(id => camperMap.get(id)).filter(Boolean)
        const grades = groupCampers.map(c => c!.gradeValidated)
        const minGrade = grades.length > 0 ? Math.min(...grades) : null
        const maxGrade = grades.length > 0 ? Math.max(...grades) : null
        const gradeSpread = minGrade !== null && maxGrade !== null ? maxGrade - minGrade : 0

        return {
          ...group,
          minGrade,
          maxGrade,
          gradeSpread,
          sizeViolation: group.camperIds.length > state.config.maxGroupSize,
          gradeViolation: gradeSpread > state.config.maxGradeSpread,
          hasHardViolations:
            group.camperIds.length > state.config.maxGroupSize ||
            gradeSpread > state.config.maxGradeSpread,
        }
      })

      // Update camper assignment
      const toGroup = finalGroups.find(g => g.id === toGroupId)
      const updatedCampers = state.campers.map(camper => {
        if (camper.athleteId === camperId) {
          return {
            ...camper,
            assignedGroupId: toGroupId,
            assignedGroupNumber: toGroup?.groupNumber ?? null,
            assignedGroupName: toGroup?.groupName ?? null,
            assignmentType: 'manual' as const,
            assignmentReason: action.payload.overrideNote || 'Manual move by director',
          }
        }
        return camper
      })

      return {
        ...state,
        groups: finalGroups,
        campers: updatedCampers,
        groupingStatus: 'reviewed',
        hasUnsavedChanges: true,
      }
    }

    case 'RESOLVE_VIOLATION':
      return {
        ...state,
        violations: state.violations.map(v =>
          v.id === action.payload.violationId
            ? {
                ...v,
                resolved: true,
                resolutionType: 'accepted' as const,
                resolutionNote: action.payload.resolutionNote,
                resolvedAt: new Date(),
              }
            : v
        ),
        hasUnsavedChanges: true,
      }

    case 'FINALIZE':
      return {
        ...state,
        groupingStatus: 'finalized',
        hasUnsavedChanges: false,
      }

    case 'RESET':
      return getInitialState()

    default:
      return state
  }
}

// ============================================================================
// INITIAL STATE
// ============================================================================

function getInitialState(): GroupingState {
  return {
    campId: '',
    campName: '',
    campStartDate: new Date(),
    campEndDate: new Date(),
    campLocation: '',
    tenantId: '',
    tenantName: '',
    tenantLogo: null,
    primaryColor: '#CCFF00',
    secondaryColor: '#FF2DCE',
    config: DEFAULT_GROUPING_CONFIG,
    groupingStatus: 'pending',
    isLoading: false,
    isRunning: false,
    error: null,
    rawCampers: [],
    campers: [],
    friendGroups: [],
    groups: [],
    violations: [],
    stats: null,
    hasUnsavedChanges: false,
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface GroupingContextValue {
  state: GroupingState

  // Actions
  initCamp: (payload: InitCampPayload) => void
  setRawCampers: (campers: RawCamperData[]) => void
  runGrouping: () => Promise<void>
  rerunGrouping: () => Promise<void>
  moveCamper: (camperId: string, fromGroupId: string, toGroupId: string) => Promise<DropValidation>
  resolveViolation: (violationId: string, note: string) => void
  finalize: () => void
  exportReport: () => void
  printReport: () => void
  reset: () => void
}

const GroupingContext = createContext<GroupingContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface GroupingProviderProps {
  children: ReactNode
}

export function GroupingProvider({ children }: GroupingProviderProps) {
  const [state, dispatch] = useReducer(groupingReducer, getInitialState())

  // Initialize camp
  const initCamp = useCallback((payload: InitCampPayload) => {
    dispatch({ type: 'INIT_CAMP', payload })
  }, [])

  // Set raw camper data
  const setRawCampers = useCallback((campers: RawCamperData[]) => {
    dispatch({ type: 'SET_RAW_CAMPERS', payload: campers })
    dispatch({ type: 'STANDARDIZE_CAMPERS' })
  }, [])

  // Run grouping algorithm
  const runGrouping = useCallback(async () => {
    dispatch({ type: 'SET_RUNNING', payload: true })

    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100))

      const output = runGroupingAlgorithm({
        campId: state.campId,
        tenantId: state.tenantId,
        campStartDate: state.campStartDate,
        config: state.config,
        campers: state.campers,
        friendGroups: state.friendGroups,
        preserveManualOverrides: false,
        existingAssignments: new Map(),
      })

      dispatch({ type: 'RUN_GROUPING_SUCCESS', payload: output })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [state.campId, state.tenantId, state.campStartDate, state.config, state.campers, state.friendGroups])

  // Rerun grouping (preserving manual overrides)
  const rerunGrouping = useCallback(async () => {
    dispatch({ type: 'SET_RUNNING', payload: true })

    try {
      await new Promise(resolve => setTimeout(resolve, 100))

      // Collect existing manual assignments
      const existingAssignments = new Map<string, string>()
      for (const camper of state.campers) {
        if (camper.assignmentType === 'manual' && camper.assignedGroupId) {
          existingAssignments.set(camper.athleteId, camper.assignedGroupId)
        }
      }

      const output = runGroupingAlgorithm({
        campId: state.campId,
        tenantId: state.tenantId,
        campStartDate: state.campStartDate,
        config: state.config,
        campers: state.campers,
        friendGroups: state.friendGroups,
        preserveManualOverrides: true,
        existingAssignments,
      })

      dispatch({ type: 'RUN_GROUPING_SUCCESS', payload: output })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [state.campId, state.tenantId, state.campStartDate, state.config, state.campers, state.friendGroups])

  // Move camper with validation
  const moveCamperAction = useCallback(async (
    camperId: string,
    fromGroupId: string,
    toGroupId: string
  ): Promise<DropValidation> => {
    const camper = state.campers.find(c => c.athleteId === camperId)
    const toGroup = state.groups.find(g => g.id === toGroupId)

    if (!camper || !toGroup) {
      return {
        allowed: false,
        violations: ['impossible_placement'],
        warnings: [],
        newGroupState: { size: 0, minGrade: 0, maxGrade: 0, gradeSpread: 0 },
      }
    }

    // Calculate new group state
    const newSize = toGroup.camperCount + 1
    const newMinGrade = toGroup.minGrade === null
      ? camper.gradeValidated
      : Math.min(toGroup.minGrade, camper.gradeValidated)
    const newMaxGrade = toGroup.maxGrade === null
      ? camper.gradeValidated
      : Math.max(toGroup.maxGrade, camper.gradeValidated)
    const newGradeSpread = newMaxGrade - newMinGrade

    const violations: ViolationType[] = []
    const warnings: string[] = []

    // Check size constraint
    if (newSize > state.config.maxGroupSize) {
      violations.push('size_exceeded')
    }

    // Check grade constraint
    if (newGradeSpread > state.config.maxGradeSpread) {
      violations.push('grade_spread_exceeded')
    }

    // Check friend group split
    if (camper.friendGroupId) {
      const friendGroup = state.friendGroups.find(fg => fg.id === camper.friendGroupId)
      if (friendGroup) {
        const friendsInFromGroup = friendGroup.memberIds.filter(id => {
          const c = state.campers.find(cam => cam.athleteId === id)
          return c?.assignedGroupId === fromGroupId && c.athleteId !== camperId
        })

        if (friendsInFromGroup.length > 0) {
          violations.push('friend_group_split')
          warnings.push(`This will separate ${camper.fullName} from friends in their group`)
        }
      }
    }

    const result: DropValidation = {
      allowed: violations.length === 0,
      violations,
      warnings,
      newGroupState: {
        size: newSize,
        minGrade: newMinGrade,
        maxGrade: newMaxGrade,
        gradeSpread: newGradeSpread,
      },
    }

    // If allowed, execute the move
    if (result.allowed) {
      dispatch({
        type: 'MOVE_CAMPER',
        payload: { camperId, fromGroupId, toGroupId },
      })
    }

    return result
  }, [state.campers, state.groups, state.config, state.friendGroups])

  // Resolve violation
  const resolveViolation = useCallback((violationId: string, note: string) => {
    dispatch({
      type: 'RESOLVE_VIOLATION',
      payload: { violationId, resolutionNote: note },
    })
  }, [])

  // Finalize groups
  const finalizeAction = useCallback(() => {
    dispatch({ type: 'FINALIZE' })
  }, [])

  // Export report
  const exportReportAction = useCallback(() => {
    const report = generateGroupReport({
      campId: state.campId,
      campName: state.campName,
      campStartDate: state.campStartDate,
      campEndDate: state.campEndDate,
      campLocation: state.campLocation,
      tenantId: state.tenantId,
      tenantName: state.tenantName,
      tenantLogo: state.tenantLogo,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      groups: state.groups,
      campers: state.campers,
      friendGroups: state.friendGroups,
      violations: state.violations,
    })

    downloadReportHtml(report)
  }, [state])

  // Print report
  const printReportAction = useCallback(() => {
    const report = generateGroupReport({
      campId: state.campId,
      campName: state.campName,
      campStartDate: state.campStartDate,
      campEndDate: state.campEndDate,
      campLocation: state.campLocation,
      tenantId: state.tenantId,
      tenantName: state.tenantName,
      tenantLogo: state.tenantLogo,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      groups: state.groups,
      campers: state.campers,
      friendGroups: state.friendGroups,
      violations: state.violations,
    })

    printReport(report)
  }, [state])

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const value = useMemo<GroupingContextValue>(
    () => ({
      state,
      initCamp,
      setRawCampers,
      runGrouping,
      rerunGrouping,
      moveCamper: moveCamperAction,
      resolveViolation,
      finalize: finalizeAction,
      exportReport: exportReportAction,
      printReport: printReportAction,
      reset,
    }),
    [
      state,
      initCamp,
      setRawCampers,
      runGrouping,
      rerunGrouping,
      moveCamperAction,
      resolveViolation,
      finalizeAction,
      exportReportAction,
      printReportAction,
      reset,
    ]
  )

  return (
    <GroupingContext.Provider value={value}>
      {children}
    </GroupingContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useGrouping() {
  const context = useContext(GroupingContext)
  if (!context) {
    throw new Error('useGrouping must be used within a GroupingProvider')
  }
  return context
}
