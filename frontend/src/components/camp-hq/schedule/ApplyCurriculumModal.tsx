'use client'

/**
 * Apply Curriculum Modal Component
 *
 * Modal for applying a curriculum template to generate the schedule.
 */

import { useState } from 'react'
import { X, BookOpen, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplyCurriculumModalProps {
  templateName: string
  templateSport: string | null
  totalDays: number
  onApply: (startTime: string) => void
  onClose: () => void
  saving?: boolean
}

export function ApplyCurriculumModal({
  templateName,
  templateSport,
  totalDays,
  onApply,
  onClose,
  saving,
}: ApplyCurriculumModalProps) {
  const [startTime, setStartTime] = useState('09:00')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onApply(startTime)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-100 border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold text-white">Apply Curriculum</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Info */}
          <div className="p-4 bg-neon/5 border border-neon/20">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
              Curriculum Template
            </p>
            <h3 className="text-lg font-bold text-white">{templateName}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
              {templateSport && (
                <span className="capitalize">{templateSport.replace('_', ' ')}</span>
              )}
              <span>{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-500 font-medium">This will replace existing schedule</p>
                <p className="text-white/50 mt-1">
                  Applying the curriculum will delete any existing schedule days and blocks for this camp.
                </p>
              </div>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              <Clock className="h-3 w-3 inline mr-1" />
              Camp Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
              required
            />
            <p className="text-xs text-white/40 mt-2">
              Schedule blocks will be calculated starting from this time.
            </p>
          </div>

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
                  Applying...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Apply Curriculum
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
