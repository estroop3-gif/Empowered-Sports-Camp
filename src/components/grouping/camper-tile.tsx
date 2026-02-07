'use client'

import { memo, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  AlertTriangle,
  Star,
  Pill,
  GripVertical,
  Link2,
} from 'lucide-react'
import { StandardizedCamper } from '@/lib/grouping/types'

/**
 * CAMPER TILE COMPONENT
 *
 * A compact, draggable tile representing a single camper in the grouping board.
 * Follows the Empowered Sports Camp brand system with:
 * - Dark background with accent borders
 * - Sharp edges (no border-radius)
 * - Uppercase labels with wide tracking
 * - Neon/Magenta/Purple accent colors
 * - Glow effects on hover and drag states
 */

interface CamperTileProps {
  camper: StandardizedCamper
  isSelected?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  showFriendIndicator?: boolean
  friendGroupColor?: string
  onSelect?: (camper: StandardizedCamper) => void
  className?: string
}

export const CamperTile = memo(forwardRef<HTMLDivElement, CamperTileProps>(
  function CamperTile(
    {
      camper,
      isSelected = false,
      isDragging = false,
      isDragOver = false,
      showFriendIndicator = false,
      friendGroupColor,
      onSelect,
      className,
      ...props
    },
    ref
  ) {
    const hasSpecialNotes = !!(camper.medicalNotes || camper.allergies || camper.specialConsiderations)
    const hasLeadership = camper.leadershipPotential

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(camper)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect?.(camper)
          }
        }}
        className={cn(
          // Base styles - dark card with sharp edges
          'group relative',
          'bg-dark-100 border-2',
          'cursor-grab active:cursor-grabbing',
          'transition-all duration-150',
          'outline-none',

          // Default border
          'border-white/10',

          // Hover state - neon glow
          'hover:border-neon/50 hover:shadow-[0_0_12px_rgba(204,255,0,0.15)]',

          // Selected state - magenta glow
          isSelected && [
            'border-magenta/70',
            'shadow-[0_0_16px_rgba(255,45,206,0.25)]',
            'ring-1 ring-magenta/30',
          ],

          // Dragging state - lifted with purple glow
          isDragging && [
            'border-purple/70',
            'shadow-[0_0_24px_rgba(111,0,216,0.35)]',
            'scale-105 rotate-1',
            'z-50',
          ],

          // Drag over state (when another item is being dragged over this)
          isDragOver && [
            'border-neon/50',
            'bg-neon/5',
          ],

          // Focus visible
          'focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-dark',

          className
        )}
        {...props}
      >
        {/* Friend group indicator stripe */}
        {showFriendIndicator && friendGroupColor && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: friendGroupColor }}
          />
        )}

        {/* Main content */}
        <div className="flex items-start gap-3 p-3">
          {/* Drag handle */}
          <div className="flex-shrink-0 text-white/30 group-hover:text-white/50 transition-colors mt-0.5">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Camper info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">
                {camper.fullName}
              </span>

              {/* Status icons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {hasLeadership && (
                  <Star
                    className="w-3.5 h-3.5 text-neon"
                    aria-label="Leadership potential"
                  />
                )}
                {hasSpecialNotes && (
                  <Pill
                    className="w-3.5 h-3.5 text-magenta"
                    aria-label="Medical notes or allergies"
                  />
                )}
                {camper.friendGroupId && (
                  <Users
                    className="w-3.5 h-3.5 text-purple"
                    aria-label="In friend group"
                  />
                )}
                {camper.squadId && (
                  <Link2
                    className="w-3.5 h-3.5 text-cyan-400"
                    aria-label={`In squad${camper.squadMemberNames?.length ? ` with ${camper.squadMemberNames.join(', ')}` : ''}`}
                  />
                )}
                {camper.gradeDiscrepancy && !camper.gradeDiscrepancyResolved && (
                  <AlertTriangle
                    className="w-3.5 h-3.5 text-warning"
                    aria-label="Grade discrepancy"
                  />
                )}
              </div>
            </div>

            {/* Details row */}
            <div className="flex items-center gap-3 mt-1">
              {/* Age */}
              <span className="text-xs text-white/60 uppercase tracking-wider">
                {camper.ageAtCampStart}y
              </span>

              {/* Grade badge */}
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5',
                  'text-xs font-bold uppercase tracking-wider',
                  'bg-white/5 text-white/80'
                )}
              >
                {camper.gradeDisplay}
              </span>

              {/* Late registration indicator */}
              {camper.isLateRegistration && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5',
                    'text-xs font-bold uppercase tracking-wider',
                    'bg-warning/20 text-warning'
                  )}
                >
                  LATE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selection indicator bar */}
        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-magenta" />
        )}
      </div>
    )
  }
))

