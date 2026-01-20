'use client'

import { memo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Zap,
} from 'lucide-react'
import { CampGroup, StandardizedCamper, GroupingConfig } from '@/lib/grouping/types'
import { formatGradeRange } from '@/lib/grouping/standardization'
import { CamperTile, CamperTileSkeleton } from './camper-tile'

/**
 * GROUP COLUMN COMPONENT
 *
 * A single group column in the grouping board showing:
 * - Group header with name, color, and status indicators
 * - Constraint status badges (size, grade spread)
 * - List of assigned campers as draggable tiles
 * - Drop zone for drag-and-drop reordering
 *
 * Follows Empowered Sports Camp brand system:
 * - Dark background with group-colored accents
 * - Sharp edges throughout
 * - Uppercase labels with wide tracking
 * - Status colors: Neon (good), Warning (caution), Error (violation)
 */

interface GroupColumnProps {
  group: CampGroup
  campers: StandardizedCamper[]
  config: GroupingConfig
  selectedCamperId: string | null
  draggedCamperId: string | null
  isDragOver: boolean
  onSelectCamper: (camper: StandardizedCamper | null) => void
  onDragStart: (camperId: string) => void
  onDragEnd: () => void
  onDragOver: (groupId: string) => void
  onDrop: (groupId: string, camperId: string) => void
  className?: string
}

export const GroupColumn = memo(function GroupColumn({
  group,
  campers,
  config,
  selectedCamperId,
  draggedCamperId,
  isDragOver,
  onSelectCamper,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  className,
}: GroupColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get campers in this group
  const groupCampers = campers.filter(c => group.camperIds.includes(c.athleteId))

  // Calculate status
  const isFull = group.camperCount >= config.maxGroupSize
  const isOverfull = group.camperCount > config.maxGroupSize
  const hasGradeIssue = group.gradeSpread > config.maxGradeSpread
  const hasViolations = group.hasHardViolations
  const hasWarnings = group.hasWarnings || group.friendViolation

  // Status color for header accent
  const getStatusColor = () => {
    if (hasViolations) return 'error'
    if (hasWarnings) return 'warning'
    return 'success'
  }

  const statusColor = getStatusColor()

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(group.id)
  }, [group.id, onDragOver])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const camperId = e.dataTransfer.getData('text/plain')
    if (camperId) {
      onDrop(group.id, camperId)
    }
  }, [group.id, onDrop])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragOver('')
    }
  }, [onDragOver])

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-dark border-2',
        'transition-all duration-200',

        // Default border
        'border-white/10',

        // Drag over state
        isDragOver && [
          'border-neon/50',
          'shadow-[0_0_20px_rgba(204,255,0,0.2)]',
          'bg-neon/5',
        ],

        className
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* GROUP HEADER */}
      <div
        className="relative border-b-2 border-white/10"
        style={{
          borderBottomColor: isDragOver ? 'rgba(204, 255, 0, 0.3)' : undefined,
        }}
      >
        {/* Colored top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: group.groupColor }}
        />

        <div className="p-4 pt-5">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Group color indicator */}
              <div
                className="w-4 h-4 flex-shrink-0"
                style={{ backgroundColor: group.groupColor }}
              />

              {/* Group name */}
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                {group.groupName || `Group ${group.groupNumber}`}
              </h3>

              {/* Status icon */}
              {hasViolations ? (
                <AlertCircle className="w-5 h-5 text-error" />
              ) : hasWarnings ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm">
            {/* Camper count */}
            <div
              className={cn(
                'flex items-center gap-1.5',
                isOverfull ? 'text-error' : isFull ? 'text-warning' : 'text-white/70'
              )}
            >
              <Users className="w-4 h-4" />
              <span className="font-semibold">{group.camperCount}</span>
              <span className="text-white/40">/ {config.maxGroupSize}</span>
            </div>

            {/* Grade range */}
            {group.minGrade !== null && group.maxGrade !== null && (
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  hasGradeIssue ? 'text-error' : 'text-white/70'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="font-semibold">
                  {formatGradeRange(group.minGrade, group.maxGrade)}
                </span>
                {hasGradeIssue && (
                  <span className="text-error text-xs">
                    ({group.gradeSpread} spread)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Violation badges */}
          {(hasViolations || hasWarnings) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {group.sizeViolation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-error/20 text-error text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3" />
                  Size Exceeded
                </span>
              )}
              {group.gradeViolation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-error/20 text-error text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3" />
                  Grade Spread
                </span>
              )}
              {group.friendViolation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/20 text-warning text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" />
                  Friends Split
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CAMPER LIST */}
      {!isCollapsed && (
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            'p-2 space-y-2',
            'min-h-[200px]',

            // Drop zone highlight
            isDragOver && 'bg-neon/5'
          )}
        >
          {groupCampers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-white/30">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm uppercase tracking-wider">No campers assigned</p>
              <p className="text-xs mt-1">Drag campers here</p>
            </div>
          ) : (
            groupCampers.map((camper) => (
              <div
                key={camper.athleteId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', camper.athleteId)
                  e.dataTransfer.effectAllowed = 'move'
                  onDragStart(camper.athleteId)
                }}
                onDragEnd={onDragEnd}
              >
                <CamperTile
                  camper={camper}
                  isSelected={selectedCamperId === camper.athleteId}
                  isDragging={draggedCamperId === camper.athleteId}
                  showFriendIndicator={!!camper.friendGroupId}
                  friendGroupColor={
                    camper.friendGroupId
                      ? getFriendGroupColor(camper.friendGroupId)
                      : undefined
                  }
                  onSelect={onSelectCamper}
                />
              </div>
            ))
          )}

          {/* Drop zone indicator when dragging */}
          {isDragOver && draggedCamperId && (
            <div className="border-2 border-dashed border-neon/50 bg-neon/5 p-4 flex items-center justify-center">
              <Zap className="w-5 h-5 text-neon mr-2" />
              <span className="text-neon text-sm font-semibold uppercase tracking-wider">
                Drop to add to {group.groupName || `Group ${group.groupNumber}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Collapsed summary */}
      {isCollapsed && (
        <div className="p-4 text-center text-white/50 text-sm">
          <span className="font-semibold">{group.camperCount}</span> campers assigned
        </div>
      )}
    </div>
  )
})

/**
 * Get a consistent color for a friend group based on its ID
 */
function getFriendGroupColor(friendGroupId: string): string {
  // Hash the ID to get a consistent index
  let hash = 0
  for (let i = 0; i < friendGroupId.length; i++) {
    hash = ((hash << 5) - hash) + friendGroupId.charCodeAt(i)
    hash = hash & hash
  }

  const colors = [
    '#CCFF00', // Neon
    '#FF2DCE', // Magenta
    '#6F00D8', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#EC4899', // Pink
    '#8B5CF6', // Violet
    '#10B981', // Emerald
  ]

  return colors[Math.abs(hash) % colors.length]
}

/**
 * GROUP COLUMN SKELETON
 *
 * Loading placeholder for group columns
 */
export function GroupColumnSkeleton() {
  return (
    <div className="flex flex-col bg-dark border-2 border-white/10 animate-pulse">
      {/* Header */}
      <div className="border-b-2 border-white/10 p-4">
        <div className="h-1 bg-white/10 mb-4" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-4 h-4 bg-white/10" />
          <div className="h-6 bg-white/10 w-32" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 bg-white/10 w-16" />
          <div className="h-4 bg-white/10 w-20" />
        </div>
      </div>

      {/* Camper list */}
      <div className="p-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <CamperTileSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
