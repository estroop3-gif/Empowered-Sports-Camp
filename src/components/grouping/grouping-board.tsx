'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Download,
  Printer,
  Search,
  Filter,
  X,
  Zap,
  Users,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  CampGroup,
  StandardizedCamper,
  FriendGroup,
  ConstraintViolation,
  GroupingConfig,
  GroupingStatus,
  GroupingStats,
  DEFAULT_GROUPING_CONFIG,
  DropValidation,
  ViolationType,
} from '@/lib/grouping/types'
import { formatGradeRange } from '@/lib/grouping/standardization'
import { Button } from '@/components/ui/button'
import { GroupColumn, GroupColumnSkeleton } from './group-column'
import { ViolationsPanel, ViolationsSummaryBar } from './violations-panel'
import { CamperDetail } from './camper-tile'

/**
 * GROUPING BOARD COMPONENT
 *
 * The main director interface for viewing, adjusting, and finalizing
 * camper group assignments. This is the "command center" for the
 * grouping engine.
 *
 * Features:
 * - Five group columns displayed side-by-side
 * - Drag-and-drop camper reassignment
 * - Real-time constraint validation
 * - Violations panel with resolution workflow
 * - Search and filter capabilities
 * - Run/rerun algorithm actions
 * - Finalize and export options
 *
 * Brand alignment:
 * - Dark theme with neon/magenta/purple accents
 * - Sharp edges throughout
 * - Pro sports control center aesthetic
 * - Clean, readable for adults
 */

interface GroupingBoardProps {
  campId: string
  campName: string
  campStartDate: Date
  groupingStatus: GroupingStatus
  groups: CampGroup[]
  campers: StandardizedCamper[]
  friendGroups: FriendGroup[]
  violations: ConstraintViolation[]
  stats: GroupingStats | null
  config?: GroupingConfig
  isLoading?: boolean
  isRunning?: boolean
  onRunGrouping: () => void
  onRerunGrouping: () => void
  onMoveCamper: (camperId: string, fromGroupId: string, toGroupId: string) => Promise<DropValidation>
  onResolveViolation: (violationId: string, note: string) => void
  onFinalize: () => void
  onExportReport: () => void
}

