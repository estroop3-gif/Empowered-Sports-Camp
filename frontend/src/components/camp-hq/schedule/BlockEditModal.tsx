'use client'

/**
 * Block Edit Modal Component
 *
 * Modal for editing schedule block details.
 */

import { useState } from 'react'
import { X, Clock, MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampScheduleBlock } from '@/lib/services/campSchedule'

interface BlockEditModalProps {
  block: CampScheduleBlock
  onSave: (updates: Partial<CampScheduleBlock>) => void
  onClose: () => void
  saving?: boolean
}

const BLOCK_TYPES = [
  { value: 'activity', label: 'Activity' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'break', label: 'Break' },
  { value: 'meal', label: 'Meal' },
  { value: 'transition', label: 'Transition' },
  { value: 'arrival', label: 'Arrival' },
  { value: 'departure', label: 'Departure' },
  { value: 'special', label: 'Special' },
]

export function BlockEditModal({ block, onSave, onClose, saving }: BlockEditModalProps) {
  const [formData, setFormData] = useState({
    label: block.label,
    description: block.description || '',
    startTime: block.startTime,
    endTime: block.endTime,
    location: block.location || '',
    blockType: block.blockType,
    assignedStaffNotes: block.assignedStaffNotes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      label: formData.label,
      description: formData.description || null,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location || null,
      blockType: formData.blockType as CampScheduleBlock['blockType'],
      assignedStaffNotes: formData.assignedStaffNotes || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-dark-100 border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Edit Block</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Block Name
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              required
            />
          </div>

          {/* Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                <Clock className="h-3 w-3 inline mr-1" />
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Block Type */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Block Type
            </label>
            <select
              value={formData.blockType}
              onChange={(e) => setFormData({ ...formData, blockType: e.target.value as CampScheduleBlock['blockType'] })}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
            >
              {BLOCK_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              <MapPin className="h-3 w-3 inline mr-1" />
              Location (optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Field A, Gym, Pool"
              className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          {/* Staff Notes */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Staff Notes (optional)
            </label>
            <textarea
              value={formData.assignedStaffNotes}
              onChange={(e) => setFormData({ ...formData, assignedStaffNotes: e.target.value })}
              rows={2}
              placeholder="Notes for assigned staff..."
              className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          {/* Curriculum Info (read-only) */}
          {block.curriculumBlock && (
            <div className="p-3 bg-purple/5 border border-purple/20">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                Linked Curriculum Block
              </p>
              <p className="text-sm text-purple font-medium">
                {block.curriculumBlock.title}
              </p>
              {block.curriculumBlock.coachingPoints && (
                <p className="text-xs text-white/50 mt-1">
                  {block.curriculumBlock.coachingPoints}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-all',
                saving
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