/**
 * CAMPER TILE SKELETON
 *
 * Loading placeholder for camper tiles
 */
export function CamperTileSkeleton() {
  return (
    <div className="bg-dark-100 border-2 border-white/10 p-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-4 h-4 bg-white/10 rounded" />
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
          <div className="flex gap-2">
            <div className="h-3 bg-white/10 rounded w-8" />
            <div className="h-3 bg-white/10 rounded w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * CAMPER DETAIL POPOVER CONTENT
 *
 * Expanded view of camper details shown in a popover
 */
interface CamperDetailProps {
  camper: StandardizedCamper
  friendNames?: string[]
}

export function CamperDetail({ camper, friendNames = [] }: CamperDetailProps) {
  return (
    <div className="bg-dark-100 border-2 border-white/20 p-4 min-w-[280px]">
      {/* Header */}
      <div className="border-b border-white/10 pb-3 mb-3">
        <h3 className="text-lg font-bold text-white">{camper.fullName}</h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-white/60">
          <span>{camper.ageAtCampStart} years old</span>
          <span>•</span>
          <span>{camper.gradeName}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-3 text-sm">
        {/* Grade info */}
        {camper.gradeDiscrepancy && (
          <div className="bg-warning/10 border border-warning/30 p-2">
            <div className="flex items-center gap-2 text-warning font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Grade Discrepancy</span>
            </div>
            <p className="text-white/70 text-xs">
              Parent reported {camper.gradeFromRegistration}, DOB suggests {camper.gradeDisplay}
            </p>
          </div>
        )}

        {/* Friends */}
        {friendNames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-purple font-semibold mb-1">
              <Users className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Friends</span>
            </div>
            <p className="text-white/70">{friendNames.join(', ')}</p>
          </div>
        )}

        {/* Squad */}
        {camper.squadId && camper.squadMemberNames && camper.squadMemberNames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
              <Link2 className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Squad ({camper.squadLabel || 'Squad'})</span>
            </div>
            <p className="text-white/70">{camper.squadMemberNames.join(', ')}</p>
          </div>
        )}

        {/* Medical notes */}
        {camper.medicalNotes && (
          <div>
            <div className="flex items-center gap-2 text-magenta font-semibold mb-1">
              <Pill className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Medical Notes</span>
            </div>
            <p className="text-white/70">{camper.medicalNotes}</p>
          </div>
        )}

        {/* Allergies */}
        {camper.allergies && (
          <div>
            <div className="text-error font-semibold mb-1 uppercase text-xs tracking-wider">
              Allergies
            </div>
            <p className="text-white/70">{camper.allergies}</p>
          </div>
        )}

        {/* Special considerations */}
        {camper.specialConsiderations && (
          <div>
            <div className="text-white/80 font-semibold mb-1 uppercase text-xs tracking-wider">
              Special Considerations
            </div>
            <p className="text-white/70">{camper.specialConsiderations}</p>
          </div>
        )}

        {/* Leadership */}
        {camper.leadershipPotential && (
          <div className="bg-neon/10 border border-neon/30 p-2">
            <div className="flex items-center gap-2 text-neon font-semibold mb-1">
              <Star className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Leadership Potential</span>
            </div>
            {camper.leadershipNotes && (
              <p className="text-white/70 text-xs">{camper.leadershipNotes}</p>
            )}
          </div>
        )}

        {/* Registration info */}
        <div className="pt-2 border-t border-white/10 text-xs text-white/40">
          Registered {camper.registeredAt.toLocaleDateString()}
          {camper.isLateRegistration && (
            <span className="ml-2 text-warning">(Late registration)</span>
          )}
        </div>
      </div>
    </div>
  )
}
