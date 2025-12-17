'use client'

/**
 * Day Navigator Component
 *
 * Navigation controls for switching between camp days.
 */

import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampScheduleDay } from '@/lib/services/campSchedule'

interface DayNavigatorProps {
  days: CampScheduleDay[]
  selectedIndex: number
  onSelectDay: (index: number) => void
  onCreateDay?: () => void
}

export function DayNavigator({
  days,
  selectedIndex,
  onSelectDay,
  onCreateDay,
}: DayNavigatorProps) {
  const selectedDay = days[selectedIndex]

  const handlePrev = () => {
    if (selectedIndex > 0) {
      onSelectDay(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex < days.length - 1) {
      onSelectDay(selectedIndex + 1)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Prev/Next Buttons */}
      <div className="flex items-center">
        <button
          onClick={handlePrev}
          disabled={selectedIndex === 0}
          className="p-2 text-white/50 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={handleNext}
          disabled={selectedIndex >= days.length - 1}
          className="p-2 text-white/50 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day Selector Dropdown */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-white/40" />
        <select
          value={selectedIndex}
          onChange={(e) => onSelectDay(Number(e.target.value))}
          className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none min-w-[200px]"
        >
          {days.map((day, index) => (
            <option key={day.id} value={index}>
              Day {day.dayNumber}: {day.title}
              {day.theme ? ` - ${day.theme}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Day Pills */}
      <div className="hidden lg:flex items-center gap-1">
        {days.map((day, index) => (
          <button
            key={day.id}
            onClick={() => onSelectDay(index)}
            className={cn(
              'px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors',
              index === selectedIndex
                ? 'bg-neon text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            )}
          >
            Day {day.dayNumber}
          </button>
        ))}

        {/* Add Day Button */}
        {onCreateDay && (
          <button
            onClick={onCreateDay}
            className="px-2 py-1 text-white/30 hover:text-neon transition-colors"
            title="Add Day"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Current Day Info */}
      {selectedDay && (
        <div className="hidden sm:block text-sm text-white/50 ml-4">
          {selectedDay.scheduleBlocks.length} blocks
          {selectedDay.actualDate && (
            <span className="ml-2 text-white/30">
              {new Date(selectedDay.actualDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
