'use client'

/**
 * Schedule Block Card Component
 *
 * Individual schedule block with drag handle and actions.
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Clock,
  MapPin,
  BookOpen,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { CampScheduleBlock } from '@/lib/services/campSchedule'

interface ScheduleBlockCardProps {
  block: CampScheduleBlock
  canEdit?: boolean
  onEdit?: (block: CampScheduleBlock) => void
  onDelete?: (blockId: string) => void
}

const BLOCK_TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  activity: { bg: 'bg-neon/10', border: 'border-l-neon', text: 'text-neon' },
  curriculum: { bg: 'bg-purple/10', border: 'border-l-purple', text: 'text-purple' },
  break: { bg: 'bg-sky-500/10', border: 'border-l-sky-500', text: 'text-sky-500' },
  meal: { bg: 'bg-orange-500/10', border: 'border-l-orange-500', text: 'text-orange-500' },
  transition: { bg: 'bg-gray-500/10', border: 'border-l-gray-500', text: 'text-gray-400' },
  arrival: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', text: 'text-emerald-500' },
  departure: { bg: 'bg-rose-500/10', border: 'border-l-rose-500', text: 'text-rose-500' },
  special: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', text: 'text-amber-500' },
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  activity: 'Activity',
  curriculum: 'Curriculum',
  break: 'Break',
  meal: 'Meal',
  transition: 'Transition',
  arrival: 'Arrival',
  departure: 'Departure',
  special: 'Special',
}

export function ScheduleBlockCard({
  block,
  canEdit = false,
  onEdit,
  onDelete,
}: ScheduleBlockCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !canEdit })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const blockStyle = BLOCK_TYPE_STYLES[block.blockType] || BLOCK_TYPE_STYLES.activity

  // Calculate duration
  const [startH, startM] = block.startTime.split(':').map(Number)
  const [endH, endM] = block.endTime.split(':').map(Number)
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex bg-black/30 border-l-4 transition-all',
        blockStyle.border,
        isDragging && 'opacity-50 ring-2 ring-neon shadow-lg z-50',
        canEdit && 'hover:bg-white/5'
      )}
    >
      {/* Drag Handle */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Block Content */}
      <div className="flex-1 p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Time and Type */}
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(block.startTime)} - {formatTime(block.endTime)}
              </span>
              <span className={cn(
                'px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                blockStyle.bg,
                blockStyle.text
              )}>
                {BLOCK_TYPE_LABELS[block.blockType] || block.blockType}
              </span>
              <span className="text-xs text-white/30">
                {durationMinutes} min
              </span>
            </div>

            {/* Title */}
            <h4 className="font-bold text-white truncate">{block.label}</h4>

            {/* Description */}
            {block.description && (
              <p className="text-sm text-white/50 mt-1 line-clamp-2">{block.description}</p>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-4 mt-2">
              {block.curriculumBlock && (
                <span className="flex items-center gap-1 text-xs text-purple">
                  <BookOpen className="h-3 w-3" />
                  {block.curriculumBlock.title}
                </span>
              )}
              {block.location && (
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3 w-3" />
                  {block.location}
                </span>
              )}
            </div>

            {/* Curriculum Details */}
            {block.curriculumBlock && (
              <div className="mt-2 p-2 bg-purple/5 border border-purple/20 text-xs">
                <div className="flex items-center gap-4 text-white/50">
                  {block.curriculumBlock.category && (
                    <span className="capitalize">{block.curriculumBlock.category.replace('_', ' ')}</span>
                  )}
                  {block.curriculumBlock.intensity && (
                    <span>Intensity: {block.curriculumBlock.intensity}</span>
                  )}
                </div>
                {block.curriculumBlock.coachingPoints && (
                  <p className="mt-1 text-white/40 line-clamp-2">
                    {block.curriculumBlock.coachingPoints}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions Menu */}
          {canEdit && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-white/30 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-dark-100 border border-white/20 shadow-xl z-50 min-w-[140px]">
                  <button
                    onClick={() => {
                      onEdit?.(block)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this block?')) {
                        onDelete?.(block.id)
                      }
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