export function GroupingBoard({
  campId,
  campName,
  campStartDate,
  groupingStatus,
  groups,
  campers,
  friendGroups,
  violations,
  stats,
  config = DEFAULT_GROUPING_CONFIG,
  isLoading = false,
  isRunning = false,
  onRunGrouping,
  onRerunGrouping,
  onMoveCamper,
  onResolveViolation,
  onFinalize,
  onExportReport,
}: GroupingBoardProps) {
  // UI State
  const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null)
  const [draggedCamperId, setDraggedCamperId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [showViolationsPanel, setShowViolationsPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState<number | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{
    camperId: string
    fromGroupId: string
    toGroupId: string
    validation: DropValidation
  } | null>(null)
  const [overrideNote, setOverrideNote] = useState('')

  // Computed values
  const selectedCamper = useMemo(
    () => campers.find(c => c.athleteId === selectedCamperId),
    [campers, selectedCamperId]
  )

  const filteredCampers = useMemo(() => {
    let result = campers

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.fullName.toLowerCase().includes(query) ||
        c.gradeDisplay.toLowerCase().includes(query)
      )
    }

    if (filterGrade !== null) {
      result = result.filter(c => c.gradeValidated === filterGrade)
    }

    return result
  }, [campers, searchQuery, filterGrade])

  const unresolvedViolations = useMemo(
    () => violations.filter(v => !v.resolved),
    [violations]
  )

  const canFinalize = unresolvedViolations.filter(v => v.severity === 'hard').length === 0

  // Friend names for selected camper
  const selectedCamperFriendNames = useMemo(() => {
    if (!selectedCamper?.friendGroupId) return []

    const fg = friendGroups.find(f => f.id === selectedCamper.friendGroupId)
    if (!fg) return []

    return fg.memberIds
      .filter(id => id !== selectedCamper.athleteId)
      .map(id => campers.find(c => c.athleteId === id)?.fullName)
      .filter(Boolean) as string[]
  }, [selectedCamper, friendGroups, campers])

  // Event handlers
  const handleSelectCamper = useCallback((camper: StandardizedCamper | null) => {
    setSelectedCamperId(camper?.athleteId ?? null)
  }, [])

  const handleDragStart = useCallback((camperId: string) => {
    setDraggedCamperId(camperId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedCamperId(null)
    setDragOverGroupId(null)
  }, [])

  const handleDragOver = useCallback((groupId: string) => {
    setDragOverGroupId(groupId || null)
  }, [])

  const handleDrop = useCallback(async (toGroupId: string, camperId: string) => {
    const camper = campers.find(c => c.athleteId === camperId)
    if (!camper) return

    const fromGroup = groups.find(g => g.camperIds.includes(camperId))
    if (!fromGroup || fromGroup.id === toGroupId) {
      handleDragEnd()
      return
    }

    // Validate the move
    const validation = await onMoveCamper(camperId, fromGroup.id, toGroupId)

    if (validation.allowed) {
      // Move is clean, execute immediately
      handleDragEnd()
    } else {
      // Move would cause violations, show confirmation dialog
      setPendingDrop({
        camperId,
        fromGroupId: fromGroup.id,
        toGroupId,
        validation,
      })
    }
  }, [campers, groups, onMoveCamper, handleDragEnd])

  const handleConfirmOverride = useCallback(async () => {
    if (!pendingDrop) return

    // Execute the move with override
    await onMoveCamper(pendingDrop.camperId, pendingDrop.fromGroupId, pendingDrop.toGroupId)
    setPendingDrop(null)
    setOverrideNote('')
    handleDragEnd()
  }, [pendingDrop, onMoveCamper, handleDragEnd])

  const handleCancelOverride = useCallback(() => {
    setPendingDrop(null)
    setOverrideNote('')
    handleDragEnd()
  }, [handleDragEnd])

  const handleNavigateToGroup = useCallback((groupId: string) => {
    // Scroll to group column
    const element = document.getElementById(`group-${groupId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setShowViolationsPanel(false)
  }, [])

  const handleNavigateToCamper = useCallback((camperId: string) => {
    setSelectedCamperId(camperId)
    setShowViolationsPanel(false)
  }, [])

  // Get unique grades for filter
  const availableGrades = useMemo(() => {
    const grades = [...new Set(campers.map(c => c.gradeValidated))].sort((a, b) => a - b)
    return grades
  }, [campers])

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* HEADER BAR */}
      <div className="flex-shrink-0 border-b-2 border-white/10 bg-dark-100">
        {/* Top row - Camp info and actions */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wide">
              {campName}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Group Assignment • {campStartDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            <StatusBadge status={groupingStatus} />

            {/* Action buttons */}
            {groupingStatus === 'pending' && (
              <Button
                variant="neon"
                size="lg"
                onClick={onRunGrouping}
                disabled={isRunning || campers.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Grouping
                  </>
                )}
              </Button>
            )}

            {(groupingStatus === 'auto_grouped' || groupingStatus === 'reviewed') && (
              <>
                <Button
                  variant="outline-neon"
                  onClick={onRerunGrouping}
                  disabled={isRunning}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rerun
                </Button>

                <Button
                  variant="neon"
                  onClick={onFinalize}
                  disabled={!canFinalize}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalize
                </Button>
              </>
            )}

            {groupingStatus === 'finalized' && (
              <>
                <Button variant="outline-neon" onClick={onExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="ghost" onClick={onExportReport}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Second row - Stats and violations summary */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/5">
          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Users className="w-4 h-4" />
                <span>
                  <strong className="text-white">{stats.totalCampers}</strong> campers
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <span>
                  <strong className="text-white">{stats.totalFriendGroups}</strong> friend groups
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <span>
                  Avg size: <strong className="text-white">{stats.averageGroupSize.toFixed(1)}</strong>
                </span>
              </div>
              {stats.lateRegistrations > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <span>
                    <strong>{stats.lateRegistrations}</strong> late registration{stats.lateRegistrations !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Violations summary */}
          <ViolationsSummaryBar
            violations={violations}
            onOpenPanel={() => setShowViolationsPanel(true)}
          />
        </div>

        {/* Third row - Search and filters */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-white/5 bg-dark">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campers..."
              className={cn(
                'w-full pl-10 pr-4 py-2 text-sm',
                'bg-white/5 border-2 border-white/10',
                'text-white placeholder:text-white/30',
                'focus:outline-none focus:border-neon/50'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Grade filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <select
              value={filterGrade ?? ''}
              onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : null)}
              className={cn(
                'px-3 py-2 text-sm',
                'bg-white/5 border-2 border-white/10',
                'text-white',
                'focus:outline-none focus:border-neon/50'
              )}
            >
              <option value="">All Grades</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === -1 ? 'Pre-K' : grade === 0 ? 'Kindergarten' : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter indicator */}
          {(searchQuery || filterGrade !== null) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setFilterGrade(null)
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* Groups grid */}
        <div className="flex-1 overflow-x-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-5 gap-4 min-w-[1200px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <GroupColumnSkeleton key={i} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <Zap className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-bold uppercase tracking-wide mb-2">
                No Groups Yet
              </h2>
              <p className="text-sm text-center max-w-md">
                {campers.length === 0
                  ? 'No campers are registered for this session yet.'
                  : 'Click "Run Grouping" to automatically assign campers to groups.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4 min-w-[1200px] h-full">
              {groups.map((group) => (
                <GroupColumn
                  key={group.id}
                  group={group}
                  campers={filteredCampers}
                  config={config}
                  selectedCamperId={selectedCamperId}
                  draggedCamperId={draggedCamperId}
                  isDragOver={dragOverGroupId === group.id}
                  onSelectCamper={handleSelectCamper}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="h-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* Violations panel (slide-out) */}
        {showViolationsPanel && (
          <div className="w-96 flex-shrink-0 border-l-2 border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-bold text-white uppercase tracking-wide">
                Constraints
              </h2>
              <button
                onClick={() => setShowViolationsPanel(false)}
                className="p-1 text-white/50 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ViolationsPanel
              violations={violations}
              onResolve={onResolveViolation}
              onNavigateToGroup={handleNavigateToGroup}
              onNavigateToCamper={handleNavigateToCamper}
              className="h-[calc(100%-57px)]"
            />
          </div>
        )}

        {/* Selected camper detail panel */}
        {selectedCamper && !showViolationsPanel && (
          <div className="w-80 flex-shrink-0 border-l-2 border-white/10 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-bold text-white uppercase tracking-wide">
                Camper Details
              </h2>
              <button
                onClick={() => setSelectedCamperId(null)}
                className="p-1 text-white/50 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CamperDetail
              camper={selectedCamper}
              friendNames={selectedCamperFriendNames}
            />
          </div>
        )}
      </div>

      {/* Override confirmation modal */}
      {pendingDrop && (
        <OverrideModal
          pendingDrop={pendingDrop}
          camper={campers.find(c => c.athleteId === pendingDrop.camperId)!}
          fromGroup={groups.find(g => g.id === pendingDrop.fromGroupId)!}
          toGroup={groups.find(g => g.id === pendingDrop.toGroupId)!}
          overrideNote={overrideNote}
          onNoteChange={setOverrideNote}
          onConfirm={handleConfirmOverride}
          onCancel={handleCancelOverride}
        />
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: GroupingStatus }) {
  const config = {
    pending: {
      label: 'Pending',
      bgClass: 'bg-white/10',
      textClass: 'text-white/60',
    },
    auto_grouped: {
      label: 'Auto-Grouped',
      bgClass: 'bg-neon/20',
      textClass: 'text-neon',
    },
    reviewed: {
      label: 'Reviewed',
      bgClass: 'bg-purple/20',
      textClass: 'text-purple',
    },
    finalized: {
      label: 'Finalized',
      bgClass: 'bg-success/20',
      textClass: 'text-success',
    },
  }[status]

  return (
    <span className={cn(
      'px-3 py-1 text-sm font-bold uppercase tracking-wider',
      config.bgClass,
      config.textClass
    )}>
      {config.label}
    </span>
  )
}

interface OverrideModalProps {
  pendingDrop: {
    camperId: string
    fromGroupId: string
    toGroupId: string
    validation: DropValidation
  }
  camper: StandardizedCamper
  fromGroup: CampGroup
  toGroup: CampGroup
  overrideNote: string
  onNoteChange: (note: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function OverrideModal({
  pendingDrop,
  camper,
  fromGroup,
  toGroup,
  overrideNote,
  onNoteChange,
  onConfirm,
  onCancel,
}: OverrideModalProps) {
  const { validation } = pendingDrop

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
      <div className="bg-dark-100 border-2 border-error/50 max-w-lg w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-error/10">
          <AlertTriangle className="w-6 h-6 text-error" />
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            Constraint Violation
          </h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-white/80">
            Moving <strong className="text-white">{camper.fullName}</strong> from{' '}
            <strong className="text-white">{fromGroup.groupName}</strong> to{' '}
            <strong className="text-white">{toGroup.groupName}</strong> would cause:
          </p>

          {/* Violations list */}
          <div className="space-y-2">
            {validation.violations.map((type, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 bg-error/10 border border-error/30"
              >
                <AlertTriangle className="w-4 h-4 text-error" />
                <span className="text-sm text-error">
                  {type === 'size_exceeded' && `Group would have ${validation.newGroupState.size} campers (max ${DEFAULT_GROUPING_CONFIG.maxGroupSize})`}
                  {type === 'grade_spread_exceeded' && `Grade spread would be ${validation.newGroupState.gradeSpread} (max ${DEFAULT_GROUPING_CONFIG.maxGradeSpread})`}
                  {type === 'friend_group_split' && 'This would separate friends who requested to be together'}
                </span>
              </div>
            ))}
          </div>

          {/* Override note */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
              Override Reason (Required)
            </label>
            <textarea
              value={overrideNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Explain why you're making this override..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 text-sm',
                'bg-white/5 border-2 border-white/10',
                'text-white placeholder:text-white/30',
                'focus:outline-none focus:border-neon/50',
                'resize-none'
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="magenta"
            onClick={onConfirm}
            disabled={!overrideNote.trim()}
          >
            Override & Move
          </Button>
        </div>
      </div>
    </div>
  )
}
