'use client'

import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Users,
  GraduationCap,
  UserMinus,
  X,
  MessageSquare,
} from 'lucide-react'
import { ConstraintViolation, ViolationType, ViolationSeverity } from '@/lib/grouping/types'
import { Button } from '@/components/ui/button'

/**
 * VIOLATIONS PANEL COMPONENT
 *
 * Displays a summary of constraint violations and warnings for the current
 * grouping configuration. Allows directors to:
 * - See all violations at a glance
 * - Navigate to affected groups/campers
 * - Mark violations as resolved/accepted with notes
 *
 * Follows Empowered Sports Camp brand system:
 * - Dark background with accent borders
 * - Sharp edges throughout
 * - Error (red), Warning (orange), Success (green) states
 * - Uppercase labels with wide tracking
 */

interface ViolationsPanelProps {
  violations: ConstraintViolation[]
  onResolve: (violationId: string, resolutionNote: string) => void
  onNavigateToGroup: (groupId: string) => void
  onNavigateToCamper: (camperId: string) => void
  className?: string
}

export const ViolationsPanel = memo(function ViolationsPanel({
  violations,
  onResolve,
  onNavigateToGroup,
  onNavigateToCamper,
  className,
}: ViolationsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  // Categorize violations
  const hardViolations = violations.filter(v => v.severity === 'hard' && !v.resolved)
  const warnings = violations.filter(v => v.severity === 'warning' && !v.resolved)
  const resolved = violations.filter(v => v.resolved)

  const totalUnresolved = hardViolations.length + warnings.length
  const allClear = totalUnresolved === 0

  // Get icon for violation type
  const getViolationIcon = (type: ViolationType) => {
    switch (type) {
      case 'size_exceeded':
        return <Users className="w-4 h-4" />
      case 'grade_spread_exceeded':
        return <GraduationCap className="w-4 h-4" />
      case 'friend_group_split':
        return <UserMinus className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  // Render a single violation item
  const renderViolation = (violation: ConstraintViolation) => {
    const isExpanded = expandedId === violation.id
    const isHard = violation.severity === 'hard'

    return (
      <div
        key={violation.id}
        className={cn(
          'border-2 transition-all duration-150',
          isHard
            ? 'border-error/30 bg-error/5'
            : 'border-warning/30 bg-warning/5',
          isExpanded && (isHard ? 'border-error/50' : 'border-warning/50')
        )}
      >
        {/* Header */}
        <button
          onClick={() => setExpandedId(isExpanded ? null : violation.id)}
          className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5 transition-colors"
        >
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 mt-0.5',
            isHard ? 'text-error' : 'text-warning'
          )}>
            {isHard ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm">
              {violation.title}
            </h4>
            <p className="text-white/60 text-xs mt-0.5 line-clamp-2">
              {violation.description}
            </p>
          </div>

          {/* Expand indicator */}
          <ChevronRight
            className={cn(
              'w-5 h-5 text-white/40 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-white/10 p-3 space-y-3">
            {/* Type badge */}
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5',
                'text-xs font-bold uppercase tracking-wider',
                isHard ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
              )}>
                {getViolationIcon(violation.violationType)}
                {violation.violationType.replace(/_/g, ' ')}
              </span>
              <span className={cn(
                'px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                isHard ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
              )}>
                {isHard ? 'Hard Violation' : 'Warning'}
              </span>
            </div>

            {/* Suggested resolution */}
            {violation.suggestedResolution && (
              <div className="bg-white/5 p-2">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                  Suggested Resolution
                </div>
                <p className="text-sm text-white/80">
                  {violation.suggestedResolution}
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-2">
              {violation.affectedGroupId && (
                <Button
                  variant="outline-neon"
                  size="sm"
                  onClick={() => onNavigateToGroup(violation.affectedGroupId!)}
                >
                  View Group
                </Button>
              )}
              {violation.affectedCamperIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToCamper(violation.affectedCamperIds[0])}
                >
                  View Camper{violation.affectedCamperIds.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {/* Resolution form */}
            <div className="border-t border-white/10 pt-3">
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
                Accept with Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Why are you accepting this?"
                  className={cn(
                    'flex-1 px-3 py-2 text-sm',
                    'bg-white/5 border-2 border-white/10',
                    'text-white placeholder:text-white/30',
                    'focus:outline-none focus:border-neon/50'
                  )}
                />
                <Button
                  variant="neon"
                  size="sm"
                  onClick={() => {
                    onResolve(violation.id, resolutionNote)
                    setResolutionNote('')
                    setExpandedId(null)
                  }}
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-dark-100 border-2 border-white/10',
        'flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="border-b-2 border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            Constraint Check
          </h2>

          {/* Summary badge */}
          {allClear ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/20 text-success text-sm font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              All Clear
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-error/20 text-error text-sm font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              {totalUnresolved} Issue{totalUnresolved !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-error">
            <AlertCircle className="w-4 h-4" />
            <span>{hardViolations.length} violations</span>
          </div>
          <div className="flex items-center gap-1.5 text-warning">
            <AlertTriangle className="w-4 h-4" />
            <span>{warnings.length} warnings</span>
          </div>
          {resolved.length > 0 && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>{resolved.length} resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* All clear message */}
        {allClear && (
          <div className="flex flex-col items-center justify-center py-12 text-success">
            <CheckCircle2 className="w-12 h-12 mb-3" />
            <p className="text-lg font-bold uppercase tracking-wide">
              All Constraints Satisfied
            </p>
            <p className="text-sm text-white/50 mt-1">
              Groups are ready for finalization
            </p>
          </div>
        )}

        {/* Hard violations section */}
        {hardViolations.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-error uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Violations (Must Fix)
            </h3>
            <div className="space-y-2">
              {hardViolations.map(renderViolation)}
            </div>
          </div>
        )}

        {/* Warnings section */}
        {warnings.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-warning uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings (Review Recommended)
            </h3>
            <div className="space-y-2">
              {warnings.map(renderViolation)}
            </div>
          </div>
        )}

        {/* Resolved section (collapsed by default) */}
        {resolved.length > 0 && (
          <details className="group">
            <summary className="text-xs font-bold text-white/50 uppercase tracking-wider cursor-pointer hover:text-white/70 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Resolved ({resolved.length})
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="mt-2 space-y-2">
              {resolved.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-white/5 border-2 border-white/10 opacity-60"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <p className="text-sm text-white line-through">
                        {v.title}
                      </p>
                      {v.resolutionNote && (
                        <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {v.resolutionNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
})

/**
 * VIOLATIONS SUMMARY BAR
 *
 * Compact summary bar shown at the top of the grouping board
 */
interface ViolationsSummaryBarProps {
  violations: ConstraintViolation[]
  onOpenPanel: () => void
  className?: string
}

export function ViolationsSummaryBar({
  violations,
  onOpenPanel,
  className,
}: ViolationsSummaryBarProps) {
  const hardCount = violations.filter(v => v.severity === 'hard' && !v.resolved).length
  const warnCount = violations.filter(v => v.severity === 'warning' && !v.resolved).length
  const allClear = hardCount === 0 && warnCount === 0

  return (
    <button
      onClick={onOpenPanel}
      className={cn(
        'flex items-center gap-4 px-4 py-2',
        'border-2 transition-all duration-150',
        'hover:bg-white/5',

        allClear
          ? 'border-success/30 bg-success/5'
          : hardCount > 0
            ? 'border-error/30 bg-error/5'
            : 'border-warning/30 bg-warning/5',

        className
      )}
    >
      {allClear ? (
        <>
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="text-sm font-semibold text-success uppercase tracking-wider">
            All Constraints Satisfied
          </span>
        </>
      ) : (
        <>
          {hardCount > 0 && (
            <div className="flex items-center gap-1.5 text-error">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">{hardCount} violation{hardCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {warnCount > 0 && (
            <div className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-white/50 ml-auto" />
        </>
      )}
    </button>
  )
}
