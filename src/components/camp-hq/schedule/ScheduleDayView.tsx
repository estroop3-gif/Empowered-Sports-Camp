'use client'

/**
 * Schedule Day View Component
 *
 * Displays the schedule for a single camp day with drag-and-drop reordering.
 */

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { ScheduleBlockCard } from './ScheduleBlockCard'
import type { CampScheduleDay, CampScheduleBlock } from '@/lib/services/campSchedule'

interface ScheduleDayViewProps {
  day: CampScheduleDay
  canEdit?: boolean
  onEditBlock?: (block: CampScheduleBlock) => void
  onDeleteBlock?: (blockId: string) => void
  onReorderBlocks?: (newOrder: { id: string; orderIndex: number }[]) => void
}

export function ScheduleDayView({
  day,
  canEdit = false,
  onEditBlock,
  onDeleteBlock,
  onReorderBlocks,
}: ScheduleDayViewProps) {
  const [blocks, setBlocks] = useState(day.scheduleBlocks)

  // Update blocks when day changes
  if (day.scheduleBlocks !== blocks && day.id) {
    setBlocks(day.scheduleBlocks)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)

    const newBlocks = arrayMove(blocks, oldIndex, newIndex)
    setBlocks(newBlocks)

    // Notify parent with new order
    if (onReorderBlocks) {
      const newOrder = newBlocks.map((block, index) => ({
        id: block.id,
        orderIndex: index,
      }))
      onReorderBlocks(newOrder)
    }
  }

  // Calculate total duration
  const totalMinutes = blocks.reduce((total, block) => {
    const [startH, startM] = block.startTime.split(':').map(Number)
    const [endH, endM] = block.endTime.split(':').map(Number)
    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM
    return total + (endTotal - startTotal)
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return (
    <div className="bg-dark-100 border border-white/10">
      {/* Day Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-neon" />
              {day.title}
            </h3>
            {day.theme && (
              <p className="text-sm text-white/50 mt-1">Theme: {day.theme}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Clock className="h-4 w-4" />
              <span>{blocks.length} blocks</span>
              <span className="text-white/30">|</span>
              <span>{hours > 0 ? `${hours}h ` : ''}{minutes}m total</span>
            </div>
            {day.actualDate && (
              <p className="text-xs text-white/40 mt-1">
                {new Date(day.actualDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Blocks List */}
      <div className="p-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">No blocks scheduled for this day</p>
            <p className="text-sm text-white/30 mt-1">
              Add blocks from the curriculum or create custom blocks
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {blocks.map((block) => (
                  <ScheduleBlockCard
                    key={block.id}
                    block={block}
                    canEdit={canEdit}
                    onEdit={onEditBlock}
                    onDelete={onDeleteBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Day Notes */}
      {day.notes && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-white/5 border border-white/10 text-sm text-white/60">
            <span className="text-white/40 uppercase text-xs tracking-wider">Notes:</span>
            <p className="mt-1">{day.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
